import { useState } from "react";
import { ArrowLeft, Pencil, Sparkles } from "lucide-react";
import { useResizeWidth } from "../../hooks/useResizeWidth";
import { Select } from "../shared/Select";
import { languageName } from "../../atoms/language";

interface MainTab {
  id: string;
  label: string;
  /** **Inventory** — how many things live behind this tab (Relationships 10,
   *  Files 2). Rides in the flow, so it must be a number the tab always has;
   *  hidden on mobile, where its width pushes later tabs off-screen. */
  count?: number;
  /** **Live state, out of view** — something the USER set is still in effect
   *  behind this tab (an active filter, a running query). Only drawn while the
   *  tab is NOT active: on the active tab you can see the state itself.
   *  Absolutely positioned, so it costs no flow width and can toggle without
   *  moving the strip — the same 6px carbon mark, in the same place, that
   *  `DrawerTabs` and the Display menu use. Keep it rare. */
  dot?: boolean;
  /** Show a tiny Sparkles icon next to the count — signals pending AI
   *  suggestions on the Relationships tab. */
  sparkle?: boolean;
}

interface MainTabsProps {
  tabs: MainTab[];
  activeId: string;
  onChange: (id: string) => void;
  languages?: string[];
  /** The language picker is the WRITE target, not a reading choice: an edit form
   *  is open below and the value it points at is the language a keystroke lands
   *  in. Same control, same slot — a pencil, the carbon accent and a spoken
   *  suffix, because a control that means two different things must not look
   *  identical in both. Read mode passes nothing and is untouched. */
  languageEditing?: boolean;
  availableLanguages?: string[];
  activeLanguage?: string;
  onLanguageChange?: (lang: string) => void;
  /** When provided, the header shows a back button that returns to the
   *  precedent screen. */
  onBack?: () => void;
}

export function MainTabs({ tabs, activeId, onChange, languages = [], availableLanguages, activeLanguage, onLanguageChange, onBack, languageEditing = false }: MainTabsProps) {
  /* THE FOLD IS DECIDED BY THE CONTAINER, not the viewport.
     It used to fold on `breakpointAtom`, which reads the WINDOW — so a strip in
     a 360px pane at a 1440px window stayed expanded and clipped mid-tab. The
     Library preview drawer is exactly that pane: it renders this strip, and at
     its minimum "Files" was cut off.

     The viewport rule is GONE rather than kept as a floor. Two conditions over
     one question drift apart, and this one covers it: at 390 the tabs do not
     fit, so it folds; where they DO fit, showing them is better than hiding them
     because the window is small.

     Measured, not a threshold, because the labels are translated and
     "Relationships 3,749" is a different width in every language. */
  const [availW, setAvailW] = useState(0);
  const [naturalW, setNaturalW] = useState(0);
  const availRef = useResizeWidth(setAvailW);
  const probeRef = useResizeWidth(setNaturalW);
  const isNarrow = availW > 0 && naturalW > 0 && naturalW > availW;
  const currentLang = activeLanguage ?? languages[0];
  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];
  /* A dot marks live state behind a tab you are NOT on. Collapsing the strip is
     exactly when that state is furthest out of sight, so the trigger has to
     carry it — a dropdown losing this signal is the one thing this change could
     silently break. It rides `triggerIcon`, and the options carry their own
     dots, so opening the menu says WHICH section it is about. */
  const hiddenDot = tabs.some((t) => t.dot && t.id !== activeId);

  return (
    <div
      className="relative flex items-center justify-between gap-3 px-3 pt-2 pb-1 md:pt-2.5 shrink-0"
    >
      {/* Left: Back + Tabs.

          `overflow-x-auto` is the STRIP's, so it belongs to the branch that
          renders the strip. A scroll container clips on both axes the moment one
          is not `visible`, so while it was unconditional it cut the section
          dropdown's menu off at the bar's own height — the menu was laid out
          (real rect, right z-index) and simply not painted. */}
      {/* `flex-1` is load-bearing: the cluster always occupies what the language
          picker leaves, so what is measured does not depend on what is rendered
          into it. Without it the cluster would shrink to the dropdown, the strip
          would "fit" again, and the fold would oscillate. */}
      <div
        ref={availRef}
        className={`flex flex-1 items-center gap-3 md:gap-4 min-w-0 ${
          isNarrow ? "" : "overflow-x-auto"
        }`}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden text-ink-tertiary hover:text-ink transition-colors shrink-0 cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        {/* Below desktop the strip is ONE dropdown naming the section — the
            shared `Select`, not a second control that would have to relearn
            RTL, focus and the popover. `steady` reserves the widest tab NAME
            (the counts ride the options' `hint`, which cannot widen the
            trigger), so switching section never moves the language picker
            beside it. */}
        {isNarrow ? (
          <Select
            value={activeTab?.id ?? ""}
            onChange={onChange}
            ariaLabel="Section"
            ariaSuffix={hiddenDot ? "another section has active filters or search" : undefined}
            steady
            triggerIcon={
              hiddenDot ? (
                <span
                  aria-hidden="true"
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "var(--accent-blue)" }}
                />
              ) : undefined
            }
            options={tabs.map((tab) => ({
              value: tab.id,
              label: tab.label,
              hint: tab.count !== undefined ? String(tab.count) : undefined,
              dot: tab.dot && tab.id !== activeId,
            }))}
          />
        ) : (
          <TabStrip tabs={tabs} activeId={activeId} onChange={onChange} />
        )}
      </div>

      {/* THE PROBE: the same strip, laid out at its natural width and never
          painted, so there is always a true number to compare against —
          including while the real strip is folded away, which is exactly when it
          cannot be measured. Absolutely positioned, so it costs no layout;
          `visibility: hidden` rather than `display: none`, because a box that is
          not laid out has no width. */}
      <div
        ref={probeRef}
        aria-hidden
        className="pointer-events-none absolute -z-10 w-max"
        style={{ visibility: "hidden", top: 0, insetInlineStart: 0 }}
      >
        <TabStrip tabs={tabs} activeId={activeId} onChange={onChange} probe />
      </div>

      {/* Right: language — the SAME control the Library uses (shared `Select`,
          codes not names), not a row of four pills. One language switcher, one
          shape, wherever you meet it; and it no longer widens the tab strip by a
          pill for every language the collection adds. Unavailable renditions stay
          listed but disabled. */}
      {languages.length > 0 && (
        <div className="shrink-0">
          <Select
            value={currentLang}
            onChange={(v) => onLanguageChange?.(v)}
            ariaLabel="Language"
            align="end"
            /* Names, not codes — and `steady`, which holds the width of the
               WIDEST option. Without it the trigger is sized to whatever is
               selected, so picking Français after English widens it and shoves
               the tab strip; with it the slot is Français-wide always and
               switching language moves nothing. */
            steady
            tone={languageEditing ? "carbon" : "default"}
            triggerIcon={languageEditing ? <Pencil size={11} aria-hidden /> : undefined}
            ariaSuffix={languageEditing ? "editing this language" : undefined}
            triggerTitle={
              languageEditing
                ? "Editing this language — switching moves every field to its value in the language you pick"
                : undefined
            }
            options={languages.map((lang) => ({
              value: lang,
              label: languageName(lang),
              disabled: !!availableLanguages && !availableLanguages.includes(lang),
            }))}
          />
        </div>
      )}
    </div>
  );
}

