import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { PublicPreview } from "../../../site/PublicPreview";
import { useSiteData } from "../../../site/useSiteData";
import { customisationSettings, collectionSettings } from "../../../../atoms/settingsSingletons";
import { assetSourcesAtom } from "../../../../atoms/uploads";
import { menuSettings } from "../../../../atoms/siteMenu";
import type { CodeLocale } from "../../../../data/sitePages";

/** `/assets/<file>` → the uploaded file's content, so a page's `<img>` and its
 *  CSS `url()` show the upload in the preview (the iframe has no server). A
 *  URL with no upload is left as it is and shows as a missing image. */
export function resolveAssets(text: string, sources: Map<string, string>): string {
  return text
    .replace(/url\(\s*(['"]?)(\/assets\/[^'")\s]+)\1\s*\)/g, (m, _q, url: string) =>
      sources.has(url) ? `url("${sources.get(url)!.replace(/"/g, "%22")}")` : m,
    )
    .replace(/(["'])(\/assets\/[^"'\s]+)\1/g, (m, q: string, url: string) =>
      sources.has(url) ? `${q}${sources.get(url)!.replace(new RegExp(q, "g"), q === '"' ? "%22" : "%27")}${q}` : m,
    );
}

/** One page language rendered as the public site shows it: the collection's
 *  Global CSS, then the page's CSS, inside the preview frame only, so neither
 *  reaches the Settings shell. Page and global JavaScript are stored and never
 *  run here. `locale` null shows `empty` in its place. */
export function PagePreview({
  locale,
  empty,
  lang,
  rtl,
  path,
  banner,
  className = "",
}: {
  locale: CodeLocale | null;
  empty: string;
  lang: string;
  rtl: boolean;
  path: string;
  banner?: string;
  className?: string;
}) {
  const site = useSiteData();
  const globalCss = useAtomValue(customisationSettings.valueAtom).css;
  const sources = useAtomValue(assetSourcesAtom);
  const menu = useAtomValue(menuSettings.valueAtom).links;
  const name = useAtomValue(collectionSettings.valueAtom).name;
  const ctx = useMemo(
    () => ({ entities: site.entities, viewEntity: site.entities.find((e) => e.typeId === site.mainTemplate) }),
    [site.entities, site.mainTemplate],
  );
  const chrome = useMemo(
    () => ({
      name: name || site.siteName,
      logoText: "",
      accent: "#1A1A1A",
      headingFont: "serif" as const,
      nav: menu.map((m) => m.title),
      lang,
      rtl,
      banner,
    }),
    [name, site.siteName, menu, lang, rtl, banner],
  );
  const html = locale?.html.trim() ? resolveAssets(locale.html, sources) : `<p class="u-empty">${empty}</p>`;
  const css = resolveAssets(`${globalCss}\n${locale?.css ?? ""}`, sources);
  return (
    <PublicPreview className={className} html={html} css={css} js="" chrome={chrome} ctx={ctx} path={path} loading={site.loading} />
  );
}
