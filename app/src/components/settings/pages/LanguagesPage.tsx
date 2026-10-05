import { useMemo, useState } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { Download, Languages, RotateCcw, Star, Trash2 } from "lucide-react";
import { SettingsListPage } from "../SettingsListPage";
import { SettingsSection } from "../SettingsSection";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { MobileActionMenu, type MobileMenuItem } from "../../layout/MobileActionMenu";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { TypedConfirmModal } from "../../shared/TypedConfirmModal";
import { dataSourceAtom } from "../../../atoms/dataSource";
import {
  installKey,
  installLanguages,
  languageInstallStateAtom,
  languagesAtom,
  LANGUAGE_CATALOG,
  PREDEFINED_TRANSLATIONS,
  setDefaultLanguageAtom,
  uninstallLanguage,
  type LanguageRecord,
} from "../../../atoms/languages";
import { languageUsageAtom } from "../../../atoms/settingsUsage";
import { isUntranslated, translationRowsAtom } from "../../../atoms/translations";
import { seedTranslationContexts } from "../../../data/settings";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { InstallLanguagesModal } from "./languages/InstallLanguagesModal";

type Ask = { kind: "default" | "reset" | "uninstall"; lang: LanguageRecord };

const plural = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** Settings › Languages (Uwazi `LanguagesList`): one "Active languages" table
 *  sorted by English name, the Default as a badge, Make default / Reset /
 *  Uninstall in a row menu, and "Install Language(s)" in the footer. Every
 *  action is immediate: no page Save, no dirty guard. */
