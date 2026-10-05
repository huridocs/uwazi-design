import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { ArrowDownAZ, ChevronRight, Download, FolderInput, FolderPlus, Plus, Trash2, Upload } from "lucide-react";
import { SettingsButton } from "../SettingsButton";
import { SettingsEditor } from "../SettingsEditor";
import { SettingsSection } from "../SettingsSection";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { RowActionButton, RowActions } from "../RowActions";
import { MoveButtons, ReorderGrip } from "../ReorderControls";
import { BulkPickModal } from "../BulkPickModal";
import { ThesaurusImportModal } from "../ThesaurusImportModal";
import { useNotify } from "../../../hooks/useNotify";
import { toThesaurusCsv } from "../../../utils/thesaurusCsv";
import { seedLanguages } from "../../../data/settings";
import { SettingsField, TextInput } from "../SettingsField";
import { Checkbox } from "../../shared/Checkbox";
import { AlphaJump } from "../../shared/AlphaJump";
import { HighlightedText } from "../../shared/HighlightedText";
import { ModalSearchField } from "../../shared/ModalParts";
import type { SettingsThesaurus, ThesaurusValue } from "../../../data/settings";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { saveThesaurusAtom, thesauriAtom } from "../../../atoms/thesauri";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { useSettingsUndo } from "../../../hooks/useSettingsUndo";
import { valueUsageAtom } from "../../../atoms/settingsUsage";
import { LastSavedLine } from "../../shared/LastSavedLine";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";
import { useWindowedRows } from "../../../hooks/useWindowedRows";
import {
  countTree,
  findItem,
  flatten,
  fold,
  initialOf,
  insertAfter,
  isGroup,
  moveToGroup,
  moveWithin,
  patchLabel,
  placeOf,
  removeIds,
  restore,
  sortAZ,
  type Removed,
  type TreeItem,
  type TreeRow,
} from "../../../utils/thesaurusTree";

let uid = 0;
const newId = () => `tv-${Date.now().toString(36)}-${++uid}`;
const ROW_REM = 2.25;
const ROOT = "__root";

/** The editor's items back into Uwazi's value shape. Blank rows are dropped:
 *  an empty label is a row someone added and never filled. */
const toValues = (items: TreeItem[]): ThesaurusValue[] =>
  items
    .filter((it) => it.label.trim())
    .map((it) =>
      it.children
        ? {
            id: it.id,
            label: it.label.trim(),
            values: it.children.filter((c) => c.label.trim()).map((c) => ({ id: c.id, label: c.label.trim() })),
          }
        : { id: it.id, label: it.label.trim() },
    );

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const valuesWord = (n: number) => `${n.toLocaleString()} ${n === 1 ? "value" : "values"}`;

/** What blocks saving: a missing or taken name, and two values with the same
 *  label at one level (Uwazi's server rule, compared folded). The same label
 *  under two groups is allowed. */
function issuesOf(name: string, items: TreeItem[], otherNames: string[]): string[] {
  const out: string[] = [];
  const n = clean(name);
  if (!n) out.push("Name is required");
  else if (otherNames.some((o) => fold(clean(o)) === fold(n))) out.push(`A thesaurus named “${n}” already exists`);
  const dupes = (list: TreeItem[], where: string) => {
    const seen = new Set<string>();
    for (const it of list) {
      const k = fold(clean(it.label));
      if (!k) continue;
      if (seen.has(k)) out.push(`“${clean(it.label)}” appears twice ${where}`);
      seen.add(k);
    }
  };
  dupes(items, "at the top level");
  for (const g of items) if (g.children) dupes(g.children, `in ${clean(g.label) || "a group"}`);
  return out;
}

/** Thesaurus detail editor (UX6): the values as a tree, not a form.
 *
 *  - Values read as text; a click renames in place (Enter keeps, Escape
 *    reverts). Enter on a new value starts the next one below it.
 *  - Add value and Add group insert at the cursor (after the row last
 *    focused, or first inside a focused group), not at the bottom.
 *  - Groups collapse; search filters values and keeps their groups open; an
 *    A–Z strip jumps to a letter. Long lists (Travesía's 2,443 municipios)
 *    are windowed.
 *  - Reorder by drag, by arrow keys on the grip, or Move up / Move down,
 *    within one list. "Move to group" moves values between groups.
 *  - Tick rows for Move to group and Remove. A removal gets an Undo in the
 *    Beacon, by id, and says how many entities hold the values. */
