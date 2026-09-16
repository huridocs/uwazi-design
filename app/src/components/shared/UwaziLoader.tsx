interface UwaziLoaderProps {
  size?: "xs" | "sm" | "md" | "lg";
  color?: "default" | "white" | "muted" | "carbon" | "seal" | "warning";
  /** When false, renders the static brand mark (no sweep). Default true. */
  animate?: boolean;
}

const sizes = {
  xs: { cell: 4, gap: 1 },
  sm: { cell: 6, gap: 2 },
  md: { cell: 10, gap: 3 },
  lg: { cell: 16, gap: 4 },
};

const colors: Record<NonNullable<UwaziLoaderProps["color"]>, string> = {
  default: "var(--text-primary)",
  white: "#FFFFFF",
  muted: "var(--text-muted)",
  carbon: "var(--accent-blue)",
  seal: "var(--accent-seal)",
  warning: "var(--warning)",
};

export function UwaziLoader({ size = "md", color = "default", animate = true }: UwaziLoaderProps) {
  const { cell, gap } = sizes[size];
  const bg = colors[color];

  return (
    // Spans, not divs: the mark rides inside buttons (the Beacon, Bert's send
    // button), where only phrasing content is valid. Grid items blockify, so
    // the cells lay out exactly as they did.
    <span
      data-component="UwaziLoader"
      className="inline-grid align-middle"
      style={{
        gridTemplateColumns: `repeat(3, ${cell}px)`,
        gridTemplateRows: `repeat(2, ${cell}px)`,
        gap,
      }}
      role={animate ? "status" : undefined}
      aria-label={animate ? "Loading" : undefined}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          data-part="cell"
          // The sweep lives on `uwazi-loader-cell`; without it the cells rest
          // at full opacity — the static brand mark.
          className={animate ? "uwazi-loader-cell rounded-[1px]" : "rounded-[1px]"}
          style={{
            width: cell,
            height: cell,
            backgroundColor: bg,
          }}
        />
      ))}
    </span>
  );
}
