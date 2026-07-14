/** A document preview that doesn't pretend to be the document.
 *
 *  A sheet of paper pinned to the top of the frame and running off the bottom
 *  edge — partially hidden, the way a page sits in a stack. It reads as "a
 *  document" without claiming to show its contents, which the old centred,
 *  fully-visible rectangle did: a page you couldn't quite read, identical on every
 *  card.
 *
 *  The extension chip carries the only fact a preview can honestly offer when
 *  nothing is rendered — what kind of file this is.
 *
 *  Rule sizes are in px per `size`, not percentages: a 2px hairline is a 2px
 *  hairline, and percentage heights inside a percentage gap collapse into mush at
 *  thumbnail scale. */
const SCALE = {
  sm: { pad: 4, gap: 2, heading: 0, rule: 0, lines: 0 },
  md: { pad: 8, gap: 4, heading: 3, rule: 2, lines: 4 },
  lg: { pad: 11, gap: 5, heading: 4, rule: 2, lines: 6 },
} as const;

export function DocPlaceholder({
  ext,
  size = "md",
}: {
  /** e.g. "pdf". Hidden at `sm` — there's no room, and a 5px word is noise. */
  ext?: string;
  size?: "sm" | "md" | "lg";
}) {
  const s = SCALE[size];

  return (
    <div className="relative w-full h-full overflow-hidden bg-vellum">
      {/* Inset at the sides, pinned near the top, and running PAST the bottom so
          the frame crops it. Rounded on the top corners only — the bottom is
          off-frame, and rounding it would put the sheet back inside the box. */}
      <div
        className="absolute inset-x-[16%] top-[10%] -bottom-[15%] bg-paper rounded-t-[3px] shadow-sm flex flex-col"
        style={{
          border: "1px solid var(--border-soft)",
          padding: s.pad,
          gap: s.gap,
        }}
      >
        {s.lines > 0 && (
          <>
            <div
              className="w-3/5 rounded-full bg-border"
              style={{ height: s.heading }}
            />
            {Array.from({ length: s.lines }).map((_, i) => (
              <div
                key={i}
                className="rounded-full bg-border-soft"
                style={{ height: s.rule, width: i % 3 === 2 ? "70%" : "100%" }}
              />
            ))}
          </>
        )}
      </div>

      {ext && size !== "sm" && (
        <span className="absolute bottom-1 end-1 px-1 py-px rounded-[2px] bg-ink/70 text-paper text-[8px] font-semibold uppercase tracking-wider leading-none">
          {ext}
        </span>
      )}
    </div>
  );
}
