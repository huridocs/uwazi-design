import { useState } from "react";
import { useAtom } from "jotai";
import { Select } from "../../components/shared/Select";
import { FAIL_SCOPES, failNextAtom, type FailScope } from "../../atoms/devSwitches";

/** Switches for demos and QA (acceptance "Amendments for run 2"). Each is
 *  cleared by Settings › Dashboard › Reset demo data. */
export function DevPanel() {
  const [armed, setArmed] = useAtom(failNextAtom);
  const [scope, setScope] = useState<FailScope>("save");
  const [reason, setReason] = useState("The server did not answer in time.");
  return (
    <div data-component="DevPanel" className="flex flex-col gap-4 max-w-xl">
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
    </div>
  );
}
