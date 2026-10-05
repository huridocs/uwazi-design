import { useState } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { ArrowRight, RotateCcw } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { SettingsIntro } from "../SettingsListPage";
import { SettingsSection } from "../SettingsSection";
import { StatsCard } from "../../shared/StatsCard";
import { dashboardStatsAtom } from "../../../atoms/dashboardStats";
import { signedInUserAtom } from "../../../atoms/users";
import { resetSettingsDataAtom } from "../../../atoms/settingsCollection";
import { settingsSectionAtom } from "../../../atoms/settings";
import { formatBytes } from "../../../atoms/uploads";
import { SettingsButton } from "../SettingsButton";
import { ConfirmDelete } from "../../shared/ConfirmDelete";
import { useNotify } from "../../../hooks/useNotify";
import type { LogMethod } from "../../../data/settings";
import { activityLogAtom } from "../../../atoms/activityLog";

const methodStyle: Record<LogMethod, string> = {
  CREATE: "bg-success-light text-success",
  UPDATE: "bg-carbon-tint text-carbon",
  DELETE: "bg-seal-tint text-seal-label",
  MIGRATE: "bg-warning-light text-warning",
};
const METHOD_LABEL: Record<LogMethod, string> = { CREATE: "Create", UPDATE: "Update", DELETE: "Delete", MIGRATE: "Migrate" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
/** "Jun 15, 2026 - 18:42", the Activity log's form. */
const stamp = (ms: number) => {
  const d = new Date(ms);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} - ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function DashboardPage() {
  // Every figure for the collection shown, from the stores (atoms/dashboardStats.ts).
  const stats = useAtomValue(dashboardStatsAtom);
  const activity = useAtomValue(activityLogAtom);
  const resetData = useSetAtom(resetSettingsDataAtom);
  const setSection = useSetAtom(settingsSectionAtom);
  const store = useStore();
  const notify = useNotify();
  const [confirmReset, setConfirmReset] = useState(false);

  const recent = activity.slice(0, 5);

  return (
    <SettingsContent component="DashboardPage">
      <SettingsContent.Header title="Dashboard" />
      <SettingsContent.Body>
        <SettingsIntro>The collection at a glance, and the latest changes made to it.</SettingsIntro>
        <div className="flex flex-col gap-6">
          <SettingsSection>
            <div data-part="cards" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <StatsCard
                label="Users"
                value={stats.users.total}
                caption="total users"
                detail={`${stats.users.admin} Admins | ${stats.users.editor} Editors | ${stats.users.collaborator} Collaborators`}
                onOpen={() => setSection("users")}
              />
              <StatsCard label="Storage" value={formatBytes(stats.storage)} caption="Files and database usage" />
              <StatsCard
                label="Entities"
                value={stats.entities.toLocaleString("en-US")}
                caption="total entities"
                detail="Entities across all languages"
              />
              <StatsCard
                label="Files"
                value={stats.files.toLocaleString("en-US")}
                caption="total files"
                detail="Total files from main documents, supporting files and uploads"
                onOpen={() => setSection("uploads")}
              />
              <StatsCard
                label="Relationships"
                value={stats.relationships === null ? "—" : stats.relationships.toLocaleString("en-US")}
                caption="total references"
              />
            </div>
          </SettingsSection>
          <SettingsSection
            title="Recent activity"
            action={
              <SettingsButton
                variant="ghost"
                size="sm"
                icon={<ArrowRight size={14} aria-hidden />}
                onClick={() => setSection("activitylog")}
              >
                Open Activity log
              </SettingsButton>
            }
          >
            {recent.length === 0 ? (
              <p className="text-xs text-ink-tertiary">No activity yet.</p>
            ) : (
              <ul data-part="recent-activity" className="flex flex-col divide-y divide-border-soft border-y border-border-soft">
                {recent.map((e) => (
                  <li key={e.id} className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1 py-2.5 min-w-0">
                    <span className={`text-meta font-semibold px-1.5 py-0.5 rounded-md w-fit shrink-0 ${methodStyle[e.method]}`}>
                      {METHOD_LABEL[e.method]}
                    </span>
                    <span className="text-sm text-ink min-w-0 flex-1 truncate">{e.summary}</span>
                    <span className="text-xs text-ink-tertiary tabular-nums shrink-0" dir="ltr">
                      {e.user} · {stamp(e.at)}
                    </span>
                  </li>
                ))}
              </ul>
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
        message="Settings changes made in this visit go back to the demo data, in every collection: users, groups, thesauri, collection settings, menu, pages, uploads, languages, filters, global CSS and JS, and the activity log."
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
