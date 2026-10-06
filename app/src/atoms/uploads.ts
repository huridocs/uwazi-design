import { atom } from "jotai";
import { seedUploads, type SettingsUpload } from "../data/settings";
import { createSettingsCollection, hasId } from "./settingsCollection";

/** Settings › Uploads: the collection's custom files, one store per corpus.
 *  The Uploads page adds, renames and deletes here; the Collection favicon
 *  picker, the Dashboard's Files card and the Pages preview read it. */
const KINDS: SettingsUpload["kind"][] = ["image", "pdf", "font", "other"];
const isUpload = (r: unknown): boolean => {
  if (!hasId(r)) return false;
  const u = r as Partial<SettingsUpload>;
  return (
    typeof u.name === "string" &&
    typeof u.filename === "string" &&
    typeof u.mimetype === "string" &&
    KINDS.includes(u.kind as SettingsUpload["kind"]) &&
    typeof u.size === "number"
  );
};

export const uploads = createSettingsCollection<SettingsUpload>({
  name: "uploads",
  idPrefix: "up",
  seedOf: () => seedUploads,
  corpusScoped: true,
  isRecord: isUpload,
});

export const uploadsAtom = uploads.listAtom;

/** The URL a page or stylesheet uses for an upload. Fixed by the stored file
 *  name, so a rename keeps it. */
export const uploadUrl = (u: Pick<SettingsUpload, "filename">) => `/assets/${u.filename}`;

/** `/assets/<filename>` → the file's content, for the Pages preview and the
 *  favicon. Files without content (a PDF, a font) are absent. */
export const assetSourcesAtom = atom((get) => {
  const map = new Map<string, string>();
  for (const u of get(uploadsAtom)) if (u.src) map.set(uploadUrl(u), u.src);
  return map;
});

/** "1.50 MB": Uwazi's unit ladder, two decimals. */
export function formatBytes(bytes: number): string {
  if (!bytes) return "0 Bytes";
  const units = ["Bytes", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}
