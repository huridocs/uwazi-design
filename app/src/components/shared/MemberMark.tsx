import { User, Users } from "lucide-react";

/** Who a permission is given to, at a glance: a user is a single person, a
 *  group is people in a circle. Used by the Library's Permissions facet and
 *  the Permissions dialog. Decorative: the name beside it is the label. */
export function MemberMark({ group = false }: { name?: string; group?: boolean }) {
  return group ? (
    <span
      data-component="MemberMark"
      data-kind="group"
      aria-hidden
      className="inline-flex items-center justify-center w-5 h-5 shrink-0 rounded-full text-ink-secondary inset-ring inset-ring-ink-tertiary"
    >
      <Users size={11} />
    </span>
  ) : (
    <span
      data-component="MemberMark"
      data-kind="user"
      aria-hidden
      className="inline-flex items-center justify-center w-5 h-5 shrink-0 text-ink-secondary"
    >
      <User size={14} />
    </span>
  );
}
