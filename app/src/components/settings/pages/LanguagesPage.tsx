import { useState } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { Plus, RotateCcw, Trash2, Check } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Table, type Column } from "../Table";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { ProgressBar } from "../../shared/ProgressBar";
import { seedLanguages, type SettingsLanguage } from "../../../data/settings";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { cejilSettingsLanguages } from "../../../data/cejil/settingsAdapt";
import { toastsAtom } from "../../../atoms/references";

export function LanguagesPage() {
  const setToasts = useSetAtom(toastsAtom);
  const dataSource = useAtomValue(dataSourceAtom);
  const [languages, setLanguages] = useState<SettingsLanguage[]>(
    dataSource === "cejil" ? cejilSettingsLanguages : seedLanguages,
  );
  const [confirm, setConfirm] = useState<{ kind: "reset" | "uninstall"; lang: SettingsLanguage } | null>(
    null,
  );

  const toast = (message: string) =>
    setToasts((prev) => [...prev, { id: Date.now().toString(), message, type: "success" as const }]);

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
        <Button variant="primary" size="sm" className="me-auto" icon={<Plus size={14} />}>
          Install language
        </Button>
      </SettingsContent.Footer>

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
