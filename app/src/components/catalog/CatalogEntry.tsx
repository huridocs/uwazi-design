import { ReactNode } from "react";
import { Copy } from "lucide-react";
import { useCopyToast } from "./useCopyToast";

interface CatalogEntryProps {
  name: string;
  description: string;
  code: string;
  children: ReactNode;
  tailwind?: string;
}

export function CatalogEntry({ name, description, code, children, tailwind }: CatalogEntryProps) {
  return (
    <article data-component="CatalogEntry" className="border border-border/60 rounded-lg overflow-hidden bg-paper">
      {/* Header */}
      <header data-part="header" className="px-4 py-3 border-b border-border/40">
        <h3 data-part="title" className="text-sm font-semibold text-ink">{name}</h3>
        <p data-part="description" className="text-xs text-ink-tertiary mt-0.5">{description}</p>
      </header>

      {/* Preview */}
      <div data-part="preview" className="px-4 py-6 bg-warm flex items-start justify-center min-h-20 w-full">
        <div className="w-full">{children}</div>
      </div>

      {/* React code */}
      <CodeBlock label="React" content={code} name={name} />

      {/* Tailwind classes */}
      {tailwind && (
        <CodeBlock label="Tailwind" content={tailwind} name={name} />
      )}
    </article>
  );
}

function CodeBlock({ label, content, name }: { label: string; content: string; name: string }) {
  const copyToast = useCopyToast();

  const handleCopy = () => {
    copyToast(content, `${label} — ${name}`);
  };

  return (
    <div data-component="CodeBlock" data-variant={label.toLowerCase()} className="relative border-t border-border/40">
      <div data-part="toolbar" className="flex items-center justify-between px-4 py-1.5" style={{ backgroundColor: "#1A1A1A" }}>
        <span className="text-meta font-medium uppercase tracking-wider" style={{ color: "#9A9A9A" }}>{label}</span>
        <button
          type="button"
          data-part="copy"
          aria-label={`Copy ${label} code for ${name}`}
          onClick={handleCopy}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-meta font-medium hover:bg-white/10 transition-colors"
          style={{ color: "#9A9A9A" }}
        >
          <Copy size={10} aria-hidden /> Copy
        </button>
      </div>
      <pre data-part="code" className="px-4 py-2.5 overflow-x-auto text-xs leading-relaxed font-mono" style={{ backgroundColor: "#1A1A1A" }}>
        <code>
          {label === "React" ? (
            <SyntaxHighlight code={content} />
          ) : (
            <span style={{ color: "#F5F0E8" }}>{content}</span>
          )}
        </code>
      </pre>
    </div>
  );
}

function SyntaxHighlight({ code }: { code: string }) {
  const lines = code.split("\n");

  return (
    <>
      {lines.map((line, i) => (
        <div key={i}>
          {tokenize(line).map((token, j) => (
            <span key={j} style={{ color: token.color }}>
              {token.text}
            </span>
          ))}
        </div>
      ))}
    </>
  );
}

interface Token {
  text: string;
  color: string;
}

function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let remaining = line;

  while (remaining.length > 0) {
    const stringMatch = remaining.match(/^("[^"]*"|'[^']*')/);
    if (stringMatch) {
      tokens.push({ text: stringMatch[0], color: "#FDE68A" });
      remaining = remaining.slice(stringMatch[0].length);
      continue;
    }

    const templateMatch = remaining.match(/^`[^`]*`/);
    if (templateMatch) {
      tokens.push({ text: templateMatch[0], color: "#FDE68A" });
      remaining = remaining.slice(templateMatch[0].length);
      continue;
    }

    const tagMatch = remaining.match(/^(<\/?[A-Z][A-Za-z0-9.]*|<\/?[a-z][a-z0-9-]*|\/>|>)/);
    if (tagMatch) {
      tokens.push({ text: tagMatch[0], color: "#00B4F0" });
      remaining = remaining.slice(tagMatch[0].length);
      continue;
    }

    const propMatch = remaining.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(?==)/);
    if (propMatch) {
      tokens.push({ text: propMatch[0], color: "#9A9A9A" });
      remaining = remaining.slice(propMatch[0].length);
      continue;
    }

    const braceMatch = remaining.match(/^[{}]/);
    if (braceMatch) {
      tokens.push({ text: braceMatch[0], color: "#6B6B6B" });
      remaining = remaining.slice(1);
      continue;
    }

    const commentMatch = remaining.match(/^(\/\/.*|\/\*[\s\S]*?\*\/|{\/\*[\s\S]*?\*\/})/);
    if (commentMatch) {
      tokens.push({ text: commentMatch[0], color: "#6B6B6B" });
      remaining = remaining.slice(commentMatch[0].length);
      continue;
    }

    const plainMatch = remaining.match(/^[^<>"'`{}=/]+/);
    if (plainMatch) {
      tokens.push({ text: plainMatch[0], color: "#F5F0E8" });
      remaining = remaining.slice(plainMatch[0].length);
      continue;
    }

    tokens.push({ text: remaining[0], color: "#F5F0E8" });
    remaining = remaining.slice(1);
  }

  return tokens;
}
