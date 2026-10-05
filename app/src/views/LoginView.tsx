import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginArtFallback, loginArtSrcSet, pickLoginArt } from "../data/loginArt";
import { useAtomValue } from "jotai";
import { usersAtom } from "../atoms/users";
import type { SettingsUser } from "../data/settings";
import { settingsDocumentation } from "../atoms/settings";
import { UwaziLoader } from "../components/shared/UwaziLoader";
import { Checkbox } from "../components/shared/Checkbox";
import { FieldMessage } from "../components/shared/FieldMessage";
import { FORM_INPUT_LG, MODAL_LABEL } from "../components/shared/ModalParts";
import { COMMIT_FILL } from "../components/shared/warmButton";
import { Wordmark } from "../components/shared/Wordmark";

/** Mock credentials: a username from the users store (`atoms/users.ts`), and
 *  any password of at least four characters. */
const MIN_PASSWORD = 4;
const REMEMBER_KEY = "uwazi:loginRemember";
const LOGIN_DELAY_MS = 800;

const FOOTER_LINKS = [
  { label: "Website", href: "https://uwazi.io" },
  { label: "Documentation", href: settingsDocumentation.external! },
  { label: "Contribute", href: "https://github.com/huridocs/uwazi" },
];
const VERSION = "Uwazi v2 · 2026 prototype";

// The shared field at its larger size (`FORM_INPUT_LG`): MODAL_INPUT's 2rem
// and 12px read as a dialog's dense fields in a page-wide form.
// `login-field` only keeps browser autofill in the theme (index.css).
const INPUT = `login-field ${FORM_INPUT_LG} transition-colors`;
const LABEL = `${MODAL_LABEL} mb-1.5`;
/** The two small text-and-icon controls in the form (reveal, forgot). The
 *  app has no shared icon-button or text-link style yet. */
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30";

function readRemembered(): string {
  try {
    return localStorage.getItem(REMEMBER_KEY) ?? "";
  } catch {
    return "";
  }
}

function findUser(users: SettingsUser[], username: string) {
  const name = username.trim().toLowerCase();
  return users.find((u) => u.username.toLowerCase() === name);
}

type Message = { kind: "error" | "note"; text: string } | null;

/** The login screen: an art panel beside the form (above it on phones).
 *  Fills its parent, so the app shell and the catalog frame can both host it. */
