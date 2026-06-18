import { SettingsContent } from "../SettingsContent";
import { settingsItemsById } from "../../../atoms/settings";

/** Stub body for settings sections not yet cloned — keeps the whole IA
 *  navigable while individual pages are built out. */
export function PlaceholderPage({ section }: { section: string }) {
  const item = settingsItemsById[section];
  const Icon = item?.icon;
  return (
    <SettingsContent>
      <SettingsContent.Header title={item?.label ?? "Settings"} />
      <SettingsContent.Body>
        <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-16">
          {Icon && (
            <span className="flex items-center justify-center w-12 h-12 rounded-lg bg-vellum">
              <Icon size={22} className="text-ink-tertiary" />
            </span>
          )}
          <div>
            <p className="text-sm font-semibold text-ink">{item?.label}</p>
            <p className="text-xs text-ink-tertiary mt-1 max-w-xs">
              This settings page is part of the cloning roadmap and hasn't been built yet.
            </p>
          </div>
        </div>
      </SettingsContent.Body>
    </SettingsContent>
  );
}
