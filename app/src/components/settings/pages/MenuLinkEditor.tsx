import { Plus } from "lucide-react";
import { SettingsButton } from "../SettingsButton";
import { SettingsEditor } from "../SettingsEditor";
import { SettingsSection } from "../SettingsSection";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { RowActions } from "../RowActions";
import { SettingsField, TextInput } from "../SettingsField";
import { MoveButtons, ReorderGrip, moveTo } from "../ReorderControls";
import { useReorder } from "../../../hooks/useReorder";
import { newSettingsId } from "../../../atoms/settingsCollection";
import { SegmentedControl } from "../../shared/SegmentedControl";
import { type SettingsMenuLink } from "../../../data/settings";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { useSettingsUndo } from "../../../hooks/useSettingsUndo";
import { LastSavedLine } from "../../shared/LastSavedLine";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";

/** A group's nested links. The shared SettingsMenuLink is flat, so the editable
 *  sub-link list lives locally. */
interface SubLink {
  id: string;
  title: string;
  url: string;
}

/** A representative starter list for a group, so the editor isn't empty. */
const SAMPLE_SUBLINKS: SubLink[] = [
  { id: "s1", title: "Methodology", url: "/page/methodology" },
  { id: "s2", title: "Partners", url: "/page/partners" },
];

/** Menu-link detail/editor — opened from the Menu list (list → detail). A link
 *  points at a URL; a group nests links under a dropdown (no URL of its own). */
export function MenuLinkEditor({
  link,
  onClose,
  onSave,
}: {
  link: SettingsMenuLink | "new";
  onClose: () => void;
  /** Write the item to the menu list; returns its id. */
  onSave: (value: Omit<SettingsMenuLink, "id">) => string;
}) {
  const { record } = useSettingsNotify();
  const isNew = link === "new";
  const base = isNew ? undefined : link;

  const { draft, setField, dirty } = useSettingsDraft({
    id: `menu-link:${base?.id ?? "new"}`,
    label: "Menu item edits",
    saved: {
      type: (base?.type ?? "link") as "link" | "group",
      title: base?.title ?? "",
      url: base?.url ?? "",
      subLinks: !isNew && base?.type === "group" ? SAMPLE_SUBLINKS : ([] as SubLink[]),
    },
  });
  const { type, title, url, subLinks } = draft;
  const setType = setField("type");
  const setTitle = setField("title");
  const setUrl = setField("url");
  const setSubLinks = setField("subLinks");

  const patchSubLink = (id: string, patch: Partial<SubLink>) =>
    setSubLinks((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const addSubLink = () =>
    setSubLinks((prev) => [...prev, { id: newSettingsId("ns"), title: "", url: "" }]);

  /** A removed sub-link gets an Undo in the Beacon (UX5); the removal stays
   *  in the draft until Save. */
  const offerUndo = useSettingsUndo<{ link: SubLink; index: number }>(({ link: l, index }) =>
    setSubLinks((prev) => (prev.some((s) => s.id === l.id) ? prev : [...prev.slice(0, index), l, ...prev.slice(index)])),
  );
  const deleteSubLink = (id: string) => {
    const index = subLinks.findIndex((s) => s.id === id);
    if (index < 0) return;
    const removed = subLinks[index];
    setSubLinks((prev) => prev.filter((s) => s.id !== id));
    if (removed.title.trim() || removed.url.trim())
      offerUndo({ link: removed, index }, `${removed.title || "Sub-link"} removed`, "Nothing is saved until you save the menu item.");
  };
  const { dragIdx, rowProps, gripProps } = useReorder(setSubLinks);

  const save = () => {
    const id = onSave({ type, title: title.trim(), url: type === "group" ? "" : url.trim() });
    record({ log: false, 
      method: isNew ? "CREATE" : "UPDATE",
      domain: "menu",
      noun: "menu item",
      id,
      name: title.trim(),
      message: isNew ? "Menu item added" : undefined,
    });
    onClose();
  };

  return (
    <SettingsEditor
      component="MenuLinkEditor"
      path={["Menu"]}
      title={isNew ? "New menu item" : base!.title}
      onBack={onClose}
      isNew={isNew}
      createLabel="Add item"
      dirty={dirty}
      valid={!!title.trim()}
      onSave={save}
      footerStart={<LastSavedLine domain="menu" id={base?.id} />}
    >
      <SettingsSection>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-secondary">Type</span>
          <SegmentedControl
            ariaLabel="Item type"
            value={type}
            onChange={(v) => setType(v as "link" | "group")}
            options={[
              { id: "link", label: "Link" },
              { id: "group", label: "Group" },
            ]}
          />
          <span className="text-xs text-ink-tertiary">
            {type === "link" ? "Points at a URL." : "Nests links in a dropdown."}
          </span>
        </div>

        <SettingsField label="Label">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. About" />
        </SettingsField>

        {type === "link" && (
          <SettingsField label="URL" hint="An internal path (/page/about) or a full URL.">
            <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/page/about" />
          </SettingsField>
        )}
      </SettingsSection>

      {type === "group" && (
        <SettingsSection
          title="Sub-links"
          action={
            <SettingsButton variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addSubLink}>
              Add sub-link
            </SettingsButton>
          }
        >
          <ul data-part="sub-links" className="flex flex-col rounded-md overflow-hidden border border-border-soft">
            {subLinks.length === 0 ? (
              <li className="px-3 py-8">
                <SettingsEmptyState title="No sub-links yet" hint="Each sub-link is one entry in this group's dropdown." />
              </li>
            ) : (
              subLinks.map((s, i) => (
                <li
                  key={s.id}
                  {...rowProps(i)}
                  data-part="sub-link"
                  className={`group grid items-end gap-3 px-3 py-2.5 border-t border-border-soft first:border-t-0 transition-opacity ${dragIdx === i ? "opacity-40" : ""}`}
                  style={{ gridTemplateColumns: "1.25rem 1fr 1fr auto" }}
                >
                  <div className="flex justify-center pb-2.5">
                    <ReorderGrip
                      {...gripProps(i)}
                      label={s.title || "sub-link"}
                      index={i}
                      count={subLinks.length}
                      onMove={(to) => setSubLinks((prev) => moveTo(prev, i, to))}
                    />
                  </div>
                  <SettingsField label="Title">
                    <TextInput value={s.title} onChange={(e) => patchSubLink(s.id, { title: e.target.value })} placeholder="e.g. Methodology" />
                  </SettingsField>
                  <SettingsField label="URL">
                    <TextInput value={s.url} onChange={(e) => patchSubLink(s.id, { url: e.target.value })} placeholder="/page/methodology" />
                  </SettingsField>
                  <div className="flex justify-end pb-1.5">
                    <RowActions label={s.title || "sub-link"} onDelete={() => deleteSubLink(s.id)}>
                      <MoveButtons
                        label={s.title || "sub-link"}
                        index={i}
                        count={subLinks.length}
                        onMove={(to) => setSubLinks((prev) => moveTo(prev, i, to))}
                      />
                    </RowActions>
                  </div>
                </li>
              ))
            )}
          </ul>
        </SettingsSection>
      )}
    </SettingsEditor>
  );
}
