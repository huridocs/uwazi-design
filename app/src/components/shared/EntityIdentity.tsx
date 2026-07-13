import { getEntityType, type Entity } from "../../data/entities";

/** The identity block at the top of an entity panel: type eyebrow → title.
 *
 *  It replaced a pill stacked over a small title. The pill was a filled, tinted
 *  chip and the title was `text-xs` — the same size as the metadata labels
 *  underneath — so the loudest thing in the header was the *template name*, and
 *  the entity's name read as its caption. Here the type is an eyebrow (a square
 *  dot in the true type colour + a small-caps label) and the title is a real
 *  heading. Same information, correct hierarchy.
 *
 *  Two lines, not three: a country/date meta line under the title just repeated
 *  what the Metadata tab says two rows further down, and cost the header a third
 *  of its height to do it.
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
          size === "sm" ? "text-[13px]" : "text-[15px]"
        }`}
      >
        {entity?.title ?? "Unknown entity"}
      </h2>
    </div>
  );
}
