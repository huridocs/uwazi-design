/* A block's form, generated from its registry entry. */
import type { Block, ImageRef, L10n, StatItem } from "../model/config";
import { BLOCKS, type Field } from "../model/blocks";
import { EntitiesField, ImageField, KeysField, L10nField, LinesField, NumberField, SelectField, StatsField, TextField, useKeyOptions, useTemplateOptions } from "./fields";
import { Toggle } from "./ui";

export function BlockForm({ block, onChange }: { block: Block; onChange: (props: Block["props"], tag: string) => void }) {
  const def = BLOCKS[block.type];
  const p = block.props as unknown as Record<string, unknown>;
  const set = (key: string, v: unknown) => onChange({ ...(block.props as object), [key]: v } as Block["props"], `${block.id}:${key}`);
  return (
    <div className="flex flex-col gap-3">
      {def.fields
        .filter((f) => !f.when || f.when(p))
        .map((f) => (
          <FieldFor key={f.key} f={f} value={p[f.key]} template={p.template as string | undefined} onChange={(v) => set(f.key, v)} />
        ))}
    </div>
  );
}

function FieldFor({ f, value, onChange, template }: { f: Field; value: unknown; onChange: (v: unknown) => void; template?: string }) {
  const tplOpts = useTemplateOptions();
  const keyOpts = useKeyOptions(template, f.keyKinds);
  switch (f.kind) {
    case "l10n":
      return <L10nField label={f.label} value={(value as L10n) ?? {}} onChange={onChange} hint={f.hint} />;
    case "l10nLong":
      return <L10nField label={f.label} value={(value as L10n) ?? {}} onChange={onChange} long hint={f.hint} />;
    case "text":
      return <TextField label={f.label} value={(value as string) ?? ""} onChange={onChange} hint={f.hint} />;
    case "number":
      return <NumberField label={f.label} value={(value as number) ?? 6} onChange={onChange} min={f.min} max={f.max} />;
    case "select":
      return <SelectField label={f.label} value={String(value ?? "")} onChange={onChange} options={f.options ?? []} />;
    case "template":
      return <SelectField label={f.label} value={(value as string) ?? ""} onChange={(v) => onChange(v || undefined)} options={tplOpts} />;
    case "key":
      return <SelectField label={f.label} value={(value as string) ?? ""} onChange={(v) => onChange(v || undefined)} options={[...(f.extra ?? []), ...keyOpts]} hint={f.hint} />;
    case "keys":
      return <KeysField label={f.label} value={(value as string[]) ?? []} onChange={onChange} template={template} kinds={f.keyKinds} />;
    case "toggle":
      return <Toggle label={f.label} checked={!!value} onChange={onChange} />;
    case "image":
      return <ImageField label={f.label} value={value as ImageRef | undefined} onChange={onChange} />;
    case "entities":
      return <EntitiesField label={f.label} value={(value as string[]) ?? []} onChange={onChange} />;
    case "stats":
      return <StatsField value={(value as StatItem[]) ?? []} onChange={onChange} />;
    case "lines":
      return <LinesField label={f.label} value={(value as L10n[]) ?? []} onChange={onChange} />;
  }
}

/** One line under a block's name in the list, so blocks of one type differ. */
export function blockSummary(b: Block, t: (x: L10n | undefined) => string, templateName: (id?: string) => string): string {
  const p = b.props as unknown as Record<string, unknown>;
  const title = t(p.title as L10n | undefined);
  if (b.type === "hero") return t(p.title as L10n);
  if (b.type === "quote") return t(p.text as L10n);
  if (title) return title;
  if (p.template) return templateName(p.template as string);
  return "";
}
