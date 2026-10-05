import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { useAtomValue, useSetAtom } from "jotai";
import { FileText, Newspaper, PanelRight } from "lucide-react";
import { languageAtom } from "../../atoms/language";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { scopedReferencesAtom } from "../../atoms/references";
import { entityMetadataAtom, makeEntityPropReader } from "../../atoms/entityMetadata";
import { previewEntityIdAtom } from "../../atoms/entityPreview";
import { entityDisplayModeAtom, entityTabRequestAtom, focusedHasPublishedViewAtom } from "../../atoms/publishedView";
import { useDirtyGuard } from "../../hooks/useDirtyGuard";
import { getEntityProfile, type EntityProfile } from "../../data/entityProfiles";
import { entityCorpusOf, getEntity, type EntityImage } from "../../data/entities";
import type { MetadataField, RelationshipMetadataField } from "../../data/metadata";
import type { Reference, RelationType } from "../../data/references";
import type { Language } from "../../atoms/language";
import { templateMirror } from "../../data/templates/mirror";
import { deriveTemplateStructure } from "../../utils/templateStructure";
import { deriveRelationships } from "../../utils/relationships";
import { groupConnections, relationLabel, specInherits, type ConnectionGroup } from "../../utils/inheritance";
import { isImageUrl } from "../../utils/typedValues";
import { t } from "../../utils/i18n";
import { fieldItem, connectionItem, type MetadataItem } from "../metadata/items";
import { RelationshipFieldCard } from "../metadata/RelationshipFieldCard";
import { ConnectionGroupCard } from "../metadata/ConnectionGroupCard";
import { EntityTypeTag } from "../shared/EntityTypeTag";
import { EntityPill } from "../shared/EntityPill";
import { SectionLabel } from "../shared/SectionLabel";
import { ImageLightbox } from "../shared/ImageLightbox";
import { useLeafletMap, labelledDivIcon } from "../shared/map/useLeafletMap";
import { EntityPreviewSlideOver } from "../relationships/EntityPreviewSlideOver";
import { DrawerWidthProvider } from "../../hooks/useDrawerWidth";
import { WARM_BUTTON } from "../shared/warmButton";

/** The width the entity slide-over takes over this page: the entity view's
 *  default drawer, so a preview is the same panel in both views. */
const PREVIEW_WIDTH = 560;
/** Entities listed per relationship type before "Show all". */
const GROUP_PREVIEW = 8;

type Block =
  | { kind: "item"; item: MetadataItem }
  | { kind: "group"; group: ConnectionGroup }
  | { kind: "table"; field: RelationshipMetadataField };

/** An entity as a published page: Uwazi's entity view page, which a template
 *  turns on with "Display entity view from page".
 *
 *  Fed by the template, as the entity view's record is: the same fields in the
 *  same order (`deriveTemplateStructure`), drawn by the same value renderers
 *  (`fieldItem`, `connectionItem`, the inheritance tables with their `↳ via`
 *  trails). What changes is the arrangement, which follows a partner's profile
 *  page: a hero (picture, template, title), then prose and tables in a reading
 *  column, short facts beside it, then the place on a map, the document and
 *  the entity's relationships by relationship type. On a phone it is one
 *  column: facts, prose, the rest.
 *
 *  Entity pills open the slide-over over this page, as they do in the record.
 *  Nothing here edits; "Entity view" (the floating toggle) leads to that. */
