import { Fragment } from "react";
import { useAtom, useSetAtom } from "jotai";
import { ExternalLink } from "lucide-react";
import {
  settingsGroupOf,
  settingsSectionAtom,
  settingsMobileDrilledAtom,
  settingsDocumentation,
} from "../../atoms/settings";
import type { AppView } from "../../atoms/navigation";
import { useDirtyGuard } from "../../hooks/useDirtyGuard";

/** The settings rail — three grouped sections (User / System / Tools) matching
 *  Uwazi's V2 SettingsNavigation: full-width items, px-5 py-2, active =
 *  vellum + semibold (no rounded inset, no left-border accent).
 *
 *  Also the IMPORT CSV rail. That view used to mount `ToolsSidebar`, a second
 *  hand-maintained copy of these lists whose items only raised a toast — a rail
 *  that looked like navigation and was scenery. Its arrays had already drifted
 *  from this one (no Paragraph Extraction, no "ML tools" shelf). Pass `activeId`
 *  and the rail serves a destination that ISN'T a settings section. */
export function SettingsNav({
  onNavigate,
  activeId,
}: {
  onNavigate?: (view: AppView) => void;
  /** The item that is "here" when here isn't a settings section — the Import
   *  CSV view passes `"import-csv"`. Also picks the group to show. */
  activeId?: string;
}) {
  const [section, setSection] = useAtom(settingsSectionAtom);
  const setDrilled = useSetAtom(settingsMobileDrilledAtom);
  const guard = useDirtyGuard();
  /** Where we are, whether that's a settings section or another view. */
  const current = activeId ?? section;

  return (
    <nav
      aria-label="Settings navigation"
      className="h-full w-full md:w-[15.625rem] shrink-0 flex flex-col bg-paper"
      style={{ borderRight: "1px solid var(--border-primary)" }}
    >
      {/* The data-source switch used to live here as well. It's the collection
          picker on the navbar's Library button now — one control, one place. */}
      <div className="flex-1 min-h-0 overflow-y-auto py-4">
      {/* ONE group — the one you came in through. Settings ▸ User settings,
          Settings ▸ System settings and the Tools dropdown are three separate
          doors; the rail behind each shows that door's destinations rather than
          all twenty under every one. */}
      {[settingsGroupOf(current)].map((group) => (
        <div key={group.id} className="mb-2">
          {group.label && (
            <h3 className="px-5 py-2 text-meta font-semibold uppercase tracking-wider text-ink-muted">
              {group.label}
            </h3>
          )}
          {group.items.map((item, i) => {
            const Icon = item.icon;
            // An item that jumps to another VIEW is never the current settings
            // section — but it is the current place when that view is the one on
            // screen, which is how Import CSV lights up in its own rail.
            const active =
              current === item.id && !item.external && (!!activeId || !item.navigateTo);
            // A subsection starts wherever the subgroup changes.
            const startsSub = !!item.subgroup && item.subgroup !== group.items[i - 1]?.subgroup;

            const inner = (
              <>
                <Icon size={15} className="text-ink-tertiary shrink-0" />
                <span className="truncate flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-meta font-semibold text-carbon">{item.badge}</span>
                )}
                {item.external && <ExternalLink size={12} className="text-ink-muted shrink-0" />}
              </>
            );

            // Active was `bg-warm` — the SAME token as hover, so the selected
            // page looked exactly like whatever the cursor happened to be over.
            // It steps up to vellum + semibold: a real state, not a hover echo.
            // (Still no left-border accent, and the icon keeps its colour — the
            // background carries the state.)
            const cls = `flex items-center gap-2.5 w-full px-5 py-2 text-tab text-left transition-colors ${
              active
                ? "bg-vellum text-ink font-semibold"
                : "font-medium text-ink-secondary hover:bg-warm hover:text-ink"
            }`;

            const sub = startsSub && (
              <h4
                key={`sub-${item.subgroup}`}
                className="px-5 pt-3 pb-1 text-meta font-semibold uppercase tracking-wider text-ink-muted"
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
                    // navigateTo routes through App's handleNavigate, which is
                    // already guarded; the section switch guards itself here.
                    if (item.navigateTo) {
                      onNavigate?.(item.navigateTo);
                      return;
                    }
                    // Setting the section is enough INSIDE settings. From the
                    // Import CSV rail it isn't: it would change a page you
                    // can't see, so the view has to move too. Harmless in
                    // settings — handleNavigate returns early on the same view.
                    if (item.id === section && !activeId) {
                      setDrilled(true);
                      return;
                    }
                    guard(() => {
                      setSection(item.id);
                      setDrilled(true); // mobile: reveal the section (ignored on desktop)
                      onNavigate?.("settings");
                    });
                  }}
                >
                  {inner}
                </button>
              </Fragment>
            );
          })}
        </div>
      ))}

      </div>

      {/* Documentation — the panel's FOOTER, pinned to the bottom whichever group
          you're in. It belongs to none of them: it's the way out of all of them.
          Not in the Tools dropdown, where it read as one more tool. */}
      <a
        href={settingsDocumentation.external}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 flex items-center gap-2.5 w-full px-5 h-12 text-tab font-medium text-left text-ink-secondary hover:bg-warm hover:text-ink transition-colors"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <settingsDocumentation.icon size={15} className="text-ink-tertiary shrink-0" />
        <span className="truncate flex-1">{settingsDocumentation.label}</span>
        <ExternalLink size={12} className="text-ink-muted shrink-0" />
      </a>
    </nav>
  );
}
