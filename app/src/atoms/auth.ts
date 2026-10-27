import { atom, type Getter, type Setter } from "jotai";
import { atomWithStorage, createJSONStorage, RESET } from "jotai/utils";
import { appViewAtom, type AppView } from "./navigation";
import { collectionSettings } from "./settingsSingletons";
import { registerSettingsReset } from "./settingsReset";
import { sessionStateAtom, signedInUserIdAtom, users, usersAtom } from "./users";
import type { SettingsUser } from "../data/settings";

/* Account access as Uwazi does it (Research's inventory,
 * `dev/results/uwazi-auth-flows.md`): log in by username, a second step for
 * accounts with 2FA, a lock after six failures, and three emails with links
 * (Welcome, Password recovery, Account locked). The prototype has no server
 * and no mail: passwords, keys and codes live in this session's store, and
 * every email lands in the outbox that "Sent emails" lists, its link opening
 * the page it names. */

/** Every seed account's password. */
export const DEMO_PASSWORD = "uwazi";
/** The one code the mock authenticator shows, for setting 2FA up and for the
 *  second step at login. A real TOTP cannot be checked without a device. */
export const MOCK_2FA_CODE = "246810";
/** Uwazi's `MAX_FAILED_LOGIN_ATTEMPTS`: wrong passwords and wrong codes count. */
export const MAX_FAILED_LOGINS = 6;
/** Uwazi's recovery and welcome keys expire after 24 hours. */
const KEY_TTL_MS = 24 * 60 * 60 * 1000;
/** A key that is never valid, so the expired-link page can be opened on purpose. */
export const EXPIRED_KEY = "expired";

interface Credential {
  /** Null: nobody knows it (an invited user who has not set one). */
  password: string | null;
  failed: number;
  /** Set while the account is locked; the Account locked email carries it. */
  unlockCode?: string;
}

interface RecoveryKey {
  userId: string;
  expiresAt: number;
}

export type EmailKind = "welcome" | "recovery" | "locked";

export type AuthLink =
  | { kind: "set-password"; key: string; createAccount: boolean }
  | { kind: "unlock"; username: string; code: string };

export interface SentEmail {
  id: string;
  kind: EmailKind;
  to: string;
  subject: string;
  /** Plain text, as Uwazi sends it. The link's line is `link.href`. */
  body: string;
  link: AuthLink & { href: string };
  sentAt: number;
}

interface AuthStore {
  credentials: Record<string, Credential>;
  keys: Record<string, RecoveryKey>;
  outbox: SentEmail[];
}

const hex = (bytes: number) => {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
};

// Origin plus Vite's base path (it ends in "/"), so a build served under a
// subpath (GitHub Pages' /uwazi-design/) links inside it.
const appRoot = () => `${typeof window !== "undefined" ? window.location.origin : "https://uwazi.example"}${import.meta.env.BASE_URL}`;

function linkHref(link: AuthLink): string {
  return link.kind === "set-password"
    ? `${appRoot()}setpassword/${link.key}${link.createAccount ? "?createAccount=true" : ""}`
    : `${appRoot()}unlockaccount/${link.username}/${link.code}`;
}

/** The three emails, Uwazi's subjects and bodies (`domain/email/templates`). */
function composeEmail(kind: EmailKind, user: SettingsUser, link: AuthLink, site: string): SentEmail {
  const href = linkHref(link);
  const name = site || "Uwazi";
  const body =
    kind === "welcome"
      ? [
          "Hello!",
          "",
          `The administrators of ${name} have created an account for you under the user name:`,
          user.username,
          "",
          "To complete this process, please create a strong password by clicking on the following link:",
          href,
          "This link will be valid for 24 hours.",
          "",
          "For more information about the Uwazi platform, visit https://www.uwazi.io.",
          "",
          "Thank you!",
          "Uwazi team",
        ].join("\n")
      : kind === "recovery"
        ? [
            `Your username is: ${user.username}`,
            "To set your password click on the following link:",
            href,
            "This link will be valid for 24 hours.",
          ].join("\n")
        : [
            "Hello,",
            "",
            "Your account has been locked because of too many failed login attempts. To unlock your account open the following link:",
            href,
          ].join("\n");
  const subject = kind === "welcome" ? `Welcome to ${name}` : kind === "recovery" ? "Password recovery" : "Account locked";
  return { id: hex(6), kind, to: user.email, subject, body, link: { ...link, href }, sentAt: Date.now() };
}

