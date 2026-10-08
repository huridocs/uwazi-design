/** The Overview's settings as the Settings › Collection page reads them. The
 *  model lives in `settingsSingletons.ts` (`CollectionFields.overview`); this
 *  module re-exports it under the names the settings page uses. */
export {
  OVERVIEW_ACTIONS as OVERVIEW_ACTION_IDS,
  OVERVIEW_MAX_ACTIONS,
  OVERVIEW_MAX_FEATURED,
  OVERVIEW_SECTIONS,
  defaultOverviewConfig,
  type OverviewActionId,
  type OverviewConfig,
  type OverviewFeaturedMode,
  type OverviewHeroVisual,
  type OverviewLanding,
  type OverviewSectionId,
} from "./settingsSingletons";

/** At most three properties feed the Overview's "Most used values". */
export const OVERVIEW_MAX_FACETS = 3;
