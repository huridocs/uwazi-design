import { useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { FileText, Newspaper, PanelRight } from "lucide-react";
import { languageAtom, LANGUAGE_NAMES } from "../../atoms/language";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { overlayEntityIdAtom, scopedReferencesAtom } from "../../atoms/references";
import { entityMetadataAtom, makeEntityPropReader } from "../../atoms/entityMetadata";
import { entityDisplayModeAtom, entityTabRequestAtom, focusedHasPublishedViewAtom } from "../../atoms/publishedView";
import { useDirtyGuard } from "../../hooks/useDirtyGuard";
import { layerStackAtom } from "../../atoms/layerStack";
import { getEntityProfile, type EntityProfile } from "../../data/entityProfiles";
import { getEntity, getEntityType, type EntityImage } from "../../data/entities";
import type { MetadataField, RelationshipMetadataField } from "../../data/metadata";
import type { Reference, RelationType } from "../../data/references";
import type { Language } from "../../atoms/language";
import { deriveTemplateStructure } from "../../utils/templateStructure";
import { deriveRelationships } from "../../utils/relationships";
import { groupConnections, relationLabel, specInherits, type ConnectionGroup } from "../../utils/inheritance";
import { countryFlag } from "../../utils/countryFlag";
import { formatRecordDate } from "../../utils/dates";
import { t } from "../../utils/i18n";
import { fieldItem, connectionItem, type MetadataItem } from "../metadata/items";
import { RelationshipFieldCard } from "../metadata/RelationshipFieldCard";
import { ConnectionGroupCard } from "../metadata/ConnectionGroupCard";
import { EntityTypeTag } from "../shared/EntityTypeTag";
import { EntityPill } from "../shared/EntityPill";
import { SectionLabel } from "../shared/SectionLabel";
import { Hint } from "../shared/Hint";
import { EntityOverlay } from "../relationships/EntityOverlay";
import { WARM_BUTTON } from "../shared/warmButton";

/** The width the entity slide-over takes over this page: the entity view's
 *  default drawer (560px), so a preview is the same panel in both views. */
const PREVIEW_COLUMN = "w-[35rem]";
/** Entities listed per template group before "Show all". */
const GROUP_PREVIEW = 8;

type Block =
  | { kind: "item"; item: MetadataItem }
  | { kind: "group"; group: ConnectionGroup }
  | { kind: "table"; field: RelationshipMetadataField };

/** A picture's address (main's records carry pictures as URLs in text). */
const isImageUrl = (v: string | undefined) => !!v && /^(https?:|\/|data:image\/|blob:)/.test(v.trim());

/** A relationship type's label, with the raw id made readable when unnamed. */
const relationDisplayLabel = (type: RelationType) => {
  const label = relationLabel(type);
  return label === type ? type.replace("_", " ") : label;
};

/** An entity as a published page: Uwazi's entity view page, which a template
 *  turns on with "Display entity view from page".
 *
 *  Fed by the template, as the entity view's record is: the same fields in the
 *  same order (`deriveTemplateStructure`), drawn by the same value renderers
 *  (`fieldItem`, `connectionItem`, the inheritance tables with their `↳ via`
 *  trails). What changes is the arrangement, which follows a partner's profile
 *  page and is decided by what the entity has:
 *
 *  - Masthead: the first image (when there is one) beside the template, the
 *    title, a descriptor made of the first short facts, and when the record
 *    was last changed.
 *  - Main column: prose and inheritance tables, the other images, the
 *    supporting files. With no prose the short facts lead it as
 *    a definition grid, so no page is a title over an empty half.
 *  - Side column: the short facts when there is prose to read beside them,
 *    then the relationships, one row per entity, grouped by template. A
 *    relationship a fact already shows is not repeated.
 *
 *  On a phone it is one column: masthead, facts, the rest. Entity pills open
 *  the slide-over over this page, as they do in the record. Nothing here
 *  edits; "Entity view" (the floating toggle) leads to that. */
export function PublishedEntityView() {
  const entityId = useAtomValue(focusedEntityIdAtom);
  const language = useAtomValue(languageAtom);
  // Subscribing keeps inherited values live, as the record does.
  const getProp = makeEntityPropReader(useAtomValue(entityMetadataAtom));
  const references = useAtomValue(scopedReferencesAtom);
  const profile = getEntityProfile(entityId);
  const entity = getEntity(entityId);
  const title = entity?.title ?? entityId;
  const scrollRef = useRef<HTMLDivElement>(null);

  // A new entity starts at the top of its page.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [entityId]);

  const { facts, reading, descriptor, shownLinks } = useMemo(
    () => arrange(profile, language, getProp),
    // `getProp` is new each render; the profile and language decide the layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, language],
  );
  const images = profile.images ?? (profile.image ? [profile.image] : entity?.images ?? (entity?.image ? [entity.image] : []));
  const [hero, ...gallery] = images;
  const rels = useMemo(() => relationshipGroups(references, shownLinks), [references, shownLinks]);
  const hasFiles = profile.hasDocument || (profile.files?.length ?? 0) > 0;
  const empty = facts.length === 0 && reading.length === 0;
  // Prose or a table to read: the facts move beside it. Otherwise they lead
  // the main column as a grid.
  const narrative = reading.length > 0;
  const factsInSide = narrative && facts.length > 0;
  const hasSide = factsInSide || rels.entities > 0;
  const edited = entity?.updatedAt ?? entity?.createdAt;
  // The slide-over's column takes pointer events only while a preview is open,
  // so the page under it stays usable.
  const previewOpen = useAtomValue(overlayEntityIdAtom) !== null;

  const factList = (
    <section
      data-part="facts"
      data-layout={factsInSide ? "list" : "grid"}
      aria-labelledby="published-facts"
      className={`min-w-0 flex flex-col gap-4 ${factsInSide ? "lg:col-start-2 lg:row-start-1" : ""}`}
    >
      <SectionLabel as="h2">
        <span id="published-facts">{t("System", "Key facts")}</span>
      </SectionLabel>
      <dl
        className={
          factsInSide
            ? "flex flex-col gap-4"
            : `grid gap-x-10 gap-y-5 sm:grid-cols-2 ${hasSide ? "xl:grid-cols-3" : "lg:grid-cols-3"}`
        }
      >
        {facts.map((item) => (
          <div key={item.id} data-field-key={item.id} className="flex flex-col gap-1 min-w-0 break-words">
            <dt className="text-xs text-ink-tertiary">{item.label}</dt>
            <dd className="min-w-0">{item.content}</dd>
          </div>
        ))}
      </dl>
    </section>
  );

  return (
    <div data-component="PublishedEntityView" className="relative flex-1 min-h-0 flex flex-col overflow-clip bg-paper">
      <div
        data-part="preview-column"
        className={`absolute inset-y-0 end-0 z-20 ${PREVIEW_COLUMN} max-w-full overflow-clip ${previewOpen ? "" : "pointer-events-none"}`}
      >
        <EntityOverlay />
      </div>
      <div ref={scrollRef} data-part="published-scroll" className="flex-1 min-h-0 overflow-y-auto">
        <article
          data-gutter-host
          aria-labelledby="published-title"
          className="gutter-host-main mx-auto w-full max-w-[72rem] pt-14 pb-20"
        >
          <header
            data-part="masthead"
            className={`flex flex-col gap-6 ${hero ? "md:flex-row md:items-end md:gap-8" : ""}`}
          >
            {hero && (
              <div data-part="masthead-image" className="block shrink-0 w-full md:w-44 rounded-md overflow-hidden bg-vellum">
                <img
                  src={hero.url}
                  alt={hero.alt}
                  width={hero.width}
                  height={hero.height}
                  className="block w-full aspect-[4/3] md:aspect-[4/5] object-cover"
                />
              </div>
            )}
            <div data-part="identity" className="flex flex-col gap-2 min-w-0">
              <EntityTypeTag typeId={profile.typeId} />
              {/* The published title: the one display size (TYPOGRAPHY.md). */}
              <h1
                id="published-title"
                className="text-2xl md:text-3xl font-semibold leading-tight text-ink text-balance break-words"
              >
                {title}
              </h1>
              {descriptor && (
                <p data-part="descriptor" className="text-sm text-ink-secondary leading-snug break-words">
                  {descriptor}
                </p>
              )}
              <p data-part="meta" className="text-meta text-ink-tertiary">
                {edited && (
                  <>
                    {entity?.updatedAt ? "Last updated" : "Added"}{" "}
                    <time dateTime={edited}>{formatRecordDate(edited, language)}</time>
                    {" · "}
                  </>
                )}
                {LANGUAGE_NAMES[language]}
              </p>
            </div>
          </header>

          <div
            data-part="body"
            data-layout={hasSide ? "split" : "single"}
            className={`mt-12 md:mt-14 grid gap-12 ${
              hasSide ? "lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:gap-x-16" : ""
            }`}
          >
            {/* With prose, the facts are first in the source so they lead on a
                phone, and sit in the side column's first row on a wide screen,
                beside the main column that spans both rows. */}
            {factsInSide && factList}

            <div
              data-part="main"
              className={`flex flex-col gap-12 min-w-0 ${hasSide ? "lg:col-start-1 lg:row-start-1 lg:row-span-2" : ""}`}
            >
              {empty && (
                <p data-part="empty" className="text-xs text-ink-tertiary">
                  No metadata for this entity yet.
                </p>
              )}
              {!factsInSide && facts.length > 0 && factList}
              {reading.map((block) => (
                <ReadingBlock key={blockKey(block)} block={block} />
              ))}
              {gallery.length > 0 && (
                <section data-part="gallery" className="flex flex-col gap-4">
                  <SectionLabel as="h2">{t("System", "Images")}</SectionLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {gallery.map((img: EntityImage, i) => (
                      <div key={`${img.url}-${i}`} className="block rounded-md overflow-hidden bg-vellum">
                        <img src={img.url} alt={img.alt} className="block w-full aspect-square object-cover" />
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {hasFiles && <SupportingFiles profile={profile} language={language} />}
            </div>

            {rels.entities > 0 && (
              <aside
                data-part="side"
                aria-labelledby="published-relationships"
                className={`min-w-0 flex flex-col gap-5 ${factsInSide ? "lg:col-start-2 lg:row-start-2" : "lg:col-start-2 lg:row-start-1 lg:row-span-2"}`}
              >
                <div className="flex flex-col gap-1">
                  <SectionLabel as="h2">
                    <span id="published-relationships">{t("System", "Relationships")}</span>
                  </SectionLabel>
                  <p data-part="summary" className="text-xs text-ink-tertiary tabular-nums">
                    {/* `bdi`: a phrase that starts with a number keeps it in front under RTL. */}
                    <bdi>{plural(rels.links, "relationship")}</bdi>, <bdi>{plural(rels.entities, "entity", "entities")}</bdi>
                  </p>
                </div>
                {rels.groups.map((g) => (
                  <RelationshipGroup key={g.typeId} typeId={g.typeId} rows={g.rows} />
                ))}
              </aside>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const blockKey = (b: Block) =>
  b.kind === "item" ? b.item.id : b.kind === "group" ? `group:${b.group.connectionKey}` : b.field.id;

const linkKey = (type: RelationType, entityId: string) => `${type}\u0000${entityId}`;

/** The record's entries, in template order, split by shape: short values and
 *  link-only connections are facts; prose, recordings and the inheritance
 *  tables are reading. Also returns the descriptor (the first short facts as
 *  one line) and every relationship the page already shows, so the
 *  relationships list can leave those out. */
function arrange(
  profile: EntityProfile,
  language: Language,
  getProp: ReturnType<typeof makeEntityPropReader>,
) {
  const { fields } = deriveTemplateStructure(profile, language);
  const relFields = fields.filter((f): f is RelationshipMetadataField => f.type === "relationship");
  const { groups } = groupConnections(relFields, language, getProp);
  const groupByKey = new Map(groups.map((g) => [g.connectionKey, g]));
  const placed = new Set<string>();
  const facts: MetadataItem[] = [];
  const reading: Block[] = [];
  const shownLinks = new Set<string>();
  // Descriptor candidates: short, single, plain values. Places go last, so the
  // line reads "Petitioner · Argentina".
  const words: string[] = [];
  const placeWords: string[] = [];

  const show = (f: RelationshipMetadataField) => f.connectedEntityIds.forEach((id) => shownLinks.add(linkKey(f.relationType, id)));

  for (const f of fields) {
    if (f.type === "relationship") {
      if (f.connectedEntityIds.length === 0 && !f.totalConnected) continue;
      const group = f.connectionKey ? groupByKey.get(f.connectionKey) : undefined;
      if (group) {
        if (placed.has(group.connectionKey)) continue;
        placed.add(group.connectionKey);
        group.fields.forEach(show);
        reading.push({ kind: "group", group });
        continue;
      }
      show(f);
      if (specInherits(f)) {
        reading.push({ kind: "table", field: f });
        continue;
      }
      facts.push(connectionItem(f));
      if (f.connectedEntityIds.length === 1) {
        const e = getEntity(f.connectedEntityIds[0]);
        const label = e?.title;
        if (label) (e?.geo ? placeWords : words).push(label);
      }
      continue;
    }
    const field = f as MetadataField;
    if (!field.value?.trim()) continue;
    // Pictures are the masthead and the gallery, not facts.
    if (field.type !== "link" && isImageUrl(field.value)) continue;
    const item = fieldItem(field);
    if (item.kind === "long") {
      reading.push({ kind: "item", item });
      continue;
    }
    facts.push(item);
    const isDate = field.type === "date";
    if (item.kind === "scalar" && !isDate && field.type !== "link" && !/^[\d\s.,-]+$/.test(field.value)) {
      // A country is a select on the Countries thesaurus too (decision S3).
      (field.type === "country" || countryFlag(field.value) ? placeWords : words).push(field.value.trim());
    }
  }
  const descriptor = [...new Set([...words.slice(0, placeWords.length ? 1 : 2), ...placeWords.slice(0, 1)])].join(" · ");
  return { facts, reading, descriptor, shownLinks };
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
    <section data-part="prose" data-field-key={item.id} className="flex flex-col gap-4 max-w-[42rem]">
      <SectionLabel as="h2">{item.label}</SectionLabel>
      <div className="min-w-0 break-words">{item.content}</div>
    </section>
  );
}

type RelRow = { entityId: string; types: RelationType[] };

/** The entity's relationships as the entities they reach: one row per entity
 *  with every relationship type that links it, grouped by the entity's
 *  template, in first-seen order. Relationships the page already shows as a
 *  fact or a table (`shown`) are left out; an entity left with no type is
 *  dropped. Hub members are listed as the entities they are. */
function relationshipGroups(references: Reference[], shown: Set<string>) {
  const rows = new Map<string, RelRow>();
  for (const rel of deriveRelationships(references, { includeHubMembers: true })) {
    if (shown.has(linkKey(rel.relationType, rel.targetEntityId))) continue;
    const row = rows.get(rel.targetEntityId) ?? { entityId: rel.targetEntityId, types: [] };
    if (!row.types.includes(rel.relationType)) row.types.push(rel.relationType);
    rows.set(rel.targetEntityId, row);
  }
  const byTemplate = new Map<string, RelRow[]>();
  let links = 0;
  for (const row of rows.values()) {
    const typeId = getEntity(row.entityId)?.typeId ?? "";
    byTemplate.set(typeId, [...(byTemplate.get(typeId) ?? []), row]);
    links += row.types.length;
  }
  return {
    groups: [...byTemplate].map(([typeId, list]) => ({ typeId, rows: list })),
    links,
    entities: rows.size,
  };
}

function RelationshipGroup({ typeId, rows }: { typeId: string; rows: RelRow[] }) {
  const [all, setAll] = useState(false);
  const preview = useSetAtom(overlayEntityIdAtom);
  const shown = all ? rows : rows.slice(0, GROUP_PREVIEW);
  const name = getEntityType(typeId)?.name;
  return (
    <section data-part="relationship-group" aria-label={name} className="flex flex-col gap-2.5 min-w-0">
      <EntityTypeTag typeId={typeId} />
      <ul className="flex flex-col gap-2 min-w-0">
        {shown.map(({ entityId, types }) => {
          const e = getEntity(entityId);
          return (
            <li key={entityId} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
              <button
                type="button"
                onClick={() => preview(entityId)}
                aria-label={`Open ${e?.title ?? "entity"}`}
                className="min-w-0 max-w-full rounded-md hover:opacity-80 transition-opacity cursor-pointer
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35"
              >
                <EntityPill typeId={e?.typeId ?? ""} label={e?.title} />
              </button>
              <span data-part="types" className="text-meta text-ink-tertiary min-w-0">
                {types.map(relationDisplayLabel).join(" · ")}
              </span>
            </li>
          );
        })}
      </ul>
      {rows.length > GROUP_PREVIEW && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
          className="w-fit text-xs text-ink-secondary hover:text-ink underline underline-offset-2 cursor-pointer
            focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 rounded-xs"
        >
          {all ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}
    </section>
  );
}

/** The entity's documents, one row per document with its files' languages.
 *  A title opens it where it can be read: the primary document in the entity
 *  view's Document tab (viewer, references, search), the rest in Files. */
function SupportingFiles({ profile, language }: { profile: EntityProfile; language: Language }) {
  const setMode = useSetAtom(entityDisplayModeAtom);
  const requestTab = useSetAtom(entityTabRequestAtom);
  const files = profile.files ?? [];
  const groups = [...(profile.documentGroups ?? [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.order - b.order);
  const docs = groups.length
    ? groups.map((g) => ({ id: g.id, title: g.title, primary: g.isPrimary, files: files.filter((f) => f.groupId === g.id) }))
    : [{ id: "doc", title: profile.document?.[language]?.title ?? files[0]?.name ?? "Document", primary: profile.hasDocument, files }];
  const pages = profile.document?.[language]?.pages;
  return (
    <section data-part="files" className="flex flex-col gap-4">
      <SectionLabel as="h2">{t("System", "Supporting files")}</SectionLabel>
      <ul className="flex flex-col gap-3">
        {docs.map((d) => {
          const langs = [...new Set(d.files.map((f) => f.language).filter(Boolean))];
          const meta = [
            (d.files[0]?.type ?? "pdf").toUpperCase(),
            langs.join(", "),
            d.primary && pages ? plural(pages, "page") : "",
          ].filter(Boolean);
          return (
            <li key={d.id} className="flex items-start gap-3 min-w-0">
              <span aria-hidden className="mt-0.5 shrink-0 w-8 h-8 rounded-md bg-vellum text-ink-tertiary flex items-center justify-center">
                <FileText size={15} />
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    requestTab(d.primary && profile.hasDocument ? "document" : "files");
                    setMode("entity");
                  }}
                  aria-label={`Open ${d.title}`}
                  className="w-fit text-start text-sm font-medium text-ink leading-snug break-words hover:underline underline-offset-2 cursor-pointer
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 rounded-xs"
                >
                  {d.title}
                </button>
                <p className="text-meta text-ink-tertiary tabular-nums">{meta.join(" · ")}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The toggle's size, in one place so it cannot drift. */
const TOGGLE_BOX = "w-7 h-7 rounded-md";
const TOGGLE_ICON = 14;

/** The one switch between the published view and the entity view, for an
 *  entity whose template has a published view (hidden otherwise).
 *
 *  Fixed at the content area's top inline-end corner, under the navbar: in the
 *  entity view that is the empty end of the drawer's tab row, in the published
 *  view the page's margin. It is the same spot in both modes, and being fixed
 *  it moves nothing when the mode changes. Icon only, with a hint; its name
 *  says where it goes ("Entity view" / "Published view"). Back to the entity
 *  view opens Metadata. Leaving the entity view goes through the dirty-form
 *  guard, like a tab change. Below desktop the entity view's tab row keeps its
 *  slot free (`reserveToggleSlotAtom`). */
export function PublishedViewToggle() {
  const available = useAtomValue(focusedHasPublishedViewAtom);
  const mode = useAtomValue(entityDisplayModeAtom);
  const setMode = useSetAtom(entityDisplayModeAtom);
  const requestTab = useSetAtom(entityTabRequestAtom);
  const guard = useDirtyGuard();
  // A slide-over, sheet or dialog puts its own close where this sits; the
  // toggle steps aside (invisible, so nothing moves) until it closes.
  const covered = useAtomValue(layerStackAtom).length > 0;
  if (!available) return null;
  const toEntity = mode === "published";
  const label = toEntity ? "Entity view" : "Published view";
  const Icon = toEntity ? PanelRight : Newspaper;
  return (
    <Hint text={label} describe={false}>
      {(hint) => (
        <button
          {...hint}
          type="button"
          data-component="PublishedViewToggle"
          data-mode={mode}
          aria-label={label}
          onClick={() => {
            if (!toEntity) return guard(() => setMode("published"));
            // The entity view opens on Metadata from here, whatever tab was
            // open last; drawer, scroll and language stay as they were.
            requestTab("metadata");
            setMode("entity");
          }}
          className={`fixed z-30 top-[3.75rem] end-3 ${TOGGLE_BOX} flex items-center justify-center
            transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 ${WARM_BUTTON} ${
            covered ? "invisible" : ""
          }`}
        >
          <Icon size={TOGGLE_ICON} aria-hidden className="rtl:-scale-x-100" />
        </button>
      )}
    </Hint>
  );
}
