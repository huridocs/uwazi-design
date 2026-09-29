/* Blocks that carry the site's own words: hero, text, quote, asks, call to
 * action, share, contact. */
import { useState } from "react";
import { Check, Link2, Mail } from "lucide-react";
import type { BlockProps, ImageRef } from "../../model/config";
import { useSite } from "../context";
import { Section } from "../parts";
import { RichText } from "../text";
import { ui } from "../ui";

export function Picture({ image, className = "", sizes }: { image: ImageRef; className?: string; sizes?: string }) {
  const { t } = useSite();
  return (
    <img
      src={image.src}
      alt={t(image.alt)}
      sizes={sizes}
      className={`object-cover ${className}`}
      style={{ objectPosition: `${image.focal.x * 100}% ${image.focal.y * 100}%` }}
    />
  );
}

function Cta({ kind, label, href }: { kind: string; label: string; href: string }) {
  const { lang } = useSite();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const cls =
    "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md bg-accent text-on-accent font-medium hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer";
  if (!label) return null;
  if (kind === "signup")
    return done ? (
      <p role="status" className="inline-flex items-center gap-2 h-11 text-ink-secondary">
        <Check size={16} aria-hidden /> {ui("thanks", lang)}
      </p>
    ) : (
      <form
        className="flex flex-wrap gap-2 w-full max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          setDone(true);
        }}
      >
        <label className="sr-only" htmlFor="signup-email">
          {ui("signup", lang)}
        </label>
        <input id="signup-email" type="email" required placeholder={ui("signup", lang)} className="flex-1 min-w-[12rem] h-11 px-3 rounded-md border border-border-soft bg-paper text-ink" />
        <button type="submit" className={cls}>
          {label}
        </button>
      </form>
    );
  if (kind === "form")
    return (
      <>
        <button type="button" className={cls} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {label}
        </button>
        {open ? <ContactForm onSent={() => setOpen(false)} /> : null}
      </>
    );
  return (
    <a href={href || "#"} className={cls} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
      {label}
    </a>
  );
}

export function Hero({ p }: { p: BlockProps["hero"] }) {
  const { t } = useSite();
  const hasImage = !!p.image;
  return (
    <section className={`w-full ${hasImage ? "relative isolate overflow-hidden" : "border-b border-border"}`}>
      {hasImage ? (
        <>
          <Picture image={p.image!} className="absolute inset-0 w-full h-full -z-10" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        </>
      ) : null}
      <div className={`mx-auto max-w-[68rem] px-5 ${hasImage ? "pt-40 pb-14 text-white" : "pt-14 pb-10 sm:pt-20 sm:pb-14"}`}>
        <h1 className={`font-heading text-4xl sm:text-5xl leading-[1.08] tracking-tight text-balance max-w-[20ch] ${hasImage ? "" : "text-ink"}`}>{t(p.title)}</h1>
        {t(p.subtitle) ? <p className={`mt-4 text-lg sm:text-xl max-w-[42rem] text-pretty ${hasImage ? "text-white/90" : "text-ink-secondary"}`}>{t(p.subtitle)}</p> : null}
        {p.ctaKind !== "none" && t(p.ctaLabel) ? (
          <div className="mt-7">
            <Cta kind={p.ctaKind} label={t(p.ctaLabel)} href={p.ctaHref} />
          </div>
        ) : null}
        {hasImage ? null : <div aria-hidden className="mt-10 h-[3px] w-16 bg-accent" />}
      </div>
    </section>
  );
}

export function Text({ p }: { p: BlockProps["text"] }) {
  const { t } = useSite();
  return (
    <Section title={t(p.title)}>
      <RichText text={t(p.body)} className="max-w-[42rem] text-[1.0625rem] leading-relaxed text-ink-secondary" />
    </Section>
  );
}

