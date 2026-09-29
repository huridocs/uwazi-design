import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { X, ArrowRight, ChevronLeft } from "lucide-react";
import { referencesAtom, referencesFor } from "../../atoms/references";
import { activeFilterCountFor } from "../../atoms/filters";
import { focusMetadataFieldAtom, libraryEditRequestAtom, libraryOpenEntityIdAtom } from "../../atoms/library";
import { entityCorpusOf, getEntity, getEntityType } from "../../data/entities";
import { languageAtom } from "../../atoms/language";
import { commitDraftAtom, discardDraftAtom, draftEntityIdAtom, draftVersionAtom, saveEntityEditAtom, startDraftAtom } from "../../atoms/entityChanges";
import { useNotify } from "../../hooks/useNotify";
import type { EditResult } from "../../utils/createEntity";
import type { MetadataField } from "../../data/metadata";
import type { Language } from "../../atoms/language";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { previewEntityIdAtom } from "../../atoms/entityPreview";
import { getEntityProfile } from "../../data/entityProfiles";
import { uiLanguageAtom } from "../../atoms/uiLanguage";
import { tabsForType } from "../../utils/entityTabs";
import { EntityScopeProvider } from "../../hooks/useEntityScope";
import { EntityIdentity } from "../shared/EntityIdentity";
import { MainTabs } from "../layout/MainTabs";
import { CloseAllButton } from "../layout/CloseAllButton";
import { DocumentViewer } from "../viewer/DocumentViewer";
import { RelationshipsDrawerSection } from "../relationships/RelationshipsDrawerSection";
import { FiltersHostProvider } from "../shared/FiltersSlideOver";
import { ModalHostProvider } from "../shared/Modal";
import { RelationshipsCollapseControls } from "../relationships/CollapseControls";
import { DrawerFilesBody } from "../files/DrawerFilesBody";
import { EntityMetadataSummary } from "../metadata/EntityMetadataSummary";
import { MetadataEditBody } from "../../views/MetadataView";
import { EntityBarActions } from "./EntityBarActions";
import { BAR_GHOST } from "../shared/warmButton";
import { editSessionOpenAtom, guardNavigationAtom } from "../../atoms/dirtyGuard";

export interface EntityDetailBodyProps {
  entityId: string;
  /** The host has FOCUSED this entity globally (the Library drawer preview
   *  does, via `focusEntityForPreviewAtom`). The Document and Files bodies read
   *  the globally seeded file atoms and the editor reads the focused profile, so
   *  those three are only offered when the focus actually points here — an
   *  overlay opened over another entity's view must leave that focus alone. */
  focused?: boolean;
  /** Rendered above the tabs — the Copy From source preview in the overlay. */
  banner?: ReactNode;
  onClose: () => void;
  /** Accessible name for the header's close button ("Back to filters", …). */
  closeLabel?: string;
  /** Before the identity on the header row: a stacked sheet's Back. */
  leading?: ReactNode;
  /** A layer above the first on the phone's sheet stack: the header's close
   *  becomes the labelled "Close all" (`onClose`), and the footer's Close
   *  becomes Back, which returns to the layer beneath (`onBack`). */
  stackedBack?: { onBack: () => void; label?: string };
  onOpen: () => void;
  openLabel: string;
  identitySize?: "sm" | "md";
  /** The connected-entity slide-over (`EntityPreviewSlideOver`), mounted over
   *  the tab content on EVERY tab: a Relationships pill, a relationship field's
   *  "Source" and Copy from's source preview all open it. The Library preview
   *  passes one; the slide-over host mounts none (it would mount itself). It
   *  used to render only inside the edit form, so pills in the Library
   *  preview's Relationships tab set the preview entity and nothing showed it. */
  overlay?: ReactNode;
  /** Session id for the metadata editor — must be distinct per mounted form. */
  editSessionId?: string;
  editDirtyLabel?: string;
}

/** Draft discards waiting a tick — see the draft cleanup in the body. */
const pendingDraftDiscard = new Map<string, number>();

/** The side-panel entity detail: identity header, the entity view's own main
 *  tabs (Document / Metadata / Relationships / Files) with drawer-flavoured
 *  bodies, and a Close / open-entity footer.
 *
 *  ONE implementation behind both panels that show an entity beside something
 *  else — the Library's drawer preview and the connection overlay — so the two
 *  can't drift into different answers to "what is this entity". Connection
 *  surfaces inside it are scoped by `EntityScopeProvider` rather than by moving
 *  the app's focus, which is what lets the overlay sit on top of a view without
 *  swapping the entity behind it. */
