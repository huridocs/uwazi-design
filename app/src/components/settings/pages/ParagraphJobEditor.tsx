import { useMemo, useState } from "react";
import { Play, RotateCw } from "lucide-react";
import { SettingsEditor } from "../SettingsEditor";
import { SettingsSection, SettingsStat } from "../SettingsSection";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsButton } from "../SettingsButton";
import { SettingsField, TextInput } from "../SettingsField";
import { Select } from "../../shared/Select";
import { StatusPill } from "../StatusPill";
import { SettingsTable, type Column } from "../SettingsTable";
import { seedTemplates, type SettingsParagraphJob } from "../../../data/settings";
import { useNotify } from "../../../hooks/useNotify";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { LastSavedLine } from "../../shared/LastSavedLine";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";

const TEMPLATE_OPTIONS = seedTemplates.map((t) => ({ value: t.name, label: t.name }));

const SEGMENTATION_OPTIONS = [
  { value: "paragraph", label: "By paragraph" },
  { value: "page", label: "By page" },
  { value: "heading", label: "By heading" },
];

// ── per-document breakdown seed ────────────────────────────────────────────
type DocState = "done" | "queued" | "skipped";
interface DocRow {
  id: string;
  title: string;
  paragraphs: number;
  state: DocState;
  snippet: string;
}

const DOC_POOL = [
  "Velásquez-Rodríguez v. Honduras — Judgment",
  "Bámaca-Velásquez v. Guatemala — Merits",
  "Masacre de El Mozote v. El Salvador — Reparations",
  "Gómez-Paquiyauri v. Perú — Judgment",
  "Loayza-Tamayo v. Perú — Merits",
  "Castillo-Páez v. Perú — Judgment",
  '"Niños de la Calle" v. Guatemala — Merits',
  "19 Comerciantes v. Colombia — Judgment",
  "La Cantuta v. Perú — Reparations",
  "Goiburú y otros v. Paraguay — Judgment",
  "Almonacid-Arellano v. Chile — Preliminary Objections",
  "Yatama v. Nicaragua — Judgment",
];

const SNIPPETS = [
  "The Court finds that the State has the obligation to investigate every situation involving a violation of the rights protected by the Convention.",
  "Forced disappearance constitutes a multiple and continuous violation of several rights recognized in the American Convention.",
  "The duty to investigate must be undertaken in a serious manner and not as a mere formality preordained to be ineffective.",
  "Reparations consist of measures that tend to eliminate the effects of the violations committed.",
  "An illegal detention, even if brief, constitutes a breach of the obligations imposed on States Parties.",
  "The protection of the law is exercised basically through the recourse of habeas corpus and amparo.",
  "Children, by reason of their physical and emotional development, require special measures of protection.",
  "The State must guarantee that the facts will not be repeated, as a measure of non-repetition.",
];

/** Deterministic per-document breakdown. ~8–12 rows, varied state + counts. */
function seedDocs(seed: string): DocRow[] {
  // Length keyed loosely on the template name so it feels stable per job.
  const count = 8 + (seed.length % 5); // 8–12
  return DOC_POOL.slice(0, count).map((title, i) => {
    const state: DocState = i % 5 === 3 ? "skipped" : i % 3 === 2 ? "queued" : "done";
    const paragraphs = state === "skipped" ? 0 : 18 + ((i * 23) % 140);
    return {
      id: `d${i}`,
      title,
      paragraphs,
      state,
      snippet: SNIPPETS[i % SNIPPETS.length],
    };
  });
}

const STATE_META: Record<DocState, { label: string; cls: string }> = {
  done: { label: "Done", cls: "bg-success-light text-success" },
  queued: { label: "Queued", cls: "bg-carbon-tint text-carbon" },
  skipped: { label: "Skipped", cls: "bg-warning-light text-warning" },
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "done", label: "Done" },
  { value: "queued", label: "Queued" },
  { value: "skipped", label: "Skipped" },
];

/** Paragraph-extraction detail — the cockpit. "new" configures a fresh job
 *  (template + segmentation + min characters, then Start); an existing job
 *  surfaces live stats, a Run action, and a per-document breakdown table. */
