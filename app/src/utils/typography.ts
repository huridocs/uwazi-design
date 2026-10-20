/** Binds a text's last two words with a no-break space, so a wrap never
 *  leaves one word ("8.”") alone on the last line. Text of one word is
 *  returned as it is. */
export function noWidow(text: string): string {
  return text.replace(/\s+(\S+)\s*$/, " $1");
}

/** `noWidow`, and after a full stop or a dash the next clause's first word is
 *  bound to the one after it, so a wrap never leaves that word alone at a
 *  line's end ("… HONDURAS — JUDGMENT" over "(1988)"). */
export function noStrayWords(text: string): string {
  return noWidow(text.replace(/([.!?:\u2014\u2013])\s+(\S+)\s+/g, "$1 $2\u00a0"));
}
