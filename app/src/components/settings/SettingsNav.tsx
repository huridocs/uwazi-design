import { Fragment } from "react";
import { useAtom, useSetAtom } from "jotai";
import { ExternalLink } from "lucide-react";
import {
  settingsGroupOf,
  settingsSectionAtom,
  settingsMobileDrilledAtom,
  settingsDocumentation,
} from "../../atoms/settings";
import { dataSourceAtom } from "../../atoms/dataSource";
import {
  libraryTypeFiltersAtom,
  libraryStatusFiltersAtom,
  libraryCountryFiltersAtom,
  libraryDescriptorFiltersAtom,
  librarySelectedEntityIdAtom,
} from "../../atoms/library";
import { SegmentedControl } from "../shared/SegmentedControl";
import type { AppView } from "../../atoms/navigation";

/** The settings rail — three grouped sections (User / System / Tools) matching
 *  Uwazi's V2 SettingsNavigation. Styled to the entity-view ToolsSidebar:
 *  full-width items, px-5 py-2, active = bg-warm text-ink (no rounded inset). */
export function SettingsNav({ onNavigate }: { onNavigate?: (view: AppView) => void }) {
  const [section, setSection] = useAtom(settingsSectionAtom);
  const setDrilled = useSetAtom(settingsMobileDrilledAtom);
  const [dataSource, setDataSource] = useAtom(dataSourceAtom);
  const setTypeFilters = useSetAtom(libraryTypeFiltersAtom);
  const setStatusFilters = useSetAtom(libraryStatusFiltersAtom);
  const setCountryFilters = useSetAtom(libraryCountryFiltersAtom);
  const setDescriptorFilters = useSetAtom(libraryDescriptorFiltersAtom);
  const setSelectedId = useSetAtom(librarySelectedEntityIdAtom);

  return (
    <nav
      aria-label="Settings navigation"
      className="h-full w-full md:w-[15.625rem] shrink-0 overflow-y-auto bg-paper py-4"
      style={{ borderRight: "1px solid var(--border-primary)" }}
    >
      {/* Data-source toggle — flip Sample↔CEJIL without going to the Library.
          Settings pages remount on change (SettingsView keys on the source). */}
      <div className="px-5 pb-3 mb-2" style={{ borderBottom: "1px solid var(--border-soft)" }}>
        <h3 className="pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Data source
        </h3>
        <SegmentedControl
          ariaLabel="Data source"
          value={dataSource}
          onChange={(v) => {
            setDataSource(v as typeof dataSource);
            // type/country ids differ per source — clear stale library facets.
            setTypeFilters({});
            setStatusFilters({});
            setCountryFilters({});
            setDescriptorFilters({});
            setSelectedId(null);
          }}
          options={[
            { id: "mock", label: "Sample" },
            { id: "cejil", label: "CEJIL" },
          ]}
        />
      </div>

      {/* ONE group — the one you came in through. Settings ▸ User settings,
          Settings ▸ System settings and the Tools dropdown are three separate
          doors; the rail behind each shows that door's destinations rather than
          all twenty under every one. */}
      {[settingsGroupOf(section)].map((group) => (
        <div key={group.id} className="mb-2">
          {group.label && (
            <h3 className="px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              {group.label}
            </h3>
          )}
          {group.items.map((item, i) => {
            const Icon = item.icon;
            const active = section === item.id && !item.navigateTo && !item.external;
            // A subsection starts wherever the subgroup changes.
            const startsSub = !!item.subgroup && item.subgroup !== group.items[i - 1]?.subgroup;

            const inner = (
              <>
                <Icon size={15} className="text-ink-tertiary shrink-0" />
                <span className="truncate flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-semibold text-carbon">{item.badge}</span>
                )}
                {item.external && <ExternalLink size={12} className="text-ink-muted shrink-0" />}
              </>
            );

            const cls = `flex items-center gap-2.5 w-full px-5 py-2 text-[13px] font-medium text-left transition-colors ${
              active ? "bg-warm text-ink" : "text-ink-secondary hover:bg-warm hover:text-ink"
            }`;

            const sub = startsSub && (
              <h4
                key={`sub-${item.subgroup}`}
                className="px-5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted"
              >
                {item.subgroup}
              </h4>
            );

            if (item.external) {
              return (
                <Fragment key={item.id}>
                  {sub}
                  <a href={item.external} target="_blank" rel="noopener noreferrer" className={cls}>
                    {inner}
                  </a>
                </Fragment>
              );
            }

            return (
              <Fragment key={item.id}>
                {sub}
                <button
                  className={cls}
                  onClick={() => {
                    if (item.navigateTo) onNavigate?.(item.navigateTo);
                    else {
                      setSection(item.id);
                      setDrilled(true); // mobile: reveal the section (ignored on desktop)
                    }
                  }}
                >
                  {inner}
                </button>
              </Fragment>
            );
          })}
        </div>
      ))}

      {/* Documentation — pinned under every group, because it's the way out of
          all of them, not a member of one. */}
      <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--border-soft)" }}>
        <a
          href={settingsDocumentation.external}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 w-full px-5 py-2 text-[13px] font-medium text-left text-ink-secondary hover:bg-warm hover:text-ink transition-colors"
        >
          <settingsDocumentation.icon size={15} className="text-ink-tertiary shrink-0" />
          <span className="truncate flex-1">{settingsDocumentation.label}</span>
          <ExternalLink size={12} className="text-ink-muted shrink-0" />
        </a>
      </div>
    </nav>
  );
}
