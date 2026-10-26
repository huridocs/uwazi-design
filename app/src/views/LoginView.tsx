import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { collectionSettings } from "../atoms/settingsSingletons";
import { completeLogInAtom, logInAttemptAtom, loginNoticeAtom, loginStartModeAtom, requestRecoveryAtom } from "../atoms/auth";
import { Checkbox } from "../components/shared/Checkbox";
import {
  AUTH_INPUT,
  AUTH_LABEL,
  AUTH_TEXT_LINK,
  AuthHeading,
  AuthLayout,
  AuthMessage,
  AuthPasswordField,
  AuthSubmit,
  type AuthMessageValue,
} from "../components/auth/AuthLayout";
import { DemoAccounts } from "../components/auth/DemoAccounts";

const REMEMBER_KEY = "uwazi:loginRemember";
/** Uwazi waits a random 500–1000 ms before answering any login, so a reply's
 *  timing says nothing about whether the account exists. */
const loginDelay = () => 500 + Math.random() * 500;
/** Uwazi's `validEmailFormat`. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** One answer for a wrong username, a wrong password and a locked account. */
const LOGIN_FAILED = "Login failed. Check your username and password.";
const CODE_FAILED = "Two-factor verification failed. Check the code and try again.";
const RECOVERY_SENT = "If the email address supplied is correct, we will send instructions to reset the password.";

type Mode = "login" | "two-step" | "forgot";

function readRemembered(): string {
  try {
    return localStorage.getItem(REMEMBER_KEY) ?? "";
  } catch {
    return "";
  }
}

/** The login screen (Uwazi `/login`), in three modes of the same page:
 *  - Log in: username (never an email) and password. Every failure reads the
 *    same, after the same random delay; six of them lock the account.
 *  - Two-step verification: for an account with 2FA, after the password is
 *    right. The username and password are kept and sent again with the code.
 *  - Forgot password: one email field; the confirmation is the same whether
 *    an account has that address or not.
 *  `onLoggedIn` replaces the sign-in (the catalog's frame passes a no-op). */
