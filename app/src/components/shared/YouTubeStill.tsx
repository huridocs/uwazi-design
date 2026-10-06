import { useState } from "react";

/** YouTube's still for a video id: `hqdefault` (480×360), on `i.ytimg.com`, no
 *  API key. A 16:9 video sits in it between black bars, which `cover` in a
 *  16:9 box crops away exactly. */
export const youtubeStillUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** A video's still, filling its box (the caller sizes it before load).
 *
 *  YouTube answers a deleted or private video with a 120×90 grey placeholder,
 *  not an error, so a still that loads at 120px wide counts as missing, as does
 *  one that fails. `onMissing` lets the caller draw its plain tile instead.
 *  Hidden until it has loaded, so the ground under it shows, never a half
 *  image or the placeholder. Lazy, like the PDF thumbnails beside it. */
export function YouTubeStill({
  id,
  onMissing,
  className = "",
}: {
  id: string;
  onMissing: () => void;
  className?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <img
      data-component="YouTubeStill"
      data-state={shown ? "loaded" : "loading"}
      src={youtubeStillUrl(id)}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={(e) => (e.currentTarget.naturalWidth <= 120 ? onMissing() : setShown(true))}
      onError={onMissing}
      className={`object-cover transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"} ${className}`}
    />
  );
}
