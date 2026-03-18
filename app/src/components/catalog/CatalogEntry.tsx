import { useState, ReactNode } from "react";
import { Copy, Check } from "lucide-react";

interface CatalogEntryProps {
  name: string;
  description: string;
  code: string;
  children: ReactNode;
  tailwind?: string;
}

export function CatalogEntry({ name, description, code, children, tailwind }: CatalogEntryProps) {
  return (
    <div className="border border-border/60 rounded-lg overflow-hidden bg-paper">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40">
        <h3 className="text-sm font-semibold text-ink">{name}</h3>
        <p className="text-xs text-ink-tertiary mt-0.5">{description}</p>
      </div>

      {/* Preview */}
      <div className="px-4 py-6 bg-warm flex items-start justify-center min-h-[80px]">
        <div className="max-w-full">{children}</div>
      </div>

      {/* React code */}
      <CodeBlock label="React" content={code} syntax="jsx" />

      {/* Tailwind classes */}
      {tailwind && (
        <CodeBlock label="Tailwind" content={tailwind} syntax="css" />
      )}
    </div>
  );
}

function CodeBlock({ label, content, syntax }: { label: string; content: string; syntax: "jsx" | "css" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative border-t border-border/40">
      <div className="flex items-center justify-between px-4 py-1.5 bg-ink">
        <span className="text-[10px] font-medium text-ink-muted uppercase tracking-wider">{label}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-ink-muted hover:text-parchment hover:bg-white/10 transition-colors"
        >
          {copied ? (
            <>
              <Check size={10} className="text-success" /> Copied
            </>
          ) : (
            <>
              <Copy size={10} /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="bg-ink px-4 py-2.5 overflow-x-auto text-xs leading-relaxed font-mono">
        <code>
          {syntax === "jsx" ? (
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
