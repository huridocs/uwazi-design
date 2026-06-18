import { SettingsContent } from "../SettingsContent";
import { StatsCard } from "../../shared/StatsCard";
import { Table, type Column } from "../Table";
import { entities } from "../../../data/entities";
import {
  seedUsers,
  seedLanguages,
  seedRelationTypes,
  seedActivityLog,
  type SettingsLogEntry,
  type LogMethod,
} from "../../../data/settings";

const methodStyle: Record<LogMethod, string> = {
  CREATE: "bg-success-light text-success",
  UPDATE: "bg-carbon-tint text-carbon",
  DELETE: "bg-seal-tint text-seal",
  MIGRATE: "bg-warning-light text-warning",
};

export function DashboardPage() {
  const connectionTotal = seedRelationTypes.reduce((n, r) => n + r.usageCount, 0);

  const columns: Column<SettingsLogEntry>[] = [
    {
      id: "method",
      header: "Action",
      width: "7rem",
      cell: (e) => (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md w-fit ${methodStyle[e.method]}`}>
          {e.method}
        </span>
      ),
    },
    { id: "summary", header: "Summary", cell: (e) => <span className="text-ink truncate">{e.summary}</span> },
    { id: "time", header: "Time", width: "11rem", cell: (e) => <span dir="ltr" className="text-xs text-ink-tertiary tabular-nums">{e.time}</span> },
  ];

  return (
    <SettingsContent>
      <SettingsContent.Header title="Dashboard" />
      <SettingsContent.Body>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatsCard label="Entities" value={entities.length} accent="blue" />
          <StatsCard label="Connections" value={connectionTotal} accent="green" />
          <StatsCard label="Users" value={seedUsers.length} />
          <StatsCard label="Languages" value={seedLanguages.length} accent="amber" />
        </div>
        <h3 className="text-sm font-semibold text-ink mb-3">Recent activity</h3>
        <Table columns={columns} data={seedActivityLog.slice(0, 5)} getRowId={(e) => e.id} />
      </SettingsContent.Body>
    </SettingsContent>
  );
}
