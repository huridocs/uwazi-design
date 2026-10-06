import { seedMenuLinks, type SettingsMenuLink } from "../data/settings";
import { cejilSettingsMenu } from "../data/cejil/settingsAdapt";
import { createSettingsSingleton } from "./settingsCollection";

/** Settings › Menu: the navbar's links and groups, one tree per corpus, saved
 *  as a whole (Uwazi saves `settings.links` in one request). The navbar reads
 *  the saved tree, never a draft. */
export interface MenuSettings extends Record<string, unknown> {
  links: SettingsMenuLink[];
}

const isLinks = (v: unknown) =>
  Array.isArray(v) &&
  v.every(
    (l) =>
      !!l &&
      typeof l.id === "string" &&
      typeof l.title === "string" &&
      typeof l.url === "string" &&
      (l.type === "link" || l.type === "group") &&
      Array.isArray(l.sublinks),
  );

export const menuSettings = createSettingsSingleton<MenuSettings>({
  name: "menu",
  seedOf: (corpus) => ({ links: corpus === "cejil" ? cejilSettingsMenu : seedMenuLinks }),
  isField: { links: isLinks },
});
