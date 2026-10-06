import { Play } from "lucide-react";

/** The play mark drawn over a video's still or its plain tile: one mark for the
 *  Library thumbnails and the record's player stage.
 *
 *  A paper disc at 80% with a light backdrop blur and a hairline edge, no
 *  shadow, carrying an ink triangle at 80%. Paper and ink swap in dark mode, so
 *  the disc stays the opposite of the triangle in both themes. The blur keeps it
 *  readable over a busy still; the hairline keeps it visible on the warm tile.
 *
 *  The caller sizes it (`className`): a thumbnail sizes it off the box height,
 *  the player stage gives it a fixed size. The triangle is 40% of the disc,
 *  nudged forward 6% so it looks centred. Hover and focus belong to the caller,
 *  through `group-*` utilities on the mark's parent. */
export function PlayMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      data-component="PlayMark"
      className={`relative flex items-center justify-center aspect-square rounded-full
        bg-paper/80 backdrop-blur-sm ring-1 ring-inset ring-ink/10 text-ink/80 ${className}`}
    >
      <Play className="w-[40%] h-[40%] ms-[6%]" fill="currentColor" strokeWidth={1.5} />
    </span>
  );
}
