import { useMemo, useState } from "react";
import { useSetAtom } from "jotai";
import { Sparkles, Check, X } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Field, TextInput } from "../Field";
import { Select } from "../../shared/Select";
import { Table, type Column } from "../Table";
import { seedTemplates, type SettingsExtractor } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

const TEMPLATE_OPTIONS = seedTemplates.map((t) => ({ value: t.name, label: t.name }));
const TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "date", label: "Date" },
  { value: "number", label: "Number" },
  { value: "select", label: "Select" },
];

// ── suggestion cockpit seed ────────────────────────────────────────────────
type SuggestionState = "match" | "empty" | "mismatch" | "accepted";
interface Suggestion {
  id: string;
  entity: string;
  current: string;
  suggested: string;
  confidence: number;
  state: SuggestionState;
}

const ENTITY_POOL = [
  "Velásquez-Rodríguez v. Honduras",
  "Bámaca-Velásquez v. Guatemala",
  "Masacre de El Mozote v. El Salvador",
  "Gómez-Paquiyauri v. Perú",
  "Loayza-Tamayo v. Perú",
  "Castillo-Páez v. Perú",
  '"Niños de la Calle" v. Guatemala',
  "19 Comerciantes v. Colombia",
  "La Cantuta v. Perú",
  "Goiburú y otros v. Paraguay",
  "Almonacid-Arellano v. Chile",
  "Yatama v. Nicaragua",
];
const DATES = ["29/07/1988", "25/11/2000", "25/10/2012", "08/07/2004", "17/09/1997", "03/11/1997", "19/11/1999", "05/07/2004", "29/11/2006", "22/09/2006", "26/09/2006", "23/06/2005"];
const COUNTRIES = ["Honduras", "Guatemala", "El Salvador", "Perú", "Perú", "Perú", "Guatemala", "Colombia", "Perú", "Paraguay", "Chile", "Nicaragua"];

/** Deterministic suggested value, shaped by the property name. */
function sampleValue(property: string, i: number): string {
  const p = property.toLowerCase();
  if (/date|fecha|filed|sentenc/.test(p)) return DATES[i % DATES.length];
  if (/country|pa[ií]s|state|estado/.test(p)) return COUNTRIES[i % COUNTRIES.length];
  return `${property || "Value"} — ${ENTITY_POOL[i % ENTITY_POOL.length].split(" v. ")[0]}`;
}

function seedSuggestions(property: string): Suggestion[] {
  return ENTITY_POOL.map((entity, i) => {
    const suggested = sampleValue(property, i);
    let current: string;
    if (i % 4 === 1) current = ""; // model found a value where none exists
    else if (i % 5 === 2) current = sampleValue(property, i + 7); // disagreement
    else current = suggested; // confirms the stored value
    const confidence = 72 + ((i * 7) % 27); // 72–98
    const state: SuggestionState = current === "" ? "empty" : current === suggested ? "match" : "mismatch";
    return { id: `s${i}`, entity, current, suggested, confidence, state };
  });
}

const STATE_META: Record<SuggestionState, { label: string; cls: string }> = {
  match: { label: "Matches", cls: "bg-success-light text-success" },
  empty: { label: "Empty", cls: "bg-carbon-tint text-carbon" },
  mismatch: { label: "Mismatch", cls: "bg-warning-light text-warning" },
  accepted: { label: "Accepted", cls: "bg-success-light text-success" },
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "mismatch", label: "Mismatch" },
  { value: "empty", label: "Empty" },
  { value: "accepted", label: "Accepted" },
];

/** Extractor detail — the Information-Extraction cockpit. Config (template +
 *  property + type) on top, then live stats and a per-entity suggestions review
 *  table (current vs. suggested value, confidence, accept/reject). Opened from
 *  the Metadata Extraction list (list → detail). */
