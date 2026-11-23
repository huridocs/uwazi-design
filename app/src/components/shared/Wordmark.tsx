import { useAtomValue } from "jotai";
import { themeLogoAtom } from "../../atoms/branding";
import { collectionSettings } from "../../atoms/settingsSingletons";
import { LOGO_SIZES, type LogoSize } from "../../utils/theme/logoFrame";

/** The logo: the Uwazi wordmark, or the collection's own from Settings ›
 *  Theme and branding. `.logo-img` inverts the wordmark where the text around
 *  it is light (`--logo-filter`); a custom logo is drawn as uploaded, inside
 *  the frame for `size` (`LOGO_SIZES`, `utils/theme/logoFrame.ts`), never
 *  enlarged. `md` is the default bar's logo; `sm` is Compact's; `lg` and `xl`
 *  are the Tall and Extra tall bars'. One component so the navbar, the catalog
 *  header and the login screen cannot drift apart. */
export function Wordmark({ className = "", size = "md" }: { className?: string; size?: LogoSize }) {
  const logo = useAtomValue(themeLogoAtom);
  const name = useAtomValue(collectionSettings.valueAtom).name;
  const frame = LOGO_SIZES[size];
  if (logo.custom)
    return (
      <img
        src={logo.src}
        alt={name || "Home"}
        data-component="Wordmark"
        data-custom=""
        className={`w-auto object-contain ${className}`}
        style={{ maxHeight: `${frame.height / 16}rem`, maxWidth: `${frame.width / 16}rem` }}
      />
    );
  return (
    <img src={logo.src} alt="Uwazi" data-component="Wordmark" className={`logo-img w-auto ${className}`} style={{ height: `${frame.wordmark}rem` }} />
  );
}
