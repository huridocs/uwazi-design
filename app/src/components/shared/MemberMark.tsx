import { UsersRound } from "lucide-react";

/** Who a permission is given to, at a glance: a user is their initials on
 *  vellum (as in Settings › Users & Groups), a group is a people icon in an
 *  outlined square. Used by the Library's Permissions facet and the
 *  Permissions dialog. Decorative: the name beside it is the label. */
export function MemberMark({ name, group = false }: { name: string; group?: boolean }) {
  return group ? (
    <span
      data-component="MemberMark"
      data-kind="group"
      aria-hidden
      className="inline-flex items-center justify-center w-5 h-5 shrink-0 rounded-md bg-paper text-ink-secondary inset-ring inset-ring-border"
    >
      <UsersRound size={12} />
    </span>
  ) : (
    <span
      data-component="MemberMark"
      data-kind="user"
      aria-hidden
      className="inline-flex items-center justify-center w-5 h-5 shrink-0 rounded-md bg-vellum text-meta font-semibold leading-none text-ink-secondary uppercase"
    >
      {name.slice(0, 2)}
    </span>
  );
}
