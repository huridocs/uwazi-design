import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ExternalLink } from "lucide-react";
import { SettingsContent } from "../../SettingsContent";
import { SettingsButton } from "../../SettingsButton";
import { SettingsTable, type Column } from "../../SettingsTable";
import { FiltersSlideOver } from "../../../shared/FiltersSlideOver";
import { dataSourceAtom } from "../../../../atoms/dataSource";
import { templatesAtom } from "../../../../atoms/templates";
import { openEntityAtom } from "../../../../atoms/focusedEntity";
import { paragraphsOf, pxRowsAtom, type PxParagraph } from "../../../../atoms/paragraphExtraction";
import type { PxExtractor } from "../../../../data/paragraphs";
import { TemplatePill } from "./TemplatePill";

const LANGUAGE_NAME: Record<string, string> = { en: "English", es: "Español" };
const cut = (s: string) => (s.length > 200 ? `${s.slice(0, 200).trimEnd()}…` : s);

/** One entity's paragraphs (Uwazi's `PXParagraphs`), read only: the main
 *  language's row, then the same paragraph in each other language beneath
 *  it. "View" shows one paragraph whole. */
export function PxParagraphsView({
  extractor: x,
  entityId,
  onBack,
}: {
  extractor: PxExtractor;
  entityId: string;
  onBack: () => void;
}) {
  const corpus = useAtomValue(dataSourceAtom);
  const templates = useAtomValue(templatesAtom(corpus));
  const row = useAtomValue(pxRowsAtom(`${corpus}|${x.id}`)).find((r) => r.entityId === entityId);
  const openEntity = useSetAtom(openEntityAtom);
  const [viewing, setViewing] = useState<PxParagraph | null>(null);
  const source = templates.find((t) => t.id === x.sourceTemplateId);
  const paragraphs = row?.paragraphs ? paragraphsOf(x.id, entityId) : [];
  const main = row?.languages[0];
  const document = `${(row?.title ?? "document").replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.pdf`;

  const columns: Column<PxParagraph>[] = [
    {
      id: "number",
      header: "Paragraph #",
      width: "7rem",
      mobile: "primary",
      cell: (p) => (p.language === main ? <span className="tabular-nums font-medium text-ink">{p.number}</span> : <span aria-label={`Paragraph ${p.number}`} className="ps-4 text-ink-muted">↳</span>),
    },
    {
      id: "language",
      header: "Language",
      width: "6rem",
      mobile: "meta",
      cell: (p) => <span className="w-fit px-1.5 py-0.5 rounded-md bg-vellum text-meta font-medium uppercase text-ink-secondary">{p.language}</span>,
    },
    { id: "text", header: "Text", mobile: "meta", cell: (p) => <span title={p.text} className="text-xs text-ink-secondary text-pretty">{cut(p.text)}</span> },
    {
      id: "actions",
      header: <span className="sr-only">Action</span>,
      width: "4.5rem",
      align: "right",
      mobile: "actions",
      cell: (p) => (
        <SettingsButton variant="secondary" size="sm" aria-label={`View paragraph ${p.number} (${p.language})`} onClick={() => setViewing(p)}>
          View
        </SettingsButton>
      ),
    },
  ];

  return (
    <div className="relative h-full">
      <SettingsContent component="PxParagraphs">
        <SettingsContent.Header path={["Paragraph extraction", source?.name ?? x.sourceTemplateId]} title={row?.title ?? entityId} onBack={onBack} />
        <SettingsContent.Body>
          <div className="flex flex-col gap-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-ink">Paragraphs for</h3>
              <TemplatePill template={source} id={x.sourceTemplateId} />
              {row?.languages.map((l) => (
                <span key={l} className="w-fit px-1.5 py-0.5 rounded-md bg-vellum text-meta font-medium uppercase text-ink-secondary">
                  {l}
                </span>
              ))}
            </div>
            <SettingsTable columns={columns} data={paragraphs} getRowId={(p) => `${p.number}-${p.language}`} />
          </div>
        </SettingsContent.Body>
      </SettingsContent>
      <FiltersSlideOver
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="Entity"
        footer={
          <SettingsButton variant="secondary" size="sm" icon={<ExternalLink size={13} aria-hidden />} onClick={() => openEntity(entityId)}>
            View entity
          </SettingsButton>
        }
      >
        {viewing && (
          <div className="flex flex-col gap-3 py-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink">{row?.title}</span>
              <TemplatePill template={source} id={x.sourceTemplateId} />
            </div>
            <dl className="flex flex-col gap-1 text-ink-secondary">
              <div className="flex gap-1.5">
                <dt>Language:</dt>
                <dd className="text-ink">{LANGUAGE_NAME[viewing.language] ?? viewing.language}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt>Document:</dt>
                <dd className="text-ink break-all" dir="ltr">{document}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt>Paragraph:</dt>
                <dd className="text-ink tabular-nums">{viewing.number}</dd>
              </div>
            </dl>
            <section className="flex flex-col gap-1 rounded-lg border border-border p-3">
              <h4 className="text-meta font-semibold uppercase tracking-wider text-ink-tertiary">Text</h4>
              <p className="text-sm text-ink text-pretty">{viewing.text}</p>
            </section>
          </div>
        )}
      </FiltersSlideOver>
    </div>
  );
}