export function PublishedEntityView() {
  const entityId = useAtomValue(focusedEntityIdAtom);
  const language = useAtomValue(languageAtom);
  // Subscribing keeps inherited values live, as the record does.
  const getProp = makeEntityPropReader(useAtomValue(entityMetadataAtom));
  const references = useAtomValue(scopedReferencesAtom);
  const profile = getEntityProfile(entityId);
  const entity = getEntity(entityId);
  const title = entity?.title ?? entityId;
  const [lightbox, setLightbox] = useState<EntityImage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // A new entity starts at the top of its page.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [entityId]);

  const { facts, reading, geo } = useMemo(
    () => arrange(profile, language, getProp),
    // `getProp` is new each render; the profile and language decide the layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, language],
  );
  const images = profile.images ?? (profile.image ? [profile.image] : entity?.images ?? (entity?.image ? [entity.image] : []));
  const [hero, ...gallery] = images;
  const place = geo ?? (entity?.geo ? { lat: entity.geo.lat, lon: entity.geo.lng, label: undefined } : undefined);
  const relGroups = useMemo(() => relationshipGroups(references), [references]);
  const empty = facts.length === 0 && reading.length === 0;
  // Nothing to read (no prose, table or extra picture): one column, facts in a
  // grid, rather than a wide empty column beside a narrow full one.
  const split = reading.length > 0 || gallery.length > 0;

  return (
    <div data-component="PublishedEntityView" className="relative flex-1 min-h-0 flex flex-col overflow-clip bg-paper">
      <DrawerWidthProvider value={PREVIEW_WIDTH}>
        <EntityPreviewSlideOver />
      </DrawerWidthProvider>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <article
          data-gutter-host
          aria-labelledby="published-title"
          className="gutter-host-main mx-auto w-full max-w-[72rem] pt-12 pb-16 md:pt-14"
        >
          <header
            data-part="hero"
            className={`grid gap-6 md:gap-10 ${hero ? "md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:items-end" : ""}`}
          >
            {hero && (
              <button
                type="button"
                data-part="hero-image"
                onClick={() => setLightbox(hero)}
                aria-label={`View image: ${hero.alt}`}
                className="block w-full max-w-[15rem] rounded-md overflow-hidden bg-vellum cursor-zoom-in
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35"
              >
                <img
                  src={hero.url}
                  alt={hero.alt}
                  width={hero.width}
                  height={hero.height}
                  className="block w-full aspect-[4/5] object-cover"
                />
              </button>
            )}
            <div data-part="identity" className="flex flex-col gap-3 min-w-0">
              <EntityTypeTag typeId={profile.typeId} />
              <h1 id="published-title" className="text-2xl font-semibold text-ink text-balance break-words">
                {title}
              </h1>
            </div>
          </header>

          <div
            data-part="body"
            data-layout={split ? "split" : "single"}
            className={`mt-10 md:mt-12 grid gap-10 ${split ? "lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:gap-x-14" : ""}`}
          >
            {/* Facts first in the source: on a phone they lead. On a wide screen
                they sit in the side column's first row, beside the reading
                column that spans both rows. */}
            {facts.length > 0 && (
              <section data-part="facts" aria-label={t("System", "Key facts")} className={`min-w-0 ${split ? "lg:col-start-2 lg:row-start-1" : ""}`}>
                <dl className={split ? "flex flex-col gap-4" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-x-10"}>
                  {facts.map((item) => (
                    <div key={item.id} data-field-key={item.id} className="flex flex-col gap-1 min-w-0 break-words">
                      <SectionLabel as="dt">{item.label}</SectionLabel>
                      <dd className="min-w-0">{item.content}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <div
              data-part="reading"
              className={`flex flex-col gap-8 min-w-0 ${split ? "lg:col-start-1 lg:row-start-1 lg:row-span-2" : empty ? "" : "hidden"}`}
            >
              {empty && (
                <p data-part="empty" className="text-xs text-ink-tertiary">
                  No metadata for this entity yet.
                </p>
              )}
              {reading.map((block) => (
                <ReadingBlock key={blockKey(block)} block={block} />
              ))}
              {gallery.length > 0 && (
                <section data-part="gallery" className="flex flex-col gap-3">
                  <SectionLabel as="h2">{t("System", "Images")}</SectionLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {gallery.map((img, i) => (
                      <button
                        key={`${img.url}-${i}`}
                        type="button"
                        onClick={() => setLightbox(img)}
                        aria-label={`View image: ${img.alt}`}
                        className="block rounded-md overflow-hidden bg-vellum cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35"
                      >
                        <img src={img.url} alt={img.alt} className="block w-full aspect-square object-cover" />
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside
              data-part="side"
              className={`min-w-0 ${split ? "lg:col-start-2 lg:row-start-2 flex flex-col gap-8" : "grid gap-8 lg:grid-cols-2 lg:gap-x-14 items-start"}`}
            >
              {place && (
                <section data-part="place" className="flex flex-col gap-2">
                  <SectionLabel as="h2">{geo?.fieldLabel ?? t("System", "Location")}</SectionLabel>
                  <PublishedMap lat={place.lat} lon={place.lon} label={place.label ?? title} />
                </section>
              )}
              {profile.hasDocument && <DocumentLink profile={profile} language={language} />}
              {relGroups.length > 0 && (
                <section data-part="relationships" className="flex flex-col gap-5">
                  <SectionLabel as="h2">{t("System", "Relationships")}</SectionLabel>
                  {relGroups.map((g) => (
                    <RelationshipGroup key={g.type} type={g.type} entityIds={g.entityIds} />
                  ))}
                </section>
              )}
            </aside>
          </div>
        </article>
      </div>
      <ImageLightbox image={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

const blockKey = (b: Block) =>
  b.kind === "item" ? b.item.id : b.kind === "group" ? `group:${b.group.connectionKey}` : b.field.id;

/** The record's entries, in template order, split by shape: short values and
 *  link-only connections are facts; prose, recordings and the inheritance
 *  tables are reading. The first geolocation value is the page's place. */
function arrange(
  profile: EntityProfile,
  language: Language,
  getProp: ReturnType<typeof makeEntityPropReader>,
) {
  const { fields } = deriveTemplateStructure(profile, language);
  const templateProps = new Map(
    (templateMirror(entityCorpusOf(profile.id), profile.typeId)?.properties ?? []).map((p) => [p.name, p]),
  );
  const relFields = fields.filter((f): f is RelationshipMetadataField => f.type === "relationship");
  const { groups } = groupConnections(relFields, language, getProp);
  const groupByKey = new Map(groups.map((g) => [g.connectionKey, g]));
  const placed = new Set<string>();
  const facts: MetadataItem[] = [];
  const reading: Block[] = [];
  let geo: { lat: number; lon: number; label?: string; fieldLabel: string } | undefined;

  for (const f of fields) {
    if (f.type === "relationship") {
      if (f.connectedEntityIds.length === 0 && !f.totalConnected) continue;
      const group = f.connectionKey ? groupByKey.get(f.connectionKey) : undefined;
      if (group) {
        if (placed.has(group.connectionKey)) continue;
        placed.add(group.connectionKey);
        reading.push({ kind: "group", group });
      } else if (specInherits(f)) {
        reading.push({ kind: "table", field: f });
      } else {
        facts.push(connectionItem(f));
      }
      continue;
    }
    const field = f as MetadataField;
    if (!field.value?.trim()) continue;
    // Pictures are the hero and the gallery, not facts.
    if (field.propertyType === "image" || isImageUrl(field.value)) continue;
    if (field.geo && !geo) geo = { ...field.geo, fieldLabel: field.label };
    const p = templateProps.get(field.id);
    const item = { ...fieldItem(field, p?.style), noLabel: p?.noLabel };
    if (item.kind === "long") reading.push({ kind: "item", item });
    else facts.push(item);
  }
  return { facts, reading, geo };
}

function ReadingBlock({ block }: { block: Block }) {
  if (block.kind === "group")
    return (
      <div data-field-key={block.group.connectionKey}>
        <ConnectionGroupCard group={block.group} />
      </div>
    );
  if (block.kind === "table")
    return (
      <div data-field-key={block.field.id}>
        <RelationshipFieldCard field={block.field} span="full" />
      </div>
    );
  const { item } = block;
  return (
    <section data-part="prose" data-field-key={item.id} className="flex flex-col gap-2 max-w-[40rem]" aria-label={item.noLabel ? item.label : undefined}>
      {!item.noLabel && <h2 className="text-sm font-semibold text-ink">{item.label}</h2>}
      <div className="min-w-0 break-words">{item.content}</div>
    </section>
  );
}

/** The entity's relationships as relationship types, each with the entities
 *  it reaches, in first-seen order. Hub members are listed as the entities
 *  they are. */
function relationshipGroups(references: Reference[]) {
  const byType = new Map<RelationType, string[]>();
  for (const rel of deriveRelationships(references, { includeHubMembers: true })) {
    const list = byType.get(rel.relationType) ?? [];
    if (!list.includes(rel.targetEntityId)) list.push(rel.targetEntityId);
    byType.set(rel.relationType, list);
  }
  return [...byType].map(([type, entityIds]) => ({ type, entityIds }));
}

function RelationshipGroup({ type, entityIds }: { type: RelationType; entityIds: string[] }) {
  const [all, setAll] = useState(false);
  const preview = useSetAtom(previewEntityIdAtom);
  const shown = all ? entityIds : entityIds.slice(0, GROUP_PREVIEW);
  const label = relationLabel(type);
  return (
    <div data-part="relationship-group" className="flex flex-col gap-2 min-w-0">
      <h3 className="text-xs font-semibold text-ink">{label}</h3>
      <ul className="flex flex-wrap gap-1.5 min-w-0">
        {shown.map((id) => {
          const e = getEntity(id);
          return (
            <li key={id} className="min-w-0 max-w-full">
              <EntityPill
                typeId={e?.typeId ?? ""}
                label={e?.title}
                onClick={() => preview(id)}
                ariaLabel={`Open ${e?.title ?? "entity"}`}
              />
            </li>
          );
        })}
      </ul>
      {entityIds.length > GROUP_PREVIEW && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
          className="w-fit text-xs font-medium text-ink-secondary hover:text-ink underline underline-offset-2 cursor-pointer
            focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 rounded-xs"
        >
          {all ? "Show fewer" : `Show all ${entityIds.length}`}
        </button>
      )}
    </div>
  );
}

/** The primary document, and the way to read it: the entity view's Document
 *  tab, where the viewer, its references and its search live. */
function DocumentLink({ profile, language }: { profile: EntityProfile; language: Language }) {
  const setMode = useSetAtom(entityDisplayModeAtom);
  const requestTab = useSetAtom(entityTabRequestAtom);
  const doc = profile.document?.[language];
  const name = doc?.title ?? profile.documentGroups?.find((g) => g.isPrimary)?.title ?? profile.files?.[0]?.name;
  return (
    <section data-part="document" className="flex flex-col gap-2">
      <SectionLabel as="h2">{t("System", "Document")}</SectionLabel>
      {name && <p className="text-sm font-medium text-ink break-words">{name}</p>}
      <button
        type="button"
        onClick={() => {
          requestTab("document");
          setMode("entity");
        }}
        className={`w-fit inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md cursor-pointer
          focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 ${WARM_BUTTON}`}
      >
        <FileText size={14} aria-hidden className="shrink-0" />
        Read the document
      </button>
    </section>
  );
}

/** The entity's place, on the collection's tiles. Wheel zoom is off: the map
 *  sits in a scrolling page, and a wheel over it should scroll the page. */
function PublishedMap({ lat, lon, label }: { lat: number; lon: number; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const map = useLeafletMap(host, { center: [lat, lon], zoom: 5, minZoom: 1, maxZoom: 18, scrollWheelZoom: false });
  useEffect(() => {
    if (!map) return;
    map.setView([lat, lon], map.getZoom());
    const marker = L.marker([lat, lon], {
      keyboard: false,
      interactive: false,
      icon: labelledDivIcon(
        { html: '<span class="map-pin" style="--pin-color:var(--text-primary)"></span>', className: "", iconSize: [16, 16] },
        label,
      ),
    }).addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, lat, lon, label]);
  return (
    <div data-component="PublishedMap" className="relative isolate h-56 rounded-md overflow-hidden border border-border-soft">
      <div ref={host} role="group" aria-label={`Map: ${label}`} className="absolute inset-0" />
    </div>
  );
}

/** The one switch between the published view and the entity view, for an
 *  entity whose template has a published view (hidden otherwise).
 *
 *  It floats centred on the navbar's lower edge, the one spot both views leave
 *  free, so it neither moves nor moves anything when the mode changes. Icon
 *  only; its name says where it goes ("Entity view" / "Published view").
 *  Leaving the entity view goes through the dirty-form guard, like a tab
 *  change. It handles no keys of its own. */
export function PublishedViewToggle() {
  const available = useAtomValue(focusedHasPublishedViewAtom);
  const mode = useAtomValue(entityDisplayModeAtom);
  const setMode = useSetAtom(entityDisplayModeAtom);
  const guard = useDirtyGuard();
  if (!available) return null;
  const toEntity = mode === "published";
  const label = toEntity ? "Entity view" : "Published view";
  const Icon = toEntity ? PanelRight : Newspaper;
  return (
    <button
      type="button"
      data-component="PublishedViewToggle"
      data-mode={mode}
      aria-label={label}
      title={label}
      onClick={() => (toEntity ? setMode("entity") : guard(() => setMode("published")))}
      className="fixed z-30 top-13 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center
        rounded-md bg-paper text-ink-secondary hover:text-ink hover:bg-parchment border border-border shadow-sm
        transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35"
    >
      <Icon size={14} aria-hidden />
    </button>
  );
}
