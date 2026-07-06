import type { Meta, StoryObj } from "@storybook/react-vite";

/** The semantic token sheet — the migration contract for huridocs/uwazi.
 *  Every swatch reads the REAL var (never a bridge alias, never a hex), so
 *  toggling the toolbar theme shows exactly what dark mode does to each role.
 *  Mapping table: handoff/TOKENS-MAPPING.md. */

function Swatch({ label, varName, utility, border }: { label: string; varName: string; utility: string; border?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-10 h-10 rounded-md shrink-0 ${border ? "border border-border" : ""}`}
        style={{ backgroundColor: `var(${varName})` }}
      />
      <div className="min-w-0 leading-tight">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <code className="block text-[11px] text-ink-tertiary">{varName}</code>
        <code className="block text-[11px] text-carbon">{utility}</code>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">{children}</div>
    </section>
  );
}

function TokenSheet() {
  return (
    <div className="max-w-3xl space-y-8 bg-paper border border-border rounded-lg p-6">
      <Section title="Backgrounds">
        <Swatch label="Parchment (canvas · selected)" varName="--bg-primary" utility="bg-parchment" border />
        <Swatch label="Paper (surfaces)" varName="--bg-surface" utility="bg-paper" border />
        <Swatch label="Warm (actions · hover)" varName="--bg-warm" utility="bg-warm" border />
        <Swatch label="Vellum (muted fill)" varName="--bg-muted" utility="bg-vellum" border />
        <Swatch label="Selected (non-card)" varName="--bg-selected" utility="bg-selected" border />
      </Section>
      <Section title="Ink ladder">
        <Swatch label="Ink" varName="--text-primary" utility="text-ink" />
        <Swatch label="Ink secondary" varName="--text-secondary" utility="text-ink-secondary" />
        <Swatch label="Ink tertiary" varName="--text-tertiary" utility="text-ink-tertiary" />
        <Swatch label="Ink muted" varName="--text-muted" utility="text-ink-muted" />
      </Section>
      <Section title="Borders">
        <Swatch label="Border" varName="--border-primary" utility="border-border" />
        <Swatch label="Border soft" varName="--border-soft" utility="border-border-soft" />
      </Section>
      <Section title="Accents — carbon is data, seal is danger ONLY">
        <Swatch label="Carbon" varName="--accent-blue" utility="text-carbon / bg-carbon" />
        <Swatch label="Carbon tint" varName="--accent-blue-tint" utility="bg-carbon-tint" />
        <Swatch label="Seal" varName="--accent-seal" utility="text-seal / bg-seal" />
        <Swatch label="Seal tint" varName="--accent-seal-tint" utility="bg-seal-tint" />
      </Section>
      <Section title="Status">
        <Swatch label="Success" varName="--success" utility="text-success" />
        <Swatch label="Success light" varName="--success-light" utility="bg-success-light" />
        <Swatch label="Warning" varName="--warning" utility="text-warning" />
        <Swatch label="Warning light" varName="--warning-light" utility="bg-warning-light" />
        <Swatch label="Highlight" varName="--highlight-yellow" utility="bg-highlight" />
        <Swatch label="Highlight active" varName="--highlight-yellow-active" utility="bg-highlight-active" />
      </Section>
    </div>
  );
}

const meta = {
  title: "Design System/Tokens",
  component: TokenSheet,
  parameters: { layout: "padded" },
} satisfies Meta<typeof TokenSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Semantic: Story = {};
