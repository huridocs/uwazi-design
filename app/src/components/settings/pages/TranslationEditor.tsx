import { useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { X } from "lucide-react";
import { SettingsEditor } from "../SettingsEditor";
import { SettingsToolbar } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { TranslationProgress } from "../TranslationProgress";
import { Checkbox } from "../../shared/Checkbox";
import { Select } from "../../shared/Select";
import { LastSavedLine } from "../../shared/LastSavedLine";
import type { SettingsLanguage } from "../../../data/settings";
import { dataSourceAtom } from "../../../atoms/dataSource";
import {
  installedLanguagesAtom,
  isUntranslated,
  progressOf,
  saveTranslationsAtom,
  translationRowsAtom,
  type TranslationContext,
  type TranslationRow,
} from "../../../atoms/translations";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";

/** Keys rendered per page of a long context. */
const PAGE = 60;

/** Per-context translation editor: a key × language grid, opened from the
 *  Translations list. The default language is the read-only source; every
 *  other installed language is a column of inputs, headed by its autonym and
 *  code.
 *
 *  A cell's code pill says its status as it is typed: amber while it is empty
 *  or still equals the source (Uwazi's rule), grey once translated. An empty
 *  cell blocks Save with Uwazi's "This field is required" and a count.
 *  "Untranslated only" and the language select narrow the grid; search and
 *  the filter read the SAVED values, so a row stays put while it is being
 *  filled in. One Save writes every language. */
export function TranslationEditor({ context, onClose }: { context: TranslationContext; onClose: () => void }) {
  const corpus = useAtomValue(dataSourceAtom);
  const { record } = useSettingsNotify();
  const languages = useAtomValue(installedLanguagesAtom(corpus));
  const stored = useAtomValue(translationRowsAtom(corpus))(context);
  const saveRows = useSetAtom(saveTranslationsAtom);
  const { draft: rows, setDraft: setRows, dirty, saved, markSaved } = useSettingsDraft({
    id: `translations:${context.id}`,
    label: "Translation edits",
    saved: stored,
  });
  const source = languages.find((l) => l.default) ?? languages[0];
  const targets = languages.filter((l) => !l.default);
  const [query, setQuery] = useState("");
  const [gapsOnly, setGapsOnly] = useState(false);
  const [lang, setLang] = useState("");
  const [attempted, setAttempted] = useState(false);
  const shownTargets = lang ? targets.filter((l) => l.key === lang) : targets;

  // Rows are patched by key id, not index: the grid is filtered.
  const patch = (id: string, langKey: string, value: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, values: { ...r.values, [langKey]: value } } : r)));

  const q = query.trim().toLowerCase();
  const keep = new Set(
    saved
      .filter((r) => !q || `${r.key} ${Object.values(r.values).join(" ")}`.toLowerCase().includes(q))
      .filter((r) => !gapsOnly || shownTargets.some((l) => isUntranslated(r, l.key, source.key)))
      .map((r) => r.id),
  );
  const shown = rows.filter((r) => keep.has(r.id));

  // A long context (the User Interface's 412 keys) renders a page of keys at
  // a time; the next page mounts as the end of the grid scrolls into view.
  // Search and the filters still cover every key.
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => setLimit(PAGE), [query, gapsOnly, lang]);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const more = shown.length > limit;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !more) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setLimit((n) => n + PAGE), {
      rootMargin: "400px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [more, limit]);
  const progress = progressOf(rows, languages);
  const empties = rows.reduce((n, r) => n + targets.filter((l) => !(r.values[l.key] ?? "").trim()).length, 0);

  const save = () => {
    saveRows({ corpus, context, rows });
    markSaved(rows);
    setAttempted(false);
    record({
      method: "UPDATE",
      domain: "translations",
      noun: "translations of",
      id: context.id,
      name: context.name,
      notice: "translationsSaved",
    });
  };

  const pill = (l: SettingsLanguage, status: "source" | "untranslated" | "translated") => (
    <span
      className={`shrink-0 text-meta font-semibold uppercase px-1.5 py-px rounded-md ${
        status === "source" ? "bg-ink text-paper" : status === "untranslated" ? "bg-warning-light text-warning" : "bg-vellum text-ink-secondary"
      }`}
    >
      {l.key}
    </span>
  );
  const header = (l: SettingsLanguage) => (
    <span className="flex items-center gap-1.5 normal-case tracking-normal">
      <span className="truncate">{l.localizedLabel}</span>
      {pill(l, l.default ? "source" : "translated")}
    </span>
  );

  const columns: Column<TranslationRow>[] = [
    {
      id: "key",
      header: "Key",
      width: "14rem",
      cell: (r) => <span className="text-xs font-medium text-ink truncate">{r.key}</span>,
    },
    {
      id: source.key,
      width: "14rem",
      header: header(source),
      cell: (r) => (
        <span className="text-sm text-ink-tertiary truncate" dir={source.ltr ? "ltr" : "rtl"}>
          {r.values[source.key] || "—"}
        </span>
      ),
    },
    ...shownTargets.map<Column<TranslationRow>>((l) => ({
      id: l.key,
      width: "16rem",
      header: header(l),
      cell: (r) => {
        const value = r.values[l.key] ?? "";
        const missing = attempted && !value.trim();
        const untranslated = isUntranslated(r, l.key, source.key);
        return (
          <span className="flex flex-col gap-0.5 w-full min-w-0">
            <span className="flex items-center gap-1.5 w-full min-w-0">
              {pill(l, untranslated ? "untranslated" : "translated")}
              {/* The direction is the wrapper's, so the clear X sits at the
                  end of the text in Arabic too. */}
              <span className="relative flex-1 min-w-0" dir={l.ltr ? "ltr" : "rtl"}>
                <input
                  value={value}
                  onChange={(e) => patch(r.id, l.key, e.target.value)}
                  aria-label={`${r.key} in ${l.label}${untranslated ? ", untranslated" : ""}`}
                  aria-invalid={missing || undefined}
                  className={`w-full min-w-0 bg-transparent text-sm text-ink focus:outline-none focus:bg-warm rounded px-1.5 py-1 pe-6 ${
                    missing ? "ring-1 ring-seal-label" : ""
                  }`}
                />
                {value && (
                  <button
                    type="button"
                    aria-label="Clear"
                    onClick={() => patch(r.id, l.key, "")}
                    className="absolute end-1 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink cursor-pointer"
                  >
                    <X size={12} aria-hidden />
                  </button>
                )}
              </span>
            </span>
            {missing && <span className="text-meta text-seal-label">This field is required</span>}
          </span>
        );
      },
    })),
  ];

  return (
    <SettingsEditor
      component="TranslationEditor"
      path={["Translations"]}
      title={context.name}
      onBack={onClose}
      intro="Translate each key into your installed languages. The&nbsp;default language is the source."
      toolbar={
        <div className="flex flex-col gap-3 mb-3">
          {targets.length > 0 && (
            <TranslationProgress
              progress={progress}
              active={lang}
              onPick={(k) => {
                if (lang === k) return setLang("");
                setLang(k);
                setGapsOnly(true);
              }}
            />
          )}
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
                    options={[{ value: "", label: "All languages" }, ...targets.map((l) => ({ value: l.key, label: l.localizedLabel }))]}
                  />
                </div>
              </>
            }
          />
        </div>
      }
      dirty={dirty}
      onSave={() => {
        if (empties) return setAttempted(true);
        save();
      }}
      saveBlocked={attempted && empties > 0}
      footerStatus={
        attempted && empties > 0 ? (
          <span role="alert" className="text-meta font-medium text-seal-label">
            {empties === 1 ? "1 empty cell blocks saving" : `${empties} empty cells block saving`}
          </span>
        ) : (
          <LastSavedLine domain="translations" id={context.id} />
        )
      }
      wide
    >
      <SettingsTable
        columns={columns}
        data={more ? shown.slice(0, limit) : shown}
        getRowId={(r) => r.id}
        emptyState={
          rows.length === 0 ? (
            <SettingsEmptyState title="This context has no keys" hint="Keys come from what the context translates: add properties, values or links there." />
          ) : gapsOnly && !q ? (
            <SettingsEmptyState
              title="There are no untranslated terms"
              action={{ label: "Show all keys", onClick: () => setGapsOnly(false) }}
            />
          ) : (
            <SettingsEmptyState title="No keys match" query={query} onClearQuery={() => setQuery("")} />
          )
        }
      />
      {more && (
        <div ref={sentinel} data-part="more" className="py-3 text-center text-meta text-ink-tertiary">
          Showing {limit} of {shown.length} keys
        </div>
      )}
    </SettingsEditor>
  );
}