export function Quote({ p }: { p: BlockProps["quote"] }) {
  const { t } = useSite();
  if (!t(p.text)) return null;
  return (
    <Section>
      <figure className="max-w-[48rem] border-s-0">
        <blockquote className="font-heading text-2xl sm:text-3xl leading-snug text-ink text-balance">
          <span aria-hidden className="text-accent-text">“</span>
          {t(p.text)}
          <span aria-hidden className="text-accent-text">”</span>
        </blockquote>
        {t(p.attribution) ? <figcaption className="mt-4 text-sm text-ink-tertiary">— {t(p.attribution)}</figcaption> : null}
      </figure>
    </Section>
  );
}

export function Asks({ p }: { p: BlockProps["asks"] }) {
  const { t } = useSite();
  const items = p.items.map(t).filter(Boolean);
  return (
    <Section title={t(p.title)}>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => (
          <li key={i} className="flex gap-4 rounded-lg bg-vellum p-5">
            <span className="font-heading text-3xl leading-none text-accent-text tabular-nums">{i + 1}</span>
            <span className="text-ink pt-1">{it}</span>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function CtaBand({ p }: { p: BlockProps["cta"] }) {
  const { t } = useSite();
  return (
    <Section>
      <div className="rounded-xl bg-parchment px-6 py-8 sm:px-10 sm:py-10 flex flex-col gap-4 items-start">
        {t(p.title) ? <h2 className="font-heading text-2xl sm:text-3xl text-ink text-balance">{t(p.title)}</h2> : null}
        {t(p.body) ? <p className="text-ink-secondary max-w-[40rem]">{t(p.body)}</p> : null}
        <Cta kind={p.kind} label={t(p.label)} href={p.href} />
      </div>
    </Section>
  );
}

export function Share({ p }: { p: BlockProps["share"] }) {
  const { t, lang } = useSite();
  const [copied, setCopied] = useState(false);
  const url = typeof location !== "undefined" ? location.href : "";
  const btn = "inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border-soft bg-paper text-sm text-ink hover:bg-warm cursor-pointer";
  return (
    <Section title={t(p.title)}>
      <div className="flex flex-wrap gap-2">
        <a className={btn} href={`https://wa.me/?text=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
        <a className={btn} href={`https://bsky.app/intent/compose?text=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">
          Bluesky
        </a>
        <a className={btn} href={`mailto:?body=${encodeURIComponent(url)}`}>
          <Mail size={14} aria-hidden /> {ui("email", lang)}
        </a>
        <button
          type="button"
          className={btn}
          onClick={() => {
            navigator.clipboard?.writeText(url).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? <Check size={14} aria-hidden /> : <Link2 size={14} aria-hidden />}
          <span aria-live="polite">{copied ? ui("copied", lang) : ui("copyLink", lang)}</span>
        </button>
      </div>
    </Section>
  );
}

function ContactForm({ onSent }: { onSent?: () => void }) {
  const { lang } = useSite();
  const [sent, setSent] = useState(false);
  const field = "w-full h-10 px-3 rounded-md border border-border-soft bg-paper text-ink";
  if (sent)
    return (
      <p role="status" className="mt-4 inline-flex items-center gap-2 text-ink-secondary">
        <Check size={16} aria-hidden /> {ui("sent", lang)}
      </p>
    );
  return (
    <form
      className="mt-4 grid gap-3 max-w-lg"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
        onSent?.();
      }}
    >
      <label className="grid gap-1 text-sm text-ink-secondary">
        {ui("name", lang)}
        <input required className={field} />
      </label>
      <label className="grid gap-1 text-sm text-ink-secondary">
        {ui("email", lang)}
        <input required type="email" className={field} />
      </label>
      <label className="grid gap-1 text-sm text-ink-secondary">
        {ui("message", lang)}
        <textarea required rows={4} className={`${field} h-auto py-2`} />
      </label>
      <button type="submit" className="justify-self-start h-10 px-4 rounded-md bg-accent text-on-accent font-medium cursor-pointer">
        {ui("send", lang)}
      </button>
    </form>
  );
}

export function Contact({ p }: { p: BlockProps["contact"] }) {
  const { t } = useSite();
  return (
    <Section title={t(p.title)}>
      {t(p.body) ? <p className="text-ink-secondary max-w-[40rem]">{t(p.body)}</p> : null}
      <ContactForm />
    </Section>
  );
}
