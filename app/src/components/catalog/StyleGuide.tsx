import { useCopyToast } from "./useCopyToast";

function CopyText({ text, children }: { text: string; children: React.ReactNode }) {
  const copyToast = useCopyToast();
  return (
    <button onClick={() => copyToast(text, text)} className="text-left" title={`Copy: ${text}`}>
      {children}
    </button>
  );
}

interface ColorDef {
  name: string;
  cssVar: string;
  light: string;
  dark: string;
  tw: string;
}

const brandColors: ColorDef[] = [
  { name: "parchment", cssVar: "--bg-primary", light: "#F5F0E8", dark: "#1A1A1A", tw: "bg-parchment" },
  { name: "paper", cssVar: "--bg-surface", light: "#FFFFFF", dark: "#242424", tw: "bg-paper" },
  { name: "warm", cssVar: "--bg-warm", light: "#FCFAF8", dark: "#2A2A2A", tw: "bg-warm" },
  { name: "vellum", cssVar: "--bg-muted", light: "#F5EED7", dark: "#333333", tw: "bg-vellum" },
];

const textColors: ColorDef[] = [
  { name: "ink", cssVar: "--text-primary", light: "#1A1A1A", dark: "#F5F0E8", tw: "text-ink" },
  { name: "ink-secondary", cssVar: "--text-secondary", light: "#333333", dark: "#D4CDB8", tw: "text-ink-secondary" },
  { name: "ink-tertiary", cssVar: "--text-tertiary", light: "#6B6B6B", dark: "#9A9A9A", tw: "text-ink-tertiary" },
  { name: "ink-muted", cssVar: "--text-muted", light: "#9A9A9A", dark: "#6B6B6B", tw: "text-ink-muted" },
];

const borderColors: ColorDef[] = [
  { name: "border", cssVar: "--border-primary", light: "#E0D9C8", dark: "#3D3D3D", tw: "border-border" },
  { name: "border-soft", cssVar: "--border-soft", light: "#D4CDB8", dark: "#4A4A4A", tw: "border-border-soft" },
];

const accentColors: ColorDef[] = [
  { name: "carbon", cssVar: "--accent-blue", light: "#00B4F0", dark: "#00B4F0", tw: "text-carbon" },
  { name: "carbon-tint", cssVar: "--accent-blue-tint", light: "#DDF3FD", dark: "#0C3A4D", tw: "bg-carbon-tint" },
];

const semanticColors: ColorDef[] = [
  { name: "success", cssVar: "--success", light: "#059669", dark: "#059669", tw: "text-success" },
  { name: "success-light", cssVar: "--success-light", light: "#D1FAE5", dark: "#064E3B", tw: "bg-success-light" },
  { name: "warning", cssVar: "--warning", light: "#F59E0B", dark: "#F59E0B", tw: "text-warning" },
  { name: "warning-light", cssVar: "--warning-light", light: "#FEF3C7", dark: "#78350F", tw: "bg-warning-light" },
  { name: "seal (error)", cssVar: "--danger", light: "#E8432A", dark: "#E8432A", tw: "text-seal" },
  { name: "seal-tint", cssVar: "--accent-seal-tint", light: "#FEE2E2", dark: "#4A1A1A", tw: "bg-seal-tint" },
];

const highlightColors: ColorDef[] = [
  { name: "highlight", cssVar: "--highlight-yellow", light: "#FDE68A", dark: "#78350F", tw: "bg-highlight" },
  { name: "highlight-active", cssVar: "--highlight-yellow-active", light: "#FCD34D", dark: "#92400E", tw: "bg-highlight-active" },
  { name: "highlight-blue", cssVar: "--highlight-blue", light: "#BFDBFE", dark: "#1E3A5F", tw: "bg-highlight-blue" },
];

