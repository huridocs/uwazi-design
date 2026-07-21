import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import {
  AlertTriangle,
  Eye,
  Globe,
  Info,
  Lock,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { getEntity } from "../../data/entities";
import { seedGroups, seedUsers } from "../../data/settings";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { t } from "../../utils/i18n";

type Visibility = "private" | "published";
type AccessLevel = "read" | "write";

type Member = {
  id: string;
  label: string;
  level: AccessLevel;
};

type ShareEntityModalProps = {
  open: boolean;
  onClose: () => void;
};

const INITIAL_MEMBERS: Member[] = seedUsers.slice(0, 1).map((user) => ({
  id: user.id,
  label: user.username,
  level: "read" as AccessLevel,
}));

const noticeClass =
  "flex items-center gap-1 text-[10px] leading-tight text-ink-secondary";

const hintClass =
  "rounded-md border border-border bg-paper px-2.5 py-1.5 text-[10px] font-medium leading-snug text-ink shadow-sm";

const findCollaborator = (term: string, assignedIds: Set<string>): Member | undefined => {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return undefined;

  const user = seedUsers.find(
    (entry) =>
      !assignedIds.has(entry.id) &&
      (entry.username.toLowerCase() === normalized || entry.email.toLowerCase() === normalized),
  );
  if (user) {
    return { id: user.id, label: user.username, level: "read" };
  }

  const group = seedGroups.find(
    (entry) => !assignedIds.has(entry.id) && entry.name.toLowerCase() === normalized,
  );
  if (group) {
    return { id: group.id, label: group.name, level: "read" };
  }

  return undefined;
};

/** Static Share UI synced with Entity V2 Share modal — no permissions API. */
export function ShareEntityModal({ open, onClose }: ShareEntityModalProps) {
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const entityTitle = getEntity(focusedId)?.title ?? "Entity";
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [showPublicTip, setShowPublicTip] = useState(false);
  const [lookupTerm, setLookupTerm] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [showLookupHint, setShowLookupHint] = useState(false);
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [dirty, setDirty] = useState(false);
  const generalAccessRef = useRef<HTMLDivElement>(null);
  const lookupInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useFocusTrap<HTMLDivElement>(open);
  const isPublished = visibility === "published";

  useEffect(() => {
    if (!open) return;
    setVisibility("private");
    setShowPublicTip(false);
    setLookupTerm("");
    setLookupError("");
    setShowLookupHint(false);
    setMembers(INITIAL_MEMBERS);
    setDirty(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!showPublicTip) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!generalAccessRef.current?.contains(event.target as Node)) {
        setShowPublicTip(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showPublicTip]);

  if (!open) return null;

  const setGeneralAccess = (next: Visibility) => {
    setVisibility(next);
    setDirty(true);
    setShowPublicTip(next === "published");
  };

  const handleAdd = () => {
    const term = lookupTerm.trim();
    if (!term) return;

    const match = findCollaborator(
      term,
      new Set(members.map((member) => member.id)),
    );
    if (!match) {
      setLookupError(t("System", "No user or group found"));
      lookupInputRef.current?.focus();
      return;
    }

    setMembers((prev) => [...prev, match]);
    setLookupTerm("");
    setLookupError("");
    setDirty(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-4 bg-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-entity-modal-title"
    >
      <div
        ref={panelRef}
        className="bg-paper shadow-xl w-full md:max-w-lg md:rounded-lg md:max-h-[80vh] h-full md:h-auto flex flex-col md:animate-fade-in-up"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-3 border-b border-border">
          <div className="min-w-0">
            <h3 id="share-entity-modal-title" className="text-base font-semibold text-ink">
              {t("System", "Share")}
            </h3>
            <p className="mt-0.5 truncate text-xs text-ink-muted">{entityTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-parchment transition-colors cursor-pointer"
            aria-label={t("System", "Close")}
          >
            <X size={18} className="text-ink-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <section className="space-y-2 border-b border-border/50 px-5 pt-3 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-medium text-ink-secondary">
                {t("System", "General access")}
              </h4>
              <div ref={generalAccessRef} className="relative">
                <div
                  role="radiogroup"
                  aria-label={t("System", "General access")}
                  className="inline-flex w-fit items-center rounded-md overflow-hidden h-8"
                  style={{ border: "1px solid var(--border-primary)" }}
                >
                  <AccessSegment
                    active={!isPublished}
                    label={t("System", "Private")}
                    onClick={() => setGeneralAccess("private")}
                    first
                  >
                    <Lock size={12} />
                    <span className="text-xs font-medium whitespace-nowrap">
                      {t("System", "Private")}
                    </span>
                  </AccessSegment>
                  <AccessSegment
                    active={isPublished}
                    label={t("System", "Published")}
                    onClick={() => setGeneralAccess("published")}
                    published
                  >
                    <Globe size={12} />
                    <span className="text-xs font-medium whitespace-nowrap">
                      {t("System", "Published")}
                    </span>
                  </AccessSegment>
                </div>
                {showPublicTip ? (
                  <div
                    role="tooltip"
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
            <p className={noticeClass}>
              <Lock size={12} className="shrink-0" aria-hidden />
              {t("System", "Administrators and Editors always have edit access")}
            </p>
            {isPublished && !showPublicTip ? (
              <p className={noticeClass}>
                <AlertTriangle size={12} className="shrink-0 text-warning" aria-hidden />
                {t("System", "Anyone can see this entity")}
              </p>
            ) : null}
          </section>

          <section className="space-y-3 px-5 pt-3">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-medium text-ink-secondary">
                {t("System", "People and groups")}
              </h4>
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
                  autoComplete="off"
                  aria-invalid={Boolean(lookupError)}
                  className={`w-full rounded-md border bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20 ${
                    lookupError ? "border-seal" : "border-border"
                  }`}
                />
                {lookupError ? (
                  <p className="mt-1 text-[11px] text-seal">{lookupError}</p>
                ) : null}
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
              <p className="text-[11px] text-ink-tertiary">
                {t(
                  "System",
                  "Lookup hint",
                  "Enter the full username, email, or group name from Settings. Suggestions are not shown.",
                )}
              </p>
            ) : null}
          </section>

          <section className="px-5 py-3">
            {members.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-ink-muted">
                {t("System", "No people or groups added yet")}
              </p>
            ) : (
              <div className="divide-y divide-border/50">
                {members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    showCanSee={!isPublished}
                    onChange={(level) => {
                      setMembers((prev) =>
                        prev.map((row) => (row.id === member.id ? { ...row, level } : row)),
                      );
                      setDirty(true);
                    }}
                    onRemove={() => {
                      setMembers((prev) => prev.filter((row) => row.id !== member.id));
                      setDirty(true);
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
          {dirty ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-ink bg-paper border border-border rounded-md hover:bg-warm transition-colors cursor-pointer"
              >
                {t("System", "Discard changes")}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-ink text-parchment hover:bg-ink/90 transition-colors cursor-pointer"
              >
                {t("System", "Save changes")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-ink bg-paper border border-border rounded-md hover:bg-warm transition-colors cursor-pointer"
            >
              {t("System", "Close")}
            </button>
          )}
        </div>
      </div>
    </div>
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
      onClick={onClick}
      className={`flex h-8 items-center gap-1.5 px-2.5 transition-colors cursor-pointer ${activeClass}`}
      style={{ borderLeft: first ? "none" : "1px solid var(--border-primary)" }}
    >
      {children}
    </button>
  );
}

function MemberRow({
  member,
  showCanSee,
  onChange,
  onRemove,
}: {
  member: Member;
  showCanSee: boolean;
  onChange: (level: AccessLevel) => void;
  onRemove: () => void;
}) {
  const canSee = member.level === "read";
  const canEdit = member.level === "write";

  return (
    <div className="flex items-center gap-3 px-1 py-2.5">
      <span className="min-w-0 flex-1 truncate text-sm text-ink">{member.label}</span>
      <div className="flex shrink-0 items-center">
        <div className="flex items-center gap-0.5" role="group" aria-label={t("System", "Permission level")}>
          {showCanSee ? (
            <IconAction
              label={t("System", "Can see")}
              active={canSee}
              onClick={() => onChange("read")}
            >
              <Eye size={16} aria-hidden />
            </IconAction>
          ) : null}
          <IconAction
            label={t("System", "Can edit")}
            active={canEdit}
            onClick={() => onChange(canEdit && !showCanSee ? "read" : "write")}
          >
            <Pencil size={16} aria-hidden />
          </IconAction>
        </div>
        <div className="ms-2 border-s border-border ps-2">
          <IconAction label={t("System", "Remove")} danger onClick={onRemove}>
            <Trash2 size={16} aria-hidden />
          </IconAction>
        </div>
      </div>
    </div>
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
    ? "inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-tertiary hover:bg-seal-tint hover:text-seal cursor-pointer transition-colors"
    : active
      ? "inline-flex h-8 w-8 items-center justify-center rounded-md bg-vellum text-ink cursor-pointer transition-colors"
      : "inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-tertiary hover:bg-warm hover:text-ink-secondary cursor-pointer transition-colors";

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={danger ? undefined : active}
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
