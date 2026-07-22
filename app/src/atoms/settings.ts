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
  /** Optional heading ABOVE this item — a visual subsection inside a group. The
   *  rail and the Tools dropdown both start a new block when it changes, so
   *  "ML tools" reads as its own shelf without becoming a fourth top-level door. */
  subgroup?: string;
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
      // Extraction is a tool you RUN, not a system setting you configure — it sat
      // under System purely because Uwazi's V2 rail listed it there. And it's ML,
      // which is a different kind of tool from an activity log, so it gets its own
      // shelf inside the group rather than a fourth top-level door.
      { id: "metadata-extraction", label: "Metadata Extraction", icon: ScanText, subgroup: "ML tools" },
      { id: "paragraph-extraction", label: "Paragraph Extraction", icon: AlignLeft, subgroup: "ML tools" },
    ],
  },
];

/** Documentation belongs to no group — it's the way out of ALL of them. Pinned
 *  to the bottom of every settings rail and appended to the menus, rather than
 *  hidden as the last item of Tools where you'd only find it if you were already
 *  looking somewhere else. */
export const settingsDocumentation: SettingsItem = {
  id: "documentation",
  label: "Documentation",
  icon: ExternalLink,
  external: "https://uwazi.io/page/9852italrtk/support",
};

/** Flat lookup of every section item by id. */
export const settingsItemsById: Record<string, SettingsItem> = Object.fromEntries(
  settingsGroups.flatMap((g) => g.items.map((i) => [i.id, i])),
);

/** Which GROUP a section belongs to. The three groups are reached from three
 *  different places now — Settings ▸ User settings, Settings ▸ System settings,
 *  and the Tools dropdown — and the rail scopes itself to whichever one you came
 *  in through, rather than listing all 20 destinations under every one. */
export const settingsGroupOf = (sectionId: string): SettingsGroup =>
  settingsGroups.find((g) => g.items.some((i) => i.id === sectionId)) ?? settingsGroups[1];

/** The first landing page of each group — what the navbar entries open. */
export const settingsEntryOf = (groupId: string): string =>
  settingsGroups.find((g) => g.id === groupId)?.items[0]?.id ?? "dashboard";

/** The Tools group, rendered by the navbar's Tools dropdown. */
export const settingsToolsItems = (): SettingsItem[] =>
  settingsGroups.find((g) => g.id === "tools")?.items ?? [];

/** Which settings page is showing. Defaults to Account (Uwazi's first item).
 *  Persisted so a reload keeps you on the same settings section. */
export const settingsSectionAtom = atomWithStorage<string>("uwazi:settingsSection", "account");

/** Mobile drill-in: on a phone the rail and the content can't share the width,
 *  so we show one at a time. False = rail; true = the selected section (with a
 *  back chevron). Ignored on desktop, where both panes render side by side.
 *  Persisted so a mobile reload stays on the drilled-in section. */
export const settingsMobileDrilledAtom = atomWithStorage<boolean>("uwazi:settingsDrilled", false);
