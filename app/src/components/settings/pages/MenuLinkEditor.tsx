import { useId, useState, type FormEvent } from "react";
import { Info } from "lucide-react";
import { Modal, MODAL_BUTTON, MODAL_COMMIT } from "../../shared/Modal";
import { SettingsField, TextInput } from "../SettingsField";
import { Select } from "../../shared/Select";
import type { SettingsMenuLink } from "../../../data/settings";

/** What the panel edits: a new or existing link or group. A link's group is
 *  its parent group's id, or null at the top level. */
export interface MenuPanelTarget {
  type: "link" | "group";
  id?: string;
  title?: string;
  url?: string;
  groupId?: string | null;
}

const REQUIRED = "This field is required";
const NO_GROUP = "";

/** Uwazi's menu sidepanel ("NEW LINK", "EDIT GROUP", …) as a dialog. The type
 *  is fixed by the button that opened it; a link takes a title, a URL and a
 *  group, a group only a title. Add / Update changes the menu draft; nothing is
 *  saved until the page's Save. */
export function MenuItemPanel({
  target,
  groups,
  onApply,
  onClose,
}: {
  target: MenuPanelTarget;
  /** The draft's groups, in order, for the Group select. */
  groups: SettingsMenuLink[];
  onApply: (value: { title: string; url: string; groupId: string | null }) => void;
  onClose: () => void;
}) {
  const isNew = !target.id;
  const isLink = target.type === "link";
  const [title, setTitle] = useState(target.title ?? "");
  const [url, setUrl] = useState(target.url ?? "");
  const [groupId, setGroupId] = useState<string>(target.groupId ?? NO_GROUP);
  const [tried, setTried] = useState(false);
  const titleId = useId();
  const urlId = useId();
  const focus = (id: string) => document.getElementById(id)?.focus();

  const titleError = tried && !title.trim();
  const urlError = tried && isLink && !url.trim();
  const heading = `${isNew ? "NEW" : "EDIT"} ${isLink ? "LINK" : "GROUP"}`;

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    setTried(true);
    if (!title.trim()) return focus(titleId);
    if (isLink && !url.trim()) return focus(urlId);
    onApply({ title: title.trim(), url: isLink ? url.trim() : "", groupId: isLink && groupId ? groupId : null });
  };

  return (
    <Modal
      onClose={onClose}
      title={heading}
      size="md"
      component="MenuItemPanel"
      footer={
        <>
          <button type="button" className={`${MODAL_BUTTON} text-ink-secondary hover:bg-warm cursor-pointer`} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="menu-item-form" className={MODAL_COMMIT}>
            {isNew ? "Add" : "Update"}
          </button>
        </>
      }
    >
      <form id="menu-item-form" noValidate onSubmit={submit} className="flex flex-col gap-4">
        <div data-part="using-urls" className="flex gap-2.5 px-3 py-2.5 rounded-md bg-carbon-tint text-xs text-ink-secondary">
          <Info size={14} aria-hidden className="shrink-0 mt-0.5 text-ink-tertiary" />
          <div className="flex flex-col gap-1 min-w-0">
            <p className="font-semibold text-ink">Using URLs</p>
            <p>If it is an external URL, use a fully formed URL. Ie. http://www.uwazi.io.</p>
            <p className="break-words">
              If it is an internal URL within this website, be sure to delete the first part ({window.location.origin}),
              leaving only a relative URL starting with a slash character. Ie.&nbsp;/some_url.
            </p>
          </div>
        </div>
        <SettingsField label="Title" issue={titleError ? { severity: "error", message: REQUIRED } : null}>
          <TextInput
            id={titleId}
            autoFocus
            value={title}
            issue={titleError ? { severity: "error", message: REQUIRED } : null}
            onChange={(e) => setTitle(e.target.value)}
          />
        </SettingsField>
        {isLink && (
          <>
            <SettingsField label="URL" issue={urlError ? { severity: "error", message: REQUIRED } : null}>
              <TextInput
                id={urlId}
                dir="ltr"
                value={url}
                issue={urlError ? { severity: "error", message: REQUIRED } : null}
                onChange={(e) => setUrl(e.target.value)}
              />
            </SettingsField>
            <SettingsField label="Group" htmlFor="menu-item-group">
              <Select
                id="menu-item-group"
                value={groupId}
                onChange={setGroupId}
                options={[{ value: NO_GROUP, label: "No Group" }, ...groups.map((g) => ({ value: g.id, label: g.title }))]}
              />
            </SettingsField>
          </>
        )}
      </form>
    </Modal>
  );
}
