/* Thesaurus CSV, in Uwazi's format (API/csv/importThesauri.ts):
 *
 *   English,Spanish
 *   Fruit,Fruta
 *   - Apple,Manzana
 *   - Banana,Banano
 *   Dog,Perro
 *
 * - The header row names installed languages by their English name. The
 *   label column is the default language's, else the first column.
 * - A row whose label cell starts with "-" is a value of the nearest row
 *   above that is not nested; that row becomes a group.
 * - Cells are whitespace-collapsed; null / undefined / N/A count as empty, and
 *   a row with an empty label is skipped.
 * - Import only adds: values already at the same level (case and accents
 *   ignored) are skipped, groups merge by label.
 *
 * Unlike Uwazi, nothing is written until the preview is applied, and the
 * thesaurus is not saved first. */

import { fold, isGroup, type TreeItem } from "./thesaurusTree";

/** RFC 4180-ish: quoted cells, doubled quotes, CRLF; `,` or `;` (whichever
 *  the header uses more). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const NULLS = new Set(["null", "NULL", "Null", "undefined", "UNDEFINED", "Undefined", "N/A", "n/a", "N/a"]);
const sanitize = (s: string) => {
  const v = s.replace(/\s+/g, " ").trim();
  return NULLS.has(v) ? "" : v;
};

export interface ParsedValue {
  label: string;
  /** Present when the row has nested rows under it. */
  children?: ParsedValue[];
  /** Label in another column's language, by language label ("Spanish"). */
  translations: Record<string, string>;
}

export type ParseResult =
  | { ok: true; values: ParsedValue[]; labelColumn: string; translationColumns: string[]; ignoredColumns: string[]; rows: number }
  | { ok: false; error: string };

export function parseThesaurusCsv(
  text: string,
  languages: { label: string; default: boolean }[],
): ParseResult {
  const rows = parseCsv(text);
  if (rows.length === 0) return { ok: false, error: "The file is empty." };
  const header = rows[0].map((h) => h.trim());
  const known = new Map(languages.map((l) => [l.label.toLowerCase(), l]));
  const langCols = header.map((h, i) => ({ i, lang: known.get(h.toLowerCase()) })).filter((c) => c.lang);
  if (langCols.length === 0)
    return {
      ok: false,
      error: `The first row must name a language, for example “${languages.find((l) => l.default)?.label ?? "English"}”. It reads “${header.join(", ")}”.`,
    };
  const labelCol = langCols.find((c) => c.lang!.default) ?? langCols[0];
  const others = langCols.filter((c) => c !== labelCol);
  const ignored = header.filter((h, i) => h && !langCols.some((c) => c.i === i));

  const values: ParsedValue[] = [];
  let parent: ParsedValue | null = null;
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    // The label column decides nesting (Uwazi's own sample nests only it);
    // a translation cell may carry the dash too, and loses it.
    const isChild = (cells[labelCol.i] ?? "").trimStart().startsWith("-");
    const cell = (i: number) => sanitize((cells[i] ?? "").replace(isChild ? /^\s*-/ : /^$/, ""));
    const label = cell(labelCol.i);
    if (!label) continue;
    const translations: Record<string, string> = {};
    for (const c of others) {
      const t = cell(c.i);
      if (t) translations[c.lang!.label] = t;
    }
    const v: ParsedValue = { label, translations };
    if (isChild) {
      if (!parent)
        return { ok: false, error: `Row ${r + 1} starts with “-”, but there is no value above it to hold it.` };
      (parent.children ??= []).push(v);
    } else {
      values.push(v);
      parent = v;
    }
  }
  return {
    ok: true,
    values,
    labelColumn: labelCol.lang!.label,
    translationColumns: others.map((c) => c.lang!.label),
    ignoredColumns: ignored,
    rows: rows.length - 1,
  };
}

export interface ImportPlanRow {
  label: string;
  /** The group it goes into (null: top level). */
  group: string | null;
  kind: "value" | "group";
  status: "new" | "duplicate" | "merge";
}

export interface ImportPlan {
  items: TreeItem[];
  rows: ImportPlanRow[];
  added: number;
  groupsAdded: number;
  skipped: number;
}

/** Fold the parsed file into the tree: append new values and groups, skip
 *  duplicates at the same level, merge groups by label. `newId` mints ids. */
export function planImport(items: TreeItem[], parsed: ParsedValue[], newId: () => string): ImportPlan {
  let next = [...items];
  const rows: ImportPlanRow[] = [];
  let added = 0;
  let groupsAdded = 0;
  let skipped = 0;
  const atRoot = (label: string) => next.find((x) => fold(x.label.trim()) === fold(label));
  for (const v of parsed) {
    const existing = atRoot(v.label);
    if (!v.children) {
      if (existing) {
        rows.push({ label: v.label, group: null, kind: "value", status: "duplicate" });
        skipped++;
      } else {
        next.push({ id: newId(), label: v.label });
        rows.push({ label: v.label, group: null, kind: "value", status: "new" });
        added++;
      }
      continue;
    }
    // A group: merge into the group with this label, or a value with this
    // label becomes that group (Uwazi: a parent with children is a group).
    let group: TreeItem;
    if (existing) {
      group = isGroup(existing) ? { ...existing, children: [...existing.children!] } : { ...existing, children: [] };
      next = next.map((x) => (x.id === existing.id ? group : x));
      rows.push({ label: v.label, group: null, kind: "group", status: "merge" });
    } else {
      group = { id: newId(), label: v.label, children: [] };
      next.push(group);
      rows.push({ label: v.label, group: null, kind: "group", status: "new" });
      groupsAdded++;
    }
    const seen = new Set(group.children!.map((c) => fold(c.label.trim())));
    for (const c of v.children) {
      if (seen.has(fold(c.label))) {
        rows.push({ label: c.label, group: v.label, kind: "value", status: "duplicate" });
        skipped++;
        continue;
      }
      seen.add(fold(c.label));
      group.children!.push({ id: newId(), label: c.label });
      rows.push({ label: c.label, group: v.label, kind: "value", status: "new" });
      added++;
    }
  }
  return { items: next, rows, added, groupsAdded, skipped };
}

const quote = (s: string) => (/[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** The tree as Uwazi's CSV: one column, the default language's. A value
 *  inside a group is written "- Value". */
export function toThesaurusCsv(items: TreeItem[], languageLabel: string): string {
  const lines = [quote(languageLabel)];
  for (const it of items) {
    if (!it.label.trim()) continue;
    lines.push(quote(it.label.trim()));
    for (const c of it.children ?? []) if (c.label.trim()) lines.push(quote(`- ${c.label.trim()}`));
  }
  return lines.join("\r\n") + "\r\n";
}
