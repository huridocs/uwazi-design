/* Where a site is kept: one JSON document in localStorage, with its draft, its
 * published copy, and every published version. A real deployment keeps the
 * same document on the server (sites/README.md). */
import type { SiteConfig } from "../model/config";

export interface Version {
  id: string;
  at: number;
  config: SiteConfig;
  /** What changed against the version before it, in words. */
  changes: string[];
}

export interface SiteDoc {
  draft: SiteConfig;
  published: SiteConfig | null;
  versions: Version[];
}

const KEY = "uwazi-sites:doc:v1";
const PUBLISHED = "uwazi-sites:published:v1";

export function loadDoc(): SiteDoc | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SiteDoc) : null;
  } catch {
    return null;
  }
}

export function saveDoc(doc: SiteDoc | null) {
  try {
    if (!doc) {
      localStorage.removeItem(KEY);
      localStorage.removeItem(PUBLISHED);
      return;
    }
    localStorage.setItem(KEY, JSON.stringify(doc));
    if (doc.published) localStorage.setItem(PUBLISHED, JSON.stringify(doc.published));
  } catch {
    /* storage full or blocked: the builder keeps working in memory */
  }
}

/** What the public site (site.html) reads. */
export function loadPublished(): SiteConfig | null {
  try {
    const raw = localStorage.getItem(PUBLISHED);
    return raw ? (JSON.parse(raw) as SiteConfig) : null;
  } catch {
    return null;
  }
}