/** The seed: kmensah's invitation and tbuergenthal's lock are already in the
 *  outbox, so both demo accounts can be followed from their email. */
function seedStore(): AuthStore {
  const site = "Uwazi";
  const kmensah = { id: "u6", username: "kmensah", email: "k.mensah@example.org" } as SettingsUser;
  const tbuergenthal = { id: "u5", username: "tbuergenthal", email: "t.buergenthal@example.org" } as SettingsUser;
  const invite: AuthLink = { kind: "set-password", key: "invite-kmensah", createAccount: true };
  const unlock: AuthLink = { kind: "unlock", username: "tbuergenthal", code: "unlock-tbuergenthal" };
  return {
    credentials: {
      u5: { password: DEMO_PASSWORD, failed: MAX_FAILED_LOGINS, unlockCode: "unlock-tbuergenthal" },
      u6: { password: null, failed: 0 },
    },
    keys: { "invite-kmensah": { userId: "u6", expiresAt: Number.MAX_SAFE_INTEGER } },
    outbox: [composeEmail("locked", tbuergenthal, unlock, site), composeEmail("welcome", kmensah, invite, site)],
  };
}

const storage = createJSONStorage<AuthStore>(() => {
  try {
    return sessionStorage;
  } catch {
    return undefined as unknown as Storage;
  }
});
const isStore = (v: unknown): v is AuthStore =>
  !!v && typeof v === "object" && "credentials" in v && "keys" in v && Array.isArray((v as AuthStore).outbox);
const authStoreAtom = atomWithStorage<AuthStore>(
  "uwazi:settings:auth",
  seedStore(),
  { ...storage, getItem: (k, init) => {
    const v = storage.getItem(k, init);
    return isStore(v) ? v : init;
  } },
  { getOnInit: true },
);
// After the users store (it registered first), so the seed's accounts exist again.
registerSettingsReset((set) => set(authStoreAtom, RESET));

const credentialOf = (s: AuthStore, id: string): Credential => s.credentials[id] ?? { password: DEMO_PASSWORD, failed: 0 };
const fold = (x: string) => x.trim().toLowerCase();
const siteName = (get: Getter) => get(collectionSettings.valueAtom).name;

/** Newest first, for "Sent emails". */
export const outboxAtom = atom((get) => [...get(authStoreAtom).outbox].sort((a, b) => b.sentAt - a.sentAt));

function patchStore(get: Getter, set: Setter, fn: (s: AuthStore) => AuthStore) {
  set(authStoreAtom, fn(get(authStoreAtom)));
}
function send(get: Getter, set: Setter, kind: EmailKind, user: SettingsUser, link: AuthLink) {
  const email = composeEmail(kind, user, link, siteName(get));
  patchStore(get, set, (s) => ({ ...s, outbox: [...s.outbox, email] }));
}
function newRecoveryKey(get: Getter, set: Setter, userId: string): string {
  const key = hex(16);
  patchStore(get, set, (s) => ({ ...s, keys: { ...s.keys, [key]: { userId, expiresAt: Date.now() + KEY_TTL_MS } } }));
  return key;
}

/** One failed password or code. The sixth locks the account and sends the
 *  Account locked email; the count resets only on a login or an unlock. */
function fail(get: Getter, set: Setter, user: SettingsUser) {
  const cred = credentialOf(get(authStoreAtom), user.id);
  const failed = cred.failed + 1;
  const locks = failed >= MAX_FAILED_LOGINS && !user.locked;
  const unlockCode = locks ? hex(16) : cred.unlockCode;
  patchStore(get, set, (s) => ({ ...s, credentials: { ...s.credentials, [user.id]: { ...cred, failed, unlockCode } } }));
  if (locks) {
    set(users.patchAtom, { id: user.id, patch: { locked: true } });
    send(get, set, "locked", user, { kind: "unlock", username: user.username, code: unlockCode! });
  }
}

