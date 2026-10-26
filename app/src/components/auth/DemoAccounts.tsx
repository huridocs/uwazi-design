import { useState } from "react";
import { useAtomValue } from "jotai";
import { DEMO_PASSWORD, MAX_FAILED_LOGINS, MOCK_2FA_CODE, outboxAtom } from "../../atoms/auth";
import { AUTH_FOCUS_RING } from "./AuthLayout";
import { SentEmailsModal } from "./SentEmailsModal";

const ACCOUNTS: { username: string; note: string }[] = [
  { username: "jnkemba", note: "password only" },
  { username: "admin", note: `two-step verification, code ${MOCK_2FA_CODE}` },
  { username: "tbuergenthal", note: "locked: unlock it from its email" },
  { username: "kmensah", note: "invited: set a password from the welcome email" },
];

/** The prototype's note under an auth form: the demo accounts, and "Sent
 *  emails", where the links Uwazi would have emailed open. Prototype-only. */
export function DemoAccounts() {
  const count = useAtomValue(outboxAtom).length;
  const [open, setOpen] = useState(false);
  return (
    <section data-component="DemoAccounts" aria-label="Prototype accounts" className="mt-6 pt-4 border-t border-border-soft text-meta text-ink-tertiary">
      <p>
        Prototype accounts, password <span className="font-mono text-ink-secondary">{DEMO_PASSWORD}</span>:
      </p>
      <ul className="mt-1.5 flex flex-col gap-0.5">
        {ACCOUNTS.map((a) => (
          <li key={a.username}>
            <span className="font-medium text-ink-secondary">{a.username}</span> · {a.note}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-pretty">
        {MAX_FAILED_LOGINS} failed attempts lock an account.{" "}
        <button
          type="button"
          data-part="sent-emails"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className={`whitespace-nowrap underline underline-offset-2 text-ink-secondary hover:text-ink cursor-pointer rounded-xs ${AUTH_FOCUS_RING}`}
        >
          Sent emails ({count})
        </button>
      </p>
      <SentEmailsModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
