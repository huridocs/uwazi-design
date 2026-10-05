// The Nepal templates as template definitions. The build script writes them
// in this shape already (data/templates/types.ts), so the seed is a copy.
import type { TemplateDef } from "../templates/types";
import { nepalTemplates } from "./schema";

let built: TemplateDef[] | null = null;
/** Built on first read (see data/sample/templates.ts). */
export const nepalTemplateDefs = (): TemplateDef[] =>
  (built ??= nepalTemplates.map((t) => ({ ...t, properties: t.properties.map((p) => ({ ...p })) })));
