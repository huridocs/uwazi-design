import { useState } from "react";
import { ChevronDown, Sparkles, List } from "lucide-react";
import { tocEntries, TocEntry } from "../../data/toc";
import { PageTag } from "../shared/PageTag";

export function TocDrawerContent() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getAllIds = (entries: TocEntry[]): string[] =>
    entries.flatMap((e) => [e.id, ...(e.children ? getAllIds(e.children) : [])]);

  const expandAll = () => setExpandedIds(new Set(getAllIds(tocEntries)));
  const collapseAll = () => setExpandedIds(new Set());

  const hasAnyChildren = tocEntries.some((e) => e.children?.length);

  if (tocEntries.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-4">
        <List size={32} className="text-ink-muted/40" />
        <div>
          <p className="text-sm font-semibold text-ink-muted">No ToC</p>
          <p className="text-xs text-ink-muted mt-1">
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
          <Sparkles size={14} className="text-ink-muted" />
        </div>
        {hasAnyChildren && (
          <div className="flex items-center gap-3">
            <button
              onClick={collapseAll}
              className="text-xs text-ink-muted hover:text-ink-secondary transition-colors"
            >
              Collapse All
            </button>
            <button
              onClick={expandAll}
              className="text-xs font-medium text-ink-secondary hover:text-ink transition-colors"
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
            onToggle={toggle}
          />
        ))}
      </div>
    </>
  );
}

function TocNode({
  entry,
  expandedIds,
  onToggle,
}: {
  entry: TocEntry;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = entry.children && entry.children.length > 0;
  const isExpanded = expandedIds.has(entry.id);
  const indent = entry.level * 16;

  return (
    <div>
      <button
        onClick={() => hasChildren ? onToggle(entry.id) : undefined}
        className={`flex items-center gap-2 w-full px-2 py-2 text-left hover:bg-warm rounded transition-colors group ${
          hasChildren ? "cursor-pointer" : "cursor-default"
        }`}
        style={{ paddingLeft: 8 + indent }}
      >
        {/* Chevron */}
        <span className="w-3.5 shrink-0 flex items-center justify-center">
          {hasChildren && (
            <ChevronDown
              size={12}
              className={`text-ink-muted transition-transform ${isExpanded ? "" : "-rotate-90"}`}
            />
          )}
        </span>

        {/* Label */}
        <span
          className={`flex-1 text-xs leading-relaxed truncate ${
            entry.level === 0
              ? "font-bold text-ink uppercase"
              : "font-medium text-ink-secondary"
          }`}
        >
          {entry.label}
        </span>

        {/* Page */}
        <PageTag page={entry.page} />
      </button>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {entry.children!.map((child) => (
            <TocNode
              key={child.id}
              entry={child}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
