import { useMemo, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { ChevronDown, Sparkles, List } from "lucide-react";
import { tocEntries, TocEntry } from "../../data/toc";
import { PageTag } from "../shared/PageTag";
import { currentPageAtom, scrollToPageAtom } from "../../atoms/selection";
import { t } from "../../utils/i18n";

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
      <div
        data-component="ToCPanel"
        data-part="empty"
        className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-4"
      >
        <List size={32} aria-hidden className="text-ink-tertiary/40" />
        <div>
          <p className="text-sm font-semibold text-ink-tertiary">{t("System", "No ToC")}</p>
          <p className="text-xs text-ink-tertiary mt-1">
            {t("System", "Well, just a table of contents (ToC)")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div
        data-component="ToCPanel"
        data-part="header"
        className="flex items-center justify-between py-2.5 shrink-0"
      >
        <div className="flex items-center gap-1.5">
          <h3 data-part="title" className="text-sm font-semibold text-ink">
            {t("System", "Table of contents")}
          </h3>
          <Sparkles size={14} aria-hidden className="text-ink-tertiary" />
        </div>
        {hasAnyChildren && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-part="collapse-all"
              onClick={collapseAll}
              className="text-xs text-ink-tertiary hover:text-ink-secondary transition-colors cursor-pointer"
            >
              {t("System", "Collapse All")}
            </button>
            <button
              type="button"
              data-part="expand-all"
              onClick={expandAll}
              className="text-xs font-medium text-ink-secondary hover:text-ink transition-colors cursor-pointer"
            >
              {t("System", "Expand All")}
            </button>
          </div>
        )}
      </div>

      {/* Tree */}
      {/* A scroll lane on the host's gutter. The rows are filled when active,
          so their BOX meets the gutter and their text sits inside it. */}
      <ul
        data-component="ToCPanel"
        data-part="tree"
        className="bleed flex-1 overflow-auto pb-8"
      >
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
      </ul>
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
    <li data-part="entry" data-level={entry.level}>
      <button
        type="button"
        onClick={handleRowClick}
        aria-current={isActive ? "true" : undefined}
        aria-expanded={hasChildren ? isExpanded : undefined}
        data-gutter-align="box"
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
        <span aria-hidden className="w-3.5 shrink-0 flex items-center justify-center">
          {hasChildren && (
            <ChevronDown
              size={12}
              className={`text-ink-tertiary transition-transform ${isExpanded ? "" : "-rotate-90"}`}
            />
          )}
        </span>

        {/* Label */}
        <span
          data-part="label"
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
        <ul data-part="children">
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
        </ul>
      )}
    </li>
  );
}
