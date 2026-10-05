import { useState } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { Plus, RotateCcw, Check, Languages } from "lucide-react";
import { SettingsButton } from "../SettingsButton";
import { SettingsListPage, useSettingsSearch } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { RowActionButton, RowActions } from "../RowActions";
import { Modal } from "../../shared/Modal";
import { ModalList, ModalListRow, ModalSearchRow, ModalStatus } from "../../shared/ModalParts";
import { SettingsTable, type Column } from "../SettingsTable";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { ConfirmDelete } from "../../shared/ConfirmDelete";
import { ProgressBar } from "../../shared/ProgressBar";
import { seedLanguages, type SettingsLanguage } from "../../../data/settings";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { cejilSettingsLanguages } from "../../../data/cejil/settingsAdapt";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { LanguageDelete } from "../../shared/SettingsDeletes";

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
  const { record } = useSettingsNotify();
  const dataSource = useAtomValue(dataSourceAtom);
  const [languages, setLanguages] = useState<SettingsLanguage[]>(
    dataSource === "cejil" ? cejilSettingsLanguages : seedLanguages,
  );
  const [confirm, setConfirm] = useState<{ kind: "reset" | "uninstall" | "default"; lang: SettingsLanguage } | null>(
    null,
  );
  const [installOpen, setInstallOpen] = useState(false);
  const [query, setQuery] = useState("");
  const search = useSettingsSearch(languages, (l) => `${l.label} ${l.localizedLabel} ${l.key}`);

  const log = (method: "CREATE" | "UPDATE", l: { key: string; label: string }, message: string) =>
    record({ log: false,  method, domain: "language", noun: "language", id: l.key, name: l.label, message });

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
    log("CREATE", cat, `${cat.label} installed`);
    // The row just installed leaves the list, and focus with it. Put focus
    // back on the search field so the dialog keeps Escape and the trap.
    requestAnimationFrame(() =>
      document.querySelector<HTMLInputElement>('[data-component="InstallLanguageDialog"] input')?.focus(),
    );
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
            <span className="text-meta font-semibold text-ink-tertiary bg-vellum px-1.5 py-px rounded w-fit">
              RTL
            </span>
          )}
          {l.default && (
            <span className="text-meta font-semibold text-carbon bg-carbon-tint px-1.5 py-px rounded w-fit">
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
        <div className="flex items-center gap-2 w-full min-w-32">
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
            onClick={() => setConfirm({ kind: "default", lang: l })}
            className="text-xs font-medium text-carbon hover:underline cursor-pointer"
          >
            Set
          </button>
        ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      width: "5rem",
      cell: (l) => (
        <RowActions
          label={l.label}
          deleteLabel="Uninstall"
          // The default language cannot be uninstalled.
          onDelete={l.default ? undefined : () => setConfirm({ kind: "uninstall", lang: l })}
        >
          <RowActionButton
            label={`Reset ${l.label}`}
            icon={<RotateCcw size={14} aria-hidden />}
            onClick={() => setConfirm({ kind: "reset", lang: l })}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <SettingsListPage
      component="LanguagesPage"
      title="Languages"
      intro="Active languages for your collection. The&nbsp;default language is shown to users who haven't chosen one."
      search={{ value: search.query, onChange: search.setQuery, label: "Search languages" }}
      lead={{
        label: "Install language",
        onClick: () => {
          setQuery("");
          setInstallOpen(true);
        },
      }}
      overlays={
        <>
          {installOpen && (
            <Modal
              component="InstallLanguageDialog"
              title="Install language"
              closeLabel="Close language list"
              onClose={() => setInstallOpen(false)}
              size="md"
              // Fixed, so the panel does not shrink as the search filters rows out.
              height="md:h-[min(34rem,100%)]"
              flush
            >
              <ModalSearchRow
                value={query}
                onChange={setQuery}
                placeholder="Search languages…"
                ariaLabel="Search languages"
                autoFocus
              />
              <ModalList>
                {installable.length === 0 ? (
                  <ModalStatus as="li">
                    {q === "" ? "All available languages are installed." : "No languages match your search."}
                  </ModalStatus>
                ) : (
                  installable.map((c) => (
                    <ModalListRow
                      key={c.key}
                      part="language"
                      title={
                        <>
                          <span className="font-medium">{c.localizedLabel}</span>
                          {c.label !== c.localizedLabel && <span className="ms-2 text-ink-tertiary">{c.label}</span>}
                        </>
                      }
                      chip={
                        !c.ltr ? (
                          <span className="w-fit text-meta font-semibold text-ink-tertiary bg-vellum px-1.5 py-px rounded-md">
                            RTL
                          </span>
                        ) : undefined
                      }
                      meta={
                        <SettingsButton
                          variant="ghost"
                          size="sm"
                          icon={<Plus size={14} aria-hidden />}
                          aria-label={`Install ${c.label}`}
                          onClick={() => installLanguage(c)}
                        >
                          Install
                        </SettingsButton>
                      }
                    />
                  ))
                )}
              </ModalList>
            </Modal>
          )}

          <ConfirmDialog
            open={confirm?.kind === "default"}
            title="Change default language"
            message={`Make ${confirm?.lang.label} the default language? It is shown to users who haven't chosen a language.`}
            confirmLabel="Make default"
            onConfirm={() => {
              if (!confirm) return;
              setDefault(confirm.lang.key);
              log("UPDATE", confirm.lang, `${confirm.lang.label} set as default language`);
              setConfirm(null);
            }}
            onCancel={() => setConfirm(null)}
          />
          <ConfirmDelete
            open={confirm?.kind === "reset"}
            title="Reset language"
            message={`Reset all translations for ${confirm?.lang.label} to their default values? This can't be undone.`}
            impact={null}
            confirmLabel="Reset"
            onConfirm={() => {
              if (!confirm) return;
              log("UPDATE", confirm.lang, `${confirm.lang.label} translations reset`);
              setConfirm(null);
            }}
            onCancel={() => setConfirm(null)}
          />
          <LanguageDelete
            language={confirm?.kind === "uninstall" ? confirm.lang : null}
            onCancel={() => setConfirm(null)}
            onDelete={(lang) => setLanguages((prev) => prev.filter((l) => l.key !== lang.key))}
          />
        </>
      }
    >
      <SettingsTable
        columns={columns}
        data={search.rows}
        getRowId={(l) => l.key}
        emptyState={
          <SettingsEmptyState
            icon={<Languages size={16} />}
            title="No languages installed"
            query={search.query}
            onClearQuery={search.clear}
          />
        }
      />
    </SettingsListPage>
  );
}
