import { useState, type DragEvent, type KeyboardEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ChevronDown, ChevronUp, CloudOff, Folder, GripVertical, Link2, Menu, Pencil, Plus, Trash2 } from "lucide-react";
import { SettingsContent, useSettingsAnnounce } from "../SettingsContent";
import { SettingsIntro } from "../SettingsListPage";
import { SettingsButton } from "../SettingsButton";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsSelectionBar } from "../SettingsSelectionBar";
import { SettingsTable, type Column } from "../SettingsTable";
import { RowActionButton } from "../RowActions";
import { MenuItemPanel, type MenuPanelTarget } from "./MenuLinkEditor";
import { menuSettings } from "../../../atoms/siteMenu";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { newSettingsId, SETTINGS_STORAGE_VERSION } from "../../../atoms/settingsCollection";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { useSettingsUndo } from "../../../hooks/useSettingsUndo";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";
import { LastSavedLine } from "../../shared/LastSavedLine";
import {
  canMoveMenuStep,
  dropMenuItem,
  flattenMenu,
  menuRemoval,
  moveMenuStep,
  placeMenuLink,
  removeMenuItems,
  restoreMenuRemoval,
  type MenuRemoval,
  type MenuRow,
  type MenuTree,
} from "../../../utils/menuTree";

/** Whether the stored menu for a corpus is unreadable. The store falls back to
 *  the seed on bad data, which would show a full menu that is not what was
 *  saved; the page says so instead (MEN-19). */
function storedMenuProblem(corpus: string): string | null {
  try {
    const raw = sessionStorage.getItem(`uwazi:settings:v${SETTINGS_STORAGE_VERSION}:menu:${corpus}`);
    if (raw === null) return null;
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return "The saved menu is not in a form this page can read.";
    if ("links" in v && !Array.isArray(v.links)) return "The saved menu's links are not a list.";
    return null;
  } catch {
    return "The saved menu could not be read.";
  }
}

const rowTitle = (r: MenuRow) => (r.kind === "top" ? r.item.title : r.sub.title);
const rowUrl = (r: MenuRow) => (r.kind === "top" ? r.item.url : r.sub.url);

/** Settings › Menu: the navbar's links and groups, edited as one tree and
 *  saved with one Save (G11, as Uwazi). Add, edit, delete and reorder change
 *  the draft only; the navbar reads the saved tree. */
export function MenuPage() {
  const corpus = useAtomValue(dataSourceAtom);
  const [problem, setProblem] = useState(() => storedMenuProblem(corpus));
  if (problem)
    return (
      <SettingsContent component="MenuPage">
        <SettingsContent.Header title="Menu" />
        <SettingsContent.Body>
          <div role="alert" className="py-10">
            <SettingsEmptyState icon={<CloudOff size={16} />} title="The menu didn't load" hint={problem} />
            <div className="flex justify-center mt-2">
              <SettingsButton variant="secondary" size="sm" onClick={() => setProblem(storedMenuProblem(corpus))}>
                Retry
              </SettingsButton>
            </div>
          </div>
        </SettingsContent.Body>
      </SettingsContent>
    );
  return <MenuTreeEditor key={corpus} />;
}

