/* A block's Style tab: every control a step on a scale (model/style.ts).
 * Only the controls the block can show are offered (STYLE_CAPS). Each change
 * is one undo step; typing the eyebrow coalesces like any text field. */
import { useId, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import type { Block } from "../model/config";
import { LANG_NAMES } from "../model/config";
import { STYLE_CAPS, clean, isStyled, type BlockStyle, type Device } from "../model/style";
import { ImageField, L10nField, useBuilder } from "./fields";
import { Segmented, Toggle } from "./ui";

function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ink-secondary">{label}</span>
      {children}
      {hint ? <span className="text-[0.6875rem] text-ink-tertiary">{hint}</span> : null}
    </div>
  );
}

/** A row of on/off chips (languages, devices). All on = no restriction. */
function Chips<T extends string>({ label, all, value, onChange, name }: { label: string; all: T[]; value?: T[]; onChange: (v: T[] | undefined) => void; name: (v: T) => string }) {
  const id = useId();
  const on = value?.length ? value : all;
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-1.5">
      <span id={id} className="text-xs font-medium text-ink-secondary">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {all.map((v) => {
          const checked = on.includes(v);
          return (
            <button
              key={v}
              type="button"
              aria-pressed={checked}
              disabled={checked && on.length === 1}
              onClick={() => {
                const next = checked ? on.filter((x) => x !== v) : [...on, v];
                onChange(next.length === all.length ? undefined : all.filter((x) => next.includes(x)));
              }}
              className={`h-7 px-2.5 rounded-md text-xs font-medium border transition-colors disabled:cursor-not-allowed ${checked ? "bg-paper text-ink border-ink/30" : "bg-warm text-ink-tertiary border-transparent line-through decoration-ink-muted/60"}`}
            >
              {name(v)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StyleForm({ block, onChange }: { block: Block; onChange: (style: BlockStyle | undefined, tag?: string) => void }) {
  const { config } = useBuilder();
  const caps = new Set(STYLE_CAPS[block.type]);
  const s = block.style ?? {};
  const set = (patch: Partial<BlockStyle>, tag?: string) => onChange(clean({ ...s, ...patch }), tag);
  const has = (c: string) => caps.has(c as never);

  return (
    <div className="flex flex-col gap-4">
      {has("pad") ? (
        <Row label="Space above and below">
          <Segmented label="Space above and below" value={s.pad ?? "M"} onChange={(pad) => set({ pad })} options={(["S", "M", "L", "XL"] as const).map((v) => ({ value: v, label: v }))} />
        </Row>
      ) : null}
      {has("gap") ? (
        <Row label="Space between items">
          <Segmented label="Space between items" value={s.gap ?? "M"} onChange={(gap) => set({ gap })} options={(["S", "M", "L", "XL"] as const).map((v) => ({ value: v, label: v }))} />
        </Row>
      ) : null}
      {has("width") ? (
        <Row label="Width">
          <Segmented
            label="Width"
            value={s.width ?? "wide"}
            onChange={(width) => set({ width })}
            options={[
              { value: "narrow", label: "Narrow" },
              { value: "text", label: "Text" },
              { value: "wide", label: "Wide" },
              { value: "full", label: "Full", title: "Edge to edge" },
            ]}
          />
        </Row>
      ) : null}
      {has("cols") ? (
        <Row label="Columns" hint="From tablet width up. Phones show one or two.">
          <Segmented
            label="Columns"
            value={s.cols ? String(s.cols) : "auto"}
            onChange={(v) => set({ cols: v === "auto" ? undefined : (Number(v) as 2 | 3 | 4) })}
            options={[
              { value: "auto", label: "Auto" },
              { value: "2", label: "2" },
              { value: "3", label: "3" },
              { value: "4", label: "4" },
            ]}
          />
        </Row>
      ) : null}
      {has("shape") ? (
        <Row label="Picture shape">
          <Segmented
            label="Picture shape"
            value={s.shape ?? "auto"}
            onChange={(v) => set({ shape: v === "auto" ? undefined : v })}
            options={[
              { value: "auto", label: "Auto" },
              { value: "square", label: "Square" },
              { value: "portrait", label: "Portrait" },
              { value: "landscape", label: "Landscape" },
            ]}
          />
        </Row>
      ) : null}
      {has("bg") ? (
        <Row label="Background">
          <Segmented
            label="Background"
            value={s.bg ?? "paper"}
            onChange={(bg) => set({ bg })}
            options={[
              { value: "paper", label: "Paper" },
              { value: "warm", label: "Warm" },
              { value: "vellum", label: "Vellum" },
              { value: "tint", label: "Accent", title: "A tint of the site's accent" },
              { value: "image", label: "Picture" },
            ]}
          />
        </Row>
      ) : null}
      {s.bg === "image" ? (
        <>
          <ImageField label="Background picture" value={s.bgImage} onChange={(bgImage) => set({ bgImage })} />
          <Row label="Darken for text">
            <Segmented
              label="Darken for text"
              value={s.overlay ?? "soft"}
              onChange={(overlay) => set({ overlay })}
              options={[
                { value: "soft", label: "Soft" },
                { value: "strong", label: "Strong" },
              ]}
            />
          </Row>
        </>
      ) : null}
      {has("align") ? (
        <Row label="Alignment">
          <Segmented
            label="Alignment"
            value={s.align ?? "start"}
            onChange={(align) => set({ align })}
            options={[
              { value: "start", label: "Start" },
              { value: "center", label: "Centre" },
            ]}
          />
        </Row>
      ) : null}
      {has("heading") ? (
        <Row label="Heading size">
          <Segmented
            label="Heading size"
            value={String(s.heading ?? 0)}
            onChange={(v) => set({ heading: v === "0" ? undefined : (Number(v) as -1 | 1) })}
            options={[
              { value: "-1", label: "Smaller" },
              { value: "0", label: "Default" },
              { value: "1", label: "Larger" },
            ]}
          />
        </Row>
      ) : null}
      {has("eyebrow") ? (
        <>
          <Toggle label="Line above the heading" checked={!!s.eyebrow} onChange={(on) => set({ eyebrow: on ? { [config.defaultLanguage]: "" } : undefined })} />
          {s.eyebrow ? <L10nField label="Line above the heading" value={s.eyebrow} onChange={(eyebrow) => set({ eyebrow }, `${block.id}:eyebrow`)} /> : null}
        </>
      ) : null}
      {has("visibility") ? (
        <div className="flex flex-col gap-3 pt-3 border-t border-border">
          {config.languages.length > 1 ? (
            <Chips label="Shown in" all={config.languages} value={s.langs} onChange={(langs) => set({ langs })} name={(l) => LANG_NAMES[l]?.name ?? l} />
          ) : null}
          <Chips<Device> label="Shown on" all={["desktop", "tablet", "phone"]} value={s.devices} onChange={(devices) => set({ devices })} name={(d) => d.charAt(0).toUpperCase() + d.slice(1)} />
        </div>
      ) : null}
      <button
        type="button"
        disabled={!isStyled(block.style)}
        onClick={() => onChange(undefined)}
        className="self-start inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs text-ink-secondary hover:text-ink hover:bg-warm disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <RotateCcw size={12} aria-hidden /> Reset style
      </button>
    </div>
  );
}
