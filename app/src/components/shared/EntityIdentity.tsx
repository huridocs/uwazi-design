import { type Entity } from "../../data/entities";
import { EntityTypeTag } from "./EntityTypeTag";

/** The identity block at the top of an entity surface: type tag → title.
 *
 *  It replaced a pill stacked over a small title. The pill was a filled, tinted
 *  chip and the title was `text-xs` — the same size as the metadata labels
 *  underneath — so the loudest thing in the header was the *template name*, and
 *  the entity's name read as its caption. Now the type is a quiet tag and the
 *  title is a real heading. Same information, correct hierarchy.
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
  /** One row — tag, title — for a header strip with no vertical room. */
  inline?: boolean;
}) {
  const tid = typeId ?? entity?.typeId ?? "";
  const label = title ?? entity?.title ?? "Unknown entity";

  if (inline) {
    return (
      // BASELINE, not centre. Box-centring a 10px caps tag against a 15px title
      // aligns their boxes, not their text — which is exactly what reads as
      // "these aren't lined up". On the baseline they sit on one line.
      <div className="flex items-baseline gap-2.5 min-w-0 flex-1">
        <EntityTypeTag typeId={tid} className="shrink-0 max-w-[12rem]" />
        <h2 title={label} className="text-[15px] font-semibold text-ink truncate min-w-0">
          {label}
        </h2>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1">
      <EntityTypeTag typeId={tid} className="flex" />
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
