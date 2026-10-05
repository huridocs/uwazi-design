import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { SettingsEditor } from "../SettingsEditor";
import { SettingsToolbar } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { TranslationProgress } from "../TranslationProgress";
import { Checkbox } from "../../shared/Checkbox";
import { Select } from "../../shared/Select";
import { seedLanguages, type SettingsTranslationContext, type TranslationKey } from "../../../data/settings";
import { isUntranslated, progressOf, saveTranslationsAtom, translationRowsAtom } from "../../../atoms/translations";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { LastSavedLine } from "../../shared/LastSavedLine";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";

const source = seedLanguages.find((l) => l.default) ?? seedLanguages[0];
const targets = seedLanguages.filter((l) => !l.default);

/** Per-context translation editor: a key × language grid, opened from the
 *  Translations list (list → detail). The source language is read-only.
 *
 *  UX8: a progress cell per language heads the grid; "Untranslated only"
 *  keeps the keys with a gap, and a language (picked in the strip or the
 *  select) narrows the grid to that column. Search and the filter read the
 *  SAVED values, so a row stays put while it is being filled in; it leaves
 *  the filtered view on Save. */
export function TranslationEditor({
  context,
  onClose,
}: {
  context: SettingsTranslationContext;
  onClose: () => void;
}) {
  const { record } = useSettingsNotify();
  const stored = useAtomValue(translationRowsAtom)(context);
  const saveRows = useSetAtom(saveTranslationsAtom);
  const { draft: rows, setDraft: setRows, dirty, saved } = useSettingsDraft({
    id: `translations:${context.id}`,
    label: "Translation edits",
    saved: stored,
  });
  const [query, setQuery] = useState("");
  const [gapsOnly, setGapsOnly] = useState(false);
  const [lang, setLang] = useState("");
  const shownTargets = lang ? targets.filter((l) => l.key === lang) : targets;

  // Rows are patched by key, not index: the grid is filtered.
  const patch = (key: string, langKey: string, value: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, values: { ...r.values, [langKey]: value } } : r)));

  const q = query.trim().toLowerCase();
  const keep = new Set(
    saved
      .filter((r) => !q || `${r.key} ${Object.values(r.values).join(" ")}`.toLowerCase().includes(q))
      .filter((r) => !gapsOnly || shownTargets.some((l) => isUntranslated(r, l.key, source.key)))
      .map((r) => r.key),
  );
  const shown = rows.filter((r) => keep.has(r.key));
  const progress = progressOf(rows);

  const save = () => {
    saveRows({ id: context.id, rows });
    record({
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
      header: "Key",
      width: "14rem",
      cell: (r) => <span className="text-xs font-medium text-ink truncate">{r.key}</span>,
    },
    ...[source, ...shownTargets].map<Column<TranslationKey>>((l) => ({
      id: l.key,
      width: "14rem",
      header: (
        <span className="flex items-center gap-1.5">
          {l.label}
          {l.default && (
            <span className="text-meta font-semibold text-ink-secondary bg-vellum px-1 py-px rounded normal-case">Source</span>
          )}
        </span>
      ),
      cell: (r) =>
        l.default ? (
          <span className="text-sm text-ink-tertiary truncate" dir={l.ltr ? "ltr" : "rtl"}>
            {r.values[l.key] || "—"}
          </span>
        ) : (
          <span className="relative flex items-center w-full min-w-0">
            {/* A dot marks a gap; the field says so too. */}
            {isUntranslated(r, l.key, source.key) && (
              <span aria-hidden className="absolute -start-2 w-1.5 h-1.5 rounded-full bg-warning" />
            )}
            <input
              value={r.values[l.key] ?? ""}
              onChange={(e) => patch(r.key, l.key, e.target.value)}
              dir={l.ltr ? "ltr" : "rtl"}
              placeholder="Add translation…"
              aria-label={`${r.key} in ${l.label}${isUntranslated(r, l.key, source.key) ? ", untranslated" : ""}`}
              className="w-full min-w-0 bg-transparent text-sm text-ink focus:outline-none focus:bg-warm rounded px-1.5 py-1 placeholder:text-ink-muted"
            />
          </span>
        ),
    })),
  ];

  return (
    <SettingsEditor
      component="TranslationEditor"
      path={["Translations"]}
      title={context.name}
      onBack={onClose}
      intro="Translate each key into your active languages. The&nbsp;source language is shown for reference."
      toolbar={
        <div className="flex flex-col gap-3 mb-3">
          <TranslationProgress
            progress={progress}
            active={lang}
            onPick={(k) => {
              if (lang === k) return setLang("");
              setLang(k);
              setGapsOnly(true);
            }}
          />
          <SettingsToolbar
            search={{ value: query, onChange: setQuery, label: "Search keys" }}
            filters={
              <>
                <label className="flex items-center gap-2 text-xs text-ink-secondary cursor-pointer whitespace-nowrap">
                  <Checkbox checked={gapsOnly} onChange={() => setGapsOnly((v) => !v)} />
                  Untranslated only
                </label>
                <div className="w-40">
                  <Select
                    value={lang}
                    onChange={setLang}
                    ariaLabel="Language"
                    options={[{ value: "", label: "All languages" }, ...targets.map((l) => ({ value: l.key, label: l.label }))]}
                  />
                </div>
              </>
            }
          />
        </div>
      }
      dirty={dirty}
      onSave={save}
      wide
      footerStart={<LastSavedLine domain="translations" id={context.id} />}
    >
      <SettingsTable
        columns={columns}
        data={shown}
        getRowId={(r) => r.key}
        emptyState={
          gapsOnly && !q ? (
            <SettingsEmptyState
              title={lang ? `Nothing left to translate into ${targets.find((l) => l.key === lang)?.label}` : "There are no untranslated keys"}
              action={{ label: "Show all keys", onClick: () => setGapsOnly(false) }}
            />
          ) : (
            <SettingsEmptyState title="No keys yet" query={query} onClearQuery={() => setQuery("")} />
          )
        }
      />
    </SettingsEditor>
  );
}
