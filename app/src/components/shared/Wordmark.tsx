import { useAtomValue } from "jotai";
import { themeLogoAtom } from "../../atoms/branding";
import { collectionSettings } from "../../atoms/settingsSingletons";

/** The logo: the Uwazi wordmark at the navbar's size (0.919rem tall), or the
 *  collection's own from Settings › Theme and branding. `.logo-img` inverts
 *  the wordmark where the text around it is light (`--logo-filter`); a
 *  custom logo is drawn as uploaded, inside the header's frame
 *  (`LOGO_FRAME`, `utils/theme/logoFrame.ts`). `size="sm"` is the Compact
 *  header layout's smaller logo. One component so the navbar,
 *  the catalog header and the login screen cannot drift apart. */
export function Wordmark({ className = "", size = "md" }: { className?: string; size?: "md" | "sm" }) {
  const logo = useAtomValue(themeLogoAtom);
  const name = useAtomValue(collectionSettings.valueAtom).name;
  if (logo.custom)
    return (
      <img
        src={logo.src}
        alt={name || "Home"}
        data-component="Wordmark"
        data-custom=""
        className={`${size === "sm" ? "max-h-6 max-w-28" : "max-h-7 max-w-32"} w-auto object-contain ${className}`}
      />
    );
  return <img src={logo.src} alt="Uwazi" data-component="Wordmark" className={`logo-img ${size === "sm" ? "h-3" : "h-[0.919rem]"} w-auto ${className}`} />;
}
