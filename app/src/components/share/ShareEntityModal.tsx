import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { AlertTriangle, Eye, Globe, Info, Lock, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import {
  applyShareAtom,
  DEFAULT_MEMBERS,
  entityAccessAtom,
  type AccessLevel,
  type MemberChange,
} from "../../atoms/entityOverlay";
import { notificationsAtom } from "../../atoms/notifications";
import { entityCorpusOf, getEntity, getEntityType } from "../../data/entities";
import { seedGroups, seedUsers } from "../../data/settings";
import { Modal, MODAL_BUTTON, MODAL_COMMIT } from "../shared/Modal";
import { BAR_GHOST } from "../shared/warmButton";
import { t } from "../../utils/i18n";
import { typeLabelColor } from "../../utils/typeColor";

type Visibility = "private" | "published";

type ShareEntityModalProps = {
  open: boolean;
  onClose: () => void;
  /** The entities to share. Absent: the focused entity, as before. */
  ids?: string[];
  /** Where focus lands on open: the general-access radios (Share — publish /
   *  unpublish) or the people lookup (Permissions). Everything is reachable
   *  from either. */
  initialFocus?: "access" | "people";
  /** Whether the current user may share an entity. The prototype has no
   *  roles, so every entity is allowed; the skipped count is built. */
  canShare?: (id: string) => boolean;
};

const noticeClass = "flex items-center gap-1 text-meta leading-tight text-ink-secondary";

const hintClass =
  "rounded-md border border-border bg-paper px-2.5 py-1.5 text-meta font-medium leading-snug text-ink shadow-sm";

const findCollaborator = (term: string, assignedIds: Set<string>): { id: string; label: string } | undefined => {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return undefined;
  const user = seedUsers.find(
    (entry) =>
      !assignedIds.has(entry.id) &&
      (entry.username.toLowerCase() === normalized || entry.email.toLowerCase() === normalized),
  );
  if (user) return { id: user.id, label: user.username };
  const group = seedGroups.find((entry) => !assignedIds.has(entry.id) && entry.name.toLowerCase() === normalized);
  if (group) return { id: group.id, label: group.name };
  return undefined;
};

/** One member across the set: how many entities have them, at which levels. */
interface MemberSummary {
  id: string;
  label: string;
  count: number;
  levels: Set<AccessLevel>;
}

/** Share and Permissions — ONE modal, for one entity or a selection. Share
 *  opens with focus on general access (publish / unpublish), Permissions on
 *  the people lookup; both halves are always there.
 *
 *  It writes to the session's access store (`entityAccessAtom`) and publishes
 *  through the entity overlay, so the Status facet and the counts follow, and
 *  the single-entity Save now persists (it only closed before).
 *
 *  Over several entities every part says where they disagree: general access
 *  reads "Mixed access · 7 published, 5 private" with neither option checked;
 *  a member row carries its coverage ("4 of 12") and "Mixed access" when the
 *  level differs. Only what the user changes is written, and a changed row
 *  says so ("Will change · added to 8") with a revert. Save opens a review in
 *  the same panel; Apply records an exact-inverse Undo. */
export function ShareEntityModal({ open, onClose, ids: idsProp, initialFocus = "access", canShare = () => true }: ShareEntityModalProps) {
  const store = useStore();
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const access = useAtomValue(entityAccessAtom);
  const applyShare = useSetAtom(applyShareAtom);
  // Frozen when the modal opens: the set the review names is the set Apply
  // writes. Until the opening effect has frozen it (the first render), the
  // live set stands in.
  const [frozen, setIds] = useState<string[]>([]);
  const ids = frozen.length ? frozen : (idsProp ?? [focusedId]).filter(Boolean);
  const [visibility, setVisibility] = useState<Visibility | null>(null);
  const [changes, setChanges] = useState<Record<string, MemberChange>>({});
  const [showPublicTip, setShowPublicTip] = useState(false);
  const [lookupTerm, setLookupTerm] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [showLookupHint, setShowLookupHint] = useState(false);
  const [review, setReview] = useState(false);
  const generalAccessRef = useRef<HTMLDivElement>(null);
  const lookupInputRef = useRef<HTMLInputElement>(null);
  // The panel (the shared `Modal` traps focus in it); read to place first focus.
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setIds([]);
      return;
    }
    setIds((idsProp ?? [focusedId]).filter(Boolean));
    setVisibility(null);
    setChanges({});
    setShowPublicTip(false);
    setLookupTerm("");
    setLookupError("");
    setShowLookupHint(false);
    setReview(false);
    // After the focus trap's own first focus.
    const timer = window.setTimeout(() => {
      if (initialFocus === "people") lookupInputRef.current?.focus();
      else panelRef.current?.querySelector<HTMLElement>('[role="radio"]')?.focus();
    }, 30);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a new opening, not a new focus
  }, [open]);

  useEffect(() => {
    if (!showPublicTip) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!generalAccessRef.current?.contains(event.target as Node)) setShowPublicTip(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showPublicTip]);

  // Nothing to summarise while closed: the modal stays mounted beside a
  // selection that can be the whole corpus.
  const eligible = useMemo(() => (open ? ids.filter((id) => canShare(id)) : []), [open, ids, canShare]);
  const skipped = ids.length - eligible.length;
  const n = eligible.length;
  const bulk = ids.length > 1;
  const published = useMemo(() => eligible.filter((id) => getEntity(id)?.published).length, [eligible]);
  const members = useMemo(() => {
    const m = new Map<string, MemberSummary>();
    for (const id of eligible)
      for (const x of access[id] ?? DEFAULT_MEMBERS) {
        const s = m.get(x.id) ?? { id: x.id, label: x.label, count: 0, levels: new Set<AccessLevel>() };
        s.count++;
        s.levels.add(x.level);
        m.set(x.id, s);
      }
    return [...m.values()];
  }, [eligible, access]);

  if (!open) return null;

  const allPublished = n > 0 && published === n;
  const nonePublished = published === 0;
  const effectiveVisibility: Visibility | null = visibility ?? (allPublished ? "published" : nonePublished ? "private" : null);
  const isPublished = effectiveVisibility === "published";
  const dirty = visibility !== null || Object.keys(changes).length > 0;
  const added = Object.entries(changes).filter(
    ([id, c]) => c.kind === "set" && !members.some((m) => m.id === id),
  ) as [string, Extract<MemberChange, { kind: "set" }>][];

  const setGeneralAccess = (next: Visibility) => {
    const unchanged = (next === "published" && allPublished) || (next === "private" && nonePublished);
    setVisibility(unchanged ? null : next);
    setShowPublicTip(next === "published");
  };
  const setChange = (id: string, change: MemberChange | null) =>
    setChanges((prev) => {
      const out = { ...prev };
      if (change) out[id] = change;
      else delete out[id];
      return out;
    });

  const handleAdd = () => {
    const term = lookupTerm.trim();
    if (!term) return;
    const match = findCollaborator(term, new Set([...members.map((m) => m.id), ...Object.keys(changes)]));
    if (!match) {
      setLookupError(t("System", "No user or group found"));
      lookupInputRef.current?.focus();
      return;
    }
    setChange(match.id, { kind: "set", label: match.label, level: "read" });
    setLookupTerm("");
    setLookupError("");
  };

  /* ── Review lines ── */
  const lines: { text: string; count: string; warn?: boolean }[] = [];
  if (visibility === "published")
    lines.push({ text: `Publish ${(n - published).toLocaleString()} ${n - published === 1 ? "entity" : "entities"}`, count: "now visible to anyone", warn: true });
  if (visibility === "private")
    lines.push({ text: `Make ${published.toLocaleString()} ${published === 1 ? "entity" : "entities"} private`, count: "only members can see them" });
  const levelWord = (l: AccessLevel) => (l === "write" ? "can edit" : "can see");
  for (const [id, c] of Object.entries(changes)) {
    const m = members.find((x) => x.id === id);
    if (c.kind === "remove") {
      lines.push({ text: `Remove ${m?.label ?? id}`, count: `${(m?.count ?? 0).toLocaleString()} ${m?.count === 1 ? "entity" : "entities"}` });
    } else if (!m) {
      lines.push({ text: `Add ${c.label}, ${levelWord(c.level)}`, count: `${n.toLocaleString()} ${n === 1 ? "entity" : "entities"}` });
    } else {
      const addedTo = n - m.count;
      lines.push({
        text: `Set ${m.label} to ${levelWord(c.level)}`,
        count: `${n.toLocaleString()} ${n === 1 ? "entity" : "entities"}${addedTo ? ` (added to ${addedTo.toLocaleString()})` : ""}`,
      });
    }
  }

  const apply = () => {
    const corpus = entityCorpusOf(eligible[0] ?? focusedId);
    const ref = applyShare({ corpus, ids: eligible, visibility, members: changes, undoable: bulk });
    if (bulk && ref)
      store.set(notificationsAtom, (prev) => [
        {
          id: `n-${ref}`,
          kind: "success",
          title: `Sharing updated on ${n.toLocaleString()} entities.`,
          detail: "Undo restores their previous access until your next bulk change or delete.",
          time: Date.now(),
          read: false,
          action: { label: "Undo", kind: "undo", ref },
        },
        ...prev,
      ]);
    onClose();
  };

  const byTemplate = (() => {
    const m = new Map<string, number>();
    for (const id of ids) {
      const tid = getEntity(id)?.typeId;
      if (tid) m.set(tid, (m.get(tid) ?? 0) + 1);
    }
    return [...m];
  })();
  const titleId = review ? "share-entity-review-title" : "share-entity-modal-title";

  return (
    <Modal
      component="ShareEntityModal"
      size="md"
      maxHeight="md:max-h-[80vh]"
      portal={false}
      dismissOnScrim={false}
      panelRef={panelRef}
      onClose={onClose}
      titleId={titleId}
      title={review ? "Review changes" : bulk ? `Share ${ids.length.toLocaleString()} entities` : t("System", "Share")}
      subtitle={
        bulk ? (
          <span data-part="subtitle-types" className="inline-flex gap-x-3 text-xs">
            {byTemplate.map(([tid, c]) => {
              const type = getEntityType(tid);
              const color = type?.color ?? "#6B7280";
              return (
                <span key={tid} className="inline-flex items-center gap-1.5">
                  <span className="w-[0.4375rem] h-[0.4375rem] rounded-[2px]" style={{ backgroundColor: color }} aria-hidden />
                  <span className="font-medium" style={{ color: typeLabelColor(color) }}>{type?.name ?? tid}</span>
                  <span className="text-meta text-ink-tertiary tabular-nums">{c.toLocaleString()}</span>
                </span>
              );
            })}
          </span>
        ) : (
          <>{(ids[0] && getEntity(ids[0])?.title) || "Entity"}</>
        )
      }
      closeLabel={t("System", "Close")}
      flush
      footer={
        <>
        {review ? (
          <>
            <button
              type="button"
              onClick={() => setReview(false)}
              data-gutter-align="box"
              className={`me-auto ${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}
            >
              Back
            </button>
            <button
              type="button"
              onClick={apply}
              className={MODAL_COMMIT}
            >
              Apply to {n.toLocaleString()} entities
            </button>
          </>
        ) : dirty ? (
          <>
            <button
              type="button"
              onClick={onClose}
              className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}
            >
              {t("System", "Discard changes")}
            </button>
            <button
              type="button"
              onClick={() => (bulk ? setReview(true) : apply())}
              className={MODAL_COMMIT}
            >
              {t("System", "Save changes")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}
          >
            {t("System", "Close")}
          </button>
        )}
        </>
      }
    >
    {review ? (
      <div data-part="review" className="bleed flex-1 overflow-auto py-3 space-y-1">
        {lines.map((l, i) => (
          <div
            key={i}
            data-gutter-align="box"
                  className={`flex items-baseline justify-between gap-3 px-2 py-1.5 rounded-md text-xs ${l.warn ? "bg-warning-light" : ""}`}
          >
            <span className="text-ink font-medium">{l.text}</span>
            <span className="text-ink-tertiary tabular-nums text-end">{l.count}</span>
          </div>
        ))}
      </div>
    ) : (
    <div data-part="share-body" className="bleed flex-1 overflow-auto">
      {skipped > 0 && (
        <p className="pt-3 text-meta text-ink-tertiary">
          {skipped.toLocaleString()} of {ids.length.toLocaleString()} skipped: you cannot share them.
        </p>
      )}
      <section data-part="general-access" aria-labelledby="share-general-access-title" className="bleed space-y-2 border-b border-border/50 pt-3 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="share-general-access-title" className="text-xs font-medium text-ink-secondary">
            {t("System", "General access")}
          </h3>
          <div ref={generalAccessRef} className="relative">
            <div
              role="radiogroup"
              aria-label={t("System", "General access")}
              className="inline-flex w-fit items-center rounded-md overflow-hidden h-8"
              style={{ border: "1px solid var(--border-primary)" }}
            >
              <AccessSegment
                active={effectiveVisibility === "private"}
                label={t("System", "Private")}
                onClick={() => setGeneralAccess("private")}
                first
              >
                <Lock size={12} aria-hidden />
                <span className="text-xs font-medium whitespace-nowrap">{t("System", "Private")}</span>
              </AccessSegment>
              <AccessSegment
                active={isPublished}
                label={t("System", "Published")}
                onClick={() => setGeneralAccess("published")}
                published
              >
                <Globe size={12} aria-hidden />
                <span className="text-xs font-medium whitespace-nowrap">{t("System", "Published")}</span>
              </AccessSegment>
            </div>
            {showPublicTip ? (
              <div
                role="tooltip"
                data-part="public-tip"
                className={`pointer-events-none absolute inset-e-0 top-full z-20 mt-1.5 w-56 ${hintClass}`}
              >
                {t(
                  "System",
                  "Public entities description",
                  "Caution: the selected entities will be public. Anyone will be able to see them.",
                )}
              </div>
            ) : null}
          </div>
        </div>
        {/* The state line is always mounted: Mixed, Will change, or the
            published caution — so choosing moves nothing below it. */}
        <div data-part="access-state" className="min-h-4 flex items-center gap-2">
          {visibility !== null && bulk ? (
            <ChangedMark label="general access" onRevert={() => setVisibility(null)} />
          ) : effectiveVisibility === null ? (
            <span className="text-meta text-ink-tertiary tabular-nums">
              Mixed access · {published.toLocaleString()} published, {(n - published).toLocaleString()} private
            </span>
          ) : isPublished && !showPublicTip ? (
            <span className={noticeClass}>
              <AlertTriangle size={12} className="shrink-0 text-warning" aria-hidden />
              {bulk ? "Anyone can see these entities" : t("System", "Anyone can see this entity")}
            </span>
          ) : null}
        </div>
      </section>

      <section data-part="lookup" aria-labelledby="share-people-title" className="space-y-3 pt-3">
        <div className="flex items-center gap-1.5">
          <h3 id="share-people-title" className="text-xs font-medium text-ink-secondary">
            {t("System", "People and groups")}
          </h3>
          <button
            type="button"
            aria-label={t("System", "Lookup help")}
            aria-expanded={showLookupHint}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-tertiary transition-colors hover:bg-warm hover:text-ink-secondary cursor-pointer"
            onClick={() => setShowLookupHint((openHint) => !openHint)}
          >
            <Info size={14} aria-hidden />
          </button>
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            handleAdd();
          }}
        >
          <div className="min-w-0 flex-1">
            <input
              ref={lookupInputRef}
              id="share-collaborator-lookup"
              value={lookupTerm}
              onChange={(event) => {
                setLookupTerm(event.target.value);
                if (lookupError) setLookupError("");
              }}
              placeholder={t("System", "Username, email or group")}
              aria-label={t("System", "Username, email or group")}
              autoComplete="off"
              aria-invalid={Boolean(lookupError)}
              className={`w-full rounded-md border bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20 ${
                lookupError ? "border-seal" : "border-border"
              }`}
            />
            {lookupError ? <p className="mt-1 text-meta text-seal-label">{lookupError}</p> : null}
          </div>
          <button
            type="submit"
            disabled={!lookupTerm.trim()}
            className="px-3 py-2 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("System", "Add")}
          </button>
        </form>
        {showLookupHint ? (
          <p className="text-meta text-ink-tertiary">
            {t(
              "System",
              "Lookup hint",
              "Enter the full username, email, or group name from Settings. Suggestions are not shown.",
            )}
          </p>
        ) : null}
      </section>

      <section data-part="members" aria-labelledby="share-people-title" className="py-3">
        <ul data-part="rows" className="divide-y divide-border/50">
          {/* Fixed first row, as in Uwazi: why no entity can be left
              without an editor. Not removable. */}
          <li data-component="MemberRow" data-fixed className="flex items-center gap-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink">{t("System", "Administrators and Editors")}</span>
              <span className="block text-meta text-ink-tertiary">Always</span>
            </span>
            <span className="inline-flex items-center gap-1 text-meta text-ink-secondary">
              <Pencil size={13} aria-hidden /> {t("System", "Can edit")}
            </span>
          </li>
          {members.map((m) => (
            <MemberRow
              key={m.id}
              label={m.label}
              coverage={bulk ? `${m.count.toLocaleString()} of ${n.toLocaleString()}` : undefined}
              current={m.levels.size === 1 ? [...m.levels][0] : null}
              change={changes[m.id]}
              addedTo={n - m.count}
              bulk={bulk}
              showCanSee={bulk || !isPublished}
              onLevel={(level) => {
                const same = m.count === n && m.levels.size === 1 && m.levels.has(level);
                setChange(m.id, same ? null : { kind: "set", label: m.label, level });
              }}
              onRemove={() => setChange(m.id, { kind: "remove" })}
              onRevert={() => setChange(m.id, null)}
            />
          ))}
          {added.map(([id, c]) => (
            <MemberRow
              key={id}
              label={c.label}
              current={c.level}
              change={c}
              addedTo={n}
              isNew
              bulk={bulk}
              showCanSee={bulk || !isPublished}
              onLevel={(level) => setChange(id, { kind: "set", label: c.label, level })}
              onRemove={() => setChange(id, null)}
              onRevert={() => setChange(id, null)}
            />
          ))}
        </ul>
      </section>
    </div>
    )}
    </Modal>
  );
}

/** "Will change" with a revert — the bulk edit form's mark (BulkFieldRow). */
function ChangedMark({ label, onRevert, note }: { label: string; onRevert: () => void; note?: string }) {
  return (
    <span data-part="changed" className="inline-flex items-center gap-1.5 h-4 ps-1.5 pe-0.5 rounded-md bg-warm">
      <span className="w-1.5 h-1.5 rounded-full bg-carbon shrink-0" aria-hidden />
      <span className="text-meta leading-none text-ink-tertiary">{note ?? "Will change"}</span>
      <button
        type="button"
        onClick={onRevert}
        aria-label={`Revert ${label}`}
        title={`Revert ${label}`}
        className="flex items-center justify-center w-4 h-4 rounded text-ink-muted hover:text-ink hover:bg-parchment cursor-pointer
          focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
      >
        <RotateCcw size={10} />
      </button>
    </span>
  );
}

/** One member across the entities being shared: their level (or "Mixed
 *  access"), coverage, and what will happen to them. */
function MemberRow({
  label,
  coverage,
  current,
  change,
  addedTo,
  isNew = false,
  bulk,
  showCanSee,
  onLevel,
  onRemove,
  onRevert,
}: {
  label: string;
  coverage?: string;
  /** The level every entity gives them; null = it differs. */
  current: AccessLevel | null;
  change?: MemberChange;
  addedTo: number;
  isNew?: boolean;
  bulk: boolean;
  showCanSee: boolean;
  onLevel: (level: AccessLevel) => void;
  onRemove: () => void;
  onRevert: () => void;
}) {
  const removed = change?.kind === "remove";
  const level = change?.kind === "set" ? change.level : removed ? null : current;
  const note = removed
    ? "Will be removed"
    : isNew
      ? `Will be added${bulk ? ` to ${addedTo.toLocaleString()}` : ""}`
      : change
        ? `Will change${addedTo > 0 ? ` · added to ${addedTo.toLocaleString()}` : ""}`
        : undefined;
  return (
    <li data-component="MemberRow" data-level={level ?? "mixed"} className="flex items-center gap-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span data-part="name" className={`block truncate text-sm ${removed ? "text-ink-tertiary line-through" : "text-ink"}`}>
          {label}
        </span>
        {/* The meta line is always mounted (coverage, or the change), so a
            change never grows the row. */}
        <span className="flex items-center gap-2 min-h-4">
          {coverage && <span className="text-meta text-ink-tertiary tabular-nums">{coverage}</span>}
          {bulk && note && <ChangedMark label={label} onRevert={onRevert} note={note} />}
          {!removed && level === null && <span className="text-meta text-ink-tertiary">Mixed access</span>}
        </span>
      </span>
      <div data-part="actions" className="flex shrink-0 items-center">
        <div data-part="permissions" className="flex items-center gap-0.5" role="group" aria-label={t("System", "Permission level")}>
          {showCanSee ? (
            <IconAction label={t("System", "Can see")} active={level === "read"} onClick={() => onLevel("read")}>
              <Eye size={16} aria-hidden />
            </IconAction>
          ) : null}
          <IconAction
            label={t("System", "Can edit")}
            active={level === "write"}
            onClick={() => onLevel(level === "write" && !showCanSee ? "read" : "write")}
          >
            <Pencil size={16} aria-hidden />
          </IconAction>
        </div>
        <div className="ms-2 border-s border-border ps-2">
          {removed ? (
            <IconAction label={`Keep ${label}`} onClick={onRevert}>
              <RotateCcw size={16} aria-hidden />
            </IconAction>
          ) : (
            <IconAction label={t("System", "Remove")} danger onClick={onRemove}>
              <Trash2 size={16} aria-hidden />
            </IconAction>
          )}
        </div>
      </div>
    </li>
  );
}

function AccessSegment({
  active,
  label,
  onClick,
  children,
  first = false,
  published = false,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
  first?: boolean;
  published?: boolean;
}) {
  const activeClass =
    published && active
      ? "bg-ink text-parchment"
      : active
        ? "bg-vellum text-ink"
        : "text-ink-tertiary hover:text-ink-secondary";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      data-component="AccessSegment"
      data-state={active ? "active" : "inactive"}
      onClick={onClick}
      className={`flex h-8 items-center gap-1.5 px-2.5 transition-colors cursor-pointer ${activeClass}`}
      style={{ borderLeft: first ? "none" : "1px solid var(--border-primary)" }}
    >
      {children}
    </button>
  );
}

function IconAction({
  label,
  active = false,
  danger = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const className = danger
    ? "inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-tertiary hover:bg-seal-tint hover:text-seal-label cursor-pointer transition-colors"
    : active
      ? "inline-flex h-8 w-8 items-center justify-center rounded-md bg-vellum text-ink cursor-pointer transition-colors"
      : "inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-tertiary hover:bg-warm hover:text-ink-secondary cursor-pointer transition-colors";

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      data-component="IconAction"
      data-variant={danger ? "danger" : "default"}
      aria-pressed={danger ? undefined : active}
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
