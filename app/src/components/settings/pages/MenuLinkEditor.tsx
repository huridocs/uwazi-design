import { useState } from "react";
import { useSetAtom } from "jotai";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Field, TextInput } from "../Field";
import { RadioGroup } from "../../shared/RadioGroup";
import { type SettingsMenuLink } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

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

  const save = () => {
    setToasts((p) => [
      ...p,
      { id: Date.now().toString(), message: isNew ? "Menu item added" : `${title || "Item"} saved`, type: "success" as const },
    ]);
    onClose();
  };

  return (
    <SettingsContent>
      <SettingsContent.Header path={["Menu"]} title={isNew ? "New menu item" : base!.title} />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6 max-w-lg">
          <RadioGroup
            name="menu-type"
            ariaLabel="Item type"
            inline
            value={type}
            onChange={(v) => setType(v as "link" | "group")}
            options={[
              { id: "link", label: "Link", hint: "Points at a URL" },
              { id: "group", label: "Group", hint: "Nests links in a dropdown" },
            ]}
          />
          <Field label="Label">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. About" />
          </Field>
          {type === "link" && (
            <Field label="URL" hint="An internal path (/page/about) or a full URL.">
              <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/page/about" />
            </Field>
          )}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="primary" size="sm" disabled={!title} onClick={save}>
          {isNew ? "Add item" : "Save"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
