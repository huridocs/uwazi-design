import { Plus } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { RowActions } from "../RowActions";
import { SettingsField, TextInput } from "../SettingsField";
import { DragGrip } from "../DragGrip";
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
    record({
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
    <SettingsContent component="MenuLinkEditor">
      <SettingsContent.Header path={["Menu"]} title={isNew ? "New menu item" : base!.title} onBack={onClose} />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6 max-w-lg">
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

          {type === "group" && (
            <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold text-ink">Sub-links</h3>
                <SettingsButton variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addSubLink}>
                  Add sub-link
                </SettingsButton>
              </div>

              <ul data-part="sub-links" className="flex flex-col rounded-md overflow-hidden" style={{ border: "1px solid var(--border-soft)" }}>
                {subLinks.length === 0 ? (
                  <li className="px-3 py-6 text-sm text-ink-muted text-center">No sub-links yet.</li>
                ) : (
                  subLinks.map((s, i) => (
                    <li
                      key={s.id}
                      {...rowProps(i)}
                      data-part="sub-link"
                      className={`grid items-end gap-3 px-3 py-2.5 transition-opacity ${dragIdx === i ? "opacity-40" : ""}`}
                      style={{ gridTemplateColumns: "1.25rem 1fr 1fr 2.5rem", borderTop: "1px solid var(--border-soft)" }}
                    >
                      <div className="flex justify-center pb-2.5">
                        <DragGrip {...gripProps(i)} />
                      </div>
                      <SettingsField label="Title">
                        <TextInput value={s.title} onChange={(e) => patchSubLink(s.id, { title: e.target.value })} placeholder="e.g. Methodology" />
                      </SettingsField>
                      <SettingsField label="URL">
                        <TextInput value={s.url} onChange={(e) => patchSubLink(s.id, { url: e.target.value })} placeholder="/page/methodology" />
                      </SettingsField>
                      <div className="flex justify-end pb-1.5">
                        <RowActions label={s.title || "sub-link"} onDelete={() => deleteSubLink(s.id)} />
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          )}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <LastSavedLine domain="menu" id={base?.id} className="me-auto" />
        <SettingsButton variant="ghost" size="sm" onClick={onClose}>Cancel</SettingsButton>
        <SettingsButton variant={isNew ? "commit" : "success"} size="sm" disabled={!dirty || !title.trim()} onClick={save}>
          {isNew ? "Add item" : "Save"}
        </SettingsButton>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
