import { useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  X,
  Check,
  CheckCheck,
  RotateCw,
  Inbox,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  Undo2,
} from "lucide-react";
import {
  notificationsAtom,
  activitiesAtom,
  beaconOpenAtom,
  unreadCountAtom,
  type Activity,
  type Notification,
  type NotificationKind,
  type NotificationAction,
} from "../../atoms/notifications";
import { undoAtom, undoOpAtom } from "../../atoms/entityOverlay";
import { UwaziLoader } from "../shared/UwaziLoader";
import { SectionLabel } from "../shared/SectionLabel";
import { useFocusTrap } from "../../hooks/useFocusTrap";

/** The drawer's section headers stick to the top of the scroller as their group
 *  passes under it, so they carry a ground of their own — the box, not the type,
 *  which is why it rides `SectionLabel`'s `className` rather than the shared
 *  primitive. `bleed` spreads that ground to the panel edge and puts the text
 *  back on the gutter. */
const STICKY = "sticky top-0 z-10 bg-warm bleed pt-3 pb-1.5";

const kindStyle: Record<
  NotificationKind,
  { Icon: typeof CheckCircle2; color: string; card: string }
> = {
  success: { Icon: CheckCircle2, color: "text-success", card: "bg-success-light border-success/20" },
  info: { Icon: Info, color: "text-carbon", card: "bg-carbon-tint border-carbon/20" },
  warning: { Icon: AlertTriangle, color: "text-warning", card: "bg-warning-light border-warning/25" },
  error: { Icon: XCircle, color: "text-seal-label", card: "bg-seal-tint border-seal/20" },
};