function ColorSwatch({ hex, name, cssVar, tw }: { hex: string; name: string; cssVar: string; tw: string }) {
  const copyToast = useCopyToast();
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-10 rounded-md border border-border/60 cursor-pointer hover:ring-2 hover:ring-carbon/30 transition-all"
        style={{ backgroundColor: hex }}
        onClick={() => copyToast(hex, name)}
        title={`Click to copy ${hex}`}
      />
      <CopyText text={tw}>
        <span className="text-[11px] font-medium text-ink hover:text-carbon transition-colors">{name}</span>
      </CopyText>
      <CopyText text={`var(${cssVar})`}>
        <span className="text-[10px] font-mono text-ink-muted hover:text-carbon transition-colors">{cssVar}</span>
      </CopyText>
      <CopyText text={hex}>
        <span className="text-[9px] font-mono text-ink-muted hover:text-carbon transition-colors">{hex}</span>
      </CopyText>
    </div>
  );
}

function ColorGroup({ title, colors }: { title: string; colors: ColorDef[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-3">{title}</h4>
      <div className="grid grid-cols-2 gap-4">
        {/* Light column */}
        <div className="rounded-lg border border-border/40 p-3" style={{ backgroundColor: "#F5F0E8" }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#6B6B6B" }}>
            Light
          </span>
          <div className="grid grid-cols-2 gap-2">
            {colors.map((c) => (
              <ColorSwatch key={`l-${c.name}`} hex={c.light} name={c.name} cssVar={c.cssVar} tw={c.tw} />
            ))}
          </div>
        </div>
        {/* Dark column */}
        <div className="rounded-lg border border-border/40 p-3" style={{ backgroundColor: "#1A1A1A" }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#9A9A9A" }}>
            Dark
          </span>
          <div className="grid grid-cols-2 gap-2">
            {colors.map((c) => (
              <DarkSwatch key={`d-${c.name}`} hex={c.dark} name={c.name} cssVar={c.cssVar} tw={c.tw} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DarkSwatch({ hex, name, cssVar, tw }: { hex: string; name: string; cssVar: string; tw: string }) {
  const copyToast = useCopyToast();
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-10 rounded-md cursor-pointer hover:ring-2 hover:ring-white/30 transition-all"
        style={{ backgroundColor: hex, border: "1px solid rgba(255,255,255,0.12)" }}
        onClick={() => copyToast(hex, `${name} dark`)}
        title={`Click to copy ${hex}`}
      />
      <CopyText text={tw}>
        <span className="text-[11px] font-medium hover:opacity-70 transition-colors" style={{ color: "#D4CDB8" }}>{name}</span>
      </CopyText>
      <CopyText text={`var(${cssVar})`}>
        <span className="text-[10px] font-mono transition-colors" style={{ color: "#6B6B6B" }}>{cssVar}</span>
      </CopyText>
      <CopyText text={hex}>
        <span className="text-[9px] font-mono transition-colors" style={{ color: "#6B6B6B" }}>{hex}</span>
      </CopyText>
    </div>
  );
}

const typeSamples = [
  { label: "text-2xl", className: "text-2xl font-sans", text: "The quick brown fox" },
  { label: "text-xl", className: "text-xl font-sans", text: "The quick brown fox" },
  { label: "text-lg", className: "text-lg font-sans", text: "The quick brown fox" },
  { label: "text-base", className: "text-base font-sans", text: "The quick brown fox" },
  { label: "text-sm", className: "text-sm font-sans", text: "The quick brown fox" },
  { label: "text-xs", className: "text-xs font-sans", text: "The quick brown fox" },
  { label: "mono text-sm", className: "text-sm font-mono", text: "const x = 42;" },
  { label: "mono text-xs", className: "text-xs font-mono", text: "const x = 42;" },
];

const shadows = [
  { name: "sm", tw: "shadow-sm", value: "var(--shadow-sm)" },
  { name: "md", tw: "shadow-md", value: "var(--shadow-md)" },
  { name: "lg", tw: "shadow-lg", value: "var(--shadow-lg)" },
  { name: "xl", tw: "shadow-xl", value: "var(--shadow-xl)" },
];

const radii = [
  { name: "sm (4px)", tw: "rounded-sm", value: "var(--radius-sm)" },
  { name: "md (8px)", tw: "rounded-md", value: "var(--radius-md)" },
  { name: "lg (12px)", tw: "rounded-lg", value: "var(--radius-lg)" },
  { name: "xl (16px)", tw: "rounded-xl", value: "var(--radius-xl)" },
];

const spacingValues = [
  { name: "0.5", px: 2, tw: "p-0.5" },
  { name: "1", px: 4, tw: "p-1" },
  { name: "1.5", px: 6, tw: "p-1.5" },
  { name: "2", px: 8, tw: "p-2" },
  { name: "3", px: 12, tw: "p-3" },
  { name: "4", px: 16, tw: "p-4" },
  { name: "5", px: 20, tw: "p-5" },
  { name: "6", px: 24, tw: "p-6" },
  { name: "8", px: 32, tw: "p-8" },
  { name: "10", px: 40, tw: "p-10" },
  { name: "12", px: 48, tw: "p-12" },
];

export function StyleGuide() {
  return (
    <div className="flex flex-col gap-8">
      {/* Colors */}
      <section id="sg-colors">
        <h3 className="text-base font-semibold text-ink mb-4">Colors</h3>
        <div className="flex flex-col gap-6">
          <ColorGroup title="Brand" colors={brandColors} />
          <ColorGroup title="Text" colors={textColors} />
          <ColorGroup title="Border" colors={borderColors} />
          <ColorGroup title="Accent" colors={accentColors} />
          <ColorGroup title="Semantic" colors={semanticColors} />
          <ColorGroup title="Highlight" colors={highlightColors} />
        </div>
      </section>

      {/* Typography */}
      <section id="sg-typography">
        <h3 className="text-base font-semibold text-ink mb-4">Typography</h3>
        <div className="flex flex-col gap-3 bg-paper border border-border/40 rounded-md p-4">
          {typeSamples.map((s) => (
            <div key={s.label} className="flex items-baseline gap-4">
              <CopyText text={s.label}>
                <code className="text-[10px] font-mono text-ink-muted w-28 shrink-0 hover:text-carbon transition-colors">{s.label}</code>
              </CopyText>
              <span className={`${s.className} text-ink`}>{s.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Shadows */}
      <section id="sg-shadows">
        <h3 className="text-base font-semibold text-ink mb-4">Shadows</h3>
        <div className="grid grid-cols-4 gap-4">
          {shadows.map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-2">
              <div
                className="w-full h-16 rounded-md bg-paper"
                style={{ boxShadow: s.value }}
              />
              <CopyText text={s.tw}>
                <code className="text-[10px] font-mono text-ink-muted hover:text-carbon transition-colors">shadow-{s.name}</code>
              </CopyText>
            </div>
          ))}
        </div>
      </section>

      {/* Radii */}
      <section id="sg-radii">
        <h3 className="text-base font-semibold text-ink mb-4">Border Radius</h3>
        <div className="grid grid-cols-4 gap-4">
          {radii.map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-2">
              <div
                className="w-16 h-16 bg-vellum border border-border"
                style={{ borderRadius: r.value }}
              />
              <CopyText text={r.tw}>
                <code className="text-[10px] font-mono text-ink-muted hover:text-carbon transition-colors">{r.name}</code>
              </CopyText>
            </div>
          ))}
        </div>
      </section>

      {/* Spacing */}
      <section id="sg-spacing">
        <h3 className="text-base font-semibold text-ink mb-4">Spacing</h3>
        <div className="flex flex-col gap-1.5">
          {spacingValues.map((s) => (
            <CopyText key={s.name} text={s.tw}>
              <div className="flex items-center gap-3 hover:bg-warm rounded px-1 -mx-1 transition-colors">
                <code className="text-[10px] font-mono text-ink-muted w-12 text-right shrink-0">{s.name}</code>
                <div
                  className="h-3 bg-carbon/70 rounded-sm"
                  style={{ width: s.px * 2.5 }}
                />
                <span className="text-[10px] text-ink-muted">{s.px}px</span>
              </div>
            </CopyText>
          ))}
        </div>
      </section>
    </div>
  );
}
