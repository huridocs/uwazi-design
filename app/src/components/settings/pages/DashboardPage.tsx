import { useState } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { RotateCcw } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { SettingsIntro } from "../SettingsListPage";
import { SettingsSection } from "../SettingsSection";
import { StatsCard } from "../../shared/StatsCard";
import { SettingsTable, type Column } from "../SettingsTable";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { dashboardStatsAtom, formatBytes } from "../../../atoms/dashboardStats";
import { signedInUserAtom } from "../../../atoms/users";
import { resetSettingsDataAtom } from "../../../atoms/settingsCollection";
import { SettingsButton } from "../SettingsButton";
import { ConfirmDelete } from "../../shared/ConfirmDelete";
import { useNotify } from "../../../hooks/useNotify";
import {
  type SettingsLogEntry,
  type LogMethod,
} from "../../../data/settings";
import { activityLogAtom } from "../../../atoms/activityLog";

const methodStyle: Record<LogMethod, string> = {
  CREATE: "bg-success-light text-success",
  UPDATE: "bg-carbon-tint text-carbon",
  DELETE: "bg-seal-tint text-seal-label",
  MIGRATE: "bg-warning-light text-warning",
};

export function DashboardPage() {
  const dataSource = useAtomValue(dataSourceAtom);
  const cejil = dataSource === "cejil";
  const stats = useAtomValue(dashboardStatsAtom);
  const activity = useAtomValue(activityLogAtom);
  const resetData = useSetAtom(resetSettingsDataAtom);
  const store = useStore();
  const notify = useNotify();
  const [confirmReset, setConfirmReset] = useState(false);

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
        <SettingsIntro>The collection at a glance, and the latest changes made to it.</SettingsIntro>
        <div className="flex flex-col gap-6">
          <SettingsSection>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatsCard
                label="Users"
                value={stats.users.total}
                detail={`${stats.users.admin} admin · ${stats.users.editor} ${stats.users.editor === 1 ? "editor" : "editors"} · ${stats.users.collaborator} ${stats.users.collaborator === 1 ? "collaborator" : "collaborators"}`}
              />
              <StatsCard label="Entities" value={stats.entities.toLocaleString()} accent="blue" />
              <StatsCard label="Relationships" value={stats.relationships === null ? "—" : stats.relationships.toLocaleString()} accent="green" />
              <StatsCard label="Files" value={stats.files.toLocaleString()} />
              <StatsCard label="Storage" value={stats.storage === null ? "Not recorded" : formatBytes(stats.storage)} />
              <StatsCard label="Templates" value={stats.templates} />
              <StatsCard label="Languages" value={stats.languages} accent="amber" />
            </div>
          </SettingsSection>
          <SettingsSection title="Recent activity">
            {cejil ? (
              <p className="text-xs text-ink-tertiary">
                The activity log isn't part of the public summa.cejil.org sample. Switch to the Sample
                source to see demo activity.
              </p>
            ) : (
              <SettingsTable columns={columns} data={activity.slice(0, 5)} getRowId={(e) => e.id} />
            )}
          </SettingsSection>
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        {/* The prototype keeps Settings edits for the visit (sessionStorage).
            This puts every collection's settings back to the demo seed. */}
        <SettingsButton
          variant="danger"
          size="sm"
          className="me-auto"
          icon={<RotateCcw size={14} aria-hidden />}
          onClick={() => setConfirmReset(true)}
        >
          Reset demo data
        </SettingsButton>
      </SettingsContent.Footer>
      <ConfirmDelete
        open={confirmReset}
        title="Reset demo data"
        message="Settings changes made in this visit go back to the demo data, in every collection: users, groups, thesauri, collection settings, filters, global CSS and JS, and the activity log."
        confirmLabel="Reset"
        impact={null}
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
