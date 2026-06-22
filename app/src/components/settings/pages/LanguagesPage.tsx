import { useState, useEffect } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { Plus, RotateCcw, Trash2, Check, Search, X } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Field, TextInput } from "../Field";
import { Table, type Column } from "../Table";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { ProgressBar } from "../../shared/ProgressBar";
import { seedLanguages, type SettingsLanguage } from "../../../data/settings";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { cejilSettingsLanguages } from "../../../data/cejil/settingsAdapt";
import { toastsAtom } from "../../../atoms/references";

type CatalogLanguage = { key: string; label: string; localizedLabel: string; ltr: boolean };

const LANGUAGE_CATALOG: CatalogLanguage[] = [
  { key: "en", label: "English", localizedLabel: "English", ltr: true },
  { key: "es", label: "Spanish", localizedLabel: "Español", ltr: true },
  { key: "fr", label: "French", localizedLabel: "Français", ltr: true },
  { key: "pt", label: "Portuguese", localizedLabel: "Português", ltr: true },
  { key: "de", label: "German", localizedLabel: "Deutsch", ltr: true },
  { key: "it", label: "Italian", localizedLabel: "Italiano", ltr: true },
  { key: "nl", label: "Dutch", localizedLabel: "Nederlands", ltr: true },
  { key: "pl", label: "Polish", localizedLabel: "Polski", ltr: true },
  { key: "ru", label: "Russian", localizedLabel: "Русский", ltr: true },
  { key: "uk", label: "Ukrainian", localizedLabel: "Українська", ltr: true },
  { key: "ro", label: "Romanian", localizedLabel: "Română", ltr: true },
  { key: "cs", label: "Czech", localizedLabel: "Čeština", ltr: true },
  { key: "el", label: "Greek", localizedLabel: "Ελληνικά", ltr: true },
  { key: "sv", label: "Swedish", localizedLabel: "Svenska", ltr: true },
  { key: "no", label: "Norwegian", localizedLabel: "Norsk", ltr: true },
  { key: "da", label: "Danish", localizedLabel: "Dansk", ltr: true },
  { key: "fi", label: "Finnish", localizedLabel: "Suomi", ltr: true },
  { key: "hu", label: "Hungarian", localizedLabel: "Magyar", ltr: true },
  { key: "tr", label: "Turkish", localizedLabel: "Türkçe", ltr: true },
  { key: "sw", label: "Swahili", localizedLabel: "Kiswahili", ltr: true },
  { key: "zh", label: "Chinese", localizedLabel: "中文", ltr: true },
  { key: "ja", label: "Japanese", localizedLabel: "日本語", ltr: true },
  { key: "ko", label: "Korean", localizedLabel: "한국어", ltr: true },
  { key: "hi", label: "Hindi", localizedLabel: "हिन्दी", ltr: true },
  { key: "bn", label: "Bengali", localizedLabel: "বাংলা", ltr: true },
  { key: "vi", label: "Vietnamese", localizedLabel: "Tiếng Việt", ltr: true },
  { key: "th", label: "Thai", localizedLabel: "ภาษาไทย", ltr: true },
  { key: "id", label: "Indonesian", localizedLabel: "Bahasa Indonesia", ltr: true },
  { key: "ar", label: "Arabic", localizedLabel: "العربية", ltr: false },
  { key: "fa", label: "Persian", localizedLabel: "فارسی", ltr: false },
  { key: "he", label: "Hebrew", localizedLabel: "עברית", ltr: false },
  { key: "ur", label: "Urdu", localizedLabel: "اردو", ltr: false },
];