export function LoginView({ onLoggedIn }: { onLoggedIn: (username: string) => void }) {
  const art = pickLoginArt();
  // The users store, so an account added in Settings can sign in and a deleted one can't.
  const users = useAtomValue(usersAtom);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const [identifier, setIdentifier] = useState(readRemembered);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(() => readRemembered() !== "");
  const [showPassword, setShowPassword] = useState(false);
  const [invalid, setInvalid] = useState<{ identifier?: boolean; password?: boolean }>({});
  const [message, setMessage] = useState<Message>(null);
  const [pending, setPending] = useState(false);

  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const ids = { identifier: useId(), password: useId(), message: useId() };

  // A cached image can finish before React attaches onLoad.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const missing = { identifier: !identifier.trim(), password: !password };
    if (missing.identifier || missing.password) {
      setInvalid(missing);
      setMessage({
        kind: "error",
        text: missing.identifier
          ? missing.password
            ? "Enter your username and password."
            : "Enter your username."
          : "Enter your password.",
      });
      (missing.identifier ? identifierRef : passwordRef).current?.focus();
      return;
    }
    setInvalid({});
    setMessage(null);
    setPending(true);
    timer.current = window.setTimeout(() => {
      const user = findUser(users, identifier);
      if (!user || password.length < MIN_PASSWORD) {
        setPending(false);
        setInvalid({ identifier: true, password: true });
        setMessage({ kind: "error", text: "The username or password is incorrect." });
        passwordRef.current?.select();
        passwordRef.current?.focus();
        return;
      }
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, identifier.trim());
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        // Storage blocked: nothing is remembered.
      }
      onLoggedIn(user.username);
    }, LOGIN_DELAY_MS);
  };

  return (
    <div
      data-component="LoginView"
      className="h-full min-h-0 flex flex-col md:flex-row bg-paper overflow-y-auto md:overflow-hidden"
    >
      {/* The art. A phone shows it as a band above the form. The box has its
          size before the image arrives, so nothing moves when it does; paper
          shows until then and the image fades in over it. */}
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

      <div
        data-part="panel"
        data-gutter-host
        className="gutter-host-rail flex-1 md:min-h-0 md:overflow-y-auto flex flex-col"
      >
        <header data-part="brand" className="pt-8 pb-6 flex justify-center">
          <Wordmark />
        </header>

        <div data-part="body" className="flex-1 flex items-center justify-center py-6">
          <form
            data-part="form"
            onSubmit={submit}
            noValidate
            aria-describedby={ids.message}
            className="w-full max-w-[22.5rem]"
          >
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Log in</h1>
            <p className="mt-1.5 text-sm text-ink-tertiary">With your Uwazi username.</p>

            <div className="mt-8">
              <label htmlFor={ids.identifier} className={LABEL}>
                Username
              </label>
              <input
                ref={identifierRef}
                id={ids.identifier}
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="e.g. admin"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (invalid.identifier) setInvalid((v) => ({ ...v, identifier: false }));
                }}
                disabled={pending}
                aria-invalid={invalid.identifier || undefined}
                aria-describedby={invalid.identifier ? ids.message : undefined}
                className={INPUT}
              />
            </div>

            <div className="mt-4">
              <label htmlFor={ids.password} className={LABEL}>
                Password
              </label>
              <div className="relative">
                <input
                  ref={passwordRef}
                  id={ids.password}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (invalid.password) setInvalid((v) => ({ ...v, password: false }));
                  }}
                  disabled={pending}
                  aria-invalid={invalid.password || undefined}
                  aria-describedby={invalid.password ? ids.message : undefined}
                  className={`${INPUT} pe-10`}
                />
                <button
                  type="button"
                  data-part="reveal"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-controls={ids.password}
                  className={`absolute end-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-md text-ink-tertiary hover:text-ink hover:bg-warm transition-colors ${FOCUS_RING}`}
                >
                  {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
                <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} disabled={pending} />
                Remember me
              </label>
              <button
                type="button"
                data-part="forgot"
                onClick={() =>
                  setMessage({
                    kind: "note",
                    text: "Password reset isn’t part of this prototype.",
                  })
                }
                className={`text-sm text-ink-secondary underline decoration-border underline-offset-4 hover:text-ink hover:decoration-ink-tertiary transition-colors rounded-sm ${FOCUS_RING}`}
              >
                Forgot password?
              </button>
            </div>

            {/* One message line, the shared FieldMessage, always mounted at its
                height (`reserve`) so an error or a note never pushes the button
                down. FieldMessage has no live role (per-field lines arrive on
                blur); here the line answers a submit, so the wrapper is the
                alert. Every message fits one line at phone width. */}
            <div id={ids.message} data-part="message" role={message?.kind === "error" ? "alert" : "status"} className="mt-4">
              <FieldMessage
                reserve
                issue={message?.kind === "error" ? { severity: "error", message: message.text } : null}
                hint={message?.kind === "note" ? message.text : undefined}
              />
            </div>

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
                  Logging in…
                </>
              ) : (
                "Log in"
              )}
            </button>

            <p className="mt-4 text-meta text-ink-tertiary">
              Prototype: log in as admin, mlopez or another seed user, with any password of {MIN_PASSWORD}+
              characters.
            </p>
          </form>
        </div>

        <footer data-part="footer" className="py-6 flex flex-col items-center gap-2 text-meta text-ink-tertiary">
          <nav aria-label="About Uwazi" className="flex flex-wrap justify-center gap-x-5 gap-y-1">
            {FOOTER_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`hover:text-ink underline-offset-4 hover:underline transition-colors rounded-sm ${FOCUS_RING}`}
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
