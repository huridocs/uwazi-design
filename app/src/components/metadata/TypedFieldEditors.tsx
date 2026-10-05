import { useState, type HTMLAttributes, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import type { MetadataField } from "../../data/metadata";
import { toDateInputValue } from "../../utils/dateValue";
import { listDate, withDates, withGeo, withLink, withRanges } from "../../utils/typedValues";

/** Editors for the Uwazi property types the form had no editor for (step M4,
 *  template-schema-spec.md §2.1): numeric, multidate, daterange,
 *  multidaterange, link, geolocation, generated id and image. Each writes its
 *  typed value through `onPatch`, which also carries the recomputed `value`
 *  (utils/typedValues.ts). Text, markdown, date, select, multiselect, media and
 *  relationship keep their existing editors in the form.
 *
 *  Returns null for a type it does not handle, so the form falls through to its
 *  own editors. */

export interface TypedEditorProps {
  field: MetadataField;
  inputId: string;
  onPatch: (patch: Partial<MetadataField>) => void;
  /** The form's input skin for this field (armed ring, issue border). */
  inputClass: string;
  /** Focus and click handlers that arm click-to-fill, for the editors whose
   *  type takes a value from a passage (numeric, link URL, generated id). */
  armProps?: HTMLAttributes<HTMLInputElement>;
  aria?: HTMLAttributes<HTMLInputElement>;
  onBlur?: (value: string) => void;
  /** The entity's image files, for an image property's picker. The property
   *  stores the file's id, as the Artworks seed does. */
  images?: { id: string; name: string; url: string }[];
}

const SMALL_BUTTON =
  "inline-flex items-center gap-1 px-2 h-7 text-xs font-medium text-ink-secondary rounded-md hover:bg-warm hover:text-ink transition-colors cursor-pointer";
const REMOVE_BUTTON =
  "shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink transition-colors cursor-pointer";

export function TypedFieldEditor(props: TypedEditorProps): ReactNode | null {
  switch (props.field.propertyType) {
    case "numeric":
      return <NumericEditor {...props} />;
    case "generatedid":
      return <GeneratedIdEditor {...props} />;
    case "multidate":
      return <DateListEditor {...props} />;
    case "daterange":
      return <RangeEditor {...props} multi={false} />;
    case "multidaterange":
      return <RangeEditor {...props} multi />;
    case "link":
      return <LinkEditor {...props} />;
    case "geolocation":
      return <GeoEditor {...props} />;
    case "image":
      return <ImageEditor {...props} />;
    default:
      return null;
  }
}

function NumericEditor({ field, inputId, onPatch, inputClass, armProps, aria, onBlur }: TypedEditorProps) {
  return (
    <input
      id={inputId}
      data-fill-id={field.id}
      type="number"
      inputMode="decimal"
      step="any"
      value={field.value}
      {...armProps}
      onChange={(e) => onPatch({ value: e.target.value })}
      onBlur={(e) => onBlur?.(e.currentTarget.value)}
      {...aria}
      className={`${inputClass} tabular-nums`}
    />
  );
}

function GeneratedIdEditor({ field, inputId, onPatch, inputClass, armProps, aria, onBlur }: TypedEditorProps) {
  return (
    <input
      id={inputId}
      data-fill-id={field.id}
      type="text"
      value={field.value}
      {...armProps}
      onChange={(e) => onPatch({ value: e.target.value })}
      onBlur={(e) => onBlur?.(e.currentTarget.value)}
      {...aria}
      className={`${inputClass} font-mono`}
    />
  );
}

function DateListEditor({ field, inputId, onPatch, inputClass, aria }: TypedEditorProps) {
  const dates = field.dates ?? [];
  const set = (next: string[]) => onPatch(withDates(next));
  return (
    <div data-component="DateListEditor" className="space-y-1.5">
      {dates.map((d, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            id={i === 0 ? inputId : `${inputId}-${i}`}
            type="date"
            aria-label={`${field.label} ${i + 1}`}
            value={toDateInputValue(d)}
            onChange={(e) => set(dates.map((x, j) => (j === i ? listDate(e.target.value, x) : x)))}
            {...(i === 0 ? aria : {})}
            className={inputClass}
          />
          <button type="button" aria-label={`Remove date ${i + 1}`} onClick={() => set(dates.filter((_, j) => j !== i))} className={REMOVE_BUTTON}>
            <X size={14} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => set([...dates, ""])} className={SMALL_BUTTON}>
        <Plus size={13} /> Add date
      </button>
    </div>
  );
}

function RangeEditor({ field, inputId, onPatch, inputClass, aria, multi }: TypedEditorProps & { multi: boolean }) {
  const ranges = field.ranges?.length ? field.ranges : multi ? [] : [{ from: "", to: "" }];
  const set = (next: { from: string; to: string }[]) => onPatch(withRanges(next, multi));
  const edit = (i: number, end: "from" | "to", iso: string) =>
    set(ranges.map((r, j) => (j === i ? { ...r, [end]: listDate(iso, r[end]) } : r)));
  return (
    <div data-component="RangeEditor" className="space-y-1.5">
      {ranges.map((r, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            id={i === 0 ? inputId : `${inputId}-${i}-from`}
            type="date"
            aria-label={`${field.label}${multi ? ` ${i + 1}` : ""}, from`}
            value={toDateInputValue(r.from)}
            onChange={(e) => edit(i, "from", e.target.value)}
            {...(i === 0 ? aria : {})}
            className={inputClass}
          />
          <span aria-hidden className="text-ink-tertiary text-sm">–</span>
          <input
            id={`${inputId}-${i}-to`}
            type="date"
            aria-label={`${field.label}${multi ? ` ${i + 1}` : ""}, to`}
            value={toDateInputValue(r.to)}
            onChange={(e) => edit(i, "to", e.target.value)}
            className={inputClass}
          />
          {multi && (
            <button type="button" aria-label={`Remove range ${i + 1}`} onClick={() => set(ranges.filter((_, j) => j !== i))} className={REMOVE_BUTTON}>
              <X size={14} />
            </button>
          )}
        </div>
      ))}
      {multi && (
        <button type="button" onClick={() => set([...ranges, { from: "", to: "" }])} className={SMALL_BUTTON}>
          <Plus size={13} /> Add range
        </button>
      )}
    </div>
  );
}

function LinkEditor({ field, inputId, onPatch, inputClass, armProps, aria, onBlur }: TypedEditorProps) {
  const link = field.link ?? { label: "", url: field.value ?? "" };
  return (
    <div data-component="LinkEditor" className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <input
        type="text"
        aria-label={`${field.label}, label`}
        placeholder="Label"
        value={link.label}
        onChange={(e) => onPatch(withLink({ ...link, label: e.target.value }))}
        className={inputClass}
      />
      <input
        id={inputId}
        data-fill-id={field.id}
        type="url"
        aria-label={`${field.label}, URL`}
        placeholder="https://"
        value={link.url}
        {...armProps}
        onChange={(e) => onPatch(withLink({ ...link, url: e.target.value }))}
        onBlur={(e) => onBlur?.(e.currentTarget.value)}
        {...aria}
        className={inputClass}
      />
    </div>
  );
}

/** A coordinate as typed: a number within its range, or why not. */
function coordIssue(raw: string, max: number, name: string): string | null {
  if (!raw.trim()) return null;
  const n = Number(raw);
  return Number.isFinite(n) && Math.abs(n) <= max ? null : `${name} runs from -${max} to ${max}`;
}

function GeoEditor({ field, inputId, onPatch, inputClass, aria }: TypedEditorProps) {
  // The two numbers are held as typed, so "-12." survives while it is being
  // written. The field holds a place only while both are numbers in range:
  // clearing either coordinate, or typing one out of range, clears it.
  const [lat, setLat] = useState(field.geo ? String(field.geo.lat) : "");
  const [lon, setLon] = useState(field.geo ? String(field.geo.lon) : "");
  const label = field.geo?.label ?? "";
  const latIssue = coordIssue(lat, 90, "Latitude");
  const lonIssue = coordIssue(lon, 180, "Longitude");
  const commit = (a: string, b: string, name: string) => {
    const ok = a.trim() && b.trim() && !coordIssue(a, 90, "") && !coordIssue(b, 180, "");
    if (ok) onPatch(withGeo({ lat: Number(a), lon: Number(b), ...(name.trim() ? { label: name } : {}) }));
    else if (field.geo) onPatch(withGeo(undefined));
  };
  const issueId = `${inputId}-geo-issue`;
  const describedBy =
    [aria?.["aria-describedby"], latIssue || lonIssue ? issueId : undefined].filter(Boolean).join(" ") || undefined;
  return (
    <div data-component="GeoEditor" className="space-y-1">
      <div className="grid gap-1.5 grid-cols-2 sm:grid-cols-[8rem_8rem_minmax(0,1fr)]">
        <input
          {...aria}
          id={inputId}
          type="number"
          step="any"
          min={-90}
          max={90}
          aria-label={`${field.label}, latitude`}
          aria-invalid={!!latIssue || aria?.["aria-invalid"] || undefined}
          aria-describedby={describedBy}
          placeholder="Latitude"
          value={lat}
          onChange={(e) => {
            setLat(e.target.value);
            commit(e.target.value, lon, label);
          }}
          className={`${inputClass} tabular-nums`}
        />
        <input
          type="number"
          step="any"
          min={-180}
          max={180}
          aria-label={`${field.label}, longitude`}
          aria-invalid={!!lonIssue || undefined}
          aria-describedby={latIssue || lonIssue ? issueId : undefined}
          placeholder="Longitude"
          value={lon}
          onChange={(e) => {
            setLon(e.target.value);
            commit(lat, e.target.value, label);
          }}
          className={`${inputClass} tabular-nums`}
        />
        <input
          type="text"
          aria-label={`${field.label}, place name`}
          placeholder="Place name (optional)"
          value={label}
          disabled={!field.geo}
          onChange={(e) => field.geo && onPatch(withGeo({ ...field.geo, label: e.target.value }))}
          className={`${inputClass} col-span-2 sm:col-span-1`}
        />
      </div>
      {/* Mounted at a fixed height so the form does not move as it shows. */}
      <p id={issueId} role="status" className="min-h-4 text-meta leading-4 text-seal-label">
        {latIssue ?? lonIssue}
      </p>
    </div>
  );
}

function ImageEditor({ field, inputId, onPatch, inputClass, images = [] }: TypedEditorProps) {
  if (!images.length && !field.value)
    return <p className="text-xs text-ink-tertiary">Attach an image in the Files tab, then pick it here.</p>;
  // A value saved as the file's URL reads as that file.
  const current = images.find((i) => i.id === field.value || i.url === field.value)?.id ?? field.value;
  return (
    <select id={inputId} value={current} onChange={(e) => onPatch({ value: e.target.value })} className={inputClass}>
      <option value="">No image</option>
      {current && !images.some((i) => i.id === current) && <option value={current}>Current image</option>}
      {images.map((i) => (
        <option key={i.id} value={i.id}>
          {i.name}
        </option>
      ))}
    </select>
  );
}
