/** Binds a text's last two words with a no-break space, so a wrap never
 *  leaves one word ("8.”") alone on the last line. Text of one word is
 *  returned as it is. */
export function noWidow(text: string): string {
  return text.replace(/\s+(\S+)\s*$/, " $1");
}