function fmtTime(t: number, now: number): string {
  const diff = Math.max(0, now - t);
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d > 1 ? "s" : ""} ago`;
  const date = new Date(t);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type Bucket = "new" | "today" | "earlier";
const bucketLabel: Record<Bucket, string> = { new: "New", today: "Today", earlier: "Earlier" };

export function NotificationsDrawer({ rtl = false }: { rtl?: boolean }) {
  const [notifications, setNotifications] = useAtom(notificationsAtom);
  const [activities, setActivities] = useAtom(activitiesAtom);
  const [open, setOpen] = useAtom(beaconOpenAtom);
  const trapRef = useFocusTrap<HTMLElement>(open);
  // Inert while closed — the drawer stays mounted off-screen and its controls
  // must not be tabbable (focusing one force-scrolls hidden overflow).
  useEffect(() => {
    trapRef.current?.toggleAttribute("inert", !open);
  }, [open, trapRef]);
  const [unread] = useAtom(unreadCountAtom);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const now = Date.now();

  // Track which notifications are new so only fresh arrivals get the enter anim.
  const seenRef = useRef<Set<string>>(new Set(notifications.map((n) => n.id)));
  useEffect(() => {
    notifications.forEach((n) => seenRef.current.add(n.id));
  }, [notifications]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const markRead = (id: string) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  // Dismiss with a brief collapse before the row actually leaves the list.
  const dismiss = (id: string) => {
    setRemoving((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
  };

  // Retry an error → mark it read and kick off a fresh task.
  const retry = (n: Notification) => {
    markRead(n.id);
    setActivities((prev) => [
      ...prev,
      { id: `retry-${n.id}-${now}`, label: `Retrying: ${n.title.replace(/[.:]\s*$/, "")}`, current: 0, total: 100 },
    ]);
  };

  // Bucket + filter the log.
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const todayStart = dayStart.getTime();
  const bucketOf = (n: Notification): Bucket =>
    !n.read ? "new" : n.time >= todayStart ? "today" : "earlier";

  const visible = notifications.filter((n) => (filter === "unread" ? !n.read : true));
  const groups: Record<Bucket, Notification[]> = { new: [], today: [], earlier: [] };
  visible.forEach((n) => groups[bucketOf(n)].push(n));
  // New = most pressing first (matches what the beacon surfaces); read = newest.
  const severityRank: Record<NotificationKind, number> = { error: 3, warning: 2, info: 1, success: 0 };
  groups.new.sort((a, b) => severityRank[b.kind] - severityRank[a.kind] || b.time - a.time);
  groups.today.sort((a, b) => b.time - a.time);
  groups.earlier.sort((a, b) => b.time - a.time);
  const orderedBuckets: Bucket[] = ["new", "today", "earlier"];

  const side = rtl ? "left-0 border-r" : "right-0 border-l";
  const closedTransform = rtl ? "-translate-x-full" : "translate-x-full";

  return (
    <>
      {/* Scrim */}
      <div
        onClick={() => setOpen(false)}
        data-component="NotificationsDrawer"
        data-part="scrim"
        className={`fixed inset-0 z-[60] bg-ink/20 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        ref={trapRef as React.Ref<HTMLElement>}
        dir={rtl ? "rtl" : "ltr"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-drawer-title"
        data-component="NotificationsDrawer"
        data-part="panel"
        data-state={open ? "open" : "closed"}
        data-gutter-host
        className={`fixed top-0 bottom-0 ${side} z-[61] w-[23rem] max-w-[calc(100vw-2.5rem)]
          gutter-host-main bg-paper border-border shadow-xl flex flex-col beacon-spring
          transition-transform duration-300 ${open ? "translate-x-0" : closedTransform}`}
      >
        {/* Header — `bleed`, so its rule runs to the panel edge */}
        <header data-part="header" className="shrink-0 bleed border-b border-border">
          <div className="flex items-center gap-2 h-14">
            <h2 id="notifications-drawer-title" data-part="title" className="text-base font-semibold text-ink">Notifications</h2>
            {unread > 0 && (
              <span data-part="unread-count" className="min-w-[18px] h-[18px] px-1.5 flex items-center justify-center rounded-full bg-carbon text-paper text-meta font-bold tabular-nums">
                {unread}
              </span>
            )}
            <div className="ms-auto flex items-center gap-0.5">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  data-part="mark-all-read"
                  className="flex items-center gap-1 px-2 h-7 text-xs leading-normal font-medium text-ink-secondary rounded-md hover:bg-warm transition-colors"
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                data-part="close"
                className="flex items-center justify-center w-7 h-7 rounded-md text-ink-muted hover:bg-warm hover:text-ink-secondary transition-colors"
                aria-label="Close"
                data-gutter-align="box"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          {/* Filter */}
          <div data-part="filter" role="group" aria-label="Show" className="flex items-center gap-1 pb-2.5">
            <FilterPill active={filter === "all"} onClick={() => setFilter("all")} label="All" count={notifications.length} />
            <FilterPill active={filter === "unread"} onClick={() => setFilter("unread")} label="Unread" count={unread} />
          </div>
        </header>

        {/* Body — polite live region so task progress + new arrivals are
            announced while the drawer is open. A `bleed` scroll lane: warm ground
            and scrollbar at the panel edge. */}
        <div aria-live="polite" data-part="body" className="flex-1 overflow-y-auto bg-warm bleed">
          {/* Tasks */}
          {activities.length > 0 && (
            <section data-part="tasks">
              <SectionLabel className={STICKY}>Tasks · {activities.length}</SectionLabel>
              <div className="pb-3 space-y-2">
                {activities.map((a) => (
                  <TaskCard key={a.id} a={a} onCancel={() => setActivities((p) => p.filter((x) => x.id !== a.id))} />
                ))}
              </div>
            </section>
          )}

          {/* Notifications */}
          {visible.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            orderedBuckets.map((b) =>
              groups[b].length === 0 ? null : (
                <section key={b} data-part="bucket" data-bucket={b}>
                  <SectionLabel className={STICKY}>{bucketLabel[b]}</SectionLabel>
                  <div className="pb-3 space-y-2">
                    {groups[b].map((n) => (
                      <NotifCard
                        key={n.id}
                        n={n}
                        now={now}
                        isNew={!seenRef.current.has(n.id)}
                        removing={removing.has(n.id)}
                        onRead={() => markRead(n.id)}
                        onDismiss={() => dismiss(n.id)}
                        onRetry={() => retry(n)}
                      />
                    ))}
                  </div>
                </section>
              ),
            )
          )}
        </div>

        {/* Footer */}
        <footer data-part="footer" className="shrink-0 bleed border-t border-border py-3">
          <button
            type="button"
            onClick={() => setNotifications([])}
            data-part="clear-all"
            disabled={notifications.length === 0}
            className="w-full h-9 text-tab font-medium text-ink-secondary bg-paper border border-border rounded-md
              hover:bg-warm transition-colors disabled:opacity-40 disabled:cursor-default"
          >
            Clear all
          </button>
        </footer>
      </aside>
    </>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-part="filter-option"
      aria-pressed={active}
      className={`flex items-center gap-1.5 px-2.5 h-7 text-xs leading-normal font-medium rounded-md transition-colors ${
        active ? "bg-vellum text-ink" : "text-ink-secondary hover:bg-warm"
      }`}
    >
      {label}
      <span className={`text-meta tabular-nums ${active ? "text-ink-tertiary" : "text-ink-muted"}`}>{count}</span>
    </button>
  );
}

function TaskCard({ a, onCancel }: { a: Activity; onCancel: () => void }) {
  const pct = Math.round((a.current / a.total) * 100);
  const done = a.current >= a.total;
  return (
    <article data-part="task" className="bg-paper border border-border-soft rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="shrink-0 flex items-center">
          <UwaziLoader size="xs" color="carbon" animate={!done} />
        </span>
        <h4 data-part="task-label" className="text-tab font-medium text-ink truncate flex-1">{a.label}…</h4>
        <span className="text-meta font-medium text-carbon shrink-0">{done ? "Finishing" : "Running"}</span>
        <button
          type="button"
          onClick={onCancel}
          data-part="cancel"
          className="shrink-0 flex items-center justify-center w-5 h-5 rounded text-ink-muted hover:bg-warm transition-colors"
          aria-label="Cancel task"
        >
          <X size={13} />
        </button>
      </div>
      {a.detail && <div className="mt-0.5 ms-[1.375rem] text-meta text-ink-muted truncate">{a.detail}</div>}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-vellum overflow-hidden">
          <div
            className="h-full rounded-full bg-carbon beacon-spring"
            style={{ width: `${pct}%`, transitionProperty: "width", transitionDuration: "0.5s" }}
          />
        </div>
        <span className="text-meta font-semibold text-ink-tertiary tabular-nums shrink-0">{pct}%</span>
      </div>
    </article>
  );
}

