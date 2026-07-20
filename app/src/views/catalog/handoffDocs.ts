/** The `handoff/` style-migration docs, surfaced in the catalog for the
 *  frontend team. They live at the REPO ROOT (outside `app/`) so they stay
 *  next to `uwazi-semantic-tokens.css` — the thing they document.
 *
 *  Adding a doc is just dropping a `.md` file in `handoff/`: the glob picks
 *  it up and it renders after the manifest entries below. Give it a manifest
 *  entry only to control its position or its sidebar label. */

const files = import.meta.glob("../../../../handoff/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Known docs, in reading order. Unlisted files append after these. */
const MANIFEST: { file: string; label: string }[] = [
  { file: "TOKENS-MAPPING.md", label: "Tokens mapping" },
  { file: "DATA-SEAMS.md", label: "Data seams" },
  { file: "PATTERNS.md", label: "Patterns" },
  { file: "COMPONENT-INVENTORY.md", label: "Component inventory" },
  { file: "PILOT-COMPONENTS.md", label: "Pilot components" },
  { file: "PR-BODY.md", label: "PR body" },
];

export interface HandoffDoc {
  /** Anchor id — `ho-tokens-mapping` etc. */
  id: string;
  /** Sidebar label. */
  label: string;
  /** Source filename, shown as the section's provenance line. */
  file: string;
  source: string;
}

const basename = (path: string) => path.slice(path.lastIndexOf("/") + 1);

const toId = (file: string) =>
  `ho-${file.replace(/\.md$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

/** COMPONENT-INVENTORY.md → "Component inventory" */
const toLabel = (file: string) => {
  const words = file.replace(/\.md$/, "").toLowerCase().split(/[^a-z0-9]+/);
  return words
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
};

const byFile = new Map(
  Object.entries(files).map(([path, source]) => [basename(path), source])
);

const known = MANIFEST.filter((entry) => byFile.has(entry.file));
const unknown = [...byFile.keys()]
  .filter((file) => !MANIFEST.some((entry) => entry.file === file))
  .sort()
  .map((file) => ({ file, label: toLabel(file) }));

export const handoffDocs: HandoffDoc[] = [...known, ...unknown].map(
  ({ file, label }) => ({
    id: toId(file),
    label,
    file: `handoff/${file}`,
    source: byFile.get(file)!,
  })
);
