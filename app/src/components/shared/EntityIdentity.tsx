import { getEntityType, type Entity } from "../../data/entities";

/** The identity block at the top of an entity panel: type eyebrow → title →
 *  quiet meta line.
 *
 *  It replaced a pill stacked over a small title. The pill was a filled, tinted
 *  chip and the title was `text-xs` — the same size as the metadata labels
 *  underneath — so the loudest thing in the header was the *template name*, and
 *  the entity's name read as its caption. Here the type is an eyebrow (a square
 *  dot in the true type colour + a small-caps label) and the title is a real
 *  heading. Same information, correct hierarchy.
 *
 *  Shared by the Library drawer preview and the EntityOverlay so the two headers
 *  can't drift apart. */
export function EntityIdentity({
  entity,
  size = "md",
}: {
  entity?: Entity;
  /** `sm` for the slide-over, `md` for the drawer panel. */
  size?: "sm" | "md";
}) {
  const type = entity ? getEntityType(entity.typeId) : undefined;
  const color = type?.color ?? "#6B7280";
  const year = entity?.createdAt ? new Date(entity.createdAt).getUTCFullYear() : null;

  // Country and date are context, not headline — one dimmed line, em-dash free
  // (a missing value is simply absent rather than a row of placeholders).
  const meta = [entity?.country, year ? String(year) : null].filter(Boolean) as string[];

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-[2px] shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary truncate">
          {type?.name ?? entity?.typeId ?? "Unknown"}
        </span>
      </div>

      <h2
        title={entity?.title}
        className={`mt-1 font-semibold text-ink leading-snug line-clamp-2 ${
          size === "sm" ? "text-[15px]" : "text-[17px]"
        }`}
      >
        {entity?.title ?? "Unknown entity"}
      </h2>

      {meta.length > 0 && (
        <p className="mt-1 text-[11px] text-ink-tertiary truncate">
          {meta.map((m, i) => (
            <span key={m}>
              {i > 0 && <span className="text-ink-muted px-1">·</span>}
              {m}
            </span>
          ))}
          {entity && entity.published === false && (
            <>
              <span className="text-ink-muted px-1">·</span>
              <span className="text-ink-muted">Restricted</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}
