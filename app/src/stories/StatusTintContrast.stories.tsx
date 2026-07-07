import type { Meta, StoryObj } from "@storybook/react-vite";

/** PROPOSAL — not shipped. The one remaining axe flag anywhere is small
 *  semantic-status text on its own tint (amber `text-warning` on
 *  `bg-warning-light` ≈ 2.3:1, carbon on carbon-tint ≈ 2.1:1, seal on
 *  seal-tint ≈ 3.9:1 — AA needs 4.5:1). The semantic colours are design-locked,
 *  so this story only puts the options side by side: keep as-is, or deepen the
 *  TEXT toward ink with the same theme-aware color-mix the EntityPill labels
 *  use (hue kept, tints and icons untouched). Toggle dark mode to compare. */

const STATUSES: { label: string; varName: string; tintVar: string }[] = [
  { label: "Completed", varName: "--success", tintVar: "--success-light" },
  { label: "Warnings", varName: "--warning", tintVar: "--warning-light" },
  { label: "Processing", varName: "--accent-blue", tintVar: "--accent-blue-tint" },
  { label: "Failed", varName: "--accent-seal", tintVar: "--accent-seal-tint" },
];

function Badge({ label, varName, tintVar, mixed }: { label: string; varName: string; tintVar: string; mixed: boolean }) {
  return (
    <span
      className="inline-flex w-fit px-2 py-0.5 text-[11px] font-semibold rounded-md"
      style={{
        backgroundColor: `var(${tintVar})`,
        color: mixed
          ? `color-mix(in srgb, var(${varName}) 65%, var(--text-primary))`
          : `var(${varName})`,
      }}
    >
      {label}
    </span>
  );
}

function ComparisonSheet() {
  return (
    <div className="max-w-xl space-y-5 bg-paper border border-border rounded-lg p-5">
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-4">
          <span className="w-24 shrink-0" />
          <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary">
            Current (locked)
          </span>
          <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary">
            Proposed (65% + ink)
          </span>
        </div>
        {STATUSES.map((s) => (
          <div key={s.label} className="flex items-center gap-4">
            <span className="w-24 shrink-0 text-xs text-ink-tertiary">{s.label}</span>
            <span className="flex-1">
              <Badge {...s} mixed={false} />
            </span>
            <span className="flex-1">
              <Badge {...s} mixed={true} />
            </span>
          </div>
        ))}
      </div>
      <div className="space-y-1.5 border-t border-border/60 pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary block">
          Inline status text (e.g. "3 failed" in tables)
        </span>
        <p className="text-xs">
          <span style={{ color: "var(--accent-seal)" }} className="font-medium">12 failed</span>
          <span className="text-ink-tertiary"> — current · </span>
          <span
            style={{ color: "color-mix(in srgb, var(--accent-seal) 65%, var(--text-primary))" }}
            className="font-medium"
          >
            12 failed
          </span>
          <span className="text-ink-tertiary"> — proposed</span>
        </p>
      </div>
    </div>
  );
}

const meta = {
  title: "Design System/Proposals/Status tint contrast",
  component: ComparisonSheet,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ComparisonSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SideBySide: Story = {};
