import { Fragment, useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useRelAtomValue } from "../../../hooks/useEntityScope";
import { activeRefIdAtom, referencesAtom, referencesFor, scrollToHighlightAtom } from "../../../atoms/references";
import { relSearchQueryAtom, relZoomAtom } from "../../../atoms/filters";
import { currentPageAtom } from "../../../atoms/selection";
import { languageAtom } from "../../../atoms/language";
import { previewEntityIdAtom } from "../../../atoms/entityPreview";
import { getEntity, getEntityType } from "../../../data/entities";
import { selectionPage, type Reference } from "../../../data/references";
import { relationDisplayLabel } from "../../../utils/inheritance";
import { entityCardFields } from "../../../utils/entityFields";
import { HighlightedText } from "../../shared/HighlightedText";
import { PageTag } from "../../shared/PageTag";
import { TimeTag } from "../../shared/TimeTag";
import { PinToggle } from "../../shared/PinToggle";
import { CardValue } from "../../library/CardValue";
import { PREVIEWED_RING } from "../../library/EntitySelectBox";
import { DirectionGlyph } from "../DirectionGlyph";
import { EvidenceStatus } from "./EvidenceStatus";

/** How many of the member's other records the quiet line names. */
const OTHER_LINKS = 3;

/** One member of an open hub: the Library's list card, scaled down. It says
 *  what the member is (template, title, the properties its template shows on
 *  cards), how it belongs to the hub (status and evidence, page or time,
 *  direction, the quote at Detail), and what else it links to. The hub row above
 *  already names every member; this is where a member says more than its name.
 *
 *  The card opens the member's preview through a stretched invisible button;
 *  the pin, the status chip and the page or time tag keep their own targets
 *  above it. Every line self-hides where the collection records nothing. */
export function HubMemberCard({
  entityId,
  refs,
  hubType,
  exclude,
}: {
  entityId: string;
  /** This member's references to the hub, from the panel's filtered set. */
  refs: Reference[];
  /** The hub's link type: a member's type is printed only where it differs. */
  hubType: string;
  /** Records the quiet line leaves out: the focused record and the hub's
   *  members, which the row above already shows. */
  exclude: Set<string>;
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
  const setActiveRefId = useSetAtom(activeRefIdAtom);
  const setCurrentPage = useSetAtom(currentPageAtom);
  const setScrollToHighlight = useSetAtom(scrollToHighlightAtom);
  const selected = previewId === entityId;

  const fields = entity ? entityCardFields(entity, language).slice(0, 2) : [];

  // The member's link: one reference in nearly every hub. The first anchored
  // one gives the page and the quote.
  const anchored = refs.find((r) => selectionPage(r.sourceSelection) !== undefined);
  const page = anchored ? selectionPage(anchored.sourceSelection) : undefined;
  const media = refs.find((r) => r.mediaAnchor)?.mediaAnchor;
  const quote = refs.find((r) => r.sourceSelection?.text)?.sourceSelection?.text;
  const dirs = new Set(refs.map((r) => r.direction ?? "outgoing"));
  const direction = dirs.size > 1 ? "both" : ((dirs.values().next().value ?? "outgoing") as "outgoing" | "incoming");
  const types = [...new Set(refs.map((r) => r.relationType))].filter((t) => t !== hubType);
  const rated = refs.filter((r) => r.verification);
  const verification = rated.length
    ? rated.every((r) => r.verification === rated[0].verification)
      ? rated[0].verification
      : ("mixed" as const)
    : undefined;

  // The records this member links to beyond the hub, by title. Read only
  // while the hub is open, so a closed tree pays nothing.
  const others = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const r of referencesFor(entityId, all)) {
      const id = r.targetEntityId;
      if (exclude.has(id) || seen.has(id)) continue;
      seen.add(id);
      const t = getEntity(id)?.title;
      if (t) names.push(t);
    }
    return names;
  }, [entityId, all, exclude]);

  const jump = () => {
    if (!anchored || page === undefined) return;
    setActiveRefId(anchored.id);
    setCurrentPage(page);
    setScrollToHighlight(anchored.id);
  };

  return (
    <div
      data-component="HubMemberCard"
      className={`group relative rounded-md border transition-colors ${
        selected ? `bg-parchment border-border ${PREVIEWED_RING}` : "bg-paper border-border/60 hover:bg-parchment"
      }`}
    >
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`Preview ${title}`}
        onClick={(e) => {
          e.stopPropagation();
          setPreview(entityId);
        }}
        data-part="primary-action"
        className="absolute inset-0 w-full cursor-pointer rounded-[inherit] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-carbon/30"
      />
      {/* Content lets presses through to the button beneath; its own
          controls (pin, status, tags) take them back. */}
      <div className="relative px-2.5 py-1.5 flex flex-col gap-0.5 min-w-0 pointer-events-none [&_button]:pointer-events-auto">
        <div data-part="title" className="flex items-center gap-1.5 min-w-0 h-5">
          <span
            aria-hidden
            className="w-1.5 h-1.5 rounded-[2px] shrink-0"
            style={{ backgroundColor: type?.color ?? "var(--text-muted)" }}
          />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">
            <HighlightedText text={title} query={query} />
          </span>
          {/* The member's own link: status and evidence, where it sits, which way. */}
          <span data-part="link" className="shrink-0 flex items-center gap-1.5">
            <EvidenceStatus verification={verification} period={refs.find((r) => r.period)?.period} refs={refs} />
            {media && <TimeTag anchor={media} recordingTitle={getEntity(media.recordingId)?.title} />}
            {page !== undefined && <PageTag page={page} onClick={jump} />}
            <DirectionGlyph direction={direction} />
          </span>
          <PinToggle entityId={entityId} title={title} reveal />
        </div>
        <div data-part="meta" className="flex items-center gap-1.5 min-w-0 text-meta text-ink-tertiary">
          <span className="shrink-0">{type?.name ?? entity?.typeId}</span>
          {fields.map((f) => (
            <Fragment key={f.id}>
              <span aria-hidden className="shrink-0 text-ink-muted">·</span>
              <span className="min-w-0 truncate">
                <CardValue field={f} query={query} compact />
              </span>
            </Fragment>
          ))}
          {/* Printed only where the member's link type is not the hub's. */}
          {types.length > 0 && (
            <>
              <span aria-hidden className="shrink-0 text-ink-muted">·</span>
              <span className="min-w-0 truncate">as {types.map((t) => relationDisplayLabel(t)).join(", ")}</span>
            </>
          )}
        </div>
        {zoom === "detail" && quote && (
          <p data-part="quote" className="text-meta text-ink-secondary line-clamp-2">
            “<HighlightedText text={quote} query={query} />”
          </p>
        )}
        {others.length > 0 && (
          <p
            data-part="other-links"
            title={others.join("\n")}
            className="truncate text-meta text-ink-tertiary"
          >
            Also linked to {others.slice(0, OTHER_LINKS).join(" · ")}
            {others.length > OTHER_LINKS ? " …" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
