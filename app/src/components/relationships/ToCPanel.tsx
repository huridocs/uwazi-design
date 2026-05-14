import { useMemo, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { ChevronDown, Sparkles, List } from "lucide-react";
import { tocEntries, TocEntry } from "../../data/toc";
import { PageTag } from "../shared/PageTag";
import { currentPageAtom, scrollToPageAtom } from "../../atoms/selection";

/** Flatten a tree of TocEntries in document order, preserving ancestor ids. */
function flatten(entries: TocEntry[], ancestors: string[] = []): {
  entry: TocEntry;
  ancestors: string[];
}[] {
  return entries.flatMap((e) => [
    { entry: e, ancestors },
    ...(e.children ? flatten(e.children, [...ancestors, e.id]) : []),
  ]);
}

export function ToCPanel() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [currentPage] = useAtom(currentPageAtom);
  const setScrollToPage = useSetAtom(scrollToPageAtom);

  const flat = useMemo(() => flatten(tocEntries), []);

  /** Active entry = the latest TocEntry whose page <= currentPage. The path
   *  from root to that entry should look "open" (active state on the leaf,
   *  ancestor highlight on collapsed parents). */
  const { activeId, activeAncestors } = useMemo(() => {
    let active: (typeof flat)[number] | undefined;
    for (const item of flat) {
      if (item.entry.page <= currentPage) active = item;
      else break;
    }
    return {
      activeId: active?.entry.id ?? null,
      activeAncestors: new Set(active?.ancestors ?? []),
    };
  }, [flat, currentPage]);

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getAllIds = (entries: TocEntry[]): string[] =>
    entries.flatMap((e) => [e.id, ...(e.children ? getAllIds(e.children) : [])]);

  const expandAll = () => setExpandedIds(new Set(getAllIds(tocEntries)));
  const collapseAll = () => setExpandedIds(new Set());

  const jumpTo = (page: number) => setScrollToPage(page);

  const hasAnyChildren = tocEntries.some((e) => e.children?.length);

  if (tocEntries.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-4">
        <List size={32} className="text-ink-tertiary/40" />
        <div>
          <p className="text-sm font-semibold text-ink-tertiary">No ToC</p>
          <p className="text-xs text-ink-tertiary mt-1">
            Well, just a table of contents (ToC)
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-ink">Table of contents</span>
          <Sparkles size={14} className="text-ink-tertiary" />
        </div>
        {hasAnyChildren && (
          <div className="flex items-center gap-3">
            <button
              onClick={collapseAll}
              className="text-xs text-ink-tertiary hover:text-ink-secondary transition-colors cursor-pointer"
            >
              Collapse All
            </button>
            <button
              onClick={expandAll}
              className="text-xs font-medium text-ink-secondary hover:text-ink transition-colors cursor-pointer"
            >
              Expand All
            </button>
          </div>
        )}
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto px-1 pb-8">
        {tocEntries.map((entry) => (
          <TocNode
            key={entry.id}
            entry={entry}
            expandedIds={expandedIds}
            activeId={activeId}
            activeAncestors={activeAncestors}
            onToggle={toggle}
            onJump={jumpTo}
          />
        ))}
      </div>
    </>
  );
}

interface NodeProps {
  entry: TocEntry;
  expandedIds: Set<string>;
  activeId: string | null;
  activeAncestors: Set<string>;
  onToggle: (id: string) => void;
  onJump: (page: number) => void;
}

function TocNode({
  entry,
  expandedIds,
  activeId,
  activeAncestors,
  onToggle,
  onJump,
}: NodeProps) {
  const hasChildren = !!entry.children?.length;
  const isExpanded = expandedIds.has(entry.id);
  const indent = entry.level * 16;
  const isActive = activeId === entry.id;
  const isOnActivePath = activeAncestors.has(entry.id);

  const handleRowClick = () => {
    if (hasChildren) onToggle(entry.id);
    onJump(entry.page);
  };

  const handlePageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onJump(entry.page);
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleRowClick}
        aria-current={isActive ? "true" : undefined}
        className={`flex items-center gap-2 w-full px-2 py-2 text-left rounded transition-colors group cursor-pointer ${
          isActive
            ? "bg-parchment"
            : isOnActivePath
              ? "bg-warm/50"
              : "hover:bg-warm"
        }`}
        style={{ paddingLeft: 8 + indent }}
      >
        {/* Chevron */}
        <span className="w-3.5 shrink-0 flex items-center justify-center">
          {hasChildren && (
            <ChevronDown
              size={12}
              className={`text-ink-tertiary transition-transform ${isExpanded ? "" : "-rotate-90"}`}
            />
          )}
        </span>

        {/* Label */}
        <span
          className={`flex-1 text-xs leading-relaxed truncate ${
            entry.level === 0
              ? "font-bold text-ink uppercase"
              : isActive
                ? "font-semibold text-ink"
                : "font-medium text-ink-secondary"
          }`}
        >
          {entry.label}
        </span>

        {/* Page (clickable independently of the row toggle) */}
        <span onClick={handlePageClick}>
          <PageTag page={entry.page} />
        </span>
      </button>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {entry.children!.map((child) => (
            <TocNode
              key={child.id}
              entry={child}
              expandedIds={expandedIds}
              activeId={activeId}
              activeAncestors={activeAncestors}
              onToggle={onToggle}
              onJump={onJump}
            />
          ))}
        </div>
      )}
    </div>
  );
}
