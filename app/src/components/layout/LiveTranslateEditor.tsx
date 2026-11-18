import { useEffect, useMemo, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { liveTranslateAtom } from "../../atoms/liveTranslate";
import { dataSourceAtom } from "../../atoms/dataSource";
import {
  addUiKeyAtom,
  installedLanguagesAtom,
  saveTranslationsAtom,
  translationContextsAtom,
  translationRowsAtom,
  type TranslationContext,
} from "../../atoms/translations";
import { Modal, MODAL_COMMIT } from "../shared/Modal";
import { MODAL_INPUT, MODAL_LABEL } from "../shared/ModalParts";
import { BAR_GHOST } from "../shared/warmButton";
import { useNotify } from "../../hooks/useNotify";
import { uiStringDefaults } from "../../utils/i18n";

/** What live translate underlines and lets the user click: the same set as the
 *  `:root[data-live-translate]` rule in `index.css`. Keep the two in step. */
export const LIVE_TRANSLATE_TARGETS = [
  '[data-component="Navbar"] button',
  '[role="tab"]',
  '[data-component="SectionLabel"]',
  '[data-part="view"] h1',
  '[data-part="view"] h2',
  '[data-part="view"] h3',
  '[data-part="view"] label',
].join(", ");

interface Hit {
  text: string;
  context: TranslationContext | null;
  keyId: string | null;
}

/** Live translate's editor: while the mode is on, a click on underlined text
 *  does not run the control; it opens this dialog with the text's key and one
 *  field per installed language, as Uwazi's inline translation does. Save
 *  writes Settings › Translations (`saveTranslationsAtom`). Text the
 *  collection has no key for says so and offers nothing to save. */
export function LiveTranslateEditor() {
  const on = useAtomValue(liveTranslateAtom);
  const corpus = useAtomValue(dataSourceAtom);
  const contexts = useAtomValue(translationContextsAtom(corpus));
  const rowsOf = useAtomValue(translationRowsAtom(corpus));
  const languages = useAtomValue(installedLanguagesAtom(corpus));
  const save = useSetAtom(saveTranslationsAtom);
  const addUiKey = useSetAtom(addUiKeyAtom);
  const notify = useNotify();
  const [hit, setHit] = useState<Hit | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  // Every key by its text, the User Interface context first; then the same
  // without case, for labels drawn in capitals or in sentence case.
  const index = useMemo(() => {
    const exact = new Map<string, { context: TranslationContext; keyId: string }>();
    const loose = new Map<string, { context: TranslationContext; keyId: string }>();
    for (const context of contexts)
      for (const k of context.keys) {
        if (!exact.has(k.text)) exact.set(k.text, { context, keyId: k.id });
        const l = k.text.toLocaleLowerCase();
        if (!loose.has(l)) loose.set(l, { context, keyId: k.id });
      }
    return { exact, loose };
  }, [contexts]);

  useEffect(() => {
    if (!on || hit) return;
    const lookup = (text: string) => index.exact.get(text) ?? index.loose.get(text.toLocaleLowerCase());
    const onClick = (e: MouseEvent) => {
      const start = e.target instanceof Element ? e.target : null;
      const target = start?.closest(LIVE_TRANSLATE_TARGETS);
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      // The innermost text that is a key wins: a navbar button reads
      // "Library CEJIL", and "Library" is the key.
      let found: Hit | null = null;
      for (let n: Element | null = start; n; n = n.parentElement) {
        const text = (n.textContent ?? "").replace(/\s+/g, " ").trim();
        const k = text && lookup(text);
        if (k) {
          found = { text, context: k.context, keyId: k.keyId };
          break;
        }
        if (n === target) break;
      }
      if (found) return setHit(found);
      // Interface text with no key yet: it joins the User Interface context,
      // as every string Uwazi draws is a System key. The innermost text is the
      // label ("Library", not "Library CEJIL").
      const own = (start && start !== target && start.closest(LIVE_TRANSLATE_TARGETS) === target ? start : target).textContent ?? "";
      const text = own.replace(/\s+/g, " ").trim();
      if (!text) return;
      const system = contexts.find((c) => c.id === "System") ?? null;
      if (system) addUiKey({ id: text, text, defaults: uiStringDefaults(text) });
      setHit({ text, context: system, keyId: system ? text : null });
    };
    // Capture: the click must not reach the control (a tab, a link, a toggle).
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [on, hit, index, contexts, addUiKey]);

  // The hit's context read fresh, so a key just added is in it.
  const context = hit?.context ? (contexts.find((c) => c.id === hit.context!.id) ?? null) : null;
  const row = useMemo(() => {
    if (!context || !hit?.keyId) return null;
    return rowsOf(context).find((r) => r.id === hit.keyId) ?? null;
  }, [context, hit, rowsOf]);

  useEffect(() => {
    setDraft(row ? { ...row.values } : {});
  }, [row]);

  // Turning the mode off closes an open dialog with it.
  useEffect(() => {
    if (!on) setHit(null);
  }, [on]);

  if (!hit) return null;
  const close = () => setHit(null);
  const changed = !!row && languages.some((l) => !l.default && (draft[l.key] ?? "") !== (row.values[l.key] ?? ""));

  const commit = () => {
    if (!context || !row) return;
    const rows = rowsOf(context).map((r) => (r.id === row.id ? { ...r, values: { ...r.values, ...draft } } : r));
    save({ corpus, context, rows });
    notify(`Translation saved: “${row.key}”`, "success");
    close();
  };

  return (
    <Modal
      onClose={close}
      title="Translate"
      subtitle={hit.context ? hit.context.name : undefined}
      size="md"
      component="LiveTranslateEditor"
      footer={
        row ? (
          <>
            <button type="button" onClick={close} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${BAR_GHOST}`}>
              Cancel
            </button>
            <button type="button" onClick={commit} disabled={!changed} className={`${MODAL_COMMIT} disabled:opacity-40 disabled:cursor-not-allowed`}>
              Save
            </button>
          </>
        ) : (
          <button type="button" onClick={close} className={MODAL_COMMIT}>
            OK
          </button>
        )
      }
    >
      {row ? (
        <form
          className="flex flex-col gap-3 py-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (changed) commit();
          }}
        >
          {languages.map((l, i) => {
            const id = `live-translate-${l.key}`;
            return (
              <label key={l.key} htmlFor={id} className="flex flex-col gap-1">
                <span className={MODAL_LABEL}>
                  {l.label}
                  {l.default && <span className="text-ink-tertiary font-normal"> · default language, the key</span>}
                </span>
                <input
                  id={id}
                  className={`${MODAL_INPUT} ${l.default ? "bg-warm text-ink-secondary" : ""}`}
                  value={draft[l.key] ?? ""}
                  readOnly={l.default}
                  autoFocus={i === 1}
                  dir={l.ltr ? undefined : "rtl"}
                  onChange={(e) => setDraft((d) => ({ ...d, [l.key]: e.target.value }))}
                />
              </label>
            );
          })}
          <button type="submit" hidden />
        </form>
      ) : (
        <p className="py-2 text-sm text-ink-secondary">
          “{hit.text}” has no translation key in this collection, so it cannot be translated here.
        </p>
      )}
    </Modal>
  );
}
