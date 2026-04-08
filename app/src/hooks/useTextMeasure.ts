import { useRef, useState, useEffect, useMemo } from "react";
import { prepare, layout } from "@chenglou/pretext";

interface UseTextMeasureOptions {
  text: string;
  font?: string;
  lineHeight?: number;
  maxLines?: number;
}

export function useTextMeasure({
  text,
  font = "12px Inter",
  lineHeight = 19.5,
  maxLines = 2,
}: UseTextMeasureOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const result = useMemo(() => {
    if (width === 0 || !text) {
      return { isTruncated: false, lineCount: 0, visibleHeight: maxLines * lineHeight };
    }
    const prepared = prepare(text, font);
    const { lineCount, height } = layout(prepared, width, lineHeight);
    const visibleHeight = maxLines * lineHeight;
    return {
      isTruncated: lineCount > maxLines,
      lineCount,
      visibleHeight,
    };
  }, [text, font, width, lineHeight, maxLines]);

  return { containerRef, ...result };
}
