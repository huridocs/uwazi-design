import { useAtomValue, useSetAtom } from "jotai";
import { Mail } from "lucide-react";
import { openAuthLinkAtom, outboxAtom, type SentEmail } from "../../atoms/auth";
import { useDirtyGuard } from "../../hooks/useDirtyGuard";
import { Modal, MODAL_BUTTON } from "../shared/Modal";
import { BAR_GHOST } from "../shared/warmButton";

const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

/** What Uwazi would have emailed in this session (the prototype has no mail):
 *  Welcome, Password recovery and Account locked, newest first, each with its
 *  subject, recipient and plain-text body. The link line opens the page it
 *  names (set password, unlock account). Prototype-only. */
export function SentEmailsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <SentEmailsBody onClose={onClose} />;
}

function SentEmailsBody({ onClose }: { onClose: () => void }) {
  const emails = useAtomValue(outboxAtom);
  const openLink = useSetAtom(openAuthLinkAtom);
  const guard = useDirtyGuard();
  const follow = (email: SentEmail) =>
    guard(() => {
      onClose();
      openLink(email.link);
    });
  return (
    <Modal
      component="SentEmailsModal"
      size="lg"
      height="min(40rem, 90dvh)"
      onClose={onClose}
      title="Sent emails"
      subtitle="Prototype: what Uwazi would have emailed"
      footer={
        <button type="button" onClick={onClose} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
          Close
        </button>
      }
    >
      {emails.length === 0 ? (
        <p data-part="empty" className="text-sm font-medium text-ink-secondary">
          No emails yet.
        </p>
      ) : (
        <ol aria-label="Sent emails, newest first" className="flex flex-col gap-3">
          {emails.map((email) => (
            <li key={email.id} data-part="email" data-kind={email.kind} className="rounded-md border border-border-soft">
              <article aria-labelledby={`email-${email.id}`} className="flex flex-col gap-3 p-4">
                <header className="flex items-start gap-2.5 min-w-0">
                  <Mail size={15} aria-hidden className="mt-0.5 shrink-0 text-ink-tertiary" />
                  <div className="min-w-0 flex-1">
                    <h3 id={`email-${email.id}`} className="text-sm font-semibold text-ink break-words">
                      {email.subject}
                    </h3>
                    <p className="text-xs text-ink-tertiary break-words">
                      To <bdi>{email.to}</bdi> · <time dateTime={new Date(email.sentAt).toISOString()}>{TIME.format(email.sentAt)}</time>
                    </p>
                  </div>
                </header>
                <EmailBody email={email} onFollow={() => follow(email)} />
              </article>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}

/** The plain text as sent, its link line a button that opens the page. */
function EmailBody({ email, onFollow }: { email: SentEmail; onFollow: () => void }) {
  return (
    <div data-part="body" className="text-xs text-ink-secondary leading-relaxed whitespace-pre-wrap break-words">
      {email.body.split("\n").map((line, i) =>
        line === email.link.href ? (
          <button
            key={i}
            type="button"
            data-part="link"
            onClick={onFollow}
            dir="ltr"
            className="block max-w-full text-start text-carbon-label underline underline-offset-2 break-all hover:text-ink cursor-pointer rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
          >
            {line}
          </button>
        ) : (
          <p key={i} className={line ? "" : "h-3"}>
            {line}
          </p>
        ),
      )}
    </div>
  );
}
