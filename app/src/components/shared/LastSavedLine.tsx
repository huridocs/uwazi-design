import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { lastSavedAtom } from "../../atoms/activityLog";

/** "2 min ago", "3 days ago", or the date past a month. */
export function savedAgo(at: number, now: number): string {
  const m = Math.floor((now - at) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`;
  return `on ${new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
}

/** An editor footer's "Saved 2 min ago by admin", read from the Activity log
 *  (UX11): several admins edit one collection, and this says who touched the
 *  record last. Always mounted, so the footer keeps its layout when there is
 *  nothing to say (a new record, or one nobody has saved). */
export function LastSavedLine({ domain, id }: { domain: string; id: string | undefined }) {
  const entry = useAtomValue(lastSavedAtom(`${domain}:${id ?? ""}`));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!entry) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [entry]);
  return (
    <span data-part="last-saved" className="min-w-0 truncate text-xs text-ink-tertiary">
      {id && entry ? `Saved ${savedAgo(entry.at, now)} by ${entry.user}` : ""}
    </span>
  );
}
