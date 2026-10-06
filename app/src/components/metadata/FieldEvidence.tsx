import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { X } from "lucide-react";
import { evidenceProviderFor, evidenceVersionAtom, fieldEvidence } from "../../data/fieldEvidence";
import type { Verification } from "../../data/references";
import { getEntity, getEntityType } from "../../data/entities";
import { previewEntityIdAtom } from "../../atoms/entityPreview";
import { sheetStackAtom, sheetZ } from "../../atoms/sheetStack";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { RefStatus, VerificationDot } from "../relationships/rows/RefStatus";

/** The record whose fields a subtree draws: `MetadataRecord` provides it, so a
 *  card can ask for its field's evidence without being handed the id. */
export const EvidenceEntityContext = createContext<string | null>(null);

const EDGE = 8;

/** "Why we believe this": the sources behind one field, in the card head.
 *  Renders nothing where the collection records no evidence (Sample, CEJIL),
 *  while the evidence loads, and for a field nothing backs, so a card's head
 *  never changes shape for a reader who does not open it. */
export function FieldEvidence({ fieldId, label }: { fieldId: string; label: string }) {
  const entityId = useContext(EvidenceEntityContext);
  const version = useAtomValue(evidenceVersionAtom);
  const bump = useSetAtom(evidenceVersionAtom);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const provider = entityId ? evidenceProviderFor(entityId) : undefined;

  useEffect(() => {
    if (!provider || provider.rows(entityId!)) return;
    let live = true;
    provider.load().then(
      () => live && bump((v) => v + 1),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [provider, entityId, bump]);

  // `version` re-reads once the provider has loaded.
  void version;
  const rows = entityId && provider ? fieldEvidence(entityId, fieldId) : undefined;
  if (!rows || rows.length === 0) return null;

  const sourceCount = new Set(rows.flatMap((r) => r.sources)).size;
  const explicit = rows.filter((r) => !r.inferred);
  const statuses = new Set((explicit.length ? explicit : rows).map((r) => r.verification));
  const status: Verification | undefined = statuses.size === 1 ? [...statuses][0] : undefined;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-component="FieldEvidence"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Why we believe this: ${label}, ${sourceCount} ${sourceCount === 1 ? "source" : "sources"}`}
        onClick={() => setOpen((o) => !o)}
        className="ms-auto inline-flex items-center gap-1 text-meta text-ink-tertiary hover:text-ink rounded-md px-1 -me-1
          normal-case tracking-normal font-normal cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
      >
        {status && <VerificationDot status={status} />}
        <span className="tabular-nums">{sourceCount}</span>
        {sourceCount === 1 ? "source" : "sources"}
      </button>
      {open && (
        <EvidencePopover
          label={label}
          rows={rows}
          anchor={triggerRef}
          onClose={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
        />
      )}
    </>
  );
}

function EvidencePopover({
  label,
  rows,
  anchor,
  onClose,
}: {
  label: string;
  rows: NonNullable<ReturnType<typeof fieldEvidence>>;
  anchor: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const panelRef = useFocusTrap<HTMLDivElement>(true);
  const titleId = useId();
  const setPreview = useSetAtom(previewEntityIdAtom);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  // On a phone the trigger may sit inside a sheet (z 70 and up); the popover
  // goes above the top layer instead of behind it.
  const sheets = useAtomValue(sheetStackAtom).length;
  const z = sheets ? sheetZ(sheets) : 60;

  // From the trigger, not the card: under "N sources", its right edge on the
  // trigger's, kept inside the viewport. Above the trigger when the space
  // below cannot hold the panel and the space above can.
  useLayoutEffect(() => {
    const place = () => {
      const r = anchor.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.min(352, window.innerWidth - EDGE * 2);
      const height = panelRef.current?.offsetHeight ?? 0;
      const left = Math.max(EDGE, Math.min(r.right - width, window.innerWidth - width - EDGE));
      const below = r.bottom + 6;
      const above = r.top - 6 - height;
      const fitsBelow = below + height <= window.innerHeight - EDGE;
      const top = !fitsBelow && above >= EDGE ? above : Math.max(EDGE, Math.min(below, window.innerHeight - height - EDGE));
      setPos({ top, left, width });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [anchor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    // A scroll moves the trigger; a fixed panel would float off it.
    const onScroll = (e: Event) => {
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose, panelRef]);

  return createPortal(
    <>
      <div data-part="scrim" aria-hidden className="fixed inset-0" style={{ zIndex: z }} onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-labelledby={titleId}
        data-component="EvidencePopover"
        className="fixed max-h-[min(28rem,70vh)] overflow-y-auto rounded-md bg-paper p-3 animate-fade-in-up"
        style={{
          zIndex: z + 1,
          top: pos?.top ?? -9999,
          left: pos?.left ?? 0,
          width: pos?.width ?? 352,
          border: "1px solid var(--border-primary)",
          boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p id={titleId} className="text-xs font-semibold text-ink">
              Why we believe this
            </p>
            <p className="text-meta text-ink-tertiary truncate">{label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-1 rounded text-ink-tertiary hover:text-ink hover:bg-warm cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
        <ul className="space-y-3">
          {rows.map((row, i) => (
            <li key={i} data-part="evidence" className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <RefStatus verification={row.verification} />
                {row.inferred && <span className="text-meta text-ink-tertiary">Inferred from the record’s other facts</span>}
              </div>
              <ul className="space-y-1">
                {row.sources.map((id) => {
                  const e = getEntity(id);
                  const color = e ? getEntityType(e.typeId)?.color : undefined;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          setPreview(id);
                        }}
                        className="flex items-baseline gap-1.5 text-left text-xs text-ink hover:underline cursor-pointer rounded
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
                      >
                        <span
                          aria-hidden
                          className="w-2 h-2 rounded-[2px] shrink-0 translate-y-px"
                          style={{ backgroundColor: color ?? "var(--text-muted)" }}
                        />
                        <span className="line-clamp-2">{e?.title ?? id}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {row.note && !row.inferred && (
                <p className="text-meta text-ink-tertiary leading-relaxed">
                  <NoteText
                    note={row.note}
                    onOpen={(id) => {
                      onClose();
                      setPreview(id);
                    }}
                  />
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>,
    document.body,
  );
}

/** A note as Research wrote it, with each claim it cites by slug
 *  ("first-shots-at-12-37") printed as the claim's title, a link that opens
 *  the claim. A slug that names no record stays as written. */
function NoteText({ note, onOpen }: { note: string; onOpen: (id: string) => void }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of note.matchAll(/[a-z0-9]+(?:-[a-z0-9]+){2,}/g)) {
    const id = `claim:${m[0]}`;
    const e = getEntity(id);
    if (!e) continue;
    parts.push(note.slice(last, m.index));
    parts.push(
      <button
        key={m.index}
        type="button"
        onClick={() => onOpen(id)}
        className="inline text-left text-ink-secondary underline underline-offset-2 hover:text-ink cursor-pointer rounded
          focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
      >
        {e.title}
      </button>,
    );
    last = m.index! + m[0].length;
  }
  parts.push(note.slice(last));
  return <>{parts}</>;
}
