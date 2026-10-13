import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Trash2 } from "lucide-react";
import { useRelAtomValue } from "../../../hooks/useEntityScope";
import { activeRefIdAtom, referencesAtom, referencesFor, scrollToHighlightAtom, scrollToRefAtom } from "../../../atoms/references";
import { relSearchQueryAtom, relZoomAtom } from "../../../atoms/filters";
import { currentPageAtom } from "../../../atoms/selection";
import { languageAtom } from "../../../atoms/language";
import { previewEntityIdAtom } from "../../../atoms/entityPreview";
import { getEntity, getEntityType } from "../../../data/entities";
import { selectionPage, type Reference } from "../../../data/references";
import { relationDisplayLabel } from "../../../utils/inheritance";
import { entityCardFields } from "../../../utils/entityFields";
import { formatTime } from "../../../utils/dateFormat";
import { HighlightedText } from "../../shared/HighlightedText";
import { PageTag } from "../../shared/PageTag";
import { TimeTag } from "../../shared/TimeTag";
import { PinToggle } from "../../shared/PinToggle";
import { CardValue } from "../../library/CardValue";
import { PREVIEWED_RING } from "../../library/EntitySelectBox";
import { DirectionGlyph } from "../DirectionGlyph";
import { EvidenceStatus } from "./EvidenceStatus";
import { RowCheckbox } from "./RowCheckbox";

/** How many of the record's other links the quiet line names. */
const OTHER_LINKS = 3;
/** Passages a row shows at Detail before "Show all passages". */
const PASSAGES = 3;
/** Page or time tags on a row's title line before the rest go to a tooltip. */
const TAGS = 3;

/** What the enclosing group (or hub) already says, so the card leaves it out. */
export interface MemberCardHide {
  /** The group keys on the record's template. */
  template?: boolean;
  /** The group keys on the link type; a string is a hub's type, printed only
   *  where the record's own link differs from it. */
  relation?: boolean | string;
  /** The group keys on direction. */
  direction?: boolean;
  /** The group IS this record: its header names it. */
  title?: boolean;
}

/** One record and its links, as a scaled-down Library list card: what the
 *  record is (template, title, the properties its template shows on cards),
 *  how it is linked here (status and evidence, page or time tags, direction,
 *  link types, the passages at Detail) and what else it links to.
 *
 *  Two hosts. `card` is a member of an open hub, a bordered box. `row` is a
 *  record inside a grouped List, one per record however many references back
 *  it, so a record linked five times reads once.
 *
 *  The card opens the record's preview through a stretched invisible button;
 *  the pin, checkbox, status chip, tags and delete keep their own targets
 *  above it. Every part self-hides where the collection records nothing. */
