import { useState } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { Plus, RotateCcw, Trash2, Check } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { Modal } from "../../shared/Modal";
import { ModalList, ModalListRow, ModalSearchRow, ModalStatus } from "../../shared/ModalParts";
import { SettingsTable, type Column } from "../SettingsTable";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { ProgressBar } from "../../shared/ProgressBar";
import { seedLanguages, type SettingsLanguage } from "../../../data/settings";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { cejilSettingsLanguages } from "../../../data/cejil/settingsAdapt";
import { toastsAtom } from "../../../atoms/notifications";

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
      mobile: "actions",
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
      mobile: "actions",
      align: "center",
      width: "6rem",
      cell: (l) =>
        l.default ? (
          <span className="text-ink-muted">—</span>
        ) : (
          <button
            onClick={() => setConfirm({ kind: "uninstall", lang: l })}
            aria-label={`Uninstall ${l.label}`}
            className="p-1.5 rounded-md text-ink-tertiary hover:bg-seal-tint hover:text-seal-label transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        ),
    },
  ];

  return (
    <SettingsContent component="LanguagesPage">
      <SettingsContent.Header title="Languages" />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          Active languages for your collection. The default language is shown to users who haven't
          chosen one.
        </p>
        <SettingsTable columns={columns} data={languages} getRowId={(l) => l.key} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <SettingsButton
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
        </SettingsButton>
      </SettingsContent.Footer>

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