function EmptyState({ filter }: { filter: "all" | "unread" }) {
  return (
    <div data-part="empty" className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
      <Inbox size={28} className="text-ink-muted" strokeWidth={1.5} />
      <p className="text-sm font-medium text-ink-secondary">
        {filter === "unread" ? "No unread notifications" : "You're all caught up"}
      </p>
      <p className="text-xs text-ink-muted">
        {filter === "unread" ? "Everything here has been read." : "New activity will show up here."}
      </p>
    </div>
  );
}

function NotifCard({
  n,
  now,
  isNew,
  removing,
  onRead,
  onDismiss,
  onRetry,
}: {
  n: Notification;
  now: number;
  isNew: boolean;
  removing: boolean;
  onRead: () => void;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { Icon, color, card } = kindStyle[n.kind];

  return (
    <article
      data-part="notification"
      data-kind={n.kind}
      data-read={n.read}
      onClick={() => !n.read && onRead()}
      className={`group relative rounded-lg border px-3 py-2.5 ${card} cursor-pointer
        transition-all duration-200 ${removing ? "opacity-0 scale-[0.97]" : "opacity-100"}
        ${isNew && !removing ? "animate-fade-in-up" : ""}
        ${n.read ? "opacity-75 hover:opacity-100" : ""}`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        data-part="dismiss"
        className="absolute top-2.5 end-2.5 flex items-center justify-center w-5 h-5 rounded text-ink-muted opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-ink/5 transition-opacity"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
      <div className="flex items-start gap-2.5 pe-5">
        <Icon size={17} className={`${color} shrink-0 mt-px`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-carbon shrink-0" />}
            <h4 data-part="title" className="text-tab font-medium text-ink">{n.title}</h4>
          </div>
          {n.detail && <div className="text-xs leading-normal text-ink-secondary mt-0.5">{n.detail}</div>}

          {n.details && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((v) => !v);
                }}
                data-part="details-toggle"
                aria-expanded={expanded}
                className="mt-1 inline-flex items-center gap-1 text-meta font-medium text-ink-tertiary hover:text-ink-secondary transition-colors"
              >
                <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                {expanded ? "Hide details" : "Show details"}
              </button>
              {expanded && (
                <pre data-part="details" className="mt-1.5 rounded-md bg-ink/[0.04] border border-border-soft px-2.5 py-2 text-meta leading-relaxed font-mono text-ink-secondary whitespace-pre-wrap break-words">
                  {n.details}
                </pre>
              )}
            </>
          )}

          {/* Footer: actions + timestamp */}
          <div className="mt-1.5 flex items-center gap-2">
            <time data-part="time" dateTime={new Date(n.time).toISOString()} className="text-meta text-ink-tertiary">{fmtTime(n.time, now)}</time>
            <div className="ms-auto flex items-center gap-1">
              {n.action && <NotifAction action={n.action} />}
              {n.kind === "error" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry();
                  }}
                  data-part="retry"
                  className="flex items-center gap-1 px-2 h-6 text-meta font-medium text-ink-secondary bg-paper/70 border border-border-soft rounded-md hover:bg-paper transition-colors"
                >
                  <RotateCw size={11} /> Retry
                </button>
              )}
              {!n.read && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRead();
                  }}
                  data-part="mark-read"
                  className="flex items-center justify-center w-6 h-6 rounded-md text-ink-tertiary hover:bg-ink/5 transition-colors"
                  aria-label="Mark read"
                  title="Mark read"
                >
                  <Check size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/** A notification's action (today: Undo). Stays mounted once the change it
 *  undoes has been replaced — disabled, saying why — so the card doesn't
 *  change shape under the reader. */
function NotifAction({ action }: { action: NotificationAction }) {
  const op = useAtomValue(undoOpAtom);
  const undo = useSetAtom(undoAtom);
  const live = op?.ref === action.ref;
  return (
    <button
      type="button"
      data-part="action"
      aria-disabled={!live || undefined}
      title={live ? undefined : "A later change replaced this undo"}
      onClick={(e) => {
        e.stopPropagation();
        if (live) undo(action.ref);
      }}
      className={`flex items-center gap-1 px-2 h-6 text-meta font-medium text-ink-secondary bg-paper/70 border border-border-soft rounded-md transition-colors ${
        live ? "hover:bg-paper cursor-pointer" : "opacity-50 cursor-not-allowed"
      }`}
    >
      <Undo2 size={11} aria-hidden /> {action.label}
    </button>
  );
}
