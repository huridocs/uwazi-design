import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FieldMessage, issueBorderClass } from "../shared/FieldMessage";
import type { ValidationIssue } from "../../utils/validation";
import {
  chapterRows,
  mediaConfigIsJson,
  parseMediaValue,
  serializeMediaValue,
  splitMediaValue,
  timecodeToSeconds,
  type ChapterRow,
} from "../../utils/mediaValue";

interface Row extends ChapterRow {
  /** Stable React key: rows move when they are put back in time order. */
  key: number;
}

/** What is wrong with an EDITED media value, most pressing first, plus which
 *  controls to mark `aria-invalid`. An untouched value is never judged — the
 *  stored data is what it is, and Save must hand it back byte-identical. */
function validate(url: string, rows: Row[]): {
  issue: ValidationIssue | null;
  badUrl: boolean;
  badTime: Set<number>;
  badLabel: Set<number>;
} {
  const badTime = new Set<number>();
  const badLabel = new Set<number>();
  let first: ValidationIssue | null = null;
  const err = (message: string) => {
    first ??= { severity: "error", message };
  };

  const address = url.trim();
  const badUrl = address ? parseMediaValue(address) === null : rows.length > 0;
  if (badUrl) {
    err(address ? "The video address must be a web address (https://…)." : "Add the video address, or remove its chapters.");
  }

  const seen = new Map<number, number>();
  rows.forEach((r, i) => {
    const n = i + 1;
    const seconds = timecodeToSeconds(r.time);
    if (seconds === null) {
      badTime.add(r.key);
      err(`Chapter ${n}: use HH:MM:SS or MM:SS.`);
    } else if (seen.has(seconds)) {
      badTime.add(r.key);
      err(`Chapter ${n} starts at the same time as chapter ${(seen.get(seconds) ?? 0) + 1}.`);
    } else {
      seen.set(seconds, i);
    }
    if (!r.label.trim()) {
      badLabel.add(r.key);
      err(`Chapter ${n} needs a title.`);
    }
  });

  return { issue: first, badUrl, badTime, badLabel };
}

/** The media property in the entity edit form: the video address, and its
 *  chapters as rows of a timestamp and a title that can be edited, added,
 *  removed and put back in time order.
 *
 *  THE VALUE IS ONLY REWRITTEN BY AN EDIT. The editor opens on the stored
 *  string, splits it for display, and writes nothing back until the reader
 *  changes the address or a chapter — so Save on an untouched form returns the
 *  exact bytes it read. That is what keeps the 18 configs that are not valid
 *  JSON, and the one address missing its "h", stored as they are unless someone
 *  edits them; both say so here, because an edit DOES rewrite them (as valid
 *  JSON, from the chapters that could be recovered). Once edited, the value is
 *  written in Uwazi's `URL, {"timelinks": {…}}` shape by `serializeMediaValue`.
 *
 *  Not armed for click-to-fill, like the date input: a passage of prose is not
 *  a web address or a timecode. */
