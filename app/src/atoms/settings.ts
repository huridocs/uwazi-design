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
import type { UserRole } from "../data/settings";
import { signedInUserAtom } from "./users";

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
    // No heading in the rail: its task shelves (`subgroup`) are the headings,
    // and a "System" label above them read as one more shelf at the same level.
    // The navbar still calls the entry "System settings".
    items: [
      // One shelf per task an admin does: run the collection and its public
      // site, shape the data, translate it, manage who can use it. Dashboard
      // stays first, since the System entry opens it.
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, subgroup: "Collection" },
      { id: "collection", label: "Collection", icon: SlidersHorizontal, subgroup: "Collection" },
      { id: "menu", label: "Menu", icon: Menu, subgroup: "Collection" },
      { id: "pages", label: "Pages", icon: FileText, subgroup: "Collection" },
      { id: "templates", label: "Templates", icon: LayoutTemplate, subgroup: "Content model" },
      { id: "thesauri", label: "Thesauri", icon: BookOpen, subgroup: "Content model" },
      { id: "relationship-types", label: "Relationship types", icon: Spline, subgroup: "Content model" },
      { id: "filters", label: "Filters", icon: Filter, subgroup: "Content model" },
      { id: "languages", label: "Languages", icon: Languages, subgroup: "Languages" },
      { id: "translations", label: "Translations", icon: Globe, subgroup: "Languages" },
      { id: "users", label: "Users & Groups", icon: Users, subgroup: "People" },
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
      { id: "metadata-extraction", label: "Metadata extraction", icon: ScanText, subgroup: "ML tools" },
      { id: "paragraph-extraction", label: "Paragraph extraction", icon: AlignLeft, subgroup: "ML tools" },
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
 *  different places — Settings ▸ User settings, Settings ▸ System settings and
 *  the Tools dropdown. The rail lists every group, so moving between Templates
 *  and Metadata extraction does not mean going back to the navbar. */
export const settingsGroupOf = (sectionId: string): SettingsGroup =>
  settingsGroups.find((g) => g.items.some((i) => i.id === sectionId)) ?? settingsGroups[1];

/** The first landing page of each group — what the navbar entries open. */
export const settingsEntryOf = (groupId: string): string =>
  settingsGroups.find((g) => g.id === groupId)?.items[0]?.id ?? "dashboard";

/** The Tools group, rendered by the navbar's Tools dropdown. */
export const settingsToolsItems = (): SettingsItem[] =>
  settingsGroups.find((g) => g.id === "tools")?.items ?? [];

/* ── Who reaches what ────────────────────────────────────────────────────
   Uwazi guards every settings page with `adminsOnlyRoute`, except Account
   (every signed-in role) and the two extraction pages (admin and editor)
   (inventory Part 0.8). A page a role cannot reach is not listed and does
   not render. */
const NON_ADMIN_SECTIONS: Record<Exclude<UserRole, "admin">, string[]> = {
  editor: ["account", "metadata-extraction", "paragraph-extraction"],
  collaborator: ["account"],
};

export const settingsSectionAllowed = (role: UserRole | undefined, id: string): boolean =>
  !role || role === "admin" || NON_ADMIN_SECTIONS[role].includes(id);

/** Whether the signed-in user may open a settings section. */
export const settingsAccessAtom = atom((get) => {
  const role = get(signedInUserAtom)?.role;
  return (id: string) => settingsSectionAllowed(role, id);
});

/** The groups the signed-in user sees, each with only the items they reach;
 *  a group left empty is dropped. */
export const visibleSettingsGroupsAtom = atom<SettingsGroup[]>((get) => {
  const allowed = get(settingsAccessAtom);
  return settingsGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => allowed(i.id)) }))
    .filter((g) => g.items.length > 0);
});

/** Which settings page is showing. Defaults to Account (Uwazi's first item).
 *  Persisted so a reload keeps you on the same settings section. */
export const settingsSectionAtom = atomWithStorage<string>("uwazi:settingsSection", "account");

/** The section Settings shows: the stored one if the signed-in role reaches
 *  it, else Account. Derived, not written back, so an admin who signs in
 *  after a collaborator lands on their own last section. */
export const effectiveSettingsSectionAtom = atom((get) => {
  const stored = get(settingsSectionAtom);
  return get(settingsAccessAtom)(stored) ? stored : "account";
});

/** Mobile drill-in: on a phone the rail and the content can't share the width,
 *  so we show one at a time. False = rail; true = the selected section (with a
 *  back chevron). Ignored on desktop, where both panes render side by side.
 *  Persisted so a mobile reload stays on the drilled-in section. */
export const settingsMobileDrilledAtom = atomWithStorage<boolean>("uwazi:settingsDrilled", false);