export function MemberCard({
  entityId,
  refs,
  exclude,
  variant,
  hide = {},
  onDelete,
}: {
  entityId: string;
  /** The record's references here, from the panel's filtered set. */
  refs: Reference[];
  /** Records the "Also linked to" line leaves out: the focused record and the
   *  ones shown around this card. */
  exclude: Set<string>;
  variant: "card" | "row";
  hide?: MemberCardHide;
  onDelete?: (id: string) => void;
}) {
  const entity = getEntity(entityId);
  const type = entity ? getEntityType(entity.typeId) : undefined;
  const title = entity?.title ?? "Unknown entity";
  const query = useRelAtomValue(relSearchQueryAtom);
  const zoom = useAtomValue(relZoomAtom);
  const language = useAtomValue(languageAtom);
  const all = useAtomValue(referencesAtom);
  const previewId = useAtomValue(previewEntityIdAtom);
  const setPreview = useSetAtom(previewEntityIdAtom);
  const [activeRefId, setActiveRefId] = useAtom(activeRefIdAtom);
  const [scrollToRef, setScrollToRef] = useAtom(scrollToRefAtom);
  const setCurrentPage = useSetAtom(currentPageAtom);
  const setScrollToHighlight = useSetAtom(scrollToHighlightAtom);
  const [allPassages, setAllPassages] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const isRow = variant === "row";
  const previewed = previewId === entityId;
  const active = activeRefId !== null && refs.some((r) => r.id === activeRefId);
  const selected = previewed || active;

  const fields = entity ? entityCardFields(entity, language).slice(0, 2) : [];

  // Where the links sit: pages (deduplicated, in reading order) and times.
  const anchored = useMemo(
    () =>
      refs
        .filter((r) => selectionPage(r.sourceSelection) !== undefined)
        .sort((a, b) => selectionPage(a.sourceSelection)! - selectionPage(b.sourceSelection)!),
    [refs],
  );
  const pages = [...new Map(anchored.map((r) => [selectionPage(r.sourceSelection)!, r])).entries()];
  const timed = refs.filter((r) => r.mediaAnchor);
  // The passages: each anchored reference's words, a quote or what happens at
  // that time in a recording.
  const passages = refs.filter((r) => r.sourceSelection?.text || r.mediaAnchor?.label);
  const dirs = new Set(refs.map((r) => r.direction ?? "outgoing"));
  const direction = dirs.size > 1 ? "both" : ((dirs.values().next().value ?? "outgoing") as "outgoing" | "incoming");
  const types = [...new Set(refs.map((r) => r.relationType))].filter((t) =>
    typeof hide.relation === "string" ? t !== hide.relation : !hide.relation,
  );
  const rated = refs.filter((r) => r.verification);
  const verification = rated.length
    ? rated.every((r) => r.verification === rated[0].verification)
      ? rated[0].verification
      : ("mixed" as const)
    : undefined;

  const showPassages = zoom === "detail";
  const showMeta = isRow ? zoom !== "overview" : true;
  const showOthers = isRow ? zoom === "detail" : true;

  // The records this one links to beyond what is shown around it. Read only
  // where the line is drawn, so a Compact list pays nothing.
  const others = useMemo(() => {
    if (!showOthers) return [];
    const seen = new Set<string>();
    const names: string[] = [];
    for (const r of referencesFor(entityId, all)) {
      const id = r.targetEntityId;
      if (id === entityId || exclude.has(id) || seen.has(id)) continue;
      seen.add(id);
      const t = getEntity(id)?.title;
      if (t) names.push(t);
    }
    return names;
  }, [showOthers, entityId, all, exclude]);

  // A highlight pressed in the document lands on the row holding its
  // reference, as a reference row did.
  useEffect(() => {
    if (!scrollToRef || !refs.some((r) => r.id === scrollToRef)) return;
    setActiveRefId(scrollToRef);
    if (passages.findIndex((r) => r.id === scrollToRef) >= PASSAGES) setAllPassages(true);
    boxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setScrollToRef(null);
  }, [scrollToRef, refs, passages, setActiveRefId, setScrollToRef]);

  const jump = (ref: Reference) => {
    const page = selectionPage(ref.sourceSelection);
    setActiveRefId(ref.id);
    if (page === undefined) return;
    setCurrentPage(page);
    setScrollToHighlight(ref.id);
  };

  const deleteButton = (ref: Reference, label: string) =>
    onDelete ? (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(ref.id);
        }}
        aria-label={label}
        data-part="delete"
        className="hit-area p-1 rounded opacity-0 group-hover/line:opacity-100 group-focus-within/line:opacity-100 hover:bg-seal-tint text-ink-muted hover:text-seal-label transition-all cursor-pointer"
      >
        <Trash2 size={12} />
      </button>
    ) : null;

  // The title line's tags. At Detail a row's passages carry their own tags,
  // so the line keeps only those of links without words.
  const lineRefs = isRow && showPassages ? new Set(passages.map((r) => r.id)) : null;
  const linePages = pages.filter(([, r]) => !lineRefs?.has(r.id));
  const lineTimes = timed.filter((r) => !lineRefs?.has(r.id));
  const restTags = [
    ...linePages.slice(TAGS).map(([p]) => `p. ${p}`),
    ...lineTimes.slice(TAGS).map((r) => r.mediaAnchor!.clock !== undefined ? formatTime(r.mediaAnchor!.clock) : r.mediaAnchor!.label ?? ""),
  ];
  const tags = (
    <>
      {lineTimes.slice(0, TAGS).map((r) => (
        <TimeTag key={r.id} anchor={r.mediaAnchor!} recordingTitle={getEntity(r.mediaAnchor!.recordingId)?.title} />
      ))}
      {linePages.slice(0, TAGS).map(([p, r]) => (
        <PageTag key={p} page={p} onClick={() => jump(r)} />
      ))}
      {restTags.length > 0 && (
        <span data-part="more-tags" title={restTags.join("\n")} className="text-meta text-ink-tertiary">
          …
        </span>
      )}
    </>
  );

  const metaParts = [
    !hide.template && type?.name ? (
      <span key="type" className="shrink-0">
        {type.name}
      </span>
    ) : null,
    ...fields.map((f) => (
      <span key={f.id} className="min-w-0 truncate">
        <CardValue field={f} query={query} compact />
      </span>
    )),
    types.length > 0 ? (
      <span key="rel" data-part="relation" className="min-w-0 truncate">
        {typeof hide.relation === "string" ? "as " : ""}
        <HighlightedText text={types.map((t) => relationDisplayLabel(t)).join(", ")} query={query} />
      </span>
    ) : null,
  ].filter(Boolean);

  const meta = metaParts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && (
        <span aria-hidden className="shrink-0 text-ink-muted">
          ·
        </span>
      )}
      {part}
    </Fragment>
  ));

  const passageList = allPassages ? passages : passages.slice(0, PASSAGES);

  return (
    <div
      ref={boxRef}
      data-component={isRow ? "RecordRow" : "HubMemberCard"}
      className={`group relative transition-colors ${
        isRow
          ? `${selected ? "bg-parchment" : "hover:bg-parchment/60"} ${previewed ? PREVIEWED_RING : ""}`
          : `rounded-md border ${selected ? `bg-parchment border-border ${previewed ? PREVIEWED_RING : ""}` : "bg-paper border-border/60 hover:bg-parchment"}`
      }`}
    >
      <button
        type="button"
        aria-pressed={previewed}
        aria-label={`Preview ${title}`}
        onClick={(e) => {
          e.stopPropagation();
          setPreview(entityId);
        }}
        data-part="primary-action"
        className="absolute inset-0 w-full cursor-pointer rounded-[inherit] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-carbon/30"
      />
      {/* Content lets presses through to the button beneath; its own
          controls take them back. */}
      <div
        className={`relative flex flex-col min-w-0 pointer-events-none [&_button]:pointer-events-auto [&_input]:pointer-events-auto [&_label]:pointer-events-auto ${
          isRow ? (zoom === "overview" ? "px-3 py-1.5" : "px-3 py-2 gap-0.5") : "px-2.5 py-1.5 gap-0.5"
        }`}
      >
        <div data-part="title" className="flex items-center gap-1.5 min-w-0 h-5">
          {isRow && <RowCheckbox refIds={refs.map((r) => r.id)} />}
          {hide.title ? (
            // The group header names the record: the line says what it is and
            // how it is linked instead.
            <span data-part="meta" className="min-w-0 flex-1 flex items-center gap-1.5 text-meta text-ink-tertiary">
              {meta}
            </span>
          ) : (
            <>
              <span
                aria-hidden
                className="w-1.5 h-1.5 rounded-[2px] shrink-0"
                style={{ backgroundColor: type?.color ?? "var(--text-muted)" }}
              />
              <span className={`min-w-0 flex-1 truncate text-xs text-ink ${isRow ? "font-medium" : "font-semibold"}`}>
                <HighlightedText text={title} query={query} />
              </span>
            </>
          )}
          <span data-part="link" className="shrink-0 flex items-center gap-1.5">
            <EvidenceStatus verification={verification} period={refs.find((r) => r.period)?.period} refs={refs} />
            {tags}
            {!hide.direction && <DirectionGlyph direction={direction} />}
          </span>
          {isRow && refs.length === 1 && !passages.length && deleteButton(refs[0], `Delete relationship with ${title}`)}
          <PinToggle entityId={entityId} title={title} reveal />
        </div>
        {showMeta && !hide.title && metaParts.length > 0 && (
          <div data-part="meta" className="flex items-center gap-1.5 min-w-0 text-meta text-ink-tertiary">
            {meta}
          </div>
        )}
        {showPassages && passageList.length > 0 && (
          <ul data-part="passages" className={`flex flex-col gap-0.5 ${isRow ? "mt-1" : ""}`}>
            {passageList.map((r) => {
              const page = selectionPage(r.sourceSelection);
              const text = r.sourceSelection?.text ?? [r.mediaAnchor?.label, r.mediaAnchor?.clock !== undefined ? formatTime(r.mediaAnchor.clock) : undefined].filter(Boolean).join(" · ");
              return (
                <li
                  key={r.id}
                  data-part="passage"
                  className={`group/line flex items-start gap-1.5 min-w-0 rounded ${
                    isRow && r.id === activeRefId ? "bg-warm" : ""
                  } ${isRow ? "px-1.5 py-0.5 -mx-1.5" : ""}`}
                >
                  <p className="min-w-0 flex-1 text-meta text-ink-secondary line-clamp-2">
                    {r.sourceSelection?.text ? "“" : ""}
                    <HighlightedText text={text} query={query} />
                    {r.sourceSelection?.text ? "”" : ""}
                  </p>
                  {isRow && (
                    <span className="shrink-0 flex items-center gap-1">
                      {r.mediaAnchor && <TimeTag anchor={r.mediaAnchor} recordingTitle={getEntity(r.mediaAnchor.recordingId)?.title} />}
                      {page !== undefined && <PageTag page={page} onClick={() => jump(r)} />}
                      {deleteButton(r, `Delete this relationship with ${title}`)}
                    </span>
                  )}
                </li>
              );
            })}
            {passages.length > PASSAGES && (
              <li>
                <button
                  type="button"
                  data-part="more-passages"
                  aria-expanded={allPassages}
                  onClick={(e) => {
                    e.stopPropagation();
                    setAllPassages((v) => !v);
                  }}
                  className="text-meta font-medium text-ink-tertiary hover:text-ink cursor-pointer"
                >
                  {allPassages ? "Show fewer passages" : "Show all passages"}
                </button>
              </li>
            )}
          </ul>
        )}
        {showOthers && others.length > 0 && (
          <p data-part="other-links" title={others.join("\n")} className="truncate text-meta text-ink-tertiary">
            Also linked to {others.slice(0, OTHER_LINKS).join(" · ")}
            {others.length > OTHER_LINKS ? " …" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
