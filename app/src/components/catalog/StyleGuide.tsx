const brandColors = [
  { name: "parchment", value: "#F5F0E8", tw: "bg-parchment" },
  { name: "paper", value: "#FFFFFF", tw: "bg-paper" },
  { name: "warm", value: "#FCFAF8", tw: "bg-warm" },
  { name: "vellum", value: "#F5EED7", tw: "bg-vellum" },
];

const textColors = [
  { name: "ink", value: "#1A1A1A", tw: "text-ink" },
  { name: "ink-secondary", value: "#333333", tw: "text-ink-secondary" },
  { name: "ink-tertiary", value: "#6B6B6B", tw: "text-ink-tertiary" },
  { name: "ink-muted", value: "#9A9A9A", tw: "text-ink-muted" },
];

const borderColors = [
  { name: "border", value: "#E0D9C8", tw: "border-border" },
  { name: "border-soft", value: "#D4CDB8", tw: "border-border-soft" },
];

const accentColors = [
  { name: "carbon", value: "#00B4F0", tw: "text-carbon" },
  { name: "carbon-tint", value: "#DDF3FD", tw: "bg-carbon-tint" },
  { name: "seal", value: "#E8432A", tw: "text-seal" },
  { name: "seal-tint", value: "#FEE2E2", tw: "bg-seal-tint" },
];

const semanticColors = [
  { name: "success", value: "#059669", tw: "text-success" },
  { name: "success-light", value: "#D1FAE5", tw: "bg-success-light" },
  { name: "warning", value: "#F59E0B", tw: "text-warning" },
  { name: "warning-light", value: "#FEF3C7", tw: "bg-warning-light" },
];

const highlightColors = [
  { name: "highlight", value: "#FDE68A", tw: "bg-highlight" },
  { name: "highlight-active", value: "#FCD34D", tw: "bg-highlight-active" },
  { name: "highlight-blue", value: "#BFDBFE", tw: "bg-highlight-blue" },
];

function ColorGroup({ title, colors }: { title: string; colors: { name: string; value: string; tw: string }[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2">{title}</h4>
      <div className="grid grid-cols-4 gap-2">
        {colors.map((c) => (
          <div key={c.name} className="flex flex-col gap-1">
            <div
              className="h-12 rounded-md border border-border/60"
              style={{ backgroundColor: c.value }}
            />
            <span className="text-[11px] font-medium text-ink">{c.name}</span>
            <span className="text-[10px] font-mono text-ink-muted">{c.value}</span>
          </div>
        ))}
      </div>
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
  { name: "sm", value: "var(--shadow-sm)" },
  { name: "md", value: "var(--shadow-md)" },
  { name: "lg", value: "var(--shadow-lg)" },
  { name: "xl", value: "var(--shadow-xl)" },
];

const radii = [
  { name: "sm (4px)", value: "var(--radius-sm)" },
  { name: "md (8px)", value: "var(--radius-md)" },
  { name: "lg (12px)", value: "var(--radius-lg)" },
  { name: "xl (16px)", value: "var(--radius-xl)" },
];

const spacingValues = [
  { name: "0.5", px: 2 },
  { name: "1", px: 4 },
  { name: "1.5", px: 6 },
  { name: "2", px: 8 },
  { name: "3", px: 12 },
  { name: "4", px: 16 },
  { name: "5", px: 20 },
  { name: "6", px: 24 },
  { name: "8", px: 32 },
  { name: "10", px: 40 },
  { name: "12", px: 48 },
];

export function StyleGuide() {
  return (
    <div className="flex flex-col gap-8">
      {/* Colors */}
      <section>
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
      <section>
        <h3 className="text-base font-semibold text-ink mb-4">Typography</h3>
        <div className="flex flex-col gap-3 bg-paper border border-border/40 rounded-md p-4">
          {typeSamples.map((s) => (
            <div key={s.label} className="flex items-baseline gap-4">
              <code className="text-[10px] font-mono text-ink-muted w-28 shrink-0">{s.label}</code>
              <span className={`${s.className} text-ink`}>{s.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Shadows */}
      <section>
        <h3 className="text-base font-semibold text-ink mb-4">Shadows</h3>
        <div className="grid grid-cols-4 gap-4">
          {shadows.map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-2">
              <div
                className="w-full h-16 rounded-md bg-paper"
                style={{ boxShadow: s.value }}
              />
              <code className="text-[10px] font-mono text-ink-muted">shadow-{s.name}</code>
            </div>
          ))}
        </div>
      </section>

      {/* Radii */}
      <section>
        <h3 className="text-base font-semibold text-ink mb-4">Border Radius</h3>
        <div className="grid grid-cols-4 gap-4">
          {radii.map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-2">
              <div
                className="w-16 h-16 bg-vellum border border-border"
                style={{ borderRadius: r.value }}
              />
              <code className="text-[10px] font-mono text-ink-muted">{r.name}</code>
            </div>
          ))}
        </div>
      </section>

      {/* Spacing */}
      <section>
        <h3 className="text-base font-semibold text-ink mb-4">Spacing</h3>
        <div className="flex flex-col gap-1.5">
          {spacingValues.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <code className="text-[10px] font-mono text-ink-muted w-12 text-right shrink-0">{s.name}</code>
              <div
                className="h-3 bg-carbon/70 rounded-sm"
                style={{ width: s.px * 2.5 }}
              />
              <span className="text-[10px] text-ink-muted">{s.px}px</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