function clearLock(get: Getter, set: Setter, user: SettingsUser, password?: string | null) {
  patchStore(get, set, (s) => {
    const cred = credentialOf(s, user.id);
    return {
      ...s,
      credentials: { ...s.credentials, [user.id]: { password: password === undefined ? cred.password : password, failed: 0 } },
    };
  });
  if (user.locked) set(users.patchAtom, { id: user.id, patch: { locked: false } });
}

export type LoginResult = { ok: true; userId: string } | { ok: false; reason: "failed" | "token-required" | "token-invalid" };

/** `POST /api/login`. Username only (Uwazi does not take an email here). An
 *  unknown user, a wrong password and a locked account give the same answer. */
export const logInAttemptAtom = atom(
  null,
  (get, set, { username, password, token }: { username: string; password: string; token?: string }): LoginResult => {
    const user = get(usersAtom).find((u) => fold(u.username) === fold(username));
    if (!user) return { ok: false, reason: "failed" };
    const cred = credentialOf(get(authStoreAtom), user.id);
    if (cred.password === null || cred.password !== password) {
      if (!user.locked) fail(get, set, user);
      return { ok: false, reason: "failed" };
    }
    if (user.locked) return { ok: false, reason: "failed" };
    if (user.using2fa) {
      if (!token) return { ok: false, reason: "token-required" };
      if (token.trim() !== MOCK_2FA_CODE) {
        fail(get, set, user);
        return { ok: false, reason: "token-invalid" };
      }
    }
    patchStore(get, set, (s) => ({ ...s, credentials: { ...s.credentials, [user.id]: { ...cred, failed: 0 } } }));
    return { ok: true, userId: user.id };
  },
);

/** `POST /api/recoverpassword`: an account with this email gets the Password
 *  recovery email; any other address gets nothing, and the screen says the
 *  same either way. */
export const requestRecoveryAtom = atom(null, (get, set, email: string) => {
  const user = get(usersAtom).find((u) => fold(u.email) === fold(email));
  if (!user) return;
  send(get, set, "recovery", user, { kind: "set-password", key: newRecoveryKey(get, set, user.id), createAccount: false });
});

/** Settings › Users & Groups › Reset password: the same email, to the user. */
export const adminResetPasswordAtom = atom(null, (get, set, userId: string) => {
  const user = get(usersAtom).find((u) => u.id === userId);
  if (user) send(get, set, "recovery", user, { kind: "set-password", key: newRecoveryKey(get, set, user.id), createAccount: false });
});

/** A new account: the password the admin typed, or one nobody knows, and the
 *  Welcome email, which Uwazi always sends. */
export const inviteUserAtom = atom(null, (get, set, { userId, password }: { userId: string; password: string }) => {
  const user = get(usersAtom).find((u) => u.id === userId);
  if (!user) return;
  patchStore(get, set, (s) => ({ ...s, credentials: { ...s.credentials, [userId]: { password: password || null, failed: 0 } } }));
  send(get, set, "welcome", user, { kind: "set-password", key: newRecoveryKey(get, set, userId), createAccount: true });
});

/** `POST /api/resetpassword`. Sets the password, clears the lock and spends
 *  the key. False for a key that was used, has expired or never existed. */
export const resetPasswordAtom = atom(null, (get, set, { key, password }: { key: string; password: string }): boolean => {
  const entry = get(authStoreAtom).keys[key];
  if (key === EXPIRED_KEY || !entry || entry.expiresAt < Date.now()) return false;
  const user = get(usersAtom).find((u) => u.id === entry.userId);
  if (!user) return false;
  clearLock(get, set, user, password);
  patchStore(get, set, (s) => {
    const keys = { ...s.keys };
    delete keys[key];
    return { ...s, keys };
  });
  return true;
});

/** `POST /api/unlockaccount`. The code does not expire. */
export const unlockByLinkAtom = atom(null, (get, set, { username, code }: { username: string; code: string }): boolean => {
  const user = get(usersAtom).find((u) => u.username === username);
  if (!user || !user.locked || credentialOf(get(authStoreAtom), user.id).unlockCode !== code) return false;
  clearLock(get, set, user);
  return true;
});

