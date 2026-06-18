import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { LucideIcon } from "lucide-react";
import {
  User,
  LayoutDashboard,
  Users,
  SlidersHorizontal,
  Menu,
  FileText,
  Languages,
  Globe,
  Filter,
  LayoutTemplate,
  BookOpen,
  Spline,
  ScanText,
  AlignLeft,
  Archive,
  Activity,
  Code2,
  Upload,
  FileSpreadsheet,
  ExternalLink,
} from "lucide-react";
import type { AppView } from "./navigation";

/** A single settings destination. Mirrors Uwazi's V2 SettingsNavigation IA
 *  (huridocs/uwazi · app/react/V2/Routes/Settings/SettingsNavigation.tsx).
 *  `navigateTo` lets an item jump to a different top-level app view instead of
 *  swapping the settings section (Import CSV reuses our existing import view);
 *  `external` renders an outbound link. */
export interface SettingsItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  navigateTo?: AppView;
  external?: string;
}

export interface SettingsGroup {
  id: string;
  label?: string;
  items: SettingsItem[];
}

export const settingsGroups: SettingsGroup[] = [
  {
    id: "user",
    label: "User",
    items: [{ id: "account", label: "Account", icon: User }],
  },
  {
    id: "system",
    label: "System",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "users", label: "Users & Groups", icon: Users },
      { id: "collection", label: "Collection", icon: SlidersHorizontal },
      { id: "menu", label: "Menu", icon: Menu },
      { id: "pages", label: "Pages", icon: FileText },
      { id: "languages", label: "Languages", icon: Languages },
      { id: "translations", label: "Translations", icon: Globe },
      { id: "filters", label: "Filters", icon: Filter },
      { id: "templates", label: "Templates", icon: LayoutTemplate },
      { id: "thesauri", label: "Thesauri", icon: BookOpen },
      { id: "relationship-types", label: "Relationship types", icon: Spline },
      { id: "metadata-extraction", label: "Metadata Extraction", icon: ScanText },
      { id: "paragraph-extraction", label: "Paragraph Extraction", icon: AlignLeft },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    items: [
      { id: "preserve", label: "Preserve", icon: Archive },
      { id: "activitylog", label: "Activity log", icon: Activity },
      { id: "customisation", label: "Global CSS & JS", icon: Code2 },
      { id: "uploads", label: "Uploads", icon: Upload },
      { id: "import-csv", label: "Import CSV", icon: FileSpreadsheet, navigateTo: "import-csv" },
      {
        id: "documentation",
        label: "Documentation",
        icon: ExternalLink,
        external: "https://uwazi.io/page/9852italrtk/support",
      },
    ],
  },
];

/** Flat lookup of every section item by id. */
export const settingsItemsById: Record<string, SettingsItem> = Object.fromEntries(
  settingsGroups.flatMap((g) => g.items.map((i) => [i.id, i])),
);

/** Which settings page is showing. Defaults to Account (Uwazi's first item).
 *  Persisted so a reload keeps you on the same settings section. */
export const settingsSectionAtom = atomWithStorage<string>("uwazi:settingsSection", "account");

/** Mobile drill-in: on a phone the rail and the content can't share the width,
 *  so we show one at a time. False = rail; true = the selected section (with a
 *  back chevron). Ignored on desktop, where both panes render side by side.
 *  Persisted so a mobile reload stays on the drilled-in section. */
export const settingsMobileDrilledAtom = atomWithStorage<boolean>("uwazi:settingsDrilled", false);