/** The tab strip, rendered once for real and once invisibly to be measured.
 *  ONE renderer for both, because the measurement is only true while it draws
 *  exactly what the strip draws — a second copy would drift and the fold would
 *  decide on a strip that no longer exists. `probe` draws the same tabs with
 *  nothing interactive in them. */
function TabStrip({
  tabs,
  activeId,
  onChange,
  probe = false,
}: {
  tabs: MainTab[];
  activeId: string;
  onChange: (id: string) => void;
  probe?: boolean;
}) {
  return (
    /* No `overflow-hidden`: it would clip the dots just outside a tab's
       corner. The end tabs round themselves instead, logically, so the strip
       still reads as one frame under RTL. */
    <div
      className="flex items-center rounded-md shrink-0"
      role={probe ? undefined : "tablist"}
      style={{
        border: "1px solid var(--border-primary)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
      }}
    >
      {tabs.map((tab, i) => (
        <div key={tab.id} className="flex items-center">
          {i > 0 && <div className="w-px self-stretch bg-border" aria-hidden="true" />}
          <button
            role={probe ? undefined : "tab"}
            tabIndex={probe ? -1 : undefined}
            aria-selected={probe ? undefined : activeId === tab.id}
            onClick={probe ? undefined : () => onChange(tab.id)}
            className={`relative flex items-center justify-center gap-1 px-2.5 md:px-3 py-1.5 text-tab font-medium transition-colors ${
              i === 0 ? "rounded-s-md" : ""
            } ${i === tabs.length - 1 ? "rounded-e-md" : ""} ${
              activeId === tab.id
                ? "bg-vellum text-ink"
                : "bg-paper text-ink-tertiary hover:text-ink-secondary"
            }`}
          >
            {tab.label}
            {/* Always shown: where the counts would not fit, the whole strip
                folds into the dropdown and they come back as option hints. */}
            {tab.count !== undefined && (
              <span className="text-xs font-semibold text-ink-tertiary bg-warm px-1 rounded">
                {tab.count}
              </span>
            )}
            {tab.sparkle && (
              <Sparkles size={11} className="text-carbon" aria-label="AI suggestions pending" />
            )}
            {/* Decorative — the state it points at is announced by the panel
                that owns it. */}
            {tab.dot && activeId !== tab.id && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -end-0.5 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: "var(--accent-blue)" }}
              />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