export function ThesaurusEditor({
  thesaurus,
  onClose,
}: {
  thesaurus: SettingsThesaurus | "new";
  onClose: () => void;
}) {
  const corpus = useAtomValue(dataSourceAtom);
  const all = useAtomValue(thesauriAtom(corpus));
  // An id the collection does not have (deleted, or a stale link) is a
  // not-found state with the way back, never an empty "new" editor.
  if (thesaurus !== "new" && !all.some((t) => t.id === thesaurus.id))
    return (
      <SettingsEditor component="ThesaurusEditor" path={["Thesauri"]} title="Thesaurus not found" onBack={onClose} dirty={false} onSave={() => {}}>
        <SettingsEmptyState
          title="Thesaurus not found"
          hint="It may have been deleted, or the link is out of date."
          action={{ label: "Back to Thesauri", onClick: onClose }}
        />
      </SettingsEditor>
    );
  return <ThesaurusEditorBody thesaurus={thesaurus} onClose={onClose} />;
}

function ThesaurusEditorBody({
  thesaurus,
  onClose,
}: {
  thesaurus: SettingsThesaurus | "new";
  onClose: () => void;
}) {
  const store = useStore();
  const { record } = useSettingsNotify();
  const corpus = useAtomValue(dataSourceAtom);
  const saveThesaurus = useSetAtom(saveThesaurusAtom);
  const isNew = thesaurus === "new";
  const base = isNew ? undefined : thesaurus;

  // The values come from the shared store, so a value the edit form added is
  // here too. Ids are kept, so a save writes the same values back.
  const all = useAtomValue(thesauriAtom(corpus));
  const stored = all.find((t) => t.id === base?.id);
  const otherNames = all.filter((t) => t.id !== base?.id).map((t) => t.name);
  const seedItems = (): TreeItem[] =>
    (stored?.values ?? []).map((v) => ({
      id: v.id,
      label: v.label,
      ...(v.values ? { children: v.values.map((c) => ({ id: c.id, label: c.label })) } : {}),
    }));

  const { draft, setField, dirty } = useSettingsDraft({
    id: `thesaurus:${base?.id ?? "new"}`,
    label: "Thesaurus edits",
    saved: { name: base?.name ?? "", items: seedItems() },
  });
  const { name, items } = draft;
  const setName = setField("name");
  const setItems = setField("items");

  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cursorId, setCursorId] = useState<string | null>(null);
  // Rows added in this session and not yet given a label: Escape or a blank
  // commit takes them away again without an Undo.
  const fresh = useRef(new Set<string>());
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [moving, setMoving] = useState<string[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const notify = useNotify();

  /** The values as Uwazi's CSV, in the default language's column. */
  const exportCsv = () => {
    const lang = seedLanguages.find((l) => l.default)?.label ?? "English";
    const blob = new Blob([toThesaurusCsv(items, lang)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clean(name) || "thesaurus"}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const rows = useMemo(
    () => flatten(items, { collapsed, query, keep: editingId }),
    [items, collapsed, query, editingId],
  );
  const groups = items.filter(isGroup);
  const total = countTree(items);
  const win = useWindowedRows(rows.length, ROW_REM);
  const listRef = useRef<HTMLUListElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const barHeight = () => barRef.current?.offsetHeight ?? 0;

  // A row put into edit mode off-screen (Add at a cursor far down, a jump)
  // is scrolled to so it mounts and takes focus.
  useEffect(() => {
    if (!editingId || !win.windowed) return;
    const i = rows.findIndex((r) => r.kind !== "empty" && r.item.id === editingId);
    if (i >= 0 && (i < win.start || i >= win.end - 2)) win.scrollToIndex(Math.max(0, i - 4), barHeight());
  }, [editingId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Removal, with an Undo by id ─────────────────────────────────────── */
  const offerUndo = useSettingsUndo<{ removed: Removed[] }>(({ removed }) =>
    setItems((prev) => restore(prev, removed)),
  );
  const remove = (ids: ReadonlySet<string>) => {
    const { items: next, removed } = removeIds(items, ids);
    if (!removed.length) return;
    setItems(next);
    setTicked((prev) => new Set([...prev].filter((id) => !ids.has(id) && findItem(next, id))));
    const kept = removed.filter((r) => clean(r.item.label) || r.item.children?.length);
    if (!kept.length) return;
    const usage = base ? store.get(valueUsageAtom(base.id)) : null;
    let held: number | null = 0;
    for (const r of kept) {
      const v: ThesaurusValue = {
        id: r.item.id,
        label: r.item.label,
        ...(r.item.children ? { values: r.item.children.map((c) => ({ id: c.id, label: c.label })) } : {}),
      };
      const n = usage ? usage(v) : 0;
      held = held === null || n === null ? null : held + n;
    }
    const what = kept.length === 1 ? clean(kept[0].item.label) : valuesWord(kept.length);
    offerUndo(
      { removed },
      `${what} removed`,
      `${held === null ? "Entity counts appear when the collection's records have loaded. " : held ? `${held.toLocaleString()} ${held === 1 ? "entity holds" : "entities hold"} ${kept.length === 1 && !kept[0].item.children ? "this value" : "these values"}. ` : ""}Nothing is saved until you save the thesaurus.`,
    );
  };

  /* ── Adding at the cursor ────────────────────────────────────────────── */
  const startNew = (item: TreeItem, parentId: string | null, afterId: string | null) => {
    fresh.current.add(item.id);
    // The anchor may be a blank new row that its own blur is removing in this
    // same event: then the new row takes its place.
    const fallback = afterId ? placeOf(items, afterId)?.index : undefined;
    setItems((prev) => insertAfter(prev, parentId, afterId, item, fallback));
    if (parentId) setCollapsed((prev) => (prev.has(parentId) ? new Set([...prev].filter((x) => x !== parentId)) : prev));
    setEditingId(item.id);
    setCursorId(item.id);
  };
  const addValue = (at: string | null = cursorId) => {
    const target = at ? findItem(items, at) : undefined;
    if (target && isGroup(target)) return startNew({ id: newId(), label: "" }, target.id, null);
    if (target) return startNew({ id: newId(), label: "" }, placeOf(items, target.id)!.parentId, target.id);
    startNew({ id: newId(), label: "" }, null, null);
  };
  const addGroup = () => {
    const target = cursorId ? placeOf(items, cursorId) : null;
    const rootAnchor = target ? (target.parentId ?? cursorId) : null;
    startNew({ id: newId(), label: "", children: [] }, null, rootAnchor);
  };

  /* ── Renaming in place ───────────────────────────────────────────────── */
  const commit = (id: string, text: string, next: "stay" | "continue") => {
    const label = clean(text);
    const isFresh = fresh.current.has(id);
    setEditingId(null);
    if (!label) {
      // A new row left blank goes away; an existing one keeps its label
      // (removing is its own action, with an Undo).
      if (isFresh) {
        fresh.current.delete(id);
        setItems((prev) => removeIds(prev, new Set([id])).items);
        setCursorId(null);
      }
      return;
    }
    fresh.current.delete(id);
    setItems((prev) => patchLabel(prev, id, label));
    if (next === "continue" && isFresh) {
      const item = findItem(items, id);
      if (item && !isGroup(item)) addValue(id);
      else if (item) startNew({ id: newId(), label: "" }, id, null);
    }
  };
  const cancel = (id: string) => {
    setEditingId(null);
    if (fresh.current.has(id)) {
      fresh.current.delete(id);
      setItems((prev) => removeIds(prev, new Set([id])).items);
      setCursorId(null);
    }
  };

  /* ── Drag within one list ────────────────────────────────────────────── */
  const dragOver = (row: TreeRow) => {
    if (!dragId || row.kind === "empty" || row.item.id === dragId) return;
    const from = placeOf(items, dragId);
    const to = placeOf(items, row.item.id);
    if (!from || !to || from.parentId !== to.parentId) return;
    setItems((prev) => moveWithin(prev, dragId, to.index));
  };

  /* ── A–Z ─────────────────────────────────────────────────────────────── */
  const present = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) if (r.kind !== "empty" && clean(r.item.label)) s.add(initialOf(r.item.label));
    return s;
  }, [rows]);
  const jump = (letter: string) => {
    const i = rows.findIndex((r) => r.kind !== "empty" && clean(r.item.label) && initialOf(r.item.label) === letter);
    if (i < 0) return;
    win.scrollToIndex(i, barHeight());
    const id = (rows[i] as Exclude<TreeRow, { kind: "empty" }>).item.id;
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        listRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(id)}"] [data-part=label]`)?.focus(),
      ),
    );
  };

  /* ── Selection ───────────────────────────────────────────────────────── */
  const shownIds = rows.flatMap((r) => (r.kind === "empty" ? [] : [r.item.id]));
  const shownTicked = shownIds.filter((id) => ticked.has(id)).length;
  const allShown = shownIds.length > 0 && shownTicked === shownIds.length;
  const toggle = (id: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAllShown = () =>
    setTicked((prev) => {
      const next = new Set(prev);
      for (const id of shownIds) (allShown ? next.delete(id) : next.add(id));
      return next;
    });

  const save = () => {
    const finalName = clean(name);
    const id = saveThesaurus({ corpus, id: base?.id ?? null, name: finalName, values: toValues(items) });
    record({
      method: isNew ? "CREATE" : "UPDATE",
      domain: "thesaurus",
      noun: "thesaurus",
      id,
      name: finalName,
    });
    onClose();
  };

  const moveReadback = (target: string) => {
    if (!moving) return null;
    const gid = target === ROOT ? null : target;
    const r = moveToGroup(items, new Set(moving), gid);
    const into = gid ? `into ${clean(findItem(items, gid)?.label ?? "") || "the group"}` : "to the top level";
    const parts = [
      r.moved.length ? `Moves ${valuesWord(r.moved.length)} ${into}.` : `Nothing moves: ${moving.length === 1 ? "it is" : "they are"} already there.`,
      r.skipped.length ? `${r.skipped.length === 1 ? "1 group stays" : `${r.skipped.length} groups stay`} where ${r.skipped.length === 1 ? "it is" : "they are"}: groups don't nest.` : "",
    ];
    return { text: parts.filter(Boolean).join(" "), none: r.moved.length === 0 };
  };

  const issues = issuesOf(name, items, otherNames);

  return (
    <SettingsEditor
      component="ThesaurusEditor"
      path={["Thesauri"]}
      title={isNew ? "New thesaurus" : base!.name}
      onBack={onClose}
      isNew={isNew}
      createLabel="Create thesaurus"
      dirty={dirty}
      issues={issues}
      onSave={save}
      footerStart={
        <>
          {/* Icon-only on phones, where the footer also holds Cancel and Save. */}
          <SettingsButton variant="ghost" size="sm" aria-label="Import CSV" className="whitespace-nowrap" icon={<Upload size={14} aria-hidden />} onClick={() => setImporting(true)}>
            <span className="hidden sm:inline">Import CSV</span>
          </SettingsButton>
          <SettingsButton variant="ghost" size="sm" aria-label="Export CSV" className="whitespace-nowrap" icon={<Download size={14} aria-hidden />} onClick={exportCsv} disabled={total === 0}>
            <span className="hidden sm:inline">Export CSV</span>
          </SettingsButton>
          <LastSavedLine domain="thesaurus" id={base?.id} className="hidden md:inline" />
        </>
      }
      selection={{
        count: ticked.size,
        total,
        onClear: () => setTicked(new Set()),
        actions: [
          {
            id: "move",
            label: "Move to group",
            icon: <FolderInput size={13} />,
            onClick: () => setMoving([...ticked]),
            disabledReason: groups.length ? undefined : "This thesaurus has no groups yet",
          },
          { id: "remove", label: "Remove", icon: <Trash2 size={13} />, onClick: () => remove(new Set(ticked)), danger: true },
        ],
      }}
      overlays={
        <>
        {importing && (
          <ThesaurusImportModal
            items={items}
            newId={newId}
            onClose={() => setImporting(false)}
            onApply={(plan, file) => {
              setItems(plan.items);
              setImporting(false);
              notify(
                `${(plan.added + plan.groupsAdded).toLocaleString()} rows added from ${file}. Save the thesaurus to keep them.`,
                "success",
              );
            }}
          />
        )}
        {moving && (
          <BulkPickModal
            title="Move to group"
            subtitle={moving.length === 1 ? clean(findItem(items, moving[0])?.label ?? "") : valuesWord(moving.length)}
            confirmLabel="Move"
            options={[
              { value: ROOT, label: "No group (top level)" },
              ...groups.map((g) => ({ value: g.id, label: clean(g.label) || "Untitled group", meta: valuesWord(g.children!.length) })),
            ]}
            readback={moveReadback}
            onClose={() => setMoving(null)}
            onConfirm={(target) => {
              const gid = target === ROOT ? null : target;
              const r = moveToGroup(items, new Set(moving), gid);
              setItems(r.items);
              if (gid) setCollapsed((prev) => new Set([...prev].filter((x) => x !== gid)));
              setTicked((prev) => new Set([...prev].filter((id) => !r.moved.includes(id))));
              setMoving(null);
            }}
          />
        )}
        </>
      }
    >
      <SettingsSection>
        <div className="max-w-sm">
          <SettingsField label="Thesaurus name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Violation types" />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection
        title={
          <>
            Values <span className="text-ink-tertiary font-normal tabular-nums">({total.toLocaleString()})</span>
          </>
        }
        action={
          <>
            <SettingsButton variant="ghost" size="sm" icon={<ArrowDownAZ size={14} aria-hidden />} onClick={() => setItems(sortAZ)} disabled={total < 2}>
              Sort A–Z
            </SettingsButton>
            <SettingsButton variant="secondary" size="sm" icon={<FolderPlus size={14} aria-hidden />} onClick={addGroup}>
              Add group
            </SettingsButton>
            <SettingsButton variant="secondary" size="sm" icon={<Plus size={14} aria-hidden />} onClick={() => addValue()}>
              Add value
            </SettingsButton>
          </>
        }
      >
        {items.length === 0 ? (
          <div className="rounded-md py-8 border border-border-soft">
            <SettingsEmptyState
              title="No values yet"
              hint="Add the values a property using this thesaurus can take. Enter after each one starts the next."
              action={{ label: "Add value", onClick: () => addValue(null) }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Toolbar: select-all over the rows shown, search, collapse, and
                the A–Z strip. It sticks to the top of the page body, so a
                jump far down the list keeps both in reach. */}
            <div ref={barRef} className="sticky -top-4 z-[1] -mt-1 pt-1 pb-2 flex flex-col gap-2 bg-paper">
            <div role="search" className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-0.5">
                <Checkbox
                  checked={allShown}
                  indeterminate={shownTicked > 0 && !allShown}
                  onChange={toggleAllShown}
                  disabled={shownIds.length === 0}
                  ariaLabel={query ? "Select all matching" : "Select all"}
                />
              </span>
              <div className="flex flex-1 min-w-[12rem]">
                <ModalSearchField value={query} onChange={setQuery} ariaLabel="Search values" placeholder="Search values…" />
              </div>
              <span role="status" className="w-24 shrink-0 text-meta text-ink-tertiary tabular-nums truncate">
                {query.trim() ? `${rows.filter((r) => r.kind === "value").length.toLocaleString()} found` : ""}
              </span>
              {groups.length > 0 && (
                <span className="flex items-center gap-1 ms-auto">
                  <SettingsButton variant="ghost" size="sm" disabled={collapsed.size === groups.length} onClick={() => setCollapsed(new Set(groups.map((g) => g.id)))}>
                    Collapse all
                  </SettingsButton>
                  <SettingsButton variant="ghost" size="sm" disabled={collapsed.size === 0} onClick={() => setCollapsed(new Set())}>
                    Expand all
                  </SettingsButton>
                </span>
              )}
            </div>
            <AlphaJump present={present} onJump={jump} />
            </div>

            <div ref={win.ref} className="relative" style={{ height: `${Math.max(rows.length, 1) * ROW_REM}rem` }}>
              {rows.length === 0 ? (
                <p className="py-6 text-center text-xs text-ink-tertiary">
                  No value matches “{query.trim()}”.{" "}
                  <button type="button" onClick={() => setQuery("")} className="text-ink underline underline-offset-2 hover:text-ink-secondary cursor-pointer">
                    Clear search
                  </button>
                </p>
              ) : (
                <ul ref={listRef} aria-label="Values" className="absolute inset-0">
                  {rows.slice(win.start, win.end).map((row, k) => {
                    const i = win.start + k;
                    const top = `${i * ROW_REM}rem`;
                    if (row.kind === "empty")
                      return (
                        <li key={`empty-${row.parentId}`} style={{ top }} className="absolute inset-x-0 h-9 flex items-center ps-14 text-xs text-ink-tertiary border-b border-border-soft">
                          No values in this group.
                          <button type="button" onClick={() => addValue(row.parentId)} className="ms-1.5 text-ink underline underline-offset-2 hover:text-ink-secondary cursor-pointer">
                            Add value
                          </button>
                        </li>
                      );
                    return (
                      <TreeRowView
                        key={row.item.id}
                        row={row}
                        top={top}
                        query={query}
                        editing={editingId === row.item.id}
                        ticked={ticked.has(row.item.id)}
                        dragging={dragId === row.item.id}
                        hasGroups={groups.length > 0}
                        onToggle={() => toggle(row.item.id)}
                        onFocus={() => setCursorId(row.item.id)}
                        onEdit={() => {
                          setCursorId(row.item.id);
                          setEditingId(row.item.id);
                        }}
                        onCommit={(text, next) => commit(row.item.id, text, next)}
                        onCancel={() => cancel(row.item.id)}
                        onMove={(to) => setItems((prev) => moveWithin(prev, row.item.id, to))}
                        onExpand={() =>
                          setCollapsed((prev) => {
                            const next = new Set(prev);
                            if (next.has(row.item.id)) next.delete(row.item.id);
                            else next.add(row.item.id);
                            return next;
                          })
                        }
                        onAddInside={() => addValue(row.item.id)}
                        onMoveToGroup={() => setMoving([row.item.id])}
                        onRemove={() => remove(new Set([row.item.id]))}
                        drag={{
                          draggable: !query.trim(),
                          onDragStart: (e: DragEvent) => {
                            e.dataTransfer.effectAllowed = "move";
                            setDragId(row.item.id);
                          },
                          onDragEnd: () => setDragId(null),
                        }}
                        onDragEnter={() => dragOver(row)}
                      />
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </SettingsSection>
    </SettingsEditor>
  );
}

/** One value or group row, 2.25rem tall. */
function TreeRowView({
  row,
  top,
  query,
  editing,
  ticked,
  dragging,
  hasGroups,
  onToggle,
  onFocus,
  onEdit,
  onCommit,
  onCancel,
  onMove,
  onExpand,
  onAddInside,
  onMoveToGroup,
  onRemove,
  drag,
  onDragEnter,
}: {
  row: Exclude<TreeRow, { kind: "empty" }>;
  top: string;
  query: string;
  editing: boolean;
  ticked: boolean;
  dragging: boolean;
  hasGroups: boolean;
  onToggle: () => void;
  onFocus: () => void;
  onEdit: () => void;
  onCommit: (text: string, next: "stay" | "continue") => void;
  onCancel: () => void;
  onMove: (to: number) => void;
  onExpand: () => void;
  onAddInside: () => void;
  onMoveToGroup: () => void;
  onRemove: () => void;
  drag: { draggable: boolean; onDragStart: (e: DragEvent) => void; onDragEnd: () => void };
  onDragEnter: () => void;
}) {
  const { item } = row;
  const group = row.kind === "group";
  const child = row.kind === "value" && row.parentId !== null;
  const label = clean(item.label);
  const name = label || (group ? "Untitled group" : "Untitled value");
  return (
    <li
      data-row-id={item.id}
      onFocus={onFocus}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      style={{ top }}
      className={`group absolute inset-x-0 h-9 flex items-center gap-2 border-b border-border-soft transition-colors ${
        ticked ? "bg-parchment" : "hover:bg-warm focus-within:bg-warm"
      } ${dragging ? "opacity-40" : ""}`}
    >
      <span className="inline-flex px-0.5">
        <Checkbox checked={ticked} onChange={onToggle} ariaLabel={`Select ${name}`} />
      </span>
      <ReorderGrip label={name} index={row.index} count={row.count} onMove={onMove} {...drag} />
      {child && <span aria-hidden className="w-5 shrink-0" />}
      {group && (
        <button
          type="button"
          onClick={onExpand}
          aria-expanded={row.open}
          aria-label={`${row.open ? "Collapse" : "Expand"} ${name}`}
          className="shrink-0 p-0.5 -mx-0.5 rounded-sm text-ink-tertiary hover:text-ink hover:bg-warm cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/50"
        >
          <ChevronRight size={14} aria-hidden className={`transition-transform ${row.open ? "rotate-90" : ""}`} />
        </button>
      )}
      {editing ? (
        <LabelInput
          initial={item.label}
          group={group}
          ariaLabel={group ? "Group name" : "Value"}
          onCommit={onCommit}
          onCancel={onCancel}
        />
      ) : (
        <button
          type="button"
          data-part="label"
          onClick={onEdit}
          aria-label={`${name}, rename`}
          className={`flex-1 min-w-0 h-7 px-1 -mx-1 rounded-sm text-start text-sm truncate cursor-text hover:bg-paper/60
            focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/50 ${
              group ? "font-semibold text-ink" : "text-ink"
            } ${label ? "" : "text-ink-muted italic"}`}
        >
          {label ? <HighlightedText text={label} query={query} /> : name}
        </button>
      )}
      {group && !editing && (
        <span className="shrink-0 text-meta text-ink-tertiary tabular-nums">{valuesWord(row.childCount)}</span>
      )}
      <RowActions label={name} onDelete={onRemove} deleteLabel="Remove">
        <MoveButtons label={name} index={row.index} count={row.count} onMove={onMove} />
        {group ? (
          <RowActionButton label={`Add value to ${name}`} icon={<Plus size={14} aria-hidden />} onClick={onAddInside} />
        ) : (
          hasGroups && (
            <RowActionButton label={`Move ${name} to group`} icon={<FolderInput size={14} aria-hidden />} onClick={onMoveToGroup} />
          )
        )}
      </RowActions>
    </li>
  );
}

/** The in-place rename: Enter keeps (and, on a new value, starts the next),
 *  Escape reverts, leaving keeps. Its text is local until then, so typing
 *  re-renders one row, not the tree. */
function LabelInput({
  initial,
  group,
  ariaLabel,
  onCommit,
  onCancel,
}: {
  initial: string;
  group: boolean;
  ariaLabel: string;
  onCommit: (text: string, next: "stay" | "continue") => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  const done = useRef(false);
  const finish = (fn: () => void) => {
    if (done.current) return;
    done.current = true;
    fn();
  };
  return (
    <input
      autoFocus
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          finish(() => onCommit(text, "continue"));
        } else if (e.key === "Escape") {
          // The editor's own Escape; nothing above should close.
          e.preventDefault();
          e.stopPropagation();
          finish(onCancel);
        }
      }}
      onBlur={() => finish(() => onCommit(text, "stay"))}
      placeholder={group ? "Group name" : "Value"}
      aria-label={ariaLabel}
      className={`flex-1 min-w-0 h-7 px-1 -mx-1 rounded-sm bg-paper text-sm text-ink placeholder:text-ink-muted
        focus:outline-none ring-1 ring-carbon/40 ${group ? "font-semibold" : ""}`}
    />
  );
}