export function LoginView({ onLoggedIn }: { onLoggedIn?: (userId: string) => void }) {
  const collectionName = useAtomValue(collectionSettings.valueAtom).name;
  const attempt = useSetAtom(logInAttemptAtom);
  const completeLogIn = useSetAtom(completeLogInAtom);
  const requestRecovery = useSetAtom(requestRecoveryAtom);
  const [notice, setNotice] = useAtom(loginNoticeAtom);
  const [startMode, setStartMode] = useAtom(loginStartModeAtom);

  const [mode, setMode] = useState<Mode>(startMode);
  const [identifier, setIdentifier] = useState(readRemembered);
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(() => readRemembered() !== "");
  const [invalid, setInvalid] = useState<{ identifier?: boolean; password?: boolean; token?: boolean; email?: boolean }>({});
  // What the last flow did (a password saved, an account unlocked) opens as
  // the first message; this screen takes it over from there.
  const [message, setMessage] = useState<AuthMessageValue>(() => notice);
  const [pending, setPending] = useState(false);

  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const ids = { identifier: useId(), token: useId(), email: useId(), message: useId() };

  useEffect(() => {
    if (notice) setNotice(null);
    if (startMode !== "login") setStartMode("login");
    return () => window.clearTimeout(timer.current);
    // Read once: the notice belongs to this visit of the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** A new mode starts clean, with the focus on its heading. */
  const switchMode = (next: Mode, msg: AuthMessageValue = null) => {
    window.clearTimeout(timer.current);
    setPending(false);
    setMode(next);
    setInvalid({});
    setMessage(msg);
    setToken("");
    requestAnimationFrame(() => {
      if (next === "login") (identifier ? passwordRef : identifierRef).current?.focus();
      else if (next === "two-step") tokenRef.current?.focus();
      else emailRef.current?.focus();
    });
  };

  const finish = (userId: string) => {
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, identifier.trim());
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {
      // Storage blocked: nothing is remembered.
    }
    if (onLoggedIn) onLoggedIn(userId);
    else completeLogIn(userId);
  };

  const submitLogin = (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const missing = { identifier: !identifier.trim(), password: !password };
    if (missing.identifier || missing.password) {
      setInvalid(missing);
      setMessage({
        tone: "error",
        text: missing.identifier ? (missing.password ? "Enter your username and password." : "Enter your username.") : "Enter your password.",
      });
      (missing.identifier ? identifierRef : passwordRef).current?.focus();
      return;
    }
    setInvalid({});
    setMessage(null);
    setPending(true);
    timer.current = window.setTimeout(() => {
      const result = attempt({ username: identifier, password });
      setPending(false);
      if (result.ok) return finish(result.userId);
      if (result.reason === "token-required") return switchMode("two-step");
      setInvalid({ identifier: true, password: true });
      setMessage({ tone: "error", text: LOGIN_FAILED });
      passwordRef.current?.select();
      passwordRef.current?.focus();
    }, loginDelay());
  };

  const submitToken = (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    if (!token.trim()) {
      setInvalid({ token: true });
      setMessage({ tone: "error", text: "Enter the code from your authenticator app." });
      tokenRef.current?.focus();
      return;
    }
    setInvalid({});
    setMessage(null);
    setPending(true);
    timer.current = window.setTimeout(() => {
      const result = attempt({ username: identifier, password, token });
      setPending(false);
      if (result.ok) return finish(result.userId);
      // A locked account (the sixth wrong code) answers as a failed login.
      if (result.reason === "failed") {
        switchMode("login", { tone: "error", text: LOGIN_FAILED });
        return;
      }
      setToken("");
      setInvalid({ token: true });
      setMessage({ tone: "error", text: CODE_FAILED });
      tokenRef.current?.focus();
    }, loginDelay());
  };

  const submitForgot = (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    if (!EMAIL.test(email.trim())) {
      setInvalid({ email: true });
      setMessage({ tone: "error", text: "Enter a valid email address." });
      emailRef.current?.focus();
      return;
    }
    setPending(true);
    timer.current = window.setTimeout(() => {
      requestRecovery(email.trim());
      setEmail("");
      switchMode("login", { tone: "note", text: RECOVERY_SENT });
    }, 400);
  };

  return (
    <AuthLayout component="LoginView">
      {mode === "login" && (
        <form data-part="form" data-mode="login" onSubmit={submitLogin} noValidate aria-describedby={ids.message}>
          <AuthHeading titleRef={titleRef} eyebrow={collectionName} title="Log in" lead="With your Uwazi username." />
          <div className="mt-8">
            <label htmlFor={ids.identifier} className={AUTH_LABEL}>
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
              className={AUTH_INPUT}
            />
          </div>
          <div className="mt-4">
            <AuthPasswordField
              label="Password"
              name="password"
              inputRef={passwordRef}
              autoComplete="current-password"
              value={password}
              onChange={(v) => {
                setPassword(v);
                if (invalid.password) setInvalid((x) => ({ ...x, password: false }));
              }}
              disabled={pending}
              invalid={invalid.password}
              describedBy={ids.message}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
              <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} disabled={pending} />
              Remember me
            </label>
            <button type="button" data-part="forgot" onClick={() => switchMode("forgot")} className={AUTH_TEXT_LINK}>
              Forgot password or username?
            </button>
          </div>
          <AuthMessage id={ids.message} message={message} />
          <AuthSubmit pending={pending} label="Log in" pendingLabel="Logging in…" />
          <DemoAccounts />
        </form>
      )}

      {mode === "two-step" && (
        <form data-part="form" data-mode="two-step" onSubmit={submitToken} noValidate aria-describedby={ids.message}>
          <AuthHeading
            titleRef={titleRef}
            eyebrow={collectionName}
            title="Two-step verification"
            lead="Open the authenticator app on your device to see your code."
          />
          <div className="mt-8">
            <label htmlFor={ids.token} className={AUTH_LABEL}>
              Authentication code
            </label>
            <input
              ref={tokenRef}
              id={ids.token}
              name="token"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={token}
              onChange={(e) => {
                setToken(e.target.value.replace(/\D/g, ""));
                if (invalid.token) setInvalid({});
              }}
              disabled={pending}
              aria-invalid={invalid.token || undefined}
              aria-describedby={invalid.token ? ids.message : undefined}
              className={`${AUTH_INPUT} font-mono tracking-[0.3em]`}
            />
          </div>
          <AuthMessage id={ids.message} message={message} />
          <AuthSubmit pending={pending} label="Verify" pendingLabel="Verifying…" />
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              data-part="return"
              onClick={() => {
                setPassword("");
                switchMode("login");
              }}
              className={AUTH_TEXT_LINK}
            >
              Return to login
            </button>
          </div>
          <DemoAccounts />
        </form>
      )}

      {mode === "forgot" && (
        <form data-part="form" data-mode="forgot" onSubmit={submitForgot} noValidate aria-describedby={ids.message}>
          <AuthHeading
            titleRef={titleRef}
            eyebrow={collectionName}
            title="Forgot your password?"
            lead="If an account exists with the email you provide, you will receive an email with your username and a link to reset your password."
          />
          <div className="mt-8">
            <label htmlFor={ids.email} className={AUTH_LABEL}>
              Email
            </label>
            <input
              ref={emailRef}
              id={ids.email}
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (invalid.email) setInvalid({});
              }}
              disabled={pending}
              aria-invalid={invalid.email || undefined}
              aria-describedby={invalid.email ? ids.message : undefined}
              className={AUTH_INPUT}
            />
          </div>
          <AuthMessage id={ids.message} message={message} />
          <AuthSubmit pending={pending} label="Send recovery email" pendingLabel="Sending…" />
          <div className="mt-4 flex justify-center">
            <button type="button" data-part="cancel" onClick={() => switchMode("login")} className={AUTH_TEXT_LINK}>
              Cancel
            </button>
          </div>
          <DemoAccounts />
        </form>
      )}
    </AuthLayout>
  );
}
