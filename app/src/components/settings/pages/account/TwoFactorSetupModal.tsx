import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_COMMIT_DISABLED } from "../../../shared/Modal";
import { MODAL_INPUT } from "../../../shared/ModalParts";
import { BAR_GHOST } from "../../../shared/warmButton";
import { issueBorderClass } from "../../../shared/FieldMessage";

/** The one code the mock accepts. There is no authenticator behind the
 *  prototype, so a real TOTP cannot be checked; any other 6 digits is
 *  rejected with Uwazi's message. */
export const MOCK_2FA_CODE = "246810";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
/** A fresh mock secret per open (Uwazi stores it before any code is checked;
 *  here it is kept only on a successful Enable). */
function newSecret(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => BASE32[b % 32]).join("");
}

/** A drawn stand-in for the QR code: a 21×21 grid seeded by the secret, with
 *  the three finder squares. Dark on light in both themes, as a scanner
 *  needs. Not scannable. */
function QrPlaceholder({ secret }: { secret: string }) {
  const cells = useMemo(() => {
    let h = 2166136261;
    const out: [number, number][] = [];
    const finder = (x: number, y: number) =>
      (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
    for (let y = 0; y < 21; y++)
      for (let x = 0; x < 21; x++) {
        h = Math.imul(h ^ secret.charCodeAt((x + y * 21) % secret.length), 16777619);
        if (!finder(x, y) && (h >>> 0) % 2 === 0) out.push([x, y]);
      }
    return out;
  }, [secret]);
  const Finder = ({ x, y }: { x: number; y: number }) => (
    <>
      <rect x={x} y={y} width={7} height={7} fill="#000" />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill="#000" />
    </>
  );
  return (
    <svg viewBox="-2 -2 25 25" width="180" height="180" role="img" aria-label="QR code" className="max-w-full h-auto">
      <title>qr code</title>
      <rect x={-2} y={-2} width={25} height={25} fill="#fff" />
      <Finder x={0} y={0} />
      <Finder x={14} y={0} />
      <Finder x={0} y={14} />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#000" />
      ))}
    </svg>
  );
}

function Card({ title, className = "", children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section className={`flex flex-col gap-2 rounded-lg border border-border bg-paper p-4 min-w-0 ${className}`}>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

/** Copy the secret for real; a check and "Copied to clipboard" for 2 s only
 *  when the write succeeded. */
function CopySecret({ secret, inputId }: { secret: string; inputId: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="flex items-stretch gap-2">
      <input
        id={inputId}
        readOnly
        value={secret}
        dir="ltr"
        className={`${MODAL_INPUT} flex-1 min-w-0 font-mono tracking-wider`}
        onFocus={(e) => e.currentTarget.select()}
      />
      <span className="relative">
        <button
          type="button"
          onClick={copy}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-warm text-ink-secondary hover:text-ink cursor-pointer"
        >
          {copied ? <Check size={15} aria-hidden className="text-success" /> : <Copy size={15} aria-hidden />}
          <span className="sr-only">Copy to clipboard</span>
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

/** Settings › Account › Two-Factor Authentication › Enable (Uwazi's
 *  `TwoFactorSetup` side panel, here a `Modal`). Mounted only while open, so
 *  Cancel discards the token, the error and the secret. */
export function TwoFactorSetupModal({ onEnable, onCancel }: { onEnable: (secret: string) => void; onCancel: () => void }) {
  const [secret] = useState(newSecret);
  const [token, setToken] = useState("");
  const [error, setError] = useState(false);
  const secretId = useId();
  const tokenId = useId();
  const errorId = useId();
  const ready = token.length === 6;

  const enable = () => {
    if (!ready) return;
    if (token !== MOCK_2FA_CODE) {
      setError(true);
      return;
    }
    onEnable(secret);
  };

  return (
    <Modal
      component="TwoFactorSetupModal"
      size="xl"
      onClose={onCancel}
      title="Two-Factor Authentication"
      footer={
        <>
          <button type="button" onClick={onCancel} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
            Cancel
          </button>
          <button
            type="button"
            data-part="confirm"
            onClick={enable}
            disabled={!ready}
            className={ready ? MODAL_COMMIT : MODAL_COMMIT_DISABLED}
          >
            Enable
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Card title="Using Authenticator" className="sm:col-span-2">
          <ol className="list-decimal ps-5 flex flex-col gap-2 text-sm text-ink">
            <li>
              Download a third-party authenticator app from your mobile store.{" "}
              <span className="italic text-ink-tertiary">
                (Google Authenticator, LastPass Authenticator, Microsoft Authenticator, Authy, etc.)
              </span>
            </li>
            <li>
              Add an account to the app by scanning the provided QR code with your mobile device or by inserting the
              provided key.
            </li>
          </ol>
          <p className="text-xs italic text-ink-tertiary">
            Instructions on how to achieve this will vary according to the app used, please refer to the app's
            documentation.
          </p>
        </Card>
        <Card title="QR Code" className="items-center">
          <QrPlaceholder secret={secret} />
        </Card>
        <Card title="Secret keys" className="sm:col-span-3">
          <label htmlFor={secretId} className="text-sm text-ink">
            You can also enter this secret key into your Authenticator app.
            <span className="block text-xs italic text-ink-tertiary">*please keep this key secret and don't share it.</span>
          </label>
          <CopySecret secret={secret} inputId={secretId} />
          <label htmlFor={tokenId} className="mt-3 text-sm font-semibold text-ink">
            Enter the 6-digit verification code generated by your Authenticator app
          </label>
          <input
            id={tokenId}
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={token}
            aria-invalid={error || undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => {
              setToken(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                enable();
              }
            }}
            className={`w-full max-w-[12rem] px-3 py-2 text-sm text-ink bg-warm border rounded-md font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-carbon/20 ${issueBorderClass(error ? { severity: "error", message: "" } : null)}`}
          />
          <p id={errorId} className="min-h-4 text-xs text-seal-label">
            {error ? "The token does not validate against the secret key!" : ""}
          </p>
        </Card>
      </div>
    </Modal>
  );
}
