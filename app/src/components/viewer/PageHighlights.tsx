import { useAtom, useSetAtom } from "jotai";
import { referencesAtom, scrollToRefAtom, scrollToHighlightAtom } from "../../atoms/references";
import { useEffect, useState } from "react";

interface PageHighlightsProps {
  page: number;
}

export function PageHighlights({ page }: PageHighlightsProps) {
  const [references] = useAtom(referencesAtom);
  const setScrollToRef = useSetAtom(scrollToRefAtom);
  const [scrollToHighlight, setScrollToHighlight] = useAtom(scrollToHighlightAtom);
  const [flashId, setFlashId] = useState<string | null>(null);

  const pageRefs = references.filter((r) => r.sourceSelection.page === page);

  useEffect(() => {
    if (scrollToHighlight && pageRefs.some((r) => r.id === scrollToHighlight)) {
      setFlashId(scrollToHighlight);
      setScrollToHighlight(null);
      const timer = setTimeout(() => setFlashId(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [scrollToHighlight, pageRefs, setScrollToHighlight]);

  if (pageRefs.length === 0) return null;

  return (
    <>
      {pageRefs.map((ref) => {
        const sel = ref.sourceSelection;
        const isFlashing = flashId === ref.id;
        return (
          <div
            key={ref.id}
            className={`absolute cursor-pointer rounded-[2px] transition-shadow
              hover:ring-2 hover:ring-orange-400/50
              ${isFlashing ? "flash-highlight" : ""}`}
            style={{
              top: `${sel.top * 100}%`,
              left: `${sel.left * 100}%`,
              width: `${sel.width * 100}%`,
              height: `${sel.height * 100}%`,
              backgroundColor: isFlashing
                ? "rgba(252, 211, 77, 0.45)"
                : "rgba(253, 230, 138, 0.4)",
              zIndex: 5,
              isolation: "isolate",
              mixBlendMode: "darken",
            }}
            onClick={() => setScrollToRef(ref.id)}
            title={ref.sourceSelection.text.slice(0, 80) + "..."}
          />
        );
      })}
    </>
  );
}
