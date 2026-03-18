interface UwaziLoaderProps {
  size?: "xs" | "sm" | "md" | "lg";
  color?: "default" | "white";
}

const sizes = {
  xs: { cell: 4, gap: 1 },
  sm: { cell: 6, gap: 2 },
  md: { cell: 10, gap: 3 },
  lg: { cell: 16, gap: 4 },
};

export function UwaziLoader({ size = "md", color = "default" }: UwaziLoaderProps) {
  const { cell, gap } = sizes[size];
  const bg = color === "white" ? "#FFFFFF" : "var(--text-primary)";

  return (
    <div
      className="inline-grid align-middle"
      style={{
        gridTemplateColumns: `repeat(3, ${cell}px)`,
        gridTemplateRows: `repeat(2, ${cell}px)`,
        gap,
      }}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="uwazi-loader-cell rounded-[1px]"
          style={{
            width: cell,
            height: cell,
            backgroundColor: bg,
          }}
        />
      ))}
    </div>
  );
}
