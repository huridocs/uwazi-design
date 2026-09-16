import { createContext, useContext, useId, type ReactNode } from "react";
import { useSetAtom } from "jotai";
import { ChevronLeft, ArrowLeft } from "lucide-react";
import { settingsMobileDrilledAtom } from "../../atoms/settings";

/** Content-area shell for a settings page, mirroring Uwazi's V2
 *  SettingsContent layout (Header breadcrumb · Body · sticky Footer save bar)
 *  but rendered with our tokens. Compose as:
 *
 *    <SettingsContent>
 *      <SettingsContent.Header title="Languages" right={<Button/>} />
 *      <SettingsContent.Body>…</SettingsContent.Body>
 *      <SettingsContent.Footer>…</SettingsContent.Footer>
 *    </SettingsContent>
 */
/** The id of the page's title heading, so the section is named by it. */
const TitleId = createContext<string | undefined>(undefined);

export function SettingsContent({
  component = "SettingsContent",
  children,
}: {
  /** The page rendering this shell ("UsersPage", "TemplateEditor"), stamped as
   *  its `data-component` — the shell has no DOM of its own to name. */
  component?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    // The main-tier gutter host (16px). Header, Body and Footer are `bleed`
    // bands: rules, the scrollbar and the footer tint reach the pane edge, and
    // their content sits on the gutter.
    //
    // A `section` named by the page's `h2` — the page is one region of the
    // app's `main`, titled under its `h1`.
    <section
      data-component={component}
      aria-labelledby={titleId}
      data-gutter-host
      className="gutter-host-main flex flex-col h-full min-h-0 bg-paper"
      data-testid="settings-content"
    >
      <TitleId.Provider value={titleId}>{children}</TitleId.Provider>
    </section>
  );
}

interface HeaderProps {
  /** Breadcrumb trail before the title (e.g. ["Templates"]). */
  path?: string[];
  title: ReactNode;
  /** Provided by a nested (child) view — renders a back arrow on all sizes and
   *  makes the breadcrumb crumbs clickable, all returning to the parent list. */
  onBack?: () => void;
}

// Title/breadcrumb only — actions live in the bottom action bar (Footer), per
// our convention (we don't put primary actions in a top bar).
SettingsContent.Header = function SettingsHeader({ path, title, onBack }: HeaderProps) {
  const setDrilled = useSetAtom(settingsMobileDrilledAtom);
  const titleId = useContext(TitleId);
  return (
    // A `header` inside the page's section, so it heads the page, not the site.
    <header
      data-part="header"
      className="bleed flex items-center gap-2 h-12 shrink-0 bg-paper"
      style={{ borderBottom: "1px solid var(--border-primary)" }}
      data-testid="settings-content-header"
    >
      {onBack ? (
        // Nested view: a back arrow on every breakpoint → returns to the list.
        <button
          type="button"
          data-part="back"
          onClick={onBack}
          aria-label="Back"
          className="-ms-1 p-1 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink transition-colors shrink-0"
        >
          <ArrowLeft size={18} aria-hidden />
        </button>
      ) : (
        // Top-level page: the mobile drill-out to the settings rail.
        <button
          type="button"
          data-part="back"
          onClick={() => setDrilled(false)}
          aria-label="Back to settings"
          className="md:hidden -ms-1 p-1 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink transition-colors shrink-0"
        >
          <ChevronLeft size={18} aria-hidden />
        </button>
      )}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 text-sm">
        {path && path.length > 0 && (
          // The trail to the parent list. The page's own title is the heading
          // beside it, not a crumb.
          <nav aria-label="Breadcrumb" data-part="breadcrumb" className="flex min-w-0">
            <ol className="flex items-center gap-1.5 min-w-0">
              {path.map((crumb) =>
                onBack ? (
                  <li key={crumb} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={onBack}
                      className="truncate text-ink-tertiary hover:text-ink hover:underline transition-colors cursor-pointer"
                    >
                      {crumb}
                    </button>
                    <span aria-hidden className="text-ink-muted">/</span>
                  </li>
                ) : (
                  <li key={crumb} className="flex items-center gap-1.5 text-ink-tertiary">
                    <span className="truncate">{crumb}</span>
                    <span aria-hidden className="text-ink-muted">/</span>
                  </li>
                ),
              )}
            </ol>
          </nav>
        )}
        <h2 id={titleId} data-part="title" className="font-semibold text-ink truncate">
          {title}
        </h2>
      </div>
    </header>
  );
};

SettingsContent.Body = function SettingsBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-part="body"
      className={`bleed grow min-h-0 overflow-auto py-4 ${className}`}
      data-testid="settings-content-body"
    >
      {children}
    </div>
  );
};

SettingsContent.Footer = function SettingsFooter({
  children,
  highlighted = false,
}: {
  children: ReactNode;
  highlighted?: boolean;
}) {
  return (
    <footer
      data-part="footer"
      className={`bleed sticky bottom-0 z-10 flex items-center justify-end gap-2 h-12 shrink-0 ${
        highlighted ? "bg-carbon-tint" : "bg-paper"
      }`}
      style={{ borderTop: "1px solid var(--border-primary)" }}
      data-testid="settings-content-footer"
    >
      {children}
    </footer>
  );
};
