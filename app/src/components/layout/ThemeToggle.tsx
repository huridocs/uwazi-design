import { useAtom } from "jotai";
import { Sun, Moon, Monitor } from "lucide-react";
import { themeAtom } from "../../atoms/theme";
import { t } from "../../utils/i18n";

/** The light ↔ dark switch, in both its shapes.
 *
 *  It subscribes to `themeAtom` ITSELF rather than taking the value from the
 *  Navbar's props: the icon is the only thing in the tree that has to re-render
 *  when the theme changes, so the subscription belongs at the leaf. Read higher
 *  up, it re-rendered the entire view underneath (see `ThemeEffect`). */
export function ThemeToggle({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const [theme, setTheme] = useAtom(themeAtom);
  const Icon = theme === "dark" ? Moon : theme === "auto" ? Monitor : Sun;
  const label = t("System", theme === "dark" ? "Dark" : theme === "auto" ? "Auto" : "Light");
  const toggle = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={toggle}
        data-component="ThemeToggle"
        data-variant="row"
        data-theme-value={theme}
        className="flex items-center justify-between gap-3 w-full px-4 py-3 text-sm font-medium text-ink-secondary hover:bg-warm transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={16} className="text-ink-tertiary" />
          {t("System", "Theme")}
        </div>
        <span data-part="value" className="px-1.5 py-0.5 text-meta font-semibold rounded bg-warm text-ink-muted">
          {label}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      data-component="ThemeToggle"
      data-variant="icon"
      data-theme-value={theme}
      className="p-1.5 text-ink-tertiary hover:text-ink-secondary hover:bg-warm rounded-md transition-colors"
      aria-label={`${t("System", "Theme")}: ${label}`}
      title={`${t("System", "Theme")}: ${label}`}
    >
      <Icon size={16} />
    </button>
  );
}
