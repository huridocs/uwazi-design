import { useMemo, useState } from "react";
import { useSetAtom } from "jotai";
import { Play, RotateCw } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Field, TextInput } from "../Field";
import { Select } from "../../shared/Select";
import { StatusPill } from "../StatusPill";
import { Table, type Column } from "../Table";
import { seedTemplates, type SettingsParagraphJob } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

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
  const setToasts = useSetAtom(toastsAtom);
  const toast = (message: string) =>
    setToasts((p) => [...p, { id: Date.now().toString(), message, type: "success" as const }]);

  const isNew = job === "new";
  const base = isNew ? undefined : job;

  const [template, setTemplate] = useState(base?.template ?? TEMPLATE_OPTIONS[0].value);
  const [segmentation, setSegmentation] = useState("paragraph");
  const [minChars, setMinChars] = useState("40");
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
    toast(isNew ? "Extraction started" : "Extraction re-run queued");
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
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md w-fit ${STATE_META[r.state].cls}`}>
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
    <SettingsContent>
      <SettingsContent.Header path={["Paragraph Extraction"]} title={isNew ? "New extraction" : base!.template} onBack={onClose} />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6">
          <p className="text-xs text-ink-tertiary">
            Split every document of a template into paragraph-level records for fine-grained search.
          </p>

          {/* Config */}
          <section className="grid sm:grid-cols-3 gap-3">
            <Field label="Template">
              {isNew ? (
                <Select value={template} options={TEMPLATE_OPTIONS} onChange={setTemplate} ariaLabel="Template" />
              ) : (
                <span className="text-sm text-ink py-2">{base!.template}</span>
              )}
            </Field>
            <Field label="Segmentation" hint="How documents are split into records.">
              <Select value={segmentation} options={SEGMENTATION_OPTIONS} onChange={setSegmentation} ariaLabel="Segmentation" />
            </Field>
            <Field label="Min characters" hint="Drop fragments shorter than this.">
              <TextInput
                value={minChars}
                inputMode="numeric"
                onChange={(e) => setMinChars(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="40"
              />
            </Field>
          </section>

          {/* Stats + run */}
          {!isNew && (
            <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
              <div className="flex items-end justify-between gap-3 mb-4">
                <div className="grid grid-cols-4 gap-6">
                  <Stat label="Documents" value={documents} />
                  <Stat label="Paragraphs" value={totalParagraphs.toLocaleString()} />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-ink-tertiary uppercase tracking-wider">Status</span>
                    <StatusPill status={base!.status} />
                  </div>
                  <Stat label="Last run" value="2 days ago" />
                </div>
                <Button variant="primary" size="sm" icon={<Play size={14} />} onClick={runExtraction}>
                  Run extraction
                </Button>
              </div>

              {/* Per-document breakdown */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold text-ink">
                  Documents <span className="text-ink-tertiary font-normal">({visible.length})</span>
                </h3>
                <Select value={filter} options={FILTERS} onChange={setFilter} ariaLabel="Filter documents" />
              </div>
              <Table columns={columns} data={visible} getRowId={(r) => r.id} emptyState="No documents in this view." />
            </section>
          )}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={save}>
          {isNew ? "Start extraction" : "Re-run"}
        </Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-ink-tertiary uppercase tracking-wider">{label}</span>
      <span className="text-lg font-semibold text-ink tabular-nums">{value}</span>
    </div>
  );
}
