import { getEntityType, type Entity } from "../../data/entities";

/** The identity block at the top of an entity surface: type eyebrow → title.
 *
 *  It replaced a pill stacked over a small title. The pill was a filled, tinted
 *  chip and the title was `text-xs` — the same size as the metadata labels
 *  underneath — so the loudest thing in the header was the *template name*, and
 *  the entity's name read as its caption. Here the type is an eyebrow (a square
 *  dot in the true type colour + a small-caps label) and the title is a real
 *  heading. Same information, correct hierarchy.
 *
 *  Two lines, not three: a country/date meta line under the title just repeated
 *  what the Metadata tab says two rows further down.
 *
 *  Shared by the Library drawer preview, EntityOverlay and the entity view's own
 *  header (`inline`, for a single-row strip) so the surfaces can't drift apart.
 *
 *  `typeId`/`title` override the entity — the Document tab's header names the
 *  primary DOCUMENT, which isn't always the entity's own title. */
export function EntityIdentity({
  entity,
  typeId,
  title,
  size = "md",
  inline = false,
}: {
  entity?: Entity;
  typeId?: string;
  title?: string;
  /** `sm` for the slide-over, `md` for the drawer panel. */
  size?: "sm" | "md";
  /** One row — dot, type, title — for a header strip that has no vertical room. */
  inline?: boolean;
}) {
  const tid = typeId ?? entity?.typeId;
  const type = tid ? getEntityType(tid) : undefined;
  const color = type?.color ?? "#6B7280";
  const name = type?.name ?? tid ?? "Unknown";
  const label = title ?? entity?.title ?? "Unknown entity";

  const eyebrow = (
    <>
      <span
        className="w-2 h-2 rounded-[2px] shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary truncate">
        {name}
      </span>
    </>
  );

  if (inline) {
    return (
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="flex items-center gap-1.5 shrink-0 max-w-[14rem]">{eyebrow}</span>
        <h2 title={label} className="text-[15px] font-semibold text-ink truncate min-w-0">
          {label}
        </h2>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">{eyebrow}</div>
      <h2
        title={label}
        className={`mt-1 font-semibold text-ink leading-snug line-clamp-2 ${
          size === "sm" ? "text-[13px]" : "text-[15px]"
        }`}
      >
        {label}
      </h2>
    </div>
  );
}
