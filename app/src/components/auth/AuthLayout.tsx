import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginArtFallback, loginArtSrcSet, pickLoginArt } from "../../data/loginArt";
import { settingsDocumentation } from "../../atoms/settings";
import { FieldMessage } from "../shared/FieldMessage";
import { FORM_INPUT_LG, MODAL_LABEL } from "../shared/ModalParts";
import { COMMIT_FILL } from "../shared/warmButton";
import { UwaziLoader } from "../shared/UwaziLoader";
import { Wordmark } from "../shared/Wordmark";

/* The account-access screens (log in, its second step, forgot password, set
 * password, unlock): one layout, one field, one message line, one button. */

const FOOTER_LINKS = [
  { label: "Website", href: "https://uwazi.io" },
  { label: "Documentation", href: settingsDocumentation.external! },
  { label: "Contribute", href: "https://github.com/huridocs/uwazi" },
];
const VERSION = "Uwazi v2 · 2026 prototype";

// The shared field at its larger size (`FORM_INPUT_LG`): MODAL_INPUT's 2rem
// and 12px read as a dialog's dense fields in a page-wide form.
// `login-field` only keeps browser autofill in the theme (index.css).
export const AUTH_INPUT = `login-field ${FORM_INPUT_LG} transition-colors`;
export const AUTH_LABEL = `${MODAL_LABEL} mb-1.5`;
/** The small text-and-icon controls in the forms (reveal, the text links).
 *  The app has no shared icon-button or text-link style yet. */
export const AUTH_FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30";
export const AUTH_TEXT_LINK = `text-sm text-ink-secondary underline decoration-border underline-offset-4 hover:text-ink hover:decoration-ink-tertiary transition-colors rounded-sm cursor-pointer ${AUTH_FOCUS_RING}`;

/** The art panel beside the form (a band above it on phones), the wordmark,
 *  the form column and the footer. Fills its parent, so the app shell and the
 *  catalog frame can both host it. */
export function AuthLayout({ component, children }: { component: string; children: ReactNode }) {
  const [art] = useState(pickLoginArt);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // A cached image can finish before React attaches onLoad.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <div
      data-component={component}
      className="h-full min-h-0 flex flex-col md:flex-row bg-paper overflow-y-auto md:overflow-hidden"
    >
      {/* The box has its size before the image arrives, so nothing moves when
          it does; paper shows until then and the image fades in over it. */}
      <div
        data-part="art"
        aria-hidden
        className="relative shrink-0 h-[35dvh] min-h-48 md:h-auto md:w-1/2 lg:w-[56%] bg-paper overflow-hidden"
      >
        <picture>
          <source type="image/avif" srcSet={loginArtSrcSet(art, "avif")} sizes="(min-width: 1024px) 56vw, (min-width: 768px) 50vw, 100vw" />
          <source type="image/webp" srcSet={loginArtSrcSet(art, "webp")} sizes="(min-width: 1024px) 56vw, (min-width: 768px) 50vw, 100vw" />
          <img
            ref={imgRef}
            src={loginArtFallback(art)}
            alt=""
            decoding="async"
            fetchPriority="high"
            onLoad={() => setLoaded(true)}
            data-art={art.id}
            className={`login-art absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out motion-reduce:transition-none ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
            style={{ objectPosition: art.focus }}
          />
        </picture>
      </div>

      <div data-part="panel" data-gutter-host className="gutter-host-rail flex-1 md:min-h-0 md:overflow-y-auto flex flex-col">
        <header data-part="brand" className="pt-8 pb-6 flex justify-center">
          <Wordmark />
        </header>
        <div data-part="body" className="flex-1 flex items-center justify-center py-6">
          <div className="w-full max-w-[22.5rem]">{children}</div>
        </div>
        <footer data-part="footer" className="py-6 flex flex-col items-center gap-2 text-meta text-ink-tertiary">
          <nav aria-label="About Uwazi" className="flex flex-wrap justify-center gap-x-5 gap-y-1">
            {FOOTER_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`hover:text-ink underline-offset-4 hover:underline transition-colors rounded-sm ${AUTH_FOCUS_RING}`}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <p>{VERSION}</p>
        </footer>
      </div>
    </div>
  );
}

/** The heading block: the collection's name, the title, one line under it. */
export function AuthHeading({ eyebrow, title, lead, titleRef }: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  titleRef?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <>
      {eyebrow && (
        <p data-part="collection-name" className="mb-2 text-sm font-medium text-ink-secondary truncate">
          {eyebrow}
        </p>
      )}
      {/* Focus moves here when a step changes, so a screen reader reads the new step. */}
      <h1 ref={titleRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight text-ink focus:outline-none">
        {title}
      </h1>
      {lead && <p className="mt-1.5 text-sm text-ink-tertiary text-pretty">{lead}</p>}
    </>
  );
}

export type AuthMessageValue = { tone: "error" | "note"; text: string } | null;

/** One message line, the shared FieldMessage, always mounted at its height
 *  (`reserve`) so an error or a note never pushes the button down. FieldMessage
 *  has no live role (per-field lines arrive on blur); here the line answers a
 *  submit, so the wrapper is the alert. */
export function AuthMessage({ id, message }: { id: string; message: AuthMessageValue }) {
  return (
    <div id={id} data-part="message" role={message?.tone === "error" ? "alert" : "status"} className="mt-4">
      <FieldMessage
        reserve
        issue={message?.tone === "error" ? { severity: "error", message: message.text } : null}
        hint={message?.tone === "note" ? message.text : undefined}
      />
    </div>
  );
}

/** The commit: full width, ink, with the loader while it waits. */
export function AuthSubmit({ pending, label, pendingLabel }: { pending?: boolean; label: string; pendingLabel?: string }) {
  return (
    <button
      type="submit"
      data-part="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={`mt-4 w-full h-10 flex items-center justify-center gap-2 rounded-md ${COMMIT_FILL} text-sm font-medium disabled:bg-ink/80 disabled:cursor-wait transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:ring-carbon/50`}
    >
      {pending ? (
        <>
          <UwaziLoader size="xs" color="paper" />
          {pendingLabel ?? label}
        </>
      ) : (
        label
      )}
    </button>
  );
}

/** A labelled password input with Show / Hide. */
export function AuthPasswordField({
  label,
  value,
  onChange,
  invalid,
  describedBy,
  autoComplete,
  disabled,
  inputRef,
  name,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  describedBy?: string;
  autoComplete: "current-password" | "new-password";
  disabled?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  name?: string;
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className={AUTH_LABEL}>
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? describedBy : undefined}
          className={`${AUTH_INPUT} pe-10`}
        />
        <button
          type="button"
          data-part="reveal"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-controls={id}
          className={`absolute end-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-md text-ink-tertiary hover:text-ink hover:bg-warm transition-colors ${AUTH_FOCUS_RING}`}
        >
          {show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>
    </div>
  );
}