export function LanguagesPage() {
  const store = useStore();
  const corpus = useAtomValue(dataSourceAtom);
  const installed = useAtomValue(languagesAtom);
  const installState = useAtomValue(languageInstallStateAtom);
  const setDefault = useSetAtom(setDefaultLanguageAtom);
  const { record } = useSettingsNotify();
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [installing, setInstalling] = useState(false);
  const [ask, setAsk] = useState<Ask | null>(null);

  const rows = useMemo(
    () => [...installed].sort((a, b) => (dir === "asc" ? 1 : -1) * a.label.localeCompare(b.label)),
    [installed, dir],
  );
  const stateOf = (l: LanguageRecord) => installState[installKey(corpus, l.key)];
  const catalogOf = (key: string) => LANGUAGE_CATALOG.find((c) => c.key === key);

  const menuItems = (l: LanguageRecord): MobileMenuItem[] => {
    const busy = stateOf(l)?.status === "installing";
    const items: MobileMenuItem[] = [
      {
        id: "default",
        label: "Make default",
        icon: <Star size={14} aria-hidden />,
        disabled: l.default || busy,
        onSelect: () => setAsk({ kind: "default", lang: l }),
      },
    ];
    if (PREDEFINED_TRANSLATIONS.has(l.key))
      items.push({ id: "reset", label: "Reset", icon: <RotateCcw size={14} aria-hidden />, disabled: busy, onSelect: () => setAsk({ kind: "reset", lang: l }) });
    if (!l.default)
      items.push({
        id: "uninstall",
        label: "Uninstall",
        icon: <Trash2 size={14} aria-hidden />,
        disabled: busy,
        onSelect: () => setAsk({ kind: "uninstall", lang: l }),
      });
    return items;
  };

  const columns: Column<LanguageRecord>[] = [
    {
      id: "label",
      header: "Language",
      sortKey: "label",
      mobile: "primary",
      cell: (l) => {
        const state = stateOf(l);
        return (
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
              <span className="font-medium text-ink">
                {l.label} ({l.key})
              </span>
              {l.localizedLabel && l.localizedLabel !== l.label && (
                <span lang={l.key} dir={l.ltr ? "ltr" : "rtl"} className="text-ink-tertiary">
                  {l.localizedLabel}
                </span>
              )}
              {l.default && (
                <span data-part="default" className="w-fit text-meta font-semibold text-ink bg-parchment px-1.5 py-px rounded-md">
                  Default
                </span>
              )}
              {state?.status === "installing" && (
                <span data-part="installing" className="w-fit text-meta font-semibold text-ink-secondary bg-vellum px-1.5 py-px rounded-md">
                  Installing
                </span>
              )}
              {state?.status === "failed" && (
                <span data-part="failed" className="w-fit text-meta font-semibold text-seal-label bg-seal-tint px-1.5 py-px rounded-md">
                  Install failed
                </span>
              )}
            </div>
            {state?.status === "failed" && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
                <span>{state.reason}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const c = catalogOf(l.key);
                    if (c) installLanguages(store, corpus, [c]);
                  }}
                  className="font-medium text-ink underline underline-offset-2 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      width: "3rem",
      align: "right",
      mobile: "actions",
      cell: (l) => <MobileActionMenu fixed label={`Actions for ${l.label}`} items={menuItems(l)} />,
    },
  ];

  return (
    <SettingsListPage
      component="LanguagesPage"
      title="Languages"
      lead={{ label: "Install Language(s)", icon: <Download size={14} aria-hidden />, onClick: () => setInstalling(true) }}
      overlays={
        <>
          {installing && (
            <InstallLanguagesModal
              installedKeys={installed.map((l) => l.key)}
              onCancel={() => setInstalling(false)}
              onInstall={(picked) => {
                setInstalling(false);
                installLanguages(store, corpus, picked);
              }}
            />
          )}
          <ConfirmDialog
            open={ask?.kind === "default"}
            title="Make default language"
            message={`Make ${ask?.lang.label} the default language? Languages installed later start as a copy of it, and Translations marks a text untranslated when it is empty or still equals the ${ask?.lang.label} text.`}
            confirmLabel="Make default"
            onConfirm={() => {
              if (!ask) return;
              setDefault({ key: ask.lang.key, corpus });
              record({
                method: "UPDATE",
                domain: "language",
                noun: "language",
                id: ask.lang.key,
                name: ask.lang.label,
                summary: `Set “${ask.lang.label}” as the default language`,
                message: "Default language change success",
              });
              setAsk(null);
            }}
            onCancel={() => setAsk(null)}
          />
          {ask?.kind === "reset" && <ResetDialog lang={ask.lang} onDone={() => setAsk(null)} />}
          {ask?.kind === "uninstall" && (
            <UninstallDialog
              lang={ask.lang}
              onCancel={() => setAsk(null)}
              onConfirm={() => {
                uninstallLanguage(store, corpus, ask.lang);
                setAsk(null);
              }}
            />
          )}
        </>
      }
    >
      <SettingsSection title="Active languages">
        <SettingsTable
          corpusScoped
          columns={columns}
          data={rows}
          getRowId={(l) => l.key}
          sort={{ key: "label", dir }}
          onSort={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
          emptyState={<SettingsEmptyState icon={<Languages size={16} />} title="No languages installed" />}
        />
      </SettingsSection>
    </SettingsListPage>
  );
}

/** System context rows: what Reset overwrites. */
const SYSTEM_CONTEXTS = seedTranslationContexts.filter((c) => c.type === "System");

function ResetDialog({ lang, onDone }: { lang: LanguageRecord; onDone: () => void }) {
  const rowsOf = useAtomValue(translationRowsAtom);
  const { record } = useSettingsNotify();
  const keys = SYSTEM_CONTEXTS.reduce((n, c) => n + rowsOf(c).length, 0);
  return (
    <TypedConfirmModal
      open
      message="You are about to reset a language."
      impact={[
        `System strings only: ${plural(keys, "key", "keys")} in User Interface go back to the predefined ${lang.label} text.`,
        "Templates, thesauri, the menu and every other context keep their translations.",
      ]}
      confirmLabel="Reset"
      onCancel={onDone}
      onConfirm={() => {
        record({
          method: "UPDATE",
          domain: "language",
          noun: "language",
          id: lang.key,
          name: lang.label,
          summary: `Reset language “${lang.label}”`,
          message: "Language reset success",
        });
        onDone();
      }}
    />
  );
}

function UninstallDialog({ lang, onCancel, onConfirm }: { lang: LanguageRecord; onCancel: () => void; onConfirm: () => void }) {
  const usage = useAtomValue(languageUsageAtom(lang));
  const rowsOf = useAtomValue(translationRowsAtom);
  const source = useAtomValue(languagesAtom).find((l) => l.default)?.key ?? "en";
  const translated = seedTranslationContexts.reduce(
    (n, c) => n + rowsOf(c).filter((r) => !isUntranslated(r, lang.key, source)).length,
    0,
  );
  const entityLine = usage.lines.find((l) => !l.startsWith("Interface translated"));
  return (
    <TypedConfirmModal
      open
      message="You are about to uninstall a language."
      impact={[
        entityLine ? entityLine.replace("a version in this language.", `a ${lang.label} version, which is deleted.`) : `No entity has a ${lang.label} version.`,
        `${plural(translated, "translated key is", "translated keys are")} removed from Translations.`,
      ]}
      confirmLabel="Uninstall"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
