import { SettingsContent } from "../SettingsContent";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { settingsItemsById } from "../../../atoms/settings";

/** Stub body for settings sections not yet cloned — keeps the whole IA
 *  navigable while individual pages are built out. */
export function PlaceholderPage({ section }: { section: string }) {
  const item = settingsItemsById[section];
  const Icon = item?.icon;
  return (
    <SettingsContent component="PlaceholderPage">
      <SettingsContent.Header title={item?.label ?? "Settings"} />
      <SettingsContent.Body>
        <div data-part="empty" className="h-full flex items-center justify-center py-16">
          <SettingsEmptyState
            icon={Icon ? <Icon size={16} aria-hidden /> : undefined}
            title={item?.label ?? "Settings"}
            hint="This settings page is part of the cloning roadmap and hasn't been built yet."
          />
        </div>
      </SettingsContent.Body>
    </SettingsContent>
  );
}