export function LanguagesPage() {
  const setToasts = useSetAtom(toastsAtom);
  const dataSource = useAtomValue(dataSourceAtom);
  const [languages, setLanguages] = useState<SettingsLanguage[]>(
    dataSource === "cejil" ? cejilSettingsLanguages : seedLanguages,
  );
  const [confirm, setConfirm] = useState<{ kind: "reset" | "uninstall"; lang: SettingsLanguage } | null>(
    null,
  );
  const [installOpen, setInstallOpen] = useState(false);
  const [query, setQuery] = useState("");

  const toast = (message: string) =>
    setToasts((prev) => [...prev, { id: Date.now().toString(), message, type: "success" as const }]);

  useEffect(() => {
    if (!installOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInstallOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [installOpen]);

  const installLanguage = (cat: CatalogLanguage) => {
    setLanguages((prev) => [
      ...prev,
      {
        key: cat.key,
        label: cat.label,
        localizedLabel: cat.localizedLabel,
        ltr: cat.ltr,
        translationsCount: 0,
        default: false,
      },
    ]);
    toast(`${cat.label} installed`);
  };

  const q = query.trim().toLowerCase();
  const installable = LANGUAGE_CATALOG.filter(
    (c) =>
      !languages.some((l) => l.key === c.key) &&
      (q === "" ||
        c.label.toLowerCase().includes(q) ||
        c.localizedLabel.toLowerCase().includes(q)),
  );

  const setDefault = (key: string) =>
    setLanguages((prev) => prev.map((l) => ({ ...l, default: l.key === key })));

  const columns: Column<SettingsLanguage>[] = [
    {
      id: "label",
      header: "Language",
      cell: (l) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink">{l.label}</span>
          <span className="text-ink-tertiary">{l.localizedLabel}</span>
          {!l.ltr && (
            <span className="text-[10px] font-semibold text-ink-tertiary bg-vellum px-1.5 py-px rounded w-fit">
              RTL
            </span>
          )}
          {l.default && (
            <span className="text-[10px] font-semibold text-carbon bg-carbon-tint px-1.5 py-px rounded w-fit">
              Default
            </span>
          )}
        </div>
      ),
    },
    {
      id: "translations",
      header: "Translations",
      width: "13rem",
      cell: (l) => (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ProgressBar value={l.translationsCount} color={l.translationsCount === 100 ? "green" : "blue"} />
          </div>
          <span className="text-xs text-ink-tertiary tabular-nums w-9 text-right">
            {l.translationsCount}%
          </span>
        </div>
      ),
    },
    {
      id: "default",
      header: "Default",
      align: "center",
      width: "6rem",
      cell: (l) =>
        l.default ? (
          <Check size={16} className="text-success mx-auto" />
        ) : (
          <button
            onClick={() => {
              setDefault(l.key);
              toast(`${l.label} set as default language`);
            }}
            className="text-xs font-medium text-carbon hover:underline cursor-pointer"
          >
            Set
          </button>
        ),
    },
    {
      id: "reset",
      header: "Reset",
      align: "center",
      width: "5rem",
      cell: (l) => (
        <button
          onClick={() => setConfirm({ kind: "reset", lang: l })}
          aria-label={`Reset ${l.label}`}
          className="p-1.5 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink transition-colors cursor-pointer"
        >
          <RotateCcw size={14} />
        </button>
      ),
    },
    {
      id: "uninstall",
      header: "Uninstall",
      align: "center",
      width: "6rem",
      cell: (l) =>
        l.default ? (
          <span className="text-ink-muted">—</span>
        ) : (
          <button
            onClick={() => setConfirm({ kind: "uninstall", lang: l })}
            aria-label={`Uninstall ${l.label}`}
            className="p-1.5 rounded-md text-ink-tertiary hover:bg-seal-tint hover:text-seal transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        ),
    },
  ];

  return (
    <SettingsContent>
      <SettingsContent.Header title="Languages" />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          Active languages for your collection. The default language is shown to users who haven't
          chosen one.
        </p>
        <Table columns={columns} data={languages} getRowId={(l) => l.key} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button
          variant="primary"
          size="sm"
          className="me-auto"
          icon={<Plus size={14} />}
          onClick={() => {
            setQuery("");
            setInstallOpen(true);
          }}
        >
          Install language
        </Button>
      </SettingsContent.Footer>

      {installOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setInstallOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Install predefined language"
            className="flex w-full max-w-[28rem] max-h-[70vh] flex-col overflow-hidden rounded-lg bg-paper"
            style={{ border: "1px solid var(--border-primary)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid var(--border-soft)" }}
            >
              <h2 className="text-sm font-semibold text-ink">Install predefined language</h2>
              <button
                onClick={() => setInstallOpen(false)}
                aria-label="Close"
                className="p-1.5 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-4 pt-3">
              <Field>
                <div className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-tertiary"
                  />
                  <TextInput
                    autoFocus
                    placeholder="Search languages…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="ps-8"
                  />
                </div>
              </Field>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
              {installable.length === 0 ? (
                <p className="py-8 text-center text-xs text-ink-tertiary">
                  {q === "" ? "All available languages are installed." : "No languages match your search."}
                </p>
              ) : (
                <ul className="flex flex-col">
                  {installable.map((c) => (
                    <li
                      key={c.key}
                      className="flex items-center justify-between gap-2 py-2"
                      style={{ borderBottom: "1px solid var(--border-soft)" }}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="font-medium text-ink">{c.localizedLabel}</span>
                        <span className="truncate text-ink-tertiary">{c.label}</span>
                        {!c.ltr && (
                          <span className="text-[10px] font-semibold text-ink-tertiary bg-vellum px-1.5 py-px rounded w-fit">
                            RTL
                          </span>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Plus size={14} />}
                        onClick={() => installLanguage(c)}
                      >
                        Install
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === "reset" ? "Reset language" : "Uninstall language"}
        message={
          confirm?.kind === "reset"
            ? `Reset all translations for ${confirm?.lang.label} to their default values? This can't be undone.`
            : `Uninstall ${confirm?.lang.label}? All its translations will be removed from the collection.`
        }
        confirmLabel={confirm?.kind === "reset" ? "Reset" : "Uninstall"}
        variant="danger"
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "uninstall") {
            setLanguages((prev) => prev.filter((l) => l.key !== confirm.lang.key));
            toast(`${confirm.lang.label} uninstalled`);
          } else {
            toast(`${confirm.lang.label} translations reset`);
          }
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </SettingsContent>
  );
}
