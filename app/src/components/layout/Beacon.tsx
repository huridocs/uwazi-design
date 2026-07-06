import { useEffect, useRef, useState } from "react";
import { useAtom } from "jotai";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import {
  notificationsAtom,
  activitiesAtom,
  beaconOpenAtom,
  unreadCountAtom,
  type NotificationKind,
} from "../../atoms/notifications";
import { breakpointAtom } from "../../atoms/viewport";
import { toastsAtom, type Toast } from "../../atoms/references";
import { UwaziLoader } from "../shared/UwaziLoader";
import { NotificationsDrawer } from "./NotificationsDrawer";

const kindIcon: Record<NotificationKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};
const kindColor: Record<NotificationKind, string> = {
  success: "text-success",
  error: "text-seal",
  warning: "text-warning",
  info: "text-carbon",
};

/**
 * Navbar Beacon — a morphing pill that signals live activity (idle bell →
 * live-task pill → transient flash) and, on click, opens the notifications
 * drawer (the history log). The pill is the indicator; the drawer is the log.
 */
export function Beacon({ rtl = false }: { rtl?: boolean }) {
  const [notifications, setNotifications] = useAtom(notificationsAtom);
  const [activities, setActivities] = useAtom(activitiesAtom);
  const [open, setOpen] = useAtom(beaconOpenAtom);
  const [unread] = useAtom(unreadCountAtom);
  const [toasts, setToasts] = useAtom(toastsAtom);
  const [breakpoint] = useAtom(breakpointAtom);
  const isMobile = breakpoint === "mobile";
  const [hovered, setHovered] = useState(false);
  // Shows the expanded rail briefly when a task starts, then auto-collapses.
  const [activityIntro, setActivityIntro] = useState(true);

  // The beacon shows one combined live indicator for all in-flight tasks.
  const hasActivity = activities.length > 0;
  const runningCount = activities.filter((a) => a.current < a.total).length;
  const totals = activities.reduce(
    (acc, a) => ({ cur: acc.cur + a.current, tot: acc.tot + a.total }),
    { cur: 0, tot: 0 },
  );
  const pct = totals.tot ? Math.round((totals.cur / totals.tot) * 100) : 0;
  const activityLabel =
    activities.length === 1 ? activities[0].label : `${activities.length} tasks running`;
  const activityKey = activities.map((a) => a.id).join(",");

  // The most pressing unread item, surfaced when the idle pill is expanded.
  const severityRank: Record<NotificationKind, number> = { error: 3, warning: 2, info: 1, success: 0 };
  const topUnread = notifications
    .filter((n) => !n.read)
    .sort((a, b) => severityRank[b.kind] - severityRank[a.kind] || b.time - a.time)[0];

  // The loader mark is always shown, coloured by the most pressing state and
  // animated only while a task runs. Severity escalates the colour: seal for
  // errors, amber for warnings, carbon for info (+ processing). Black (ink) at
  // rest — idle, or "done" (only a success left to acknowledge).
  const kindTone: Record<NotificationKind, "seal" | "warning" | "carbon" | "default"> = {
    error: "seal",
    warning: "warning",
    info: "carbon",
    success: "default",
  };
  const loaderColor = hasActivity ? "carbon" : topUnread ? kindTone[topUnread.kind] : "default";

  // Transient message the beacon "speaks" inline (consolidated toasts).
  const [flash, setFlash] = useState<Toast | null>(null);

  // Drain the legacy toast channel: every action-feedback toast becomes a
  // persistent notification AND briefly flashes on the pill, so the beacon is
  // the single notification surface (no separate floating toasts).
  useEffect(() => {
    if (toasts.length === 0) return;
    setNotifications((prev) => [
      ...toasts
        .map((t) => ({
          id: `t-${t.id}`,
          kind: t.type,
          title: t.message,
          time: Date.now(),
          read: false,
        }))
        .reverse(),
      ...prev,
    ]);
    setFlash(toasts[toasts.length - 1]);
    setToasts([]);
  }, [toasts, setToasts, setNotifications]);

  // The flash reverts to idle/live after a beat.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3200);
    return () => clearTimeout(t);
  }, [flash]);

  // Attention pop whenever the unread count rises (new notification lands).
  const [pop, setPop] = useState(false);
  const prevUnread = useRef(unread);
  useEffect(() => {
    if (unread > prevUnread.current) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 480);
      prevUnread.current = unread;
      return () => clearTimeout(t);
    }
    prevUnread.current = unread;
  }, [unread]);

  // A new task (the set of ids changes) expands the pill for a beat, then it
  // auto-collapses back to the mark.
  useEffect(() => {
    if (!hasActivity) {
      setActivityIntro(false);
      return;
    }
    setActivityIntro(true);
    const t = setTimeout(() => setActivityIntro(false), 3000);
    return () => clearTimeout(t);
  }, [activityKey, hasActivity]);

  // Running tasks tick toward completion so the beacon feels alive.
  useEffect(() => {
    if (runningCount === 0) return;
    const id = setInterval(() => {
      setActivities((prev) => {
        let changed = false;
        const next = prev.map((a) => {
          if (a.current >= a.total) return a;
          changed = true;
          const step = Math.ceil((a.total - a.current) * 0.18) + 1;
          return { ...a, current: Math.min(a.total, a.current + step) };
        });
        return changed ? next : prev;
      });
    }, 850);
    return () => clearInterval(id);
  }, [runningCount, setActivities]);

  // Each completed task converts into a success notification (once).
  const finalizingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    activities.forEach((a) => {
      if (a.current >= a.total && !finalizingRef.current.has(a.id)) {
        finalizingRef.current.add(a.id);
        window.setTimeout(() => {
          setNotifications((prev) => [
            {
              id: `n-done-${a.id}`,
              kind: "success",
              title: `${a.label} complete.`,
              detail: `${a.total} items processed.`,
              time: Date.now(),
              read: false,
            },
            ...prev,
          ]);
          setActivities((prev) => prev.filter((x) => x.id !== a.id));
          finalizingRef.current.delete(a.id);
        }, 1100);
      }
    });
  }, [activities, setActivities, setNotifications]);

  // Expansion: a task intro, a flash, or hover opens the pill (desktop only).
  // It needs something to say — an active task or unread items.
  const hasContent = !!flash || hasActivity || unread > 0;
  const isExpanded = !isMobile && hasContent && (!!flash || hovered || (hasActivity && activityIntro));

  const width = !isMobile && flash ? "17rem" : isExpanded ? "15rem" : "1.75rem";

  const LeadIcon = topUnread ? kindIcon[topUnread.kind] : null;
  const moreCount = unread - 1;

  return (
    <>
      {/* Visually-hidden live region — announces flashes (action feedback /
          new arrivals) to screen readers; the pill itself is purely visual. */}
      <span aria-live="polite" className="sr-only">
        {flash?.message ?? ""}
      </span>
      <div
        dir="ltr"
        className="relative shrink-0"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className={`relative rounded-md beacon-spring ${
            open ? "bg-vellum" : "bg-warm"
          } ${pop ? "animate-beacon-pop" : ""}`}
          style={{
            width,
            transitionProperty: "width, box-shadow",
            transitionDuration: "0.42s",
          }}
        >
          {/* Clip wrapper keeps rail content rounded through the width morph. */}
          <div className="overflow-hidden" style={{ borderRadius: "inherit" }}>
            <button
              onClick={() => { setOpen(true); setFlash(null); }}
              className="relative flex items-center w-full h-7 px-2.5 hover:bg-parchment transition-colors"
              aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
              aria-haspopup="dialog"
              aria-expanded={open}
            >
              {flash ? (
                (() => {
                  const FlashIcon = kindIcon[flash.type];
                  return (
                    <div key="flash" className="flex items-center gap-2 w-full animate-beacon-rail">
                      <FlashIcon size={14} className={`${kindColor[flash.type]} shrink-0`} />
                      <span className="text-[12px] font-medium text-ink truncate">{flash.message}</span>
                    </div>
                  );
                })()
              ) : isExpanded && hasActivity ? (
                // Processing — combined label + percentage.
                <div key="live" className="flex items-center gap-2 w-full animate-beacon-rail">
                  <span className="shrink-0 flex items-center">
                    <UwaziLoader size="xs" color="carbon" animate />
                  </span>
                  <span className="text-[12px] font-medium text-ink truncate">{activityLabel}</span>
                  <span className="ml-auto text-[11px] font-semibold text-ink-tertiary tabular-nums shrink-0">
                    {pct}%
                  </span>
                </div>
              ) : isExpanded && topUnread && LeadIcon ? (
                // Idle-but-unread — surface the most pressing item on hover.
                <div key="summary" className="flex items-center gap-2 w-full animate-beacon-rail">
                  <LeadIcon size={14} className={`${kindColor[topUnread.kind]} shrink-0`} />
                  <span className="text-[12px] font-medium text-ink truncate">{topUnread.title}</span>
                  {moreCount > 0 && (
                    <span className="ml-auto text-[11px] font-semibold text-ink-tertiary tabular-nums shrink-0">
                      +{moreCount}
                    </span>
                  )}
                </div>
              ) : (
                // Collapsed — just the loader mark, coloured by status.
                <div key="idle" className="flex items-center justify-center w-full">
                  <UwaziLoader size="xs" color={loaderColor} animate={hasActivity} />
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      <NotificationsDrawer rtl={rtl} />
    </>
  );
}
