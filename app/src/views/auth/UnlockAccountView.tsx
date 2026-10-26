import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { authLinkAtom, goToLoginAtom, unlockByLinkAtom } from "../../atoms/auth";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { UwaziLoader } from "../../components/shared/UwaziLoader";

/** Uwazi `/unlockaccount/:username/:code`, from the Account locked email: a
 *  short "Verifying…", then the login screen, saying whether it worked. The
 *  reader is not signed in. */
export function UnlockAccountView({ username, code }: { username: string; code: string }) {
  const unlock = useSetAtom(unlockByLinkAtom);
  const goToLogin = useSetAtom(goToLoginAtom);
  useEffect(() => {
    const t = window.setTimeout(() => {
      const ok = unlock({ username, code });
      goToLogin(
        ok
          ? { tone: "note", text: "Account unlocked. You can log in." }
          : { tone: "error", text: "This unlock link is not valid. Ask\u00a0an administrator to unlock the account." },
      );
    }, 900);
    return () => window.clearTimeout(t);
  }, [username, code, unlock, goToLogin]);
  return (
    <AuthLayout component="UnlockAccountView">
      <div role="status" className="flex flex-col items-center gap-3 py-10 text-sm text-ink-secondary">
        <UwaziLoader size="sm" />
        Verifying…
      </div>
    </AuthLayout>
  );
}

export function UnlockAccountRoute() {
  const link = useAtomValue(authLinkAtom);
  const username = link?.kind === "unlock" ? link.username : "";
  const code = link?.kind === "unlock" ? link.code : "";
  return <UnlockAccountView key={`${username}/${code}`} username={username} code={code} />;
}
