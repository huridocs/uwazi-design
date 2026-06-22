import { useState } from "react";
import { useSetAtom } from "jotai";
import { Plus } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { RowActions } from "../RowActions";
import { Field, TextInput } from "../Field";
import { SegmentedControl } from "../../shared/SegmentedControl";
import { type SettingsMenuLink } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

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
}: {
  link: SettingsMenuLink | "new";
  onClose: () => void;
}) {
  const setToasts = useSetAtom(toastsAtom);
  const isNew = link === "new";
  const base = isNew ? undefined : link;

  const [type, setType] = useState<"link" | "group">(base?.type ?? "link");
  const [title, setTitle] = useState(base?.title ?? "");
  const [url, setUrl] = useState(base?.url ?? "");
  const [subLinks, setSubLinks] = useState<SubLink[]>(
    !isNew && base?.type === "group" ? SAMPLE_SUBLINKS : [],
  );

  const initialSubLinks = !isNew && base?.type === "group" ? SAMPLE_SUBLINKS : [];
  const dirty =
    type !== (base?.type ?? "link") ||
    title !== (base?.title ?? "") ||
    url !== (base?.url ?? "") ||
    JSON.stringify(subLinks) !== JSON.stringify(initialSubLinks);

  const patchSubLink = (id: string, patch: Partial<SubLink>) =>
    setSubLinks((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const addSubLink = () =>
    setSubLinks((prev) => [...prev, { id: `ns-${prev.length}-${Date.now()}`, title: "", url: "" }]);

  const deleteSubLink = (id: string) => setSubLinks((prev) => prev.filter((s) => s.id !== id));

  const save = () => {
    setToasts((p) => [
      ...p,
      { id: Date.now().toString(), message: isNew ? "Menu item added" : `${title || "Item"} saved`, type: "success" as const },
    ]);
    onClose();
  };

  return (
    <SettingsContent>
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

          <Field label="Label">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. About" />
          </Field>

          {type === "link" && (
            <Field label="URL" hint="An internal path (/page/about) or a full URL.">
              <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/page/about" />
            </Field>
          )}

          {type === "group" && (
            <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold text-ink">Sub-links</h3>
                <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addSubLink}>
                  Add sub-link
                </Button>
              </div>

              <div className="flex flex-col rounded-md overflow-hidden" style={{ border: "1px solid var(--border-soft)" }}>
                {subLinks.length === 0 ? (
                  <div className="px-3 py-6 text-sm text-ink-muted text-center">No sub-links yet.</div>
                ) : (
                  subLinks.map((s) => (
                    <div
                      key={s.id}
                      className="grid items-end gap-3 px-3 py-2.5"
                      style={{ gridTemplateColumns: "1fr 1fr 2.5rem", borderTop: "1px solid var(--border-soft)" }}
                    >
                      <Field label="Title">
                        <TextInput value={s.title} onChange={(e) => patchSubLink(s.id, { title: e.target.value })} placeholder="e.g. Methodology" />
                      </Field>
                      <Field label="URL">
                        <TextInput value={s.url} onChange={(e) => patchSubLink(s.id, { url: e.target.value })} placeholder="/page/methodology" />
                      </Field>
                      <div className="flex justify-end pb-1.5">
                        <RowActions label={s.title || "sub-link"} onDelete={() => deleteSubLink(s.id)} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="success" size="sm" disabled={!dirty || !title} onClick={save}>
          {isNew ? "Add item" : "Save"}
        </Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
