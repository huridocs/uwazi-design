import type { ComponentProps } from "react";
import { PaneHeader } from "./PaneHeader";
import { DocMeta } from "./DocMeta";
import { MainTabs } from "./MainTabs";

/** PROPOSAL SWITCH, not a product setting: `?entityHeader=inline` or `=stacked`
 *  in the URL picks the variant so the two can be compared on one build. Remove
 *  with whichever variant loses. */
export type EntityHeaderVariant = "stacked" | "inline";
const fromUrl = (): EntityHeaderVariant =>
  typeof location !== "undefined" &&
  new URLSearchParams(location.search).get("entityHeader") === "inline"
    ? "inline"
    : "stacked";

/** The entity view's header: identity (`DocMeta`) and the view tabs (`MainTabs`)
 *  in one `PaneHeader`, the same in all four entity views.
 *
 *  stacked  identity on its own row ABOVE the tabs. The title leads the page.
 *           Cost: the pane's tab strip sits one row lower than the drawer's, so
 *           the two strips no longer share a line (they have since 2026-09-14).
 *  inline   identity BESIDE the tabs on one row: title, then tabs, then language.
 *           The strip keeps the drawer's y, the header is one row instead of two,
 *           and the title still comes first in reading order. When the row can't
 *           hold both (`flex-wrap-reverse`), the tabs keep the top line, where the
 *           drawer's strip is, and the identity takes the line under them, which
 *           is the order the header had before. */
export function EntityHeader({
  showPdfSelector = true,
  variant = fromUrl(),
  ...tabs
}: ComponentProps<typeof MainTabs> & { showPdfSelector?: boolean; variant?: EntityHeaderVariant }) {
  if (variant === "inline") {
    return (
      <PaneHeader flush data-variant="inline">
        <div className="flex flex-wrap-reverse items-end gap-x-4 gap-y-1">
          <div className="min-w-[8rem] max-w-[22rem] shrink">
            <DocMeta showPdfSelector={showPdfSelector} ruled={false} />
          </div>
          <div className="min-w-0 grow basis-[24rem]">
            <MainTabs {...tabs} />
          </div>
        </div>
      </PaneHeader>
    );
  }
  return (
    <PaneHeader data-variant="stacked">
      <DocMeta showPdfSelector={showPdfSelector} ruled={false} />
      <MainTabs {...tabs} />
    </PaneHeader>
  );
}