export function MediaFieldEditor({
  inputId,
  label,
  value,
  onChange,
  onIssue,
  describedBy,
}: {
  /** The address input's id — what the section label's `htmlFor` names. */
  inputId: string;
  /** The property's label, for naming the chapter controls. */
  label: string;
  /** The stored (or, once edited, re-serialised) value. */
  value: string;
  onChange: (raw: string) => void;
  /** The editor's own verdict on an edited value; `null` when untouched or valid. */
  onIssue: (issue: ValidationIssue | null) => void;
  /** The field's message line, while it has something to say. */
  describedBy?: string;
}) {
  // Seeded ONCE from the stored value. The form owns `value`; these are the
  // editable halves of it.
  const [initial] = useState(value);
  const [url, setUrl] = useState(() => splitMediaValue(value).head);
  const nextKey = useRef(0);
  const [rows, setRows] = useState<Row[]>(() =>
    chapterRows(value).map((r) => ({ ...r, key: nextKey.current++ })),
  );
  const [touched, setTouched] = useState(false);
  const timeRefs = useRef(new Map<number, HTMLInputElement>());
  const addRef = useRef<HTMLButtonElement>(null);
  /** Where focus goes once the rows have re-rendered: a new row's timestamp, or
   *  after a removal the neighbouring row (or "Add chapter" when none is left).
   *  An effect, not a frame callback — the element has to exist first. */
  const focusAfter = useRef<number | "add" | null>(null);
  useEffect(() => {
    const target = focusAfter.current;
    if (target === null) return;
    focusAfter.current = null;
    if (target === "add") addRef.current?.focus();
    else timeRefs.current.get(target)?.focus();
  }, [rows]);

  const commit = (nextUrl: string, nextRows: Row[]) => {
    setUrl(nextUrl);
    setRows(nextRows);
    setTouched(true);
    onChange(serializeMediaValue(nextUrl, nextRows));
    onIssue(validate(nextUrl, nextRows).issue);
  };

  const updateRow = (key: number, patch: Partial<ChapterRow>) =>
    commit(url, rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  /** Back in time order — on leaving a timestamp, and only once every timestamp
   *  reads, so a half-typed row doesn't jump away from the cursor. */
  const sortRows = () => {
    if (rows.some((r) => timecodeToSeconds(r.time) === null)) return;
    const sorted = [...rows].sort((a, b) => timecodeToSeconds(a.time)! - timecodeToSeconds(b.time)!);
    if (sorted.some((r, i) => r.key !== rows[i].key)) commit(url, sorted);
  };

  const addRow = () => {
    const key = nextKey.current++;
    focusAfter.current = key;
    commit(url, [...rows, { key, time: "", label: "" }]);
  };

  const removeRow = (key: number) => {
    const i = rows.findIndex((r) => r.key === key);
    const next = rows.filter((r) => r.key !== key);
    const neighbour = next[Math.min(i, next.length - 1)];
    focusAfter.current = neighbour ? neighbour.key : "add";
    commit(url, next);
  };

  const { badUrl, badTime, badLabel } = touched
    ? validate(url, rows)
    : { badUrl: false, badTime: new Set<number>(), badLabel: new Set<number>() };

  // What the STORED value is, said once, while it is still what is stored.
  const storedHead = splitMediaValue(initial).head;
  const notes: string[] = [];
  if (!touched && mediaConfigIsJson(initial) === false) {
    notes.push(
      `The stored chapter list is not valid JSON; ${rows.length} ${rows.length === 1 ? "chapter was" : "chapters were"} recovered from it. It is kept exactly as stored unless you change the media here — any change saves it as valid JSON.`,
    );
  }
  if (!touched && /^ttps?:\/\//.test(storedHead)) {
    notes.push("The stored address is missing its first letter. It plays because the app repairs it on read, and it is kept as stored unless you edit it.");
  }

  const chaptersId = `${inputId}-chapters`;
  const inputClass = (bad: boolean) =>
    `w-full min-w-0 px-3 py-2 text-sm text-ink bg-paper border rounded-md focus:outline-none
     focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 ${issueBorderClass(bad ? { severity: "error", message: "" } : null)}`;

  return (
    <div data-component="MediaFieldEditor" data-state={touched ? "edited" : "stored"} className="flex flex-col gap-3 min-w-0">
      <input
        id={inputId}
        type="url"
        inputMode="url"
        value={url}
        placeholder="https://youtu.be/…"
        onChange={(e) => commit(e.target.value, rows)}
        aria-invalid={badUrl || undefined}
        aria-describedby={describedBy}
        className={inputClass(badUrl)}
      />

      {notes.map((note) => (
        <FieldMessage key={note} issue={{ severity: "warning", message: note }} />
      ))}

      <div role="group" aria-labelledby={chaptersId} data-part="chapters" className="flex flex-col gap-2">
        <span id={chaptersId} className="text-xs font-medium text-ink-secondary">
          Chapters
        </span>
        {rows.length > 0 && (
          <ol className="flex flex-col gap-1.5">
            {rows.map((r, i) => (
              <li key={r.key} data-part="chapter" className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-2">
                <input
                  ref={(el) => {
                    if (el) timeRefs.current.set(r.key, el);
                    else timeRefs.current.delete(r.key);
                  }}
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={r.time}
                  placeholder="00:00:00"
                  aria-label={`${label} chapter ${i + 1} start time`}
                  aria-invalid={badTime.has(r.key) || undefined}
                  onChange={(e) => updateRow(r.key, { time: e.target.value })}
                  onBlur={sortRows}
                  className={`${inputClass(badTime.has(r.key))} font-mono tabular-nums`}
                />
                <input
                  type="text"
                  value={r.label}
                  placeholder="What happens here"
                  aria-label={`${label} chapter ${i + 1} title`}
                  aria-invalid={badLabel.has(r.key) || undefined}
                  onChange={(e) => updateRow(r.key, { label: e.target.value })}
                  className={inputClass(badLabel.has(r.key))}
                />
                <button
                  type="button"
                  onClick={() => removeRow(r.key)}
                  aria-label={`Remove chapter ${i + 1}${r.label.trim() ? `, ${r.label.trim()}` : ""}`}
                  className="p-2 rounded-md text-ink-tertiary hover:bg-seal-tint hover:text-seal-label transition-colors cursor-pointer
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ol>
        )}
        <button
          ref={addRef}
          type="button"
          onClick={addRow}
          className="inline-flex w-fit items-center gap-1.5 px-2 py-1 -mx-2 rounded-md text-xs font-medium text-ink-secondary
            hover:bg-warm hover:text-ink transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
        >
          <Plus size={12} aria-hidden />
          Add chapter
        </button>
      </div>
    </div>
  );
}
