import { useSetAtom } from "jotai";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { SettingsTable, type Column } from "../SettingsTable";
import {
  seedLanguages,
  seedTranslationKeys,
  type SettingsTranslationContext,
  type TranslationKey,
} from "../../../data/settings";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { LastSavedLine } from "../../shared/LastSavedLine";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";

/** Build the editable rows for a context — seeded terms when we have them, else
 *  a representative set generated from the context's key count. */
function buildRows(context: SettingsTranslationContext): TranslationKey[] {
  const seeded = seedTranslationKeys[context.id];
  if (seeded) return seeded.map((r) => ({ key: r.key, values: { ...r.values } }));
  const n = Math.min(context.keyCount, 10);
  return Array.from({ length: n }, (_, i) => ({
    key: `${context.name} term ${i + 1}`,
    values: Object.fromEntries(
      seedLanguages.map((l) => [l.key, l.default ? `${context.name} term ${i + 1}` : ""]),
    ),
  }));
}

/** Per-context translation editor — a key × language grid, opened from the
 *  Translations list (list → detail). The default language column is read-only
 *  (it's the source term); the rest are editable. */
export function TranslationEditor({
  context,
  onClose,
}: {
  context: SettingsTranslationContext;
  onClose: () => void;
}) {
  const { record } = useSettingsNotify();
  const { draft: rows, setDraft: setRows, dirty } = useSettingsDraft({
    id: `translations:${context.id}`,
    label: "Translation edits",
    saved: buildRows(context),
  });

  const patch = (rowIndex: number, langKey: string, value: string) =>
    setRows((prev) =>
      prev.map((r, i) => (i === rowIndex ? { ...r, values: { ...r.values, [langKey]: value } } : r)),
    );

  const save = () => {
    record({ log: false, 
      method: "UPDATE",
      domain: "translations",
      noun: "translations of",
      id: context.id,
      name: context.name,
      message: `${context.name} translations saved`,
    });
    onClose();
  };

  const columns: Column<TranslationKey>[] = [
    {
      id: "key",
      header: "Term",
      width: "14rem",
      cell: (r) => <span className="text-xs font-medium text-ink truncate">{r.key}</span>,
    },
    ...seedLanguages.map<Column<TranslationKey>>((lang) => ({
      id: lang.key,
      width: "14rem",
      header: (
        <span className="flex items-center gap-1.5">
          {lang.label}
          {lang.default && (
            <span className="text-meta font-semibold text-carbon bg-carbon-tint px-1 py-px rounded normal-case">
              Source
            </span>
          )}
        </span>
      ),
      cell: (r, i) =>
        lang.default ? (
          <span className="text-sm text-ink-tertiary truncate" dir={lang.ltr ? "ltr" : "rtl"}>
            {r.values[lang.key] || "—"}
          </span>
        ) : (
          <input
            value={r.values[lang.key] ?? ""}
            onChange={(e) => patch(i, lang.key, e.target.value)}
            dir={lang.ltr ? "ltr" : "rtl"}
            placeholder="Add translation…"
            aria-label={`${r.key} in ${lang.label}`}
            className="w-full min-w-0 bg-transparent text-sm text-ink focus:outline-none focus:bg-warm rounded px-1.5 py-1 placeholder:text-ink-muted"
          />
        ),
    })),
  ];

  return (
    <SettingsContent component="TranslationEditor">
      <SettingsContent.Header path={["Translations"]} title={context.name} onBack={onClose} />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          Translate each term into your active languages. The source language is shown for reference.
        </p>
        <SettingsTable columns={columns} data={rows} getRowId={(r) => r.key} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <LastSavedLine domain="translations" id={context.id} className="me-auto" />
        <SettingsButton variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </SettingsButton>
        <SettingsButton variant="success" size="sm" disabled={!dirty} onClick={save}>
          Save
        </SettingsButton>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
