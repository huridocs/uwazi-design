import { useState } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { RotateCcw } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { StatsCard } from "../../shared/StatsCard";
import { SettingsTable, type Column } from "../SettingsTable";
import { entities } from "../../../data/entities";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { cejilDashboardStats } from "../../../data/cejil/settingsAdapt";
import { signedInUserAtom, usersAtom } from "../../../atoms/users";
import { resetSettingsDataAtom } from "../../../atoms/settingsCollection";
import { SettingsButton } from "../SettingsButton";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { useNotify } from "../../../hooks/useNotify";
import {
  seedLanguages,
  type SettingsLogEntry,
  type LogMethod,
} from "../../../data/settings";
import { activityLogAtom } from "../../../atoms/activityLog";
import { referencesAtom } from "../../../atoms/references";

const methodStyle: Record<LogMethod, string> = {
  CREATE: "bg-success-light text-success",
  UPDATE: "bg-carbon-tint text-carbon",
  DELETE: "bg-seal-tint text-seal-label",
  MIGRATE: "bg-warning-light text-warning",
};

export function DashboardPage() {
  const dataSource = useAtomValue(dataSourceAtom);
  const cejil = dataSource === "cejil";
  const userCount = useAtomValue(usersAtom).length;
  const activity = useAtomValue(activityLogAtom);
  const resetData = useSetAtom(resetSettingsDataAtom);
  const store = useStore();
  const notify = useNotify();
  const [confirmReset, setConfirmReset] = useState(false);
  // The Sample's references, counted live (the store the panel writes).
  const connectionTotal = useAtomValue(referencesAtom).length;

  const columns: Column<SettingsLogEntry>[] = [
    {
      id: "method",
      header: "Action",
      width: "7rem",
      cell: (e) => (
        <span className={`text-meta font-semibold px-1.5 py-0.5 rounded-md w-fit ${methodStyle[e.method]}`}>
          {e.method}
        </span>
      ),
    },
    { id: "summary", header: "Summary", cell: (e) => <span className="text-ink truncate">{e.summary}</span> },
    { id: "time", header: "Time", width: "11rem", cell: (e) => <span dir="ltr" className="text-xs text-ink-tertiary tabular-nums">{e.time}</span> },
  ];

  return (
    <SettingsContent component="DashboardPage">
      <SettingsContent.Header title="Dashboard" />
      <SettingsContent.Body>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {cejil ? (
            <>
              <StatsCard label="Entities" value={cejilDashboardStats.entities} accent="blue" />
              <StatsCard label="Relationships" value={cejilDashboardStats.connections} accent="green" />
              <StatsCard label="Templates" value={cejilDashboardStats.templates} />
              <StatsCard label="Languages" value={cejilDashboardStats.languages} accent="amber" />
            </>
          ) : (
            <>
              <StatsCard label="Entities" value={entities.length} accent="blue" />
              <StatsCard label="Relationships" value={connectionTotal} accent="green" />
              <StatsCard label="Users" value={userCount} />
              <StatsCard label="Languages" value={seedLanguages.length} accent="amber" />
            </>
          )}
        </div>
        <h3 className="text-sm font-semibold text-ink mb-3">Recent activity</h3>
        {cejil ? (
          <p className="text-xs text-ink-tertiary">
            The activity log isn't part of the public summa.cejil.org sample. Switch to the Sample
            source to see demo activity.
          </p>
        ) : (
          <SettingsTable columns={columns} data={activity.slice(0, 5)} getRowId={(e) => e.id} />
        )}
      </SettingsContent.Body>
      <SettingsContent.Footer>
        {/* The prototype keeps Settings edits for the visit (sessionStorage).
            This puts every collection's settings back to the demo seed. */}
        <SettingsButton
          variant="ghost"
          size="sm"
          className="me-auto"
          icon={<RotateCcw size={14} aria-hidden />}
          onClick={() => setConfirmReset(true)}
        >
          Reset demo data
        </SettingsButton>
      </SettingsContent.Footer>
      <ConfirmDialog
        open={confirmReset}
        title="Reset demo data"
        message="Settings changes made in this visit go back to the demo data, in every collection: users, groups, thesauri, collection settings, filters, global CSS and JS, and the activity log."
        confirmLabel="Reset"
        variant="danger"
        onConfirm={() => {
          const before = store.get(signedInUserAtom);
          resetData();
          setConfirmReset(false);
          const after = store.get(signedInUserAtom);
          // A user created in this visit is gone after a reset: say who is
          // signed in now rather than switching accounts silently.
          notify(
            before && after && before.id !== after.id
              ? `Demo data reset. ${before.username} no longer exists, so you are signed in as ${after.username}.`
              : "Demo data reset",
            "success",
          );
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </SettingsContent>
  );
}
