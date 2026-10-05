import { useMemo, useState } from "react";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_COMMIT_DISABLED } from "../../../shared/Modal";
import { ModalList, ModalListRow, ModalSearchRow, ModalStatus } from "../../../shared/ModalParts";
import { BAR_GHOST } from "../../../shared/warmButton";
import { LANGUAGE_CATALOG, PREDEFINED_TRANSLATIONS, type CatalogLanguage } from "../../../../atoms/languages";

/** Accent- and case-insensitive, as Uwazi's `MultiselectList` search. */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Settings › Languages › Install Language(s) (Uwazi `InstallLanguagesModal`):
 *  the catalog minus what is installed, a search over English names, All /
 *  Selected, rows that toggle, and Install (n). Mounted only while open, so
 *  Cancel and Escape drop the selection. */
export function InstallLanguagesModal({
  installedKeys,
  onInstall,
  onCancel,
}: {
  installedKeys: string[];
  onInstall: (picked: CatalogLanguage[]) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [show, setShow] = useState<"all" | "selected">("all");

  const available = useMemo(
    () => LANGUAGE_CATALOG.filter((c) => !installedKeys.includes(c.key)),
    [installedKeys],
  );
  const q = fold(query.trim());
  const rows = available.filter(
    (c) => (show === "all" || picked.includes(c.key)) && (!q || fold(c.label).includes(q)),
  );
  const toggle = (key: string) => {
    const next = picked.includes(key) ? picked.filter((k) => k !== key) : [...picked, key];
    setPicked(next);
    if (next.length === 0) setShow("all");
  };
  const n = picked.length;

  const radio = (value: "all" | "selected", label: string, disabled = false) => (
    <label className={`inline-flex items-center gap-1.5 text-xs ${disabled ? "text-ink-muted cursor-not-allowed" : "text-ink-secondary cursor-pointer"}`}>
      <input
        type="radio"
        name="install-language-show"
        value={value}
        checked={show === value}
        disabled={disabled}
        onChange={() => setShow(value)}
        className="accent-[var(--text-primary)]"
      />
      {label}
    </label>
  );

  return (
    <Modal
      component="InstallLanguagesModal"
      title="Install Language(s)"
      closeLabel="Close modal"
      onClose={onCancel}
      size="lg"
      height="md:h-[min(40rem,100%)]"
      flush
      footer={
        <div className="flex w-full min-w-0 items-center gap-2">
          <span className="me-auto min-w-0 truncate text-xs text-ink-tertiary">* Available default translation</span>
          <button type="button" onClick={onCancel} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
            Cancel
          </button>
          <button
            type="button"
            data-part="confirm"
            disabled={n === 0}
            onClick={() => onInstall(available.filter((c) => picked.includes(c.key)))}
            className={n === 0 ? MODAL_COMMIT_DISABLED : MODAL_COMMIT}
          >
            {n > 0 ? `Install (${n})` : "Install"}
          </button>
        </div>
      }
    >
      <p className="shrink-0 py-3 text-xs text-ink-secondary text-pretty">
        This action may take some time while we add the extra language to the entire collection.
      </p>
      <ModalSearchRow value={query} onChange={setQuery} placeholder="Search" ariaLabel="Search languages" clearLabel="Clear" autoFocus />
      <div role="radiogroup" aria-label="Show" className="shrink-0 flex items-center gap-4 py-2 border-b border-border-soft">
        {radio("all", "All")}
        {radio("selected", `Selected (${n})`, n === 0)}
      </div>
      <ModalList aria-label="Languages">
        {rows.length === 0 ? (
          <ModalStatus as="li">No items available</ModalStatus>
        ) : (
          rows.map((c) => {
            const on = picked.includes(c.key);
            return (
              <ModalListRow
                key={c.key}
                part="language"
                onClick={() => toggle(c.key)}
                pressed={on}
                selected={on}
                title={
                  <>
                    {PREDEFINED_TRANSLATIONS.has(c.key) && <span>* </span>}
                    {c.label} ({c.key})
                  </>
                }
                meta={
                  <span
                    className={`w-fit rounded-md px-1.5 py-px font-semibold ${on ? "bg-success-light text-success" : "bg-warm text-ink-secondary"}`}
                  >
                    {on ? "Selected" : "Select"}
                  </span>
                }
              />
            );
          })
        )}
      </ModalList>
    </Modal>
  );
}
