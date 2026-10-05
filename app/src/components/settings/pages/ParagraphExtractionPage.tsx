import { useState } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { AlignLeft, Trash2 } from "lucide-react";
import { SettingsListPage } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { SettingsButton } from "../SettingsButton";
import { ConfirmDelete } from "../../shared/ConfirmDelete";
import { PxWizard } from "./paragraphs/PxWizard";
import { PxEntitiesView } from "./paragraphs/PxEntitiesView";
import { PxParagraphsView } from "./paragraphs/PxParagraphsView";
import { TemplatePill } from "./paragraphs/TemplatePill";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { templatesAtom } from "../../../atoms/templates";
import { consumeFailureAtom } from "../../../atoms/devSwitches";
import { pxExtractors, pxRowsAtom } from "../../../atoms/paragraphExtraction";
import type { PxExtractor } from "../../../data/paragraphs";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";

/** Settings › Paragraph extraction (Uwazi's `ParagraphExtraction`): the
 *  extractors, a three-step wizard to add one, Delete over the ticked ones.
 *  There is no edit. "View" opens the source entities, and from there one
 *  entity's paragraphs. */
export function ParagraphExtractionPage() {
  const store = useStore();
  const corpus = useAtomValue(dataSourceAtom);
  const extractors = useAtomValue(pxExtractors.listAtom);
  const templates = useAtomValue(templatesAtom(corpus));
  const remove = useSetAtom(pxExtractors.deleteAtom);
  const consumeFailure = useSetAtom(consumeFailureAtom);
  const { record, fail } = useSettingsNotify();
  const [wizard, setWizard] = useState(false);
  const [viewing, setViewing] = useState<{ id: string; entityId?: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);

  const tpl = (id: string) => templates.find((t) => t.id === id);
  const open = extractors.find((x) => x.id === viewing?.id);
  if (open && viewing?.entityId)
    return <PxParagraphsView extractor={open} entityId={viewing.entityId} onBack={() => setViewing({ id: open.id })} />;
  if (open) return <PxEntitiesView extractor={open} onBack={() => setViewing(null)} onView={(entityId) => setViewing({ id: open.id, entityId })} />;

  const picked = extractors.filter((x) => selected.has(x.id));
  const rowsOf = (x: PxExtractor) => store.get(pxRowsAtom(`${corpus}|${x.id}`));
  const statusRows = picked.reduce((n, x) => n + rowsOf(x).length, 0);
  const paragraphEntities = picked.reduce((n, x) => n + rowsOf(x).reduce((m, r) => m + r.paragraphs, 0), 0);

  const columns: Column<PxExtractor>[] = [
    { id: "source", header: "Source Template", mobile: "primary", cell: (x) => <TemplatePill template={tpl(x.sourceTemplateId)} id={x.sourceTemplateId} /> },
    { id: "target", header: "Target Template", mobile: "meta", cell: (x) => <TemplatePill template={tpl(x.targetTemplateId)} id={x.targetTemplateId} /> },
    { id: "entities", header: "Entities", width: "9rem", mobile: "meta", cell: (x) => <EntityCount x={x} /> },
    {
      id: "actions",
      header: <span className="sr-only">Action</span>,
      width: "4.5rem",
      align: "right",
      mobile: "actions",
      cell: (x) => (
        <SettingsButton variant="secondary" size="sm" aria-label={`View ${tpl(x.sourceTemplateId)?.name ?? "extractor"}`} onClick={() => setViewing({ id: x.id })}>
          View
        </SettingsButton>
      ),
    },
  ];

  const deleteSelected = () => {
    setConfirm(false);
    const failure = consumeFailure("delete");
    if (failure) return fail(undefined, failure);
    for (const x of picked) {
      remove({ id: x.id });
      record({ method: "DELETE", domain: "paragraph-extractor", noun: "paragraph extractor for", id: x.id, name: tpl(x.sourceTemplateId)?.name ?? x.sourceTemplateId, notify: false });
    }
    record({ method: "DELETE", domain: "paragraph-extractor", noun: "paragraph extractor", name: "", message: "Extractor/s deleted", log: false });
    setSelected(new Set());
  };

  return (
    <SettingsListPage
      component="ParagraphExtractionPage"
      title="Paragraph extraction"
      intro="Extractors split each entity's document into paragraph entities of a target template, linked to the entity they came from."
      lead={{ label: "Add extractor", onClick: () => setWizard(true) }}
      selection={{
        count: selected.size,
        total: extractors.length,
        onClear: () => setSelected(new Set()),
        actions: [{ id: "delete", label: "Delete", icon: <Trash2 size={14} />, danger: true, onClick: () => setConfirm(true) }],
      }}
      overlays={
        <>
          {wizard && <PxWizard onClose={() => setWizard(false)} />}
          <ConfirmDelete
            open={confirm}
            title="Are you sure?"
            message="Only the extractor will be deleted, all created entities will remain on the library."
            impact={{
              lines: [
                `${statusRows.toLocaleString()} entity statuses are removed with ${picked.length === 1 ? "it" : "them"}.`,
                `${paragraphEntities.toLocaleString()} paragraph entities stay in the library.`,
              ],
              block: null,
            }}
            confirmLabel="Delete"
            onConfirm={deleteSelected}
            onCancel={() => setConfirm(false)}
          />
        </>
      }
    >
      <h3 className="text-sm font-semibold text-ink mb-2">Extractors</h3>
      <SettingsTable
        corpusScoped
        columns={columns}
        data={extractors}
        getRowId={(x) => x.id}
        selection={{ selected, onChange: setSelected, label: (x) => `${tpl(x.sourceTemplateId)?.name ?? x.sourceTemplateId} extractor` }}
        emptyState={
          <SettingsEmptyState
            icon={<AlignLeft size={16} />}
            title="No extractors yet"
            hint="An extractor turns each document of a source template into paragraph entities."
            action={{ label: "Add extractor", onClick: () => setWizard(true) }}
          />
        }
      />
    </SettingsListPage>
  );
}

/** The source template's entity count, with how many are New. */
function EntityCount({ x }: { x: PxExtractor }) {
  const corpus = useAtomValue(dataSourceAtom);
  const rows = useAtomValue(pxRowsAtom(`${corpus}|${x.id}`));
  const fresh = rows.filter((r) => r.status === "new").length;
  return (
    <span className="flex items-center gap-2">
      <span className="tabular-nums text-ink-secondary">{rows.length.toLocaleString()}</span>
      {fresh > 0 && <span className="w-fit px-1.5 py-0.5 rounded-md bg-carbon-tint text-carbon-label text-meta font-medium tabular-nums">{fresh.toLocaleString()} New</span>}
    </span>
  );
}