export function ParagraphJobEditor({
  job,
  onClose,
}: {
  job: SettingsParagraphJob | "new";
  onClose: () => void;
}) {
  const notify = useNotify();
  const toast = (message: string) => notify(message, "success");
  const { record } = useSettingsNotify();

  const isNew = job === "new";
  const base = isNew ? undefined : job;

  // The job's configuration. The footer runs the job whether or not it changed.
  const { draft, setField } = useSettingsDraft({
    id: `paragraph-job:${base?.id ?? "new"}`,
    label: "Extraction settings",
    saved: { template: base?.template ?? TEMPLATE_OPTIONS[0].value, segmentation: "paragraph", minChars: "40" },
  });
  const { template, segmentation, minChars } = draft;
  const setTemplate = setField("template");
  const setSegmentation = setField("segmentation");
  const setMinChars = setField("minChars");
  const [filter, setFilter] = useState("all");
  const [rows] = useState<DocRow[]>(() => (isNew ? [] : seedDocs(base!.template)));

  const documents = rows.length;
  const totalParagraphs = rows.reduce((sum, r) => sum + r.paragraphs, 0);

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.state === filter)),
    [rows, filter],
  );

  const runExtraction = () => toast("Extraction queued — runs in the background");
  const rerunDoc = (title: string) => toast(`Re-running extraction for ${title.split(" — ")[0]}`);

  const save = () => {
    record({ log: false,
      method: isNew ? "CREATE" : "UPDATE",
      domain: "paragraphJob",
      noun: "paragraph extraction for",
      id: base?.id,
      name: template,
      message: isNew ? "Extraction started" : "Extraction re-run queued",
    });
    onClose();
  };

  const columns: Column<DocRow>[] = [
    {
      id: "title",
      header: "Document",
      cell: (r) => <span className="text-sm font-medium text-ink truncate">{r.title}</span>,
    },
    {
      id: "paragraphs",
      header: "Paragraphs",
      width: "7rem",
      cell: (r) => <span className="text-sm text-ink-secondary tabular-nums">{r.paragraphs.toLocaleString()}</span>,
    },
    {
      id: "state",
      header: "State",
      width: "6rem",
      cell: (r) => (
        <span className={`text-meta font-semibold px-1.5 py-0.5 rounded-md w-fit ${STATE_META[r.state].cls}`}>
          {STATE_META[r.state].label}
        </span>
      ),
    },
    {
      id: "snippet",
      header: "Sample paragraph",
      width: "20rem",
      cell: (r) =>
        r.state === "skipped" ? (
          <span className="text-ink-muted">—</span>
        ) : (
          <span className="text-xs text-ink-tertiary truncate" title={r.snippet}>
            {r.snippet}
          </span>
        ),
    },
    {
      id: "actions",
      header: "",
      width: "4.5rem",
      align: "right",
      cell: (r) => (
        <button
          onClick={() => rerunDoc(r.title)}
          aria-label={`Re-run extraction for ${r.title}`}
          className="p-1 rounded text-ink-tertiary hover:bg-carbon-tint hover:text-carbon transition-colors cursor-pointer"
        >
          <RotateCw size={14} />
        </button>
      ),
    },
  ];

  return (
    <SettingsEditor
      component="ParagraphJobEditor"
      path={["Paragraph extraction"]}
      title={isNew ? "New extraction" : base!.template}
      onBack={onClose}
      intro="Split every document of a template into paragraph-level records for fine-grained search."
      isNew={isNew}
      createLabel="Start extraction"
      saveLabel="Re-run"
      // The commit runs the job, so it is always available; the settings
      // draft still guards an unsaved change on the way out.
      dirty
      onSave={save}
      footerStart={<LastSavedLine domain="paragraphJob" id={base?.id} />}
      wide
    >
      <SettingsSection>
        <div className="grid sm:grid-cols-3 gap-3">
          <SettingsField label="Template">
            {isNew ? (
              <Select value={template} options={TEMPLATE_OPTIONS} onChange={setTemplate} ariaLabel="Template" />
            ) : (
              <span className="text-sm text-ink py-2">{base!.template}</span>
            )}
          </SettingsField>
          <SettingsField label="Segmentation" hint="How documents are split into records.">
            <Select value={segmentation} options={SEGMENTATION_OPTIONS} onChange={setSegmentation} ariaLabel="Segmentation" />
          </SettingsField>
          <SettingsField label="Min characters" hint="Drop fragments shorter than this.">
            <TextInput
              value={minChars}
              inputMode="numeric"
              onChange={(e) => setMinChars(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="40"
            />
          </SettingsField>
        </div>
      </SettingsSection>

      {!isNew && (
        <SettingsSection
          title="Last run"
          action={
            <SettingsButton variant="secondary" size="sm" icon={<Play size={14} />} onClick={runExtraction}>
              Run extraction
            </SettingsButton>
          }
        >
          <dl data-part="stats" className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
            <SettingsStat label="Documents" value={documents} />
            <SettingsStat label="Paragraphs" value={totalParagraphs.toLocaleString()} />
            <SettingsStat label="Status" value={<StatusPill status={base!.status} />} />
            <SettingsStat label="Last run" value="2 days ago" />
          </dl>
        </SettingsSection>
      )}

      {!isNew && (
        <SettingsSection
          title={
            <>
              Documents <span className="text-ink-tertiary font-normal">({visible.length})</span>
            </>
          }
          action={<Select value={filter} options={FILTERS} onChange={setFilter} ariaLabel="Filter documents" />}
        >
          <SettingsTable
            columns={columns}
            data={visible}
            getRowId={(r) => r.id}
            emptyState={<SettingsEmptyState title="No documents in this view" hint="Change the filter to see other documents." />}
          />
        </SettingsSection>
      )}
    </SettingsEditor>
  );
}