export function ExtractorEditor({
  extractor,
  onClose,
}: {
  extractor: SettingsExtractor | "new";
  onClose: () => void;
}) {
  const setToasts = useSetAtom(toastsAtom);
  const toast = (message: string) =>
    setToasts((p) => [...p, { id: Date.now().toString(), message, type: "success" as const }]);

  const isNew = extractor === "new";
  const base = isNew ? undefined : extractor;

  const [template, setTemplate] = useState(base?.template ?? TEMPLATE_OPTIONS[0].value);
  const [property, setProperty] = useState(base?.property ?? "");
  const [propType, setPropType] = useState("text");
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState<Suggestion[]>(() => (isNew ? [] : seedSuggestions(base!.property)));

  const dirty =
    template !== (base?.template ?? TEMPLATE_OPTIONS[0].value) || property !== (base?.property ?? "");

  // Live stats over the current suggestion set.
  const reviewed = rows.filter((r) => r.state === "accepted").length;
  const pending = rows.filter((r) => r.state === "mismatch" || r.state === "empty").length;
  const accuracy = rows.length
    ? Math.round((rows.filter((r) => r.state === "match" || r.state === "accepted").length / rows.length) * 100)
    : base?.accuracy ?? null;

  const visible = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "pending") return rows.filter((r) => r.state === "mismatch" || r.state === "empty");
    return rows.filter((r) => r.state === filter);
  }, [rows, filter]);

  const accept = (id: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, current: r.suggested, state: "accepted" } : r)));
  const reject = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));
  const acceptAll = () => {
    const n = rows.filter((r) => r.state !== "accepted").length;
    setRows((prev) => prev.map((r) => ({ ...r, current: r.suggested, state: "accepted" })));
    toast(`Accepted ${n} suggestion${n === 1 ? "" : "s"}`);
  };
  const findSuggestions = () => {
    setRows(seedSuggestions(property || base?.property || "Value"));
    setFilter("all");
    toast("Finding suggestions — this runs in the background");
  };

  const save = () => {
    toast(isNew ? "Extractor created" : `${property || "Extractor"} saved`);
    onClose();
  };

  const columns: Column<Suggestion>[] = [
    {
      id: "entity",
      header: "Entity",
      cell: (r) => <span className="text-sm font-medium text-ink truncate">{r.entity}</span>,
    },
    {
      id: "current",
      header: "Current value",
      width: "12rem",
      cell: (r) =>
        r.current ? (
          <span className="text-sm text-ink-secondary truncate">{r.current}</span>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
    {
      id: "suggested",
      header: "Suggested",
      width: "12rem",
      cell: (r) => <span className="text-sm text-ink truncate">{r.suggested}</span>,
    },
    {
      id: "confidence",
      header: "Score",
      width: "5rem",
      cell: (r) => <span className="text-xs text-ink-tertiary tabular-nums">{r.confidence}%</span>,
    },
    {
      id: "state",
      header: "State",
      width: "7rem",
      cell: (r) => (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md w-fit ${STATE_META[r.state].cls}`}>
          {STATE_META[r.state].label}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      width: "5rem",
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => accept(r.id)}
            disabled={r.state === "accepted"}
            aria-label={`Accept suggestion for ${r.entity}`}
            className="p-1 rounded text-success hover:bg-success-light transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => reject(r.id)}
            aria-label={`Reject suggestion for ${r.entity}`}
            className="p-1 rounded text-ink-tertiary hover:bg-seal-tint hover:text-seal transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <SettingsContent>
      <SettingsContent.Header path={["Metadata Extraction"]} title={isNew ? "New extractor" : base!.property} onBack={onClose} />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6">
          {/* Config */}
          <section className="grid sm:grid-cols-3 gap-3">
            <Field label="Template">
              <Select value={template} options={TEMPLATE_OPTIONS} onChange={setTemplate} ariaLabel="Template" />
            </Field>
            <Field label="Property" hint="The metadata property to suggest values for.">
              <TextInput value={property} onChange={(e) => setProperty(e.target.value)} placeholder="e.g. Date filed" />
            </Field>
            <Field label="Property type">
              <Select value={propType} options={TYPE_OPTIONS} onChange={setPropType} ariaLabel="Property type" />
            </Field>
          </section>

          {/* Stats + train */}
          {!isNew && (
            <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
              <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
                  <Stat label="Documents" value={base!.documents} />
                  <Stat label="Reviewed" value={reviewed} />
                  <Stat label="Pending" value={pending} />
                  <Stat label="Accuracy" value={accuracy === null ? "—" : `${accuracy}%`} />
                </div>
                <Button variant="primary" size="sm" icon={<Sparkles size={14} />} onClick={findSuggestions}>
                  Find suggestions
                </Button>
              </div>

              {/* Review table */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold text-ink">
                  Suggestions <span className="text-ink-tertiary font-normal">({visible.length})</span>
                </h3>
                <div className="flex items-center gap-2">
                  <Select value={filter} options={FILTERS} onChange={setFilter} ariaLabel="Filter suggestions" />
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Check size={14} />}
                    onClick={acceptAll}
                    disabled={!rows.some((r) => r.state !== "accepted")}
                  >
                    Accept all
                  </Button>
                </div>
              </div>
              <Table columns={columns} data={visible} getRowId={(r) => r.id} emptyState="No suggestions in this view." />
            </section>
          )}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="success" size="sm" disabled={!dirty || !property} onClick={save}>
          {isNew ? "Create extractor" : "Save"}
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