/** The title row's height, so the slide-over layer can start beneath it. */
function useHeight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [h, setH] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, h] as const;
}

export function EntityDetailBody({
  entityId,
  focused = false,
  banner,
  onClose,
  closeLabel = "Close",
  leading,
  stackedBack,
  onOpen,
  openLabel,
  identitySize = "md",
  overlay,
  editSessionId = "metadata-edit-drawer",
  editDirtyLabel = "Metadata edits (preview)",
}: EntityDetailBodyProps) {
  const references = useAtomValue(referencesAtom);
  const language = useAtomValue(languageAtom);
  /* An entity being CREATED (Create entity): it opens straight into its form,
     offers no other tab — it has no connections or files yet — and its
     Cancel discards it and its Save is what adds it to the library. */
  const isDraft = useAtomValue(draftEntityIdAtom) === entityId;
  // Re-read when the draft is rewritten in place (its template changed).
  useAtomValue(draftVersionAtom);
  const commitDraft = useSetAtom(commitDraftAtom);
  const startDraft = useSetAtom(startDraftAtom);
  const store = useStore();
  const notify = useNotify();
  const saveEdit = useSetAtom(saveEntityEditAtom);
  /* The edit form edits the FOCUSED entity, and a host focuses this one in an
     effect — after the first render. A draft opens straight into its form, so
     on that first render the form would seed itself from whatever was focused
     before. It waits for the focus to arrive. */
  const focusArrived = useAtomValue(focusedEntityIdAtom) === entityId;
  const discardDraft = useSetAtom(discardDraftAtom);
  // Leaving a draft any other way — the drawer's X, another entity selected —
  // discards it too; a draft nothing is showing is a record nobody can reach.
  const isDraftRef = useRef(isDraft);
  isDraftRef.current = isDraft;
  // Deferred a tick, and cancelled by a remount of the same entity: StrictMode
  // mounts, cleans up and mounts again, and an immediate discard there dropped
  // every new draft the moment it opened.
  useEffect(() => {
    window.clearTimeout(pendingDraftDiscard.get(entityId));
    return () => {
      if (!isDraftRef.current) return;
      pendingDraftDiscard.set(
        entityId,
        window.setTimeout(() => {
          pendingDraftDiscard.delete(entityId);
          discardDraft(entityId);
        }, 0),
      );
    };
  }, [entityId, discardDraft]);
  const stored = getEntity(entityId);
  // Its title is the form's to fill; until then the header names the template.
  const entity =
    stored && isDraft && !stored.title
      ? { ...stored, title: `New ${getEntityType(stored.typeId)?.name ?? "entity"}` }
      : stored;
  const profile = getEntityProfile(entityId);

  // Connection count for the tab strip: the same slice the scoped
  // Relationships body lists.
  const connectionCount = useMemo(
    () => referencesFor(entityId, references).length,
    [references, entityId],
  );
  const filesCount = profile.files?.length ?? 0;

  // This panel's own filters (its body is scoped to `entityId`), not the host's.
  const relFilterCount = useAtomValue(activeFilterCountFor(entityId));
  // Chrome language: re-render the t()-built tab labels when it changes.
  useAtomValue(uiLanguageAtom);
  const showDocument = focused && profile.hasDocument;
  const tabs = tabsForType(profile.typeId, showDocument)
    // Files reads the globally seeded file atoms, which hold the focused
    // entity's files only.
    .filter((tab) => (tab.id === "files" ? focused : true))
    .filter((tab) => (isDraft ? tab.id === "metadata" : true))
    .map((tab) => {
      if (tab.id === "relationships")
        return { ...tab, count: connectionCount, dot: relFilterCount > 0 };
      if (tab.id === "files") return { ...tab, count: filesCount };
      return tab;
    });

  const [activeTab, setActiveTab] = useState(showDocument ? "document" : "metadata");
  useEffect(() => {
    setActiveTab(showDocument ? "document" : "metadata");
  }, [entityId, showDocument]);

  // A Results-tab Properties click deep-focuses a metadata field: force the
  // Metadata tab so `MetadataRecord` can scroll + flash it. Runs AFTER the
  // default-tab effect (both fire on entity change), so it wins; clearing the
  // atom later re-runs this with a falsy condition — a no-op, so it won't yank
  // the tab back.
  const focusField = useAtomValue(focusMetadataFieldAtom);
  useEffect(() => {
    if (focusField?.entityId === entityId) setActiveTab("metadata");
  }, [focusField, entityId]);

  /* ── Editing ──────────────────────────────────────────────────────────────
     The SAME MetadataEditBody the full view renders, in its compact flavour.
     It edits the FOCUSED entity, so it is offered only where this panel and the
     focus agree on which entity that is. */
  const [editing, setEditing] = useState(isDraft);
  // Any edit session anywhere, this panel's own included — see the footer.
  const editSessionOpen = useAtomValue(editSessionOpenAtom);

  // A different entity is a different record: end the session rather than carry
  // one entity's unsaved edits into another's form. The registration tears down
  // with the body, so nothing is left registered.
  useEffect(() => {
    setEditing(isDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a new entity, not a new draft flag
  }, [entityId]);

  // Only the Metadata tab has an editor; leaving that tab ends the session.
  useEffect(() => {
    if (activeTab !== "metadata") setEditing(false);
  }, [activeTab]);

  // Edit with ONE entity selected opens its preview straight on the form. After
  // the two resets above (effects run in order, so theirs would undo this on
  // the mount it arrives with), and only once the focus is this entity's — the
  // form edits the FOCUSED entity.
  const [editRequest, setEditRequest] = useAtom(libraryEditRequestAtom);
  useEffect(() => {
    if (editRequest !== entityId || !focused || !focusArrived) return;
    setActiveTab("metadata");
    setEditing(true);
    setEditRequest(null);
  }, [editRequest, entityId, focused, focusArrived, setEditRequest]);

  /* The Filters slide-over covers THE PANEL, header to footer — the geometry
     the entity view's pane gives it for free, because there the positioned box
     and the pane are the same element. Here the tab content is its own
     `relative overflow-hidden` box (the graph canvas needs it), so the drawer
     was scoped to the tab area: it began under the tab strip and stopped above
     the footer. Making the root positioned is not enough on its own — the tab
     wrapper's `overflow-hidden` clips the drawer wherever it is positioned
     from — so the root names itself the drawer's host and the drawer portals
     out to it. See FiltersHostProvider. A pane modal (Copy From) takes the
     same root for the same reason: its scrim covers header, tabs and footer. */
  const [panelEl, setPanelEl] = useState<HTMLDivElement | null>(null);
  const [headerRef, headerH] = useHeight<HTMLDivElement>();
  // Covered: this panel hosts the slide-over (`overlay`) and it is open.
  const [previewId, setPreviewId] = useAtom(previewEntityIdAtom);
  const covered = !!overlay && previewId !== null;

  /** "Save and create another": save this draft, then open the next one of
   *  the same template in this drawer, its pinned properties filled from the
   *  record just saved. The preview selection moves to the new draft. */
  const saveAndNew = (result: EditResult, pinned: ReadonlySet<string>) => {
    const typeId = entity?.typeId;
    if (!typeId) return;
    const corpus = entityCorpusOf(entityId);
    const saved = result.titles[language]?.trim() || "Untitled";
    commitDraft({ id: entityId, result, language });
    const next = startDraft({ typeId, corpus, carry: result.fieldsByLang, only: pinned });
    store.set(libraryOpenEntityIdAtom, next);
    notify(
      pinned.size
        ? `Saved “${saved}”. The next one is open, ${pinned.size} pinned ${pinned.size === 1 ? "value" : "values"} filled in.`
        : `Saved “${saved}”. The next one is open.`,
      "success",
    );
  };
  /** Duplicate: a draft of the same template holding this entity's property
   *  values (not its title, files or connections), open for editing. */
  const duplicate = () => {
    const typeId = entity?.typeId;
    if (!typeId) return;
    const profile = getEntityProfile(entityId);
    const carry = Object.fromEntries(
      (Object.keys(profile.metadata) as Language[]).map((l) => [
        l,
        profile.metadata[l].filter((f): f is MetadataField => f.type !== "relationship"),
      ]),
    ) as Partial<Record<Language, MetadataField[]>>;
    store.set(guardNavigationAtom, () =>
      store.set(libraryOpenEntityIdAtom, startDraft({ typeId, corpus: entityCorpusOf(entityId), carry })),
    );
  };

  return (
    <EntityScopeProvider entityId={entityId}>
      <FiltersHostProvider host={panelEl}>
      <ModalHostProvider host={panelEl}>
      {/* THE GUTTER HOST. The side gutter is this box's padding and nothing
          else's: the header, tabs, toolbar, cards and footer below carry no side
          padding of their own, so they cannot disagree about where the content
          starts. Boxes that must reach the panel edge — the header and footer
          rules, the tab-content clip, scroll lanes, the document page — use
          `bleed` / `bleed-flush`. `window.__gutter()` measures it. */}
      <div
        ref={setPanelEl}
        data-gutter-host
        className="gutter-host relative flex flex-col h-full min-h-0 bg-paper overflow-clip"
      >
        {/* Identity header on top — the entity title + close, acting as the
            panel header. Tabs sit beneath it (flipped from the entity view so the
            panel reads title-first). */}
        <div
          ref={headerRef}
          className="bleed relative flex items-start gap-2 pt-3 pb-2.5 shrink-0"
          style={{ borderBottom: "1px solid var(--border-primary)" }}
        >
          {/* While the slide-over covers this panel, the title row stays as
              the parent in the hierarchy and is ONE control: back to this
              entity (closes the slide-over). Its own × and Back sit under it. */}
          {covered ? (
            <button
              type="button"
              data-part="back-to-parent"
              onClick={() => setPreviewId(null)}
              aria-label={`Back to ${entity?.title ?? "entity"}`}
              className="absolute inset-0 z-30 cursor-pointer bg-transparent hover:bg-warm/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent-blue)]"
            />
          ) : null}
          {/* A stacked sheet's Back (MobileOverlayStack): on this row, level
              with the type and title, not squeezed against the sheet's edge. */}
          {leading && <div className="shrink-0 self-center">{leading}</div>}
          <EntityIdentity entity={entity} size={identitySize} />
          {/* Its BOX meets the gutter, not the icon: the hover fill must stay
              inside the panel edge. */}
          {stackedBack ? (
            <div className="shrink-0 self-center">
              <CloseAllButton onClick={onClose} />
            </div>
          ) : (
            <button
              onClick={onClose}
              aria-label={closeLabel}
              data-gutter-align="box"
              // `after:` extends the target to 44px without growing the header.
              className="relative after:absolute after:-inset-2 after:content-[''] -mt-0.5 p-1.5 rounded-md hover:bg-warm text-ink-muted hover:text-ink transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {banner && <div className="pt-3 shrink-0">{banner}</div>}

        {/* Main-tab navigation beneath the identity header. */}
        <MainTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

        {/* Tab content — drawer-flavoured bodies, scoped to this entity.
            flex COLUMN: the bodies are toolbar + flex-1 pane (the graph canvas, the
            scrolling list). As a plain block this box gave `flex-1` nothing to grow
            against, so the graph collapsed to the SVG's intrinsic height and sat in
            the top half of an empty pane. `bleed`: it clips (`overflow-hidden`), so
            it has to span the panel for the lanes inside it to reach the edge. */}
        <div className="bleed flex-1 min-h-0 relative overflow-hidden flex flex-col">
          {activeTab === "document" ? (
            <DocumentViewer showMinimap={false} hideActionBar />
          ) : activeTab === "relationships" ? (
            <RelationshipsDrawerSection hideActionBar />
          ) : activeTab === "files" ? (
            <DrawerFilesBody hideActionBar />
          ) : editing && (!isDraft || focusArrived) ? (
            <>
              <MetadataEditBody
                // A draft whose template changed is a new form over the new
                // template's record (see `retypeDraftAtom`).
                key={isDraft ? `${entityId}:${entity?.typeId}` : entityId}
                compact
                sessionId={isDraft ? "create-entity" : editSessionId}
                dirtyLabel={isDraft ? "New entity" : editDirtyLabel}
                onCancel={() => {
                  setEditing(false);
                  if (!isDraft) return;
                  // Close first — on the next tick, once the form has unmounted
                  // and left the dirty registry, so Cancel doesn't ask whether to
                  // discard what it is discarding — then drop the draft.
                  window.setTimeout(() => {
                    onClose();
                    discardDraft(entityId);
                  }, 0);
                }}
                onSave={(result) => {
                  if (isDraft) commitDraft({ id: entityId, result, language });
                  else saveEdit({ id: entityId, result, language });
                  setEditing(false);
                }}
                draft={isDraft ? { onSaveAndNew: saveAndNew } : undefined}
              />
            </>
          ) : (
            <EntityMetadataSummary entityId={entityId} />
          )}
        </div>

        {/* Footer action bar — h-12, matching the entity view / library footers
            so the bottom divider is continuous across the split.

            While editing, MetadataEditBody's own bar IS this bar: it is the same
            h-12 row with the same top border, and it carries Copy from / Cancel /
            Save plus the validation summary. Rendering both would stack two
            action bars at the foot of a 460px pane — the thing `hideActionBar`
            exists to prevent on the other three tabs. The edit session is the
            only thing you can be doing here, so it gets the slot. */}
        {!editing && (
          <div
            className="bleed shrink-0 flex items-center gap-2 h-12 bg-paper"
            style={{ borderTop: "1px solid var(--border-primary)" }}
          >
            {/* The collapse pair lives in the Relationships action bar, and this
                panel passes `hideActionBar` to keep from stacking two bars — so
                without this the one host that suppresses that bar would be the one
                host with no way to collapse. It is adopted into THIS bar rather
                than given a slim bar of its own, which would have been the double
                footer the flag exists to prevent. The wiring is
                `RelationshipsCollapseControls`' — a second HOST, not a second
                implementation. It sits before the `flex-1` spacer, so Close and
                the open button never move when it mounts. */}
            {activeTab === "relationships" && <RelationshipsCollapseControls />}
            {focused && activeTab === "metadata" && (
              <button
                onClick={() => setEditing(true)}
                data-gutter-align="box"
                className={`px-3 py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer`}
              >
                Edit
              </button>
            )}
            {/* Share, Permissions | Delete for this entity — icons here, the
                footer also carries Close and the open-entity commit. */}
            {focused && !isDraft && activeTab === "metadata" && (
              <EntityBarActions entityId={entityId} onDeleted={onClose} onDuplicate={duplicate} compact />
            )}
            <div className="flex-1" />
            {/* Ghost: the ink "Open entity" beside it is this bar's one filled
                button (the ladder in `warmButton.ts`). */}
            {stackedBack ? (
              <button
                onClick={stackedBack.onBack}
                data-part="back-footer"
                aria-label={stackedBack.label ? `Back to ${stackedBack.label}` : "Back"}
                className={`inline-flex items-center gap-1 ps-2 pe-3 py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer`}
              >
                <ChevronLeft size={14} aria-hidden className="rtl:rotate-180" />
                Back
              </button>
            ) : (
              <button
                onClick={onClose}
                className={`px-3 py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer`}
              >
                Close
              </button>
            )}
            {/* HIDDEN while any edit form is open — this panel over a Metadata
                edit's "Source" row, a click-to-fill hunt, the drawer preview's
                own edit: opening an entity navigates, and navigating discards
                the form. Hidden, not disabled (a disabled route still reads as
                one), and `invisible` rather than unmounted, so Close keeps its
                x and the bar its height. Outside edit mode it is there. */}
            <button
              onClick={onOpen}
              aria-hidden={editSessionOpen || undefined}
              tabIndex={editSessionOpen ? -1 : undefined}
              data-part="open-entity"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                editSessionOpen ? "invisible" : ""
              }`}
              style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-surface)" }}
            >
              {openLabel} <ArrowRight size={13} />
            </button>
          </div>
        )}
        {/* The connected-entity slide-over: from under the title row to the
            panel's bottom edge, over the tabs, the body and the action bar, so
            only its own footer shows. The layer takes no pointer events of its
            own; the scrim and panel inside it do. */}
        {overlay ? (
          <div data-part="overlay-layer" className="absolute inset-x-0 bottom-0 pointer-events-none [&>[role=dialog]]:pointer-events-auto" style={{ top: headerH, zIndex: 20 }}>
            {overlay}
          </div>
        ) : null}
      </div>
      </ModalHostProvider>
      </FiltersHostProvider>
    </EntityScopeProvider>
  );
}
