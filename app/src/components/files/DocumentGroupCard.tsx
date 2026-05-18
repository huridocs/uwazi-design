import { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { useSetAtom } from "jotai";
import { DocumentGroup } from "../../data/files";
import { documentGroupsAtom } from "../../atoms/files";

interface DocumentGroupCardProps {
  group: DocumentGroup;
  /** Translation count for the section header. */
  translationCount: number;
  /** Whether this group's first file is the active primary. Used to surface
   *  an "Active" pill in the header. */
  active?: boolean;
  children: ReactNode;
}

/** Shell rendered above each primary `DocumentGroup` in the Files tab.
 *  Shows the editable group title, translation count, and active state.
 *  Inline rename: click the pencil → input replaces the title; commit on
 *  blur or Enter. */
export function DocumentGroupCard({
  group,
  translationCount,
  active,
  children,
}: DocumentGroupCardProps) {
  const setGroups = useSetAtom(documentGroupsAtom);

  const renameGroup = (next: string) => {
    const trimmed = next.trim();
    if (!trimmed || trimmed === group.title) return;
    setGroups((all) =>
      all.map((g) => (g.id === group.id ? { ...g, title: trimmed } : g)),
    );
  };

  return (
    <section className="mb-4">
      <header className="flex items-center gap-2 flex-wrap mb-2 px-1">
        <GroupTitleField initial={group.title} onCommit={renameGroup} />
        {/* Primary always shows on every primary group; Active is the
            single source of "which one the viewer's rendering". Same
            shape, different fill so they read as a continuum, not two
            unrelated states. */}
        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded shrink-0 bg-warning-light text-warning">
          Primary
        </span>
        {active && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-ink text-parchment shrink-0">
            Active
          </span>
        )}
        <span className="text-[11px] text-ink-tertiary tabular-nums shrink-0">
          {translationCount} {translationCount === 1 ? "translation" : "translations"}
        </span>
      </header>
      {children}
    </section>
  );
}

function GroupTitleField({
  initial,
  onCommit,
}: {
  initial: string;
  onCommit: (next: string) => void;
}) {
  return (
    <label className="group flex items-center gap-1">
      <input
        defaultValue={initial}
        size={Math.max(initial.length, 16)}
        onBlur={(e) => onCommit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            (e.target as HTMLInputElement).value = initial;
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="text-sm font-semibold text-ink bg-transparent
          focus:outline-none focus:bg-paper focus:ring-1 focus:ring-carbon/30 focus:rounded px-1 -mx-1"
        style={{ fieldSizing: "content" } as React.CSSProperties}
        aria-label="Document title"
      />
      <Pencil
        size={11}
        className="text-ink-tertiary opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0"
      />
    </label>
  );
}
