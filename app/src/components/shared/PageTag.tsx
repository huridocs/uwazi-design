interface PageTagProps {
  page: number;
  onClick?: () => void;
}

export function PageTag({ page, onClick }: PageTagProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center px-1.5 py-0.5 text-xs font-mono rounded
        bg-vellum text-ink-secondary hover:bg-border hover:text-ink
        transition-colors cursor-pointer"
    >
      p.{page}
    </button>
  );
}