/** An admin's Unlock account clears the counter with the flag. */
export const clearFailedLoginsAtom = atom(null, (get, set, userId: string) => {
  const user = get(usersAtom).find((u) => u.id === userId);
  if (user) clearLock(get, set, user);
});

/** Whether `password` is the account's current one (the "Enter your current
 *  password to confirm" dialog, and Account's password change). */
export const passwordCheckAtom = atom((get) => (userId: string | undefined, password: string) => {
  if (!userId) return false;
  return credentialOf(get(authStoreAtom), userId).password === password;
});

export const setOwnPasswordAtom = atom(null, (get, set, { userId, password }: { userId: string; password: string }) => {
  patchStore(get, set, (s) => ({
    ...s,
    credentials: { ...s.credentials, [userId]: { ...credentialOf(s, userId), password } },
  }));
});

/* ── Session ────────────────────────────────────────────────────────────── */

export interface AuthNotice {
  tone: "note" | "error";
  text: string;
}
/** A line the login screen shows when it opens: what the last flow did
 *  (a password saved, an account unlocked, recovery requested). Uwazi says
 *  these in toasts; the auth screens have no Beacon, so they say it in place. */
export const loginNoticeAtom = atom<AuthNotice | null>(null);

/** The view to return to after logging in (a prototype addition: Uwazi
 *  always lands on `/`). Set when a session ends under a page. */
export const returnToAtom = atom<AppView | null>(null);

/** The last view the reader worked in (not the catalog or an account screen),
 *  kept by `App`, so a session ended from the catalog's Dev panel returns to it. */
export const lastWorkViewAtom = atom<AppView>("library");
const WORK_VIEWS: AppView[] = ["entity", "library", "import-csv", "settings"];
export const isWorkView = (v: AppView) => WORK_VIEWS.includes(v);

/** The link an email opened (`/setpassword/…`, `/unlockaccount/…`). */
export const authLinkAtom = atom<AuthLink | null>(null);

/** Open a link from "Sent emails": the page it names, without the app's chrome. */
export const openAuthLinkAtom = atom(null, (_get, set, link: AuthLink) => {
  set(authLinkAtom, link);
  set(appViewAtom, link.kind === "set-password" ? "set-password" : "unlock-account");
});

/** The mode the login screen opens in: "forgot" from an expired link's
 *  "Request a new link". Read once when the screen mounts. */
export const loginStartModeAtom = atom<"login" | "forgot">("login");

/** Go to the login screen, with a line for it to show. */
export const goToLoginAtom = atom(null, (_get, set, notice: AuthNotice | null = null, mode: "login" | "forgot" = "login") => {
  set(loginNoticeAtom, notice);
  set(loginStartModeAtom, mode);
  set(authLinkAtom, null);
  set(appViewAtom, "login");
});

export const completeLogInAtom = atom(null, (get, set, userId: string) => {
  set(signedInUserIdAtom, userId);
  set(sessionStateAtom, "signed-in");
  set(loginNoticeAtom, null);
  const back = get(returnToAtom);
  set(returnToAtom, null);
  set(appViewAtom, back && back !== "login" ? back : "library");
});

/** `GET /logout`: back to `/`, which a public collection shows to anonymous
 *  visitors and a private one answers with the login screen (`App`). */
export const logOutAtom = atom(null, (_get, set) => {
  set(sessionStateAtom, "signed-out");
  set(returnToAtom, null);
  set(appViewAtom, "library");
});

/** A session that ended under the reader (closed browser, 14 days idle).
 *  Uwazi sends the next request to `/login`; the prototype remembers the view
 *  to return to. */
export const endSessionAtom = atom(null, (get, set) => {
  const view = get(appViewAtom);
  set(sessionStateAtom, "signed-out");
  set(returnToAtom, isWorkView(view) ? view : get(lastWorkViewAtom));
  set(loginNoticeAtom, { tone: "note", text: "Your session ended. Log in again to continue." });
  set(appViewAtom, "login");
});
