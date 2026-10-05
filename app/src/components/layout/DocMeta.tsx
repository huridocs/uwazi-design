import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileText, FileType, Code2, ExternalLink } from "lucide-react";
import { useAtom, useAtomValue } from "jotai";
import {
  documentGroupsAtom,
  activePrimaryGroupIdAtom,
} from "../../atoms/files";
import { documentFormatAtom, type DocumentFormat } from "../../atoms/selection";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { getEntity } from "../../data/entities";
import { getEntityProfile, type DocumentProvenance } from "../../data/entityProfiles";
import { EntityIdentity } from "../shared/EntityIdentity";

interface DocMetaProps {
  /** Show the format picker (PDF / Plain text / HTML). Only the Document tab
   *  wants it; the metadata/files headers pass false. */
  showPdfSelector?: boolean;
}

const FORMATS: { id: DocumentFormat; label: string; icon: typeof FileText }[] = [
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "text", label: "Plain text", icon: FileType },
  { id: "html", label: "HTML", icon: Code2 },
];

/** Entity header strip. Names the entity (type tag + its own title) and, on the
 *  Document tab, the document on screen plus a picker that switches between
 *  that document's renditions (PDF, plain text, HTML). */
export function DocMeta({ showPdfSelector = true }: DocMetaProps) {
  const groups = useAtomValue(documentGroupsAtom);
  const activeGroupId = useAtomValue(activePrimaryGroupIdAtom);
  const [format, setFormat] = useAtom(documentFormatAtom);
  const focusedId = useAtomValue(focusedEntityIdAtom);

  // The header names the entity, never a document. A group title names the
  // document, and a Causa without its own PDF borrows a connected Sentencia's
  // (`docFilesFor`), so the group title would name a different entity.
  // `getEntity` covers seed and CEJIL entities; an unresolved id shows
  // `EntityIdentity`'s "Unknown entity" rather than another document's name.
  const entity = getEntity(focusedId);
  const primaryGroups = groups
    .filter((g) => g.isPrimary)
    .sort((a, b) => a.order - b.order);
  // Same resolution as `DocumentViewer`, so this names what is rendered.
  const defaultGroup =
    primaryGroups.find((g) => g.id === activeGroupId) ?? primaryGroups[0];
  // The strip is the only place that names the document on screen, which
  // matters with several primary documents. Hidden when it repeats the entity
  // title (an entity that owns its document titles the group after itself).
  const docName =
    defaultGroup?.title && defaultGroup.title !== entity?.title ? defaultGroup.title : null;

  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [pickerOpen]);

  // Who issued the document on screen and where it was taken from, when the
  // collection says (the Nepal corpus's government PDFs). Document tab only.
  const provenance = showPdfSelector ? getEntityProfile(focusedId).documentProvenance : undefined;

  const activeFormat = FORMATS.find((f) => f.id === format) ?? FORMATS[0];
  const ActiveIcon = activeFormat.icon;

  return (
    <header
      data-component="DocMeta"
      /* Rendered inside a gutter host: no side padding of its own, and `bleed`
         so its bottom rule spans the pane. */
      className="@container bleed flex flex-col gap-1 pt-1 pb-2 shrink-0"
      style={{ borderBottom: "1px solid var(--border-primary)" }}
    >
      {/* min-h-8 + the header's padding is the strip's old min-h-11: a record
          without a provenance line keeps its height. */}
      <div data-part="row" className="flex items-center gap-2 min-h-8 min-w-0">
      {/* Stacked, like the drawer: tag over title. Side by side, a long template
          name ("Resolución de Presidencia de la CorteIDH") ran halfway across the
          strip and squeezed the entity's own name — squeezing the wrong thing. */}
      <EntityIdentity entity={entity} />

      {showPdfSelector && docName && (
        // Quiet, and only on the tab that actually shows a document. Shown only
        // where the STRIP is at least 40rem — its own width, not the viewport's:
        // beside a drawer at a tablet width the pane is ~380px, and an 18rem
        // name held its width while the entity's own title shrank to nothing.
        // Below that the strip has room for the entity and the picker; the
        // Files tab names the document.
        <span
          title={docName}
          data-part="document-name"
          className="hidden @[40rem]:block min-w-0 shrink max-w-[18rem] truncate text-meta text-ink-tertiary"
        >
          {docName}
        </span>
      )}

      {showPdfSelector && (
        <div ref={pickerRef} data-part="format-picker" className="relative shrink-0">
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            data-part="trigger"
            aria-haspopup="menu"
            aria-expanded={pickerOpen}
            aria-label="Document format"
            className="flex items-center gap-1.5 pl-2 pr-2 py-1 text-xs font-medium text-ink-secondary rounded-md bg-warm hover:bg-parchment transition-colors cursor-pointer"
          >
            <ActiveIcon size={12} className="text-ink-tertiary" />
            {activeFormat.label}
            <ChevronDown
              size={12}
              className={`text-ink-tertiary transition-transform ${pickerOpen ? "rotate-180" : ""}`}
            />
          </button>
          {pickerOpen && (
            <div
              role="menu"
              data-part="menu"
              className="absolute end-0 top-full mt-1 z-30 min-w-40 rounded-md bg-paper border border-border shadow-xl py-1 animate-fade-in-up"
            >
              {FORMATS.map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="menuitem"
                    data-part="option"
                    data-format={f.id}
                    aria-current={f.id === format || undefined}
                    onClick={() => {
                      setFormat(f.id);
                      setPickerOpen(false);
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-start transition-colors cursor-pointer ${
                      f.id === format
                        ? "bg-vellum text-ink font-semibold"
                        : "text-ink-secondary hover:bg-warm"
                    }`}
                  >
                    <Icon size={12} className="text-ink-tertiary shrink-0" />
                    <span className="truncate">{f.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>
      {provenance && <DocProvenance provenance={provenance} />}
    </header>
  );
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** The document's issuer, date and source, and how its text was made. One
 *  quiet line under the strip; it wraps on a phone rather than truncating the
 *  issuer. The licence basis is the source link's title: it is a sentence, and
 *  the link is where a reader goes to check it. */
function DocProvenance({ provenance }: { provenance: DocumentProvenance }) {
  const { issuer, sourceUrl, dateLine, licenceBasis, textNote } = provenance;
  return (
    <p
      data-part="provenance"
      className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0 text-meta text-ink-tertiary leading-snug"
    >
      <span className="text-ink-secondary">{issuer}</span>
      {dateLine && (
        <>
          <span aria-hidden>·</span>
          <span className="tabular-nums">{dateLine}</span>
        </>
      )}
      <span aria-hidden>·</span>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`${sourceUrl}\n${licenceBasis}`}
        data-part="source"
        className="inline-flex items-center gap-1 min-w-0 hover:text-ink underline-offset-2 hover:underline rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
      >
        <span className="truncate">Source: {hostOf(sourceUrl)}</span>
        <ExternalLink size={10} aria-hidden className="shrink-0" />
      </a>
      {textNote && (
        <span
          data-part="text-note"
          title="The text, search and quotes come from machine OCR of the scan. Nobody has checked it against the pages; expect errors in conjuncts and numerals."
          className="w-fit rounded-md bg-vellum px-1.5 py-px text-ink-secondary"
        >
          Text: {textNote}
        </span>
      )}
    </p>
  );
}
