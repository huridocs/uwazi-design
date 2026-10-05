import { Fragment, useEffect, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ExternalLink } from "lucide-react";
import { SectionLabel } from "../shared/SectionLabel";
import {
  visibleSettingsGroupsAtom,
  settingsSectionAtom,
  effectiveSettingsSectionAtom,
  settingsMobileDrilledAtom,
  settingsDocumentation,
} from "../../atoms/settings";
import type { AppView } from "../../atoms/navigation";
import { useDirtyGuard } from "../../hooks/useDirtyGuard";

/** The settings rail — every group (User / System / Tools) with its task
 *  shelves, after Uwazi's V2 SettingsNavigation: full-width items on the rail gutter, py-2, active =
 *  vellum + semibold (no rounded inset, no left-border accent).
 *
 *  Also the Import CSV rail, so there is one list of tools, not two to keep in
 *  step. Pass `activeId` for a destination that is not a settings section. */
export function SettingsNav({
  onNavigate,
  activeId,
}: {
  onNavigate?: (view: AppView) => void;
  /** The item that is "here" when here isn't a settings section — the Import
   *  CSV view passes `"import-csv"`. Also picks the group to show. */
  activeId?: string;
}) {
  // Marks the section actually shown (Account when the role falls back).
  const section = useAtomValue(effectiveSettingsSectionAtom);
  const setSection = useSetAtom(settingsSectionAtom);
  // Only what the signed-in role reaches (`atoms/settings.ts`).
  const groups = useAtomValue(visibleSettingsGroupsAtom);
  const setDrilled = useSetAtom(settingsMobileDrilledAtom);
  const guard = useDirtyGuard();
  /** Where we are, whether that's a settings section or another view. */
  const current = activeId ?? section;

  // Every group is listed, so the current item can sit below the fold (a phone
  // opening Tools from the navbar lands on Preserve). Scroll the rail's own
  // lane so it is in view; the page itself does not move.
  const laneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // After the frame, so the rail has its height (it mounts inside a pane
    // that is laid out in the same commit).
    const frame = requestAnimationFrame(() => {
      const lane = laneRef.current;
      const item = lane?.querySelector<HTMLElement>('[aria-current="page"]');
      if (!lane || !item) return;
      const laneBox = lane.getBoundingClientRect();
      const box = item.getBoundingClientRect();
      if (box.bottom > laneBox.bottom || box.top < laneBox.top)
        lane.scrollTop += box.top - laneBox.top - lane.clientHeight / 3;
    });
    return () => cancelAnimationFrame(frame);
    // On a change of the current item too: the stored section arrives after
    // the first render. A click lands on an item already in view, which this
    // leaves alone.
  }, [current]);

  return (
    <nav
      aria-label="Settings navigation"
      data-component="SettingsNav"
      /* The rail-tier gutter host (20px). Items, the scroll lane and the
         Documentation footer are `bleed`, so hover and active fills and the
         footer rule reach the rail edge while the text sits on the gutter. */
      data-gutter-host
      /* The rule is on the inline END, the side that meets the content pane:
         the right in LTR, the left in RTL. A physical `borderRight` put it on
         the viewport edge in RTL and left nothing between rail and content. */
      className="gutter-host-rail h-full w-full md:w-[15.625rem] shrink-0 flex flex-col bg-paper"
      style={{ borderInlineEnd: "1px solid var(--border-primary)" }}
    >
      <div ref={laneRef} data-part="groups" className="bleed flex-1 min-h-0 overflow-y-auto py-4">
      {/* Every group, each with its task shelves (`subgroup`). The navbar's
          three entries still open their own group's first page. */}
      {groups.map((group) => (
        // A flex column, so the items stretch: a stretched item's `bleed`
        // margins widen it to the rail edge. A `w-full` button does not widen,
        // it only moves.
        <div key={group.id} data-part="group" className="mb-2 flex flex-col">
          {group.label &&
            (group.hideLabel ? (
              <h2 className="sr-only">{group.label}</h2>
            ) : (
              <SectionLabel as="h2" className="py-2">
                {group.label}
              </SectionLabel>
            ))}
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
                <Icon size={15} aria-hidden className="text-ink-tertiary shrink-0" />
                <span className="truncate flex-1">{item.label}</span>
                {item.badge && (
                  <span data-part="badge" className="text-meta font-semibold text-carbon">
                    {item.badge}
                  </span>
                )}
                {item.external && <ExternalLink size={12} aria-hidden className="text-ink-muted shrink-0" />}
              </>
            );

            // Active is vellum + semibold, not `bg-warm`, which is the hover fill.
            // No left-border accent; the icon keeps its colour.
            const cls = `bleed flex items-center gap-2.5 py-2 text-tab text-left transition-colors ${
              active
                ? "bg-vellum text-ink font-semibold"
                : "font-medium text-ink-secondary hover:bg-warm hover:text-ink"
            }`;

            const sub = startsSub && (
              <SectionLabel
                as="h3"
                key={`sub-${item.subgroup}`}
                className="pt-3 pb-1"
              >
                {item.subgroup}
              </SectionLabel>
            );

            if (item.external) {
              return (
                <Fragment key={item.id}>
                  {sub}
                  <a
                    href={item.external}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-part="item"
                    className={cls}
                  >
                    {inner}
                  </a>
                </Fragment>
              );
            }

            return (
              <Fragment key={item.id}>
                {sub}
                <button
                  type="button"
                  data-part="item"
                  aria-current={active ? "page" : undefined}
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

      {/* Documentation: the panel's footer, pinned to the bottom in every group.
          It belongs to no group, so it is not listed as a Tools item. */}
      <a
        href={settingsDocumentation.external}
        target="_blank"
        rel="noopener noreferrer"
        data-part="documentation"
        className="bleed shrink-0 flex items-center gap-2.5 h-12 text-tab font-medium text-left text-ink-secondary hover:bg-warm hover:text-ink transition-colors"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <settingsDocumentation.icon size={15} aria-hidden className="text-ink-tertiary shrink-0" />
        <span className="truncate flex-1">{settingsDocumentation.label}</span>
        <ExternalLink size={12} aria-hidden className="text-ink-muted shrink-0" />
      </a>
    </nav>
  );
}
