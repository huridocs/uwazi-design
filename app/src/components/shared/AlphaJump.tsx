/** An A–Z index for a long list: one button per letter, the letters the
 *  list has none of disabled, and "#" for labels that start with anything
 *  else. Pressing a letter calls `onJump`; the list scrolls to its first
 *  row filed under it. A toolbar of buttons (`role="toolbar"`), wrapping on
 *  narrow panes. */
const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "#"];

export function AlphaJump({
  present,
  onJump,
  label = "Jump to letter",
}: {
  /** Letters with at least one row. */
  present: ReadonlySet<string>;
  onJump: (letter: string) => void;
  label?: string;
}) {
  return (
    <div data-component="AlphaJump" role="toolbar" aria-label={label} className="flex flex-wrap items-center gap-px">
      {LETTERS.map((l) => {
        const on = present.has(l);
        return (
          <button
            key={l}
            type="button"
            disabled={!on}
            onClick={() => onJump(l)}
            aria-label={l === "#" ? "Jump to other characters" : `Jump to ${l}`}
            className={`w-5 h-6 rounded-sm text-meta font-medium tabular-nums transition-colors ${
              on ? "text-ink-secondary hover:bg-warm hover:text-ink cursor-pointer" : "text-ink-muted/50 cursor-default"
            } focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/50`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
