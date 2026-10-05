import { useEffect, useId, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Archive, Check, Copy } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { SettingsForm, SettingsSection } from "../SettingsSection";
import { MODAL_INPUT, MODAL_LABEL } from "../../shared/ModalParts";
import { UwaziLoader } from "../../shared/UwaziLoader";
import { myPreserveTokenAtom, newPreserveToken, preserveTokens } from "../../../atoms/preserve";
import { signedInUserAtom } from "../../../atoms/users";
import { consumeFailureAtom } from "../../../atoms/devSwitches";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";

/** How long the mocked request to the Preserve host takes. */
const REQUEST_MS = 900;

/** Settings › Preserve (Uwazi's `Preserve.tsx`): one card with the setup
 *  steps and the signed-in user's extension token. Decision G9: no capture
 *  sources, no editor. Not a form, so no footer and no dirty guard: "Request
 *  token" stores the token at once. */
export function PreservePage() {
  const token = useAtomValue(myPreserveTokenAtom);
  const me = useAtomValue(signedInUserAtom);
  const create = useSetAtom(preserveTokens.createAtom);
  const consumeFailure = useSetAtom(consumeFailureAtom);
  const { record, fail } = useSettingsNotify();
  const [busy, setBusy] = useState(false);
  const fieldId = useId();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => void (mounted.current = false);
  }, []);

  const request = () => {
    if (busy || !me) return;
    setBusy(true);
    setTimeout(() => {
      // The token is the user's whether or not the page is still open.
      const failure = consumeFailure("save");
      if (failure) fail(undefined, failure);
      else {
        const id = create({ value: { userId: me.id, token: newPreserveToken(), created: Date.now() } });
        record({
          method: "CREATE",
          domain: "preserve",
          noun: "Preserve extension token",
          id,
          name: me.username,
          summary: `Requested a Preserve extension token for ${me.username}`,
          message: "Extension token created",
        });
      }
      if (mounted.current) setBusy(false);
    }, REQUEST_MS);
  };

  return (
    <SettingsContent component="PreservePage">
      <SettingsContent.Header title="Preserve Extension" />
      <SettingsContent.Body>
        <SettingsForm>
          <div data-part="card" className="flex flex-col gap-6 rounded-lg border border-border bg-paper p-4 min-w-0">
            <SettingsSection
              title={
                <span className="inline-flex items-center gap-2">
                  <Archive size={15} aria-hidden className="text-ink-tertiary" />
                  Preserve Extension
                </span>
              }
            >
              <ol className="flex flex-col gap-1 text-xs text-ink-secondary text-pretty">
                <li>1. Install the browser extension.</li>
                <li>
                  2. Request and copy the Extension Token below and paste it into the preserve extension settings.
                </li>
              </ol>
            </SettingsSection>
            <SettingsSection title="Configuration">
              <div className="flex flex-col gap-1.5 min-w-0">
                <label htmlFor={fieldId} className={MODAL_LABEL}>
                  Extension Token
                </label>
                <CopyValue id={fieldId} value={token?.token ?? ""} />
              </div>
              {!token && (
                <div className="flex justify-end">
                  <SettingsButton
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    aria-busy={busy || undefined}
                    icon={busy ? <UwaziLoader size="xs" color="muted" /> : undefined}
                    onClick={request}
                  >
                    {busy ? "Requesting token…" : "Request token"}
                  </SettingsButton>
                </div>
              )}
            </SettingsSection>
          </div>
        </SettingsForm>
      </SettingsContent.Body>
    </SettingsContent>
  );
}

/** A read-only value with a copy button (Uwazi's `CopyValueInput`). The copy
 *  is real; "Copied to clipboard" shows for 2 s only when the write
 *  succeeded, in a live region. */
function CopyValue({ id, value }: { id: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="flex items-stretch gap-2 min-w-0">
      <input
        id={id}
        readOnly
        value={value}
        dir="ltr"
        className={`${MODAL_INPUT} flex-1 min-w-0 font-mono`}
        onFocus={(e) => e.currentTarget.select()}
      />
      <span className="relative shrink-0">
        <button
          type="button"
          onClick={copy}
          disabled={!value}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-warm text-ink-secondary hover:text-ink disabled:text-ink-muted disabled:cursor-not-allowed cursor-pointer"
        >
          {copied ? <Check size={15} aria-hidden className="text-success" /> : <Copy size={15} aria-hidden />}
          <span className="sr-only">Copy Extension Token</span>
        </button>
        <span
          role="status"
          className={`absolute bottom-full end-0 mb-1 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-meta text-paper transition-opacity ${copied ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          {copied ? "Copied to clipboard" : ""}
        </span>
      </span>
    </div>
  );
}
