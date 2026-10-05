import { useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { signedInUserIdAtom, usersAtom } from "../../atoms/users";
import { FEATURE_LABELS, featureFlagsAtom, type FeatureFlags } from "../../atoms/featureFlags";
import type { UserRole } from "../../data/settings";
import { Select } from "../../components/shared/Select";
import { Checkbox } from "../../components/shared/Checkbox";
import {
  FAIL_SCOPES,
  emptyDomainAtom,
  failNextAtom,
  slowLoadAtom,
  type EmptyDomain,
  type FailScope,
} from "../../atoms/devSwitches";

const EMPTY: { domain: EmptyDomain; label: string }[] = [
  { domain: "templates", label: "Empty templates" },
  { domain: "thesauri", label: "Empty thesauri" },
  { domain: "relationTypes", label: "Empty relationship types" },
  { domain: "activity", label: "Empty activity log" },
];

/** Switches for demos and QA (acceptance "Amendments for run 2"). Each is
 *  cleared by Settings › Dashboard › Reset demo data. */
export function DevPanel() {
  const [armed, setArmed] = useAtom(failNextAtom);
  const [scope, setScope] = useState<FailScope>("save");
  const [reason, setReason] = useState("The server did not answer in time.");
  const [slow, setSlow] = useAtom(slowLoadAtom);
  const empty = useSetAtom(emptyDomainAtom);
  const [emptied, setEmptied] = useState<string | null>(null);
  const users = useAtomValue(usersAtom);
  const [signedIn, setSignedIn] = useAtom(signedInUserIdAtom);
  const role = users.find((u) => u.id === signedIn)?.role ?? "admin";
  const [flags, setFlags] = useAtom(featureFlagsAtom);
  return (
    <div data-component="DevPanel" className="flex flex-col gap-4 max-w-xl">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-ink">Role</h3>
        <p className="text-xs text-ink-tertiary text-pretty">Signs in as the first seed account with the role; the Settings rail follows at once.</p>
        <div className="w-44">
          <Select
            value={role}
            onChange={(r) => {
              const u = users.find((x) => x.role === (r as UserRole));
              if (u) setSignedIn(u.id);
            }}
            options={[
              { value: "admin", label: "Admin" },
              { value: "editor", label: "Editor" },
              { value: "collaborator", label: "Collaborator" },
            ]}
            ariaLabel="Role"
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-ink">Features</h3>
        <div className="flex flex-col gap-1.5">
          {(Object.keys(FEATURE_LABELS) as (keyof FeatureFlags)[]).map((k) => (
            <label key={k} className="flex items-center gap-2 text-xs text-ink cursor-pointer w-fit">
              <Checkbox checked={flags[k] !== false} onChange={() => setFlags((f) => ({ ...f, [k]: f[k] === false }))} ariaLabel={FEATURE_LABELS[k]} />
              <span className="font-mono">{FEATURE_LABELS[k]}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-ink">Fail next request</h3>
        <p className="text-xs text-ink-tertiary text-pretty">
          The next action of this kind fails as a server error would, with this reason, then the switch clears.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <Select value={scope} onChange={(v) => setScope(v as FailScope)} options={FAIL_SCOPES} ariaLabel="Failure scope" />
          </div>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-label="Failure reason"
            className="flex-1 min-w-[12rem] h-8 px-2.5 text-xs bg-paper border border-border rounded-md"
          />
          <button
            type="button"
            onClick={() => setArmed({ scope, reason: reason.trim() || "Request failed." })}
            className="h-8 px-3 text-xs font-medium rounded-md bg-ink text-paper cursor-pointer"
          >
            Arm
          </button>
          {armed && (
            <button type="button" onClick={() => setArmed(null)} className="h-8 px-3 text-xs font-medium rounded-md text-ink-secondary hover:bg-warm cursor-pointer">
              Disarm
            </button>
          )}
        </div>
        <p role="status" className="min-h-4 text-meta text-ink-secondary">
          {armed ? `Armed: the next ${FAIL_SCOPES.find((s) => s.value === armed.scope)?.label.toLowerCase()} fails with “${armed.reason}”.` : "Not armed."}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-ink">Slow load (2 s)</h3>
        <label className="flex items-center gap-2 text-xs text-ink cursor-pointer w-fit">
          <Checkbox checked={slow} onChange={() => setSlow((v) => !v)} ariaLabel="Slow load (2 s)" />
          Settings holds its lists as loading for two seconds each time it opens
        </label>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-ink">Zero rows</h3>
        <p className="text-xs text-ink-tertiary text-pretty">
          Empties a store for the collection shown, past its delete guards, so its empty state can be seen.
        </p>
        <div className="flex flex-wrap gap-2">
          {EMPTY.map((e) => (
            <button
              key={e.domain}
              type="button"
              onClick={() => {
                empty(e.domain);
                setEmptied(e.label);
              }}
              className="h-8 px-3 text-xs font-medium rounded-md bg-warm text-ink hover:bg-parchment cursor-pointer"
            >
              {e.label}
            </button>
          ))}
        </div>
        <p role="status" className="min-h-4 text-meta text-ink-secondary">
          {emptied ? `${emptied}: done. Reset demo data brings the seed back.` : ""}
        </p>
      </section>
    </div>
  );
}