function MenuTreeEditor() {
  const { record, fail } = useSettingsNotify();
  const stored = useAtomValue(menuSettings.valueAtom).links;
  const save = useSetAtom(menuSettings.saveAtom);
  const announce = useSettingsAnnounce();
  const { draft: tree, setDraft: setTree, dirty, markSaved } = useSettingsDraft<MenuTree>({
    id: "menu",
    label: "Menu edits",
    saved: stored,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [panel, setPanel] = useState<MenuPanelTarget | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const rows = flattenMenu(tree);
  const groups = tree.filter((i) => i.type === "group");

  const undo = useSettingsUndo<MenuRemoval>((r) => setTree((t) => restoreMenuRemoval(t, r)));

  const step = (r: MenuRow, dir: -1 | 1) => {
    const next = moveMenuStep(tree, r.id, dir);
    if (next === tree) return;
    setTree(next);
    const flat = flattenMenu(next);
    const pos = flat.findIndex((x) => x.id === r.id);
    const where = flat[pos]?.kind === "sub" ? ` in ${(flat[pos] as Extract<MenuRow, { kind: "sub" }>).parent.title}` : "";
    announce(`${rowTitle(r)} moved to position ${pos + 1} of ${flat.length}${where}`);
  };

  const onSelect = (next: Set<string>) => {
    // A ticked group takes its links; unticking it releases them.
    for (const g of groups) {
      const was = selected.has(g.id);
      const now = next.has(g.id);
      if (now && !was) g.sublinks.forEach((s) => next.add(s.id));
      if (!now && was) g.sublinks.forEach((s) => next.delete(s.id));
    }
    setSelected(next);
  };

  const deleteSelected = () => {
    const removal = menuRemoval(tree, selected);
    const names = [...removal.top.map((t) => t.item.title), ...removal.subs.map((s) => s.sub.title)];
    setTree((t) => removeMenuItems(t, selected));
    setSelected(new Set());
    record({
      log: false,
      method: "DELETE",
      domain: "menu",
      noun: "menu item",
      name: names[0] ?? "Menu item",
      message: names.length === 1 ? `Deleted ${names[0]}` : `Deleted ${names.length} menu items`,
      detail: "Nothing is saved until you save the menu.",
      action: undo.prepare(removal),
    });
  };

  const commit = () => {
    const value = tree;
    try {
      save({ value: { links: value } });
    } catch (e) {
      // The draft stays as it is, still unsaved.
      fail("An error occurred", e instanceof Error ? e.message : String(e));
      return;
    }
    // Translations' Menu context reads this store and keys each link by id,
    // so a rename keeps its translations and a removed link's key goes.
    markSaved(value);
    undo.end();
    record({ method: "UPDATE", domain: "menu", noun: "menu", id: "menu", name: "Menu", summary: "Updated menu", message: "Updated" });
  };

  const applyPanel = (value: { title: string; url: string; groupId: string | null }) => {
    if (!panel) return;
    if (panel.type === "group") {
      if (panel.id) setTree((t) => t.map((i) => (i.id === panel.id ? { ...i, title: value.title } : i)));
      else setTree((t) => [...t, { id: newSettingsId("m"), title: value.title, url: "", type: "group", sublinks: [] }]);
    } else {
      const id = panel.id ?? newSettingsId("m");
      setTree((t) => placeMenuLink(t, { id, title: value.title, url: value.url }, value.groupId));
    }
    setPanel(null);
  };

  const onDrop = (target: string) => {
    if (drag) setTree((t) => dropMenuItem(t, drag, target));
    setDrag(null);
    setOver(null);
  };
  const dropAllowed = (target: MenuRow) => {
    if (!drag || drag === target.id) return false;
    const d = rows.find((r) => r.id === drag);
    return !(d?.kind === "top" && d.item.type === "group" && target.kind === "sub");
  };

  const columns: Column<MenuRow>[] = [
    {
      id: "title",
      header: "Label",
      cell: (r) => {
        const group = r.kind === "top" && r.item.type === "group";
        return (
          <div className={`flex items-center gap-2 min-w-0 ${r.kind === "sub" ? "ps-6" : ""}`}>
            <TreeGrip
              title={rowTitle(r)}
              onStep={(dir) => step(r, dir)}
              onDragStart={() => setDrag(r.id)}
              onDragEnd={() => {
                setDrag(null);
                setOver(null);
              }}
            />
            {group ? (
              <Folder size={14} className="text-ink-muted shrink-0" aria-hidden />
            ) : (
              <Link2 size={14} className="text-ink-muted shrink-0" aria-hidden />
            )}
            <span className="font-medium text-ink truncate">{rowTitle(r)}</span>
            {group && r.kind === "top" && r.item.sublinks.length === 0 && (
              <span className="text-meta text-ink-tertiary whitespace-nowrap">No links · drop one here</span>
            )}
          </div>
        );
      },
    },
    {
      id: "url",
      header: "URL",
      cell: (r) =>
        r.kind === "top" && r.item.type === "group" ? (
          <span className="text-meta font-semibold text-ink-secondary bg-warm px-2 py-0.5 rounded-md w-fit">Group</span>
        ) : (
          <span dir="ltr" className="text-xs text-ink-tertiary truncate">
            {rowUrl(r)}
          </span>
        ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      width: "7.5rem",
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-0.5">
          <MoveButton title={rowTitle(r)} dir={-1} disabled={!canMoveMenuStep(tree, r.id, -1)} onMove={() => step(r, -1)} />
          <MoveButton title={rowTitle(r)} dir={1} disabled={!canMoveMenuStep(tree, r.id, 1)} onMove={() => step(r, 1)} />
          <RowActionButton
            part="edit"
            label={`Edit ${rowTitle(r)}`}
            icon={<Pencil size={14} aria-hidden />}
            onClick={() =>
              setPanel(
                r.kind === "top"
                  ? { type: r.item.type, id: r.item.id, title: r.item.title, url: r.item.url, groupId: null }
                  : { type: "link", id: r.sub.id, title: r.sub.title, url: r.sub.url, groupId: r.parent.id },
              )
            }
          />
        </div>
      ),
    },
  ];

  const selecting = selected.size > 0;
  return (
    <SettingsContent component="MenuPage">
      <SettingsContent.Header title="Menu" />
      <SettingsContent.Body>
        <SettingsIntro>
          The links in the collection's top navigation, in navbar order. A&nbsp;group opens to its links. Changes show
          in the navbar after Save.
        </SettingsIntro>
        <SettingsTable
          corpusScoped
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          selection={{ selected, onChange: onSelect, label: rowTitle }}
          rowProps={(r) => ({
            onDragOver: (e: DragEvent) => {
              if (!dropAllowed(r)) return;
              e.preventDefault();
              if (over !== r.id) setOver(r.id);
            },
            onDragLeave: () => over === r.id && setOver(null),
            onDrop: (e: DragEvent) => {
              e.preventDefault();
              if (dropAllowed(r)) onDrop(r.id);
            },
            className: `${drag === r.id ? "opacity-50" : ""} ${over === r.id ? "bg-parchment" : ""}`,
            "data-drop-target": over === r.id ? "" : undefined,
          } as React.HTMLAttributes<HTMLTableRowElement>)}
          emptyState={
            <SettingsEmptyState
              icon={<Menu size={16} />}
              title="No menu links yet"
              hint="Add the links readers see in the collection's top navigation."
              action={{ label: "Add link", onClick: () => setPanel({ type: "link", groupId: null }) }}
            />
          }
        />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        {selecting ? (
          <SettingsSelectionBar
            count={selected.size}
            total={rows.length}
            onClear={() => setSelected(new Set())}
            actions={[{ id: "delete", label: "Delete", icon: <Trash2 size={13} />, danger: true, onClick: deleteSelected }]}
          />
        ) : (
          <div className="me-auto flex items-center gap-1">
            <SettingsButton variant="lead" size="sm" icon={<Plus size={14} aria-hidden />} onClick={() => setPanel({ type: "link", groupId: null })}>
              Add link
            </SettingsButton>
            <SettingsButton variant="ghost" size="sm" icon={<Plus size={14} aria-hidden />} onClick={() => setPanel({ type: "group" })}>
              Add group
            </SettingsButton>
          </div>
        )}
        <LastSavedLine domain="menu" id="menu" className="hidden sm:inline" />
        <SettingsButton variant="commit" size="sm" disabled={!dirty} onClick={commit}>
          Save
        </SettingsButton>
      </SettingsContent.Footer>
      {panel && <MenuItemPanel target={panel} groups={groups} onApply={applyPanel} onClose={() => setPanel(null)} />}
    </SettingsContent>
  );
}

/** The row's drag handle, also a button: ArrowUp and ArrowDown move the row
 *  one step through the tree (into and out of groups), focus stays on it. */
function TreeGrip({
  title,
  onStep,
  onDragStart,
  onDragEnd,
}: {
  title: string;
  onStep: (dir: -1 | 1) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    e.stopPropagation();
    onStep(e.key === "ArrowUp" ? -1 : 1);
  };
  return (
    <button
      type="button"
      data-component="ReorderGrip"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", title);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onKeyDown={onKeyDown}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Reorder ${title}. Arrow keys move it.`}
      className="shrink-0 p-0.5 -m-0.5 rounded-sm cursor-grab active:cursor-grabbing text-ink-muted hover:text-ink-secondary focus:outline-none focus-visible:ring-1 focus-visible:ring-carbon/50"
    >
      <GripVertical size={14} aria-hidden />
    </button>
  );
}

function MoveButton({ title, dir, disabled, onMove }: { title: string; dir: -1 | 1; disabled: boolean; onMove: () => void }) {
  const Icon = dir === -1 ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`Move ${title} ${dir === -1 ? "up" : "down"}`}
      onClick={(e) => {
        e.stopPropagation();
        onMove();
      }}
      className="p-1.5 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent"
    >
      <Icon size={14} aria-hidden />
    </button>
  );
}
