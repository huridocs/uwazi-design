import { useAtomValue } from "jotai";
import { Modal } from "../../../shared/Modal";
import { defaultLanguageAtom, languagesAtom } from "../../../../atoms/languages";
import { localesFor, pageTitle, pageUrl, type SitePage } from "../../../../atoms/sitePages";
import { PagePreview } from "./PagePreview";

/** "View": the page as visitors see it, which is its last release. A page
 *  never published is not public; this says so instead of showing its draft. */
export function PageViewModal({ page, onClose }: { page: SitePage; onClose: () => void }) {
  const lang = useAtomValue(defaultLanguageAtom)?.key ?? "en";
  const keys = useAtomValue(languagesAtom).map((l) => l.key);
  const title = pageTitle(page, lang);
  const published = page.doc.published ? localesFor(page.doc.published, keys, lang)[lang] : null;
  return (
    <Modal
      onClose={onClose}
      title={title}
      subtitle={pageUrl(page, lang)}
      size="xl"
      height="md:h-[min(44rem,100%)]"
      component="PageViewModal"
      bodyClassName="py-3 flex flex-col"
    >
      <PagePreview
        className="flex-1 min-h-[24rem]"
        locale={published}
        empty={`“${title}” is not published yet. Publish it from its editor to make it public.`}
        lang={lang}
        rtl={lang === "ar"}
        path={`/${lang}${pageUrl(page, lang)}`}
      />
    </Modal>
  );
}
