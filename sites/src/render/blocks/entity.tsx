/* Blocks of an entity page. They read the record the page is showing from
 * EntityCtx; in the builder that is a sample record of the page's template. */
import { createContext, useContext, useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import type { Entity } from "../../data/types";
import type { BlockProps } from "../../model/config";
import { useQuery, useSite } from "../context";
import { EntityLink, EntityRow, Loadable, Section, StatusChip, TypeDot, fmtDate, statusTone, useMetaLine } from "../parts";
import { useBlockStyle } from "../blockStyle";
import { ui } from "../ui";

export const EntityCtx = createContext<Entity | null>(null);
const useEntity = () => useContext(EntityCtx);

export function EntityHeader({ p }: { p: BlockProps["entityHeader"] }) {
  const e = useEntity();
  const { templates, lang } = useSite();
  const st = useBlockStyle();
  if (!e) return null;
  const tpl = templates.get(e.template);
  const pad = { S: "pt-6 pb-5", M: "pt-10 pb-8", L: "pt-14 pb-12", XL: "pt-20 pb-16" }[st?.pad ?? "M"];
  const h1 = { "-1": "text-2xl sm:text-3xl", "0": "text-3xl sm:text-[2.75rem]", "1": "text-4xl sm:text-5xl" }[String(st?.heading ?? 0)];
  const center = st?.align === "center";
  return (
    <section className="border-b border-border">
      <div className={`mx-auto max-w-[68rem] px-5 ${pad} flex flex-col gap-4 ${center ? "items-center text-center" : ""}`}>
        <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-tertiary ${center ? "justify-center" : ""}`}>
          <span className="inline-flex items-center gap-1.5 text-ink-secondary">
            <TypeDot template={e.template} />
            {tpl?.name}
          </span>
          {e.country ? <span>{e.country}</span> : null}
          {e.date ? <span className="tabular-nums">{fmtDate(e.date, lang)}</span> : null}
          {e.status ? <StatusChip value={e.status} /> : null}
        </p>
        <h1 className={`font-heading ${h1} leading-[1.1] tracking-tight text-ink text-balance max-w-[28ch]`}>{e.title}</h1>
        {p.showImage && e.image ? (
          <figure className="mt-2 rounded-lg overflow-hidden bg-vellum max-w-[48rem]">
            <img src={e.image.url} alt={e.image.alt} className="w-full max-h-[70vh] object-contain" />
          </figure>
        ) : null}
      </div>
    </section>
  );
}

export function EntityFields({ p }: { p: BlockProps["entityFields"] }) {
  const e = useEntity();
  const { t, lang } = useSite();
  if (!e) return null;
  // The header already prints country and status; don't say them twice.
  const inHeader = (m: Entity["metadata"][number]) => m.values.length === 1 && (m.values[0] === e.country || m.values[0] === e.status);
  const fields = (p.keys.length ? e.metadata.filter((m) => p.keys.includes(m.name)) : e.metadata.filter((m) => !inHeader(m))).filter((m) => m.values.length);
  if (!fields.length) return null;
  const linked = fields.filter((m) => m.type === "relationship" && m.values.length > 1);
  const plain = fields.filter((m) => !linked.includes(m));
  return (
    <Section title={t(p.title)}>
      <dl className="blk-grid grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {plain.map((m) => (
          <div key={m.name} className="flex flex-col gap-1 min-w-0">
            <dt className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">{m.label}</dt>
            <dd className="text-ink text-pretty">
              {m.type === "multiselect" ? (
                <ul className="flex flex-wrap gap-1.5">
                  {m.values.slice(0, 16).map((v) => (
                    <li key={v} className="rounded-md bg-vellum px-2 py-0.5 text-sm">
                      {v}
                    </li>
                  ))}
                  {m.values.length > 16 ? <li className="text-sm text-ink-tertiary px-1">+{m.values.length - 16}</li> : null}
                </ul>
              ) : m.type === "date" ? (
                <span className="tabular-nums">{m.values.map((v) => fmtDate(Date.parse(v), lang)).join(", ")}</span>
              ) : m.type === "relationship" && m.ids?.[0] ? (
                <EntityLink id={m.ids[0]} className="text-accent-text hover:underline underline-offset-2">
                  {m.values[0]}
                </EntityLink>
              ) : (
                m.values.join(", ")
              )}
            </dd>
          </div>
        ))}
      </dl>
      {linked.map((m) => (
        <div key={m.name} className="mt-8 flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">{m.label}</h3>
          <ul className="border-t border-border">
            {m.values.map((v, i) => (
              <li key={i} className="border-b border-border py-2.5 text-sm">
                {m.ids?.[i] ? (
                  <EntityLink id={m.ids[i]} className="text-ink hover:text-accent-text hover:underline underline-offset-2">
                    {v}
                  </EntityLink>
                ) : (
                  v
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Section>
  );
}

export function EntitySummary({ p }: { p: BlockProps["entitySummary"] }) {
  const e = useEntity();
  const { t } = useSite();
  if (!e?.summary) return null;
  return (
    <Section title={t(p.title)}>
      <div className="max-w-[42rem] flex flex-col gap-4 text-[1.0625rem] leading-relaxed text-ink-secondary">
        {e.summary.split(/\n{2,}/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </Section>
  );
}

export function EntityHistory({ p }: { p: BlockProps["entityHistory"] }) {
  const e = useEntity();
  const { t, lang } = useSite();
  if (!e?.history?.length) return null;
  return (
    <Section title={t(p.title)}>
      <ol className="relative flex flex-col gap-5 ps-6 max-w-[40rem]">
        <span aria-hidden className="absolute start-[0.3125rem] top-2 bottom-2 w-px bg-border-soft" />
        {e.history.map((s, i) => (
          <li key={i} className="relative flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span aria-hidden className="absolute -start-6 top-1.5 w-[0.6875rem] h-[0.6875rem] rounded-full border-2 border-paper" style={{ background: statusTone(s.state).dot }} />
            <StatusChip value={s.state} />
            <time className="text-sm text-ink-tertiary tabular-nums" dateTime={new Date(s.date).toISOString()}>
              {fmtDate(s.date, lang)}
            </time>
            {i === e.history!.length - 1 ? <span className="text-xs text-ink-muted">· {ui("current", lang)}</span> : null}
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function EntityConnections({ p }: { p: BlockProps["entityConnections"] }) {
  const e = useEntity();
  const { t, templates } = useSite();
  const links = useMemo(() => {
    if (!e) return [];
    // "Documents it links to" = connections to document-like templates;
    // "links to it" = everything else. The seed has no direction, so the split
    // is by what the connected record is.
    const docLike = (tid: string) => /sentenc|resoluci|judgment|document|informe|voto|report/i.test(templates.get(tid)?.name ?? "");
    return e.links.map((l) => ({ ...l, docLike }));
  }, [e, templates]);
  const q = useQuery(`links:${e?.id}:${p.mode}:${p.limit}`, async (ds) => {
    const rows = await ds.entities(links.map((l) => l.id));
    const tidOf = (r: Entity) => r.template;
    const docLike = links[0]?.docLike ?? (() => false);
    const pick = p.mode === "cites" ? rows.filter((r) => docLike(tidOf(r))) : p.mode === "citedBy" ? rows.filter((r) => !docLike(tidOf(r))) : rows;
    return pick.slice(0, p.limit);
  });
  if (!e || !e.links.length) return null;
  return (
    <Section title={t(p.title)}>
      <Loadable q={q} rows={3} empty={(d) => !d.length}>
        {(d) => (
          <ul className="border-t border-border">
            {d.map((r) => (
              <EntityRow key={r.id} e={r} />
            ))}
          </ul>
        )}
      </Loadable>
    </Section>
  );
}

export function EntityDownload({ p }: { p: BlockProps["entityDownload"] }) {
  const e = useEntity();
  const { t, lang } = useSite();
  if (!e) return null;
  return (
    <Section title={t(p.title)}>
      <button type="button" className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-border-soft bg-paper text-ink hover:bg-warm cursor-pointer">
        <Download size={16} aria-hidden /> {ui("download", lang)}
      </button>
    </Section>
  );
}

export function EntityCitation({ p }: { p: BlockProps["entityCitation"] }) {
  const e = useEntity();
  const { t, lang, config } = useSite();
  const meta = useMetaLine();
  const [copied, setCopied] = useState(false);
  if (!e) return null;
  const cite = `${e.title}. ${meta(e)}. ${t(config.name)}. ${typeof location !== "undefined" ? location.href.split("?")[0] : ""}`;
  return (
    <Section title={t(p.title)}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 max-w-[48rem]">
        <p className="flex-1 rounded-md bg-vellum px-4 py-3 text-sm text-ink-secondary font-mono break-words">{cite}</p>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(cite).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          className="inline-flex items-center gap-2 h-10 px-3 rounded-md border border-border-soft bg-paper text-sm text-ink hover:bg-warm cursor-pointer self-start"
        >
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
          <span aria-live="polite">{copied ? ui("copied", lang) : ui("copy", lang)}</span>
        </button>
      </div>
    </Section>
  );
}
