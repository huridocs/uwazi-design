import { Fragment, type ReactNode } from "react";
import { useQuery, useSite } from "./context";
import { EntityLink } from "./parts";

/** The one text format a site takes: paragraphs, **bold**, [links](url),
 *  "- " list lines, and @[entity-id] mentions that become entity links.
 *  No HTML — raw code lives only behind Advanced. */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*[-*] /.test(l)))
          return (
            <ul key={i} className="list-disc ps-5 flex flex-col gap-1.5 marker:text-ink-muted">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*] /, ""))}</li>
              ))}
            </ul>
          );
        return <p key={i}>{inline(b)}</p>;
      })}
    </div>
  );
}

function inline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|@\[([^\]]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[1]) out.push(<strong key={m.index}>{m[1]}</strong>);
    else if (m[2])
      out.push(
        <a key={m.index} href={m[3]} className="text-accent-text underline underline-offset-2 decoration-1 hover:decoration-2">
          {m[2]}
        </a>,
      );
    else if (m[4]) out.push(<Mention key={m.index} id={m[4]} />);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out.map((n, i) => <Fragment key={i}>{n}</Fragment>);
}

function Mention({ id }: { id: string }) {
  const q = useQuery(`entity:${id}`, (ds) => ds.entity(id));
  const { templates } = useSite();
  if (q.loading) return <span className="text-ink-muted">…</span>;
  if (!q.data) return <span className="text-ink-muted">[{id}]</span>;
  const tpl = templates.get(q.data.template);
  return (
    <EntityLink id={id} className="inline-flex items-baseline gap-1 font-medium text-accent-text underline underline-offset-2 decoration-1 hover:decoration-2">
      <span aria-hidden className="inline-block w-2 h-2 rounded-[2px] translate-y-[-1px]" style={{ background: tpl?.color }} />
      {q.data.title}
    </EntityLink>
  );
}
