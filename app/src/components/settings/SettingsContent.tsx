import type { ReactNode } from "react";
import { useSetAtom } from "jotai";
import { ChevronLeft } from "lucide-react";
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
export function SettingsContent({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-full min-h-0 bg-paper" data-testid="settings-content">
      {children}
    </div>
  );
}

interface HeaderProps {
  /** Breadcrumb trail before the title (e.g. ["Templates"]). */
  path?: string[];
  title: ReactNode;
}

// Title/breadcrumb only — actions live in the bottom action bar (Footer), per
// our convention (we don't put primary actions in a top bar).
SettingsContent.Header = function SettingsHeader({ path, title }: HeaderProps) {
  const setDrilled = useSetAtom(settingsMobileDrilledAtom);
  return (
    <div
      className="flex items-center gap-2 h-12 px-4 shrink-0 bg-paper"
      style={{ borderBottom: "1px solid var(--border-primary)" }}
      data-testid="settings-content-header"
    >
      <button
        onClick={() => setDrilled(false)}
        aria-label="Back to settings"
        className="md:hidden -ms-1 p-1 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink transition-colors shrink-0"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="flex items-center gap-1.5 min-w-0 flex-1 text-sm">
        {path?.map((crumb) => (
          <span key={crumb} className="flex items-center gap-1.5 text-ink-tertiary">
            <span className="truncate">{crumb}</span>
            <span className="text-ink-muted">/</span>
          </span>
        ))}
        <span className="font-semibold text-ink truncate">{title}</span>
      </div>
    </div>
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
      className={`grow min-h-0 overflow-auto px-4 py-4 ${className}`}
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
    <div
      className={`sticky bottom-0 z-10 flex items-center gap-2 h-12 px-4 shrink-0 ${
        highlighted ? "bg-carbon-tint" : "bg-paper"
      }`}
      style={{ borderTop: "1px solid var(--border-primary)" }}
      data-testid="settings-content-footer"
    >
      {children}
    </div>
  );
};
