import { useAtom } from "jotai";
import { ArrowLeft, Pencil, Sparkles } from "lucide-react";
import { breakpointAtom } from "../../atoms/viewport";
import { Select } from "../shared/Select";
import { languageName } from "../../atoms/language";
import { TabCount } from "../shared/TabCount";

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
  /** Align the strip to a body of metadata cards below it — see the wrapper
   *  comment for why both the padding and a transparent border are needed. */
  cardAligned?: boolean;
}

export function MainTabs({ tabs, activeId, onChange, languages = [], availableLanguages, activeLanguage, onLanguageChange, onBack, languageEditing = false, cardAligned = false }: MainTabsProps) {
  const [breakpoint] = useAtom(breakpointAtom);
  /* BELOW DESKTOP, not below mobile. `breakpointAtom` calls 768–1023 "tablet",
     so a mobile-only test is false at 768 — the width this was reported at — and a
     mobile-only rule would have left the reported defect exactly as it was. A
     strip that scrolls sideways to reach "Files" is the same defect at 768 as
     at 390, so the fold is for everything under desktop. */
  const isNarrow = breakpoint !== "desktop";
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
      /* `cardAligned` lines the strip up with a body of `p-4` metadata cards
         beneath it — the drawer, where the two sat 4px apart at the edge and
         8px apart at the text. Both alignments hold at once because the strip
         takes the card's BORDER too, transparently: without it the strip's
         content box starts one pixel left of the card's, and you can have the
         edges flush or the text flush but not both. */
      className={`flex items-center justify-between gap-3 pt-2 pb-1 md:pt-2.5 shrink-0 ${
        cardAligned ? "px-4" : "px-3"
      }`}
    >
      {/* Left: Back + Tabs.

          `overflow-x-auto` is the STRIP's, so it belongs to the branch that
          renders the strip. A scroll container clips on both axes the moment one
          is not `visible`, so while it was unconditional it cut the section
          dropdown's menu off at the bar's own height — the menu was laid out
          (real rect, right z-index) and simply not painted. */}
      <div
        className={`flex items-center gap-3 md:gap-4 min-w-0 ${
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
        /* No `overflow-hidden`: it would clip the dots just outside a tab's
            corner. The end tabs round themselves instead, logically, so the
            strip still reads as one frame under RTL. */
        <div
          className={`flex items-center rounded-md shrink-0 ${
            cardAligned ? "border border-transparent" : ""
          }`}
          role="tablist"
          style={{
            border: "1px solid var(--border-primary)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
          }}
        >
          {tabs.map((tab, i) => (
            <div key={tab.id} className="flex items-center">
              {i > 0 && <div className="w-px self-stretch bg-border" aria-hidden="true" />}
              <button
                role="tab"
                aria-selected={activeId === tab.id}
                onClick={() => onChange(tab.id)}
                className={`relative flex items-center justify-center gap-1 py-1.5 text-tab font-medium transition-colors ${
                  cardAligned ? "px-4" : "px-2.5 md:px-3"
                } ${
                  i === 0 ? "rounded-s-md" : ""
                } ${i === tabs.length - 1 ? "rounded-e-md" : ""} ${
                  activeId === tab.id
                    ? "bg-vellum text-ink"
                    : "bg-paper text-ink-tertiary hover:text-ink-secondary"
                }`}
              >
                {tab.label}
                {/* Always shown now: this strip only renders at desktop, and
                    the narrow widths that had to hide counts to fit get them
                    back as the dropdown's option hints instead. */}
                {tab.count !== undefined && <TabCount count={tab.count} />}
                {tab.sparkle && (
                  <Sparkles size={11} className="text-carbon" aria-label="AI suggestions pending" />
                )}
                {/* Decorative — the state it points at is announced by the panel
                    that owns it. Survives on mobile (unlike the count): it costs
                    no width, and it is exactly there that the other panel is
                    furthest out of sight. */}
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
        )}
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
