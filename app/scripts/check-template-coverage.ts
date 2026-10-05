// node scripts/check-template-coverage.ts
//
// Template-schema migration, step M1: how well each imported corpus's
// templates describe its records. Per template it lists
//   - record keys no template property declares (values the projection will
//     not show),
//   - declared properties no record uses,
//   - relationship properties with `inherit`, and whether the inherited
//     property resolves (CEJIL's dump has no property `_id`, so the seed
//     resolves by the target's only property of the inherited type).
// Reads the dumps directly (public/*-data, the bundled templates), so it runs
// on plain Node. The Sample and Artworks seeds are built from the same tables
// their records are, so they are not checked here.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

type Prop = { _id?: string; name: string; type: string; content?: string; inherit?: { property: string; type: string } };
type Tpl = { _id: string; name: string; properties: Prop[]; commonProperties?: Prop[] };
type Rec = { template: string; metadata: Record<string, unknown[]> };

const cejilSrc = read("src/data/cejil/templates.ts");
const cejilTemplates: Tpl[] = JSON.parse(cejilSrc.slice(cejilSrc.indexOf("= [") + 2, cejilSrc.lastIndexOf("];") + 1));
const travesiaTemplates: Tpl[] = JSON.parse(read("src/data/travesia/templates.json"));
const cejilRecords: Rec[] = JSON.parse(read("public/cejil-data/entities.json"));
const travesiaRecords: Rec[] = JSON.parse(read("public/travesia-data/entities.json"));

function report(corpus: string, templates: Tpl[], records: Rec[], byId: boolean) {
  console.log(`\n# ${corpus}: ${templates.length} templates, ${records.length} records`);
  const tplById = new Map(templates.map((t) => [t._id, t]));
  let undeclaredTotal = 0;
  for (const t of templates) {
    const declared = new Set([...(t.commonProperties ?? []), ...t.properties].map((p) => p.name));
    const recs = records.filter((r) => r.template === t._id);
    const used = new Map<string, number>();
    const undeclared = new Map<string, number>();
    for (const r of recs)
      for (const [k, v] of Object.entries(r.metadata ?? {})) {
        if (!Array.isArray(v) || !v.length) continue;
        (declared.has(k) ? used : undeclared).set(k, ((declared.has(k) ? used : undeclared).get(k) ?? 0) + 1);
      }
    const unused = t.properties.filter((p) => !used.has(p.name) && p.type !== "preview").map((p) => p.name);
    const inherits = t.properties
      .filter((p) => p.inherit)
      .map((p) => {
        const target = p.content ? tplById.get(p.content) : undefined;
        const viaId = byId && target?.properties.some((x) => x._id === p.inherit!.property);
        const sameType = (target?.properties ?? []).filter((x) => x.type === p.inherit!.type);
        const how = viaId ? "by id" : sameType.length === 1 ? `by type (${sameType[0].name})` : "UNRESOLVED";
        return `${p.name} → ${target?.name ?? "?"}: ${how}`;
      });
    undeclaredTotal += undeclared.size;
    if (!undeclared.size && !unused.length && !inherits.length) continue;
    console.log(`\n## ${t.name} (${recs.length} records)`);
    if (undeclared.size)
      console.log(`  undeclared keys: ${[...undeclared].map(([k, n]) => `${k} (${n})`).join(", ")}`);
    if (unused.length) console.log(`  declared, no record uses: ${unused.join(", ")}`);
    for (const i of inherits) console.log(`  inherit: ${i}`);
  }
  console.log(`\n${corpus}: ${undeclaredTotal} undeclared key(s) across templates`);
}

report("CEJIL", cejilTemplates, cejilRecords, false);
report("Travesía", travesiaTemplates, travesiaRecords, true);
