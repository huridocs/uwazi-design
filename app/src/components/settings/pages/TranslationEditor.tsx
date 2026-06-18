import { useState } from "react";
import { useSetAtom } from "jotai";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Table, type Column } from "../Table";
import {
  seedLanguages,
  seedTranslationKeys,
  type SettingsTranslationContext,
  type TranslationKey,
} from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

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
  const setToasts = useSetAtom(toastsAtom);
  const [rows, setRows] = useState<TranslationKey[]>(() => buildRows(context));

  const patch = (rowIndex: number, langKey: string, value: string) =>
    setRows((prev) =>
      prev.map((r, i) => (i === rowIndex ? { ...r, values: { ...r.values, [langKey]: value } } : r)),
    );

  const dirty = JSON.stringify(rows) !== JSON.stringify(buildRows(context));

  const save = () => {
    setToasts((p) => [
      ...p,
      { id: Date.now().toString(), message: `${context.name} translations saved`, type: "success" as const },
    ]);
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
            <span className="text-[9px] font-semibold text-carbon bg-carbon-tint px-1 py-px rounded normal-case">
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
    <SettingsContent>
      <SettingsContent.Header path={["Translations"]} title={context.name} onBack={onClose} />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          Translate each term into your active languages. The source language is shown for reference.
        </p>
        <Table columns={columns} data={rows} getRowId={(r) => r.key} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="success" size="sm" disabled={!dirty} onClick={save}>
          Save
        </Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
