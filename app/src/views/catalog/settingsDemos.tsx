import { useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { SettingsListPage, useSettingsSearch } from "../../components/settings/SettingsListPage";
import { SettingsEmptyState } from "../../components/settings/SettingsEmptyState";
import { SettingsTable, type Column } from "../../components/settings/SettingsTable";
import { RowActions } from "../../components/settings/RowActions";
import { SettingsEditor, SettingsFormPage } from "../../components/settings/SettingsEditor";
import {
  SettingsCheckList,
  SettingsCheckRow,
  SettingsFieldRow,
  SettingsForm,
  SettingsSection,
  SettingsStat,
} from "../../components/settings/SettingsSection";
import { SettingsField, TextInput } from "../../components/settings/SettingsField";
import { SettingsButton } from "../../components/settings/SettingsButton";
import { Checkbox } from "../../components/shared/Checkbox";
import { useSettingsDraft } from "../../hooks/useSettingsDraft";

/* Live demos for the Settings primitives in the component catalog. */

type Row = { id: string; name: string; items: number };
const ROWS: Row[] = [
  { id: "1", name: "Violation types", items: 8 },
  { id: "2", name: "Countries", items: 35 },
  { id: "3", name: "Case status", items: 5 },
];

export function SettingsListPageDemo() {
  const search = useSettingsSearch(ROWS, (r) => r.name);
  const columns: Column<Row>[] = [
    { id: "name", header: "Thesaurus", cell: (r) => <span className="font-medium text-ink truncate">{r.name}</span> },
    { id: "items", header: "Items", width: "6rem", cell: (r) => <span className="text-ink-secondary tabular-nums">{r.items}</span> },
    { id: "actions", header: "", width: "4rem", align: "right", cell: (r) => <RowActions label={r.name} onDelete={() => {}} /> },
  ];
  return (
    <div className="h-[26rem] rounded-md overflow-hidden border border-border">
      <SettingsListPage
        component="CatalogListPage"
        title="Thesauri"
        intro="Controlled vocabularies you can attach to template properties."
        search={{ value: search.query, onChange: search.setQuery, label: "Search thesauri" }}
        lead={{ label: "Add thesaurus", onClick: () => {} }}
      >
        <SettingsTable
          columns={columns}
          data={search.rows}
          getRowId={(r) => r.id}
          onRowClick={() => {}}
          rowAriaLabel={(r) => `Edit ${r.name}`}
          emptyState={
            <SettingsEmptyState
              icon={<BookOpen size={16} />}
              title="No thesauri yet"
              query={search.query}
              onClearQuery={search.clear}
            />
          }
        />
      </SettingsListPage>
    </div>
  );
}

export function SettingsEmptyStateDemo() {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div className="rounded-md bg-paper py-8 px-4 border border-border">
        <SettingsEmptyState
          icon={<BookOpen size={16} />}
          title="No thesauri yet"
          hint="A thesaurus gives a property a fixed list of values to choose from."
          action={{ label: "Add thesaurus", onClick: () => {} }}
        />
      </div>
      <div className="rounded-md bg-paper py-8 px-4 border border-border">
        <SettingsEmptyState title="No thesauri yet" query="zzz" onClearQuery={() => {}} />
      </div>
    </div>
  );
}

export function SettingsSectionDemo() {
  const [groups, setGroups] = useState<string[]>(["lit"]);
  const toggle = (id: string) => setGroups((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  return (
    <div className="bg-paper rounded-md p-4 border border-border">
      <SettingsForm>
        <SettingsSection>
          <SettingsFieldRow>
            <SettingsField label="Username">
              <TextInput defaultValue="mlopez" />
            </SettingsField>
            <SettingsField label="Email">
              <TextInput type="email" defaultValue="m.lopez@cejil.org" />
            </SettingsField>
          </SettingsFieldRow>
        </SettingsSection>
        <SettingsSection
          title="Groups"
          description="Groups share access to entities among several users."
          action={
            <SettingsButton variant="secondary" size="sm" icon={<Plus size={14} />}>
              Add group
            </SettingsButton>
          }
        >
          <SettingsCheckList>
            {[
              { id: "lit", name: "Litigation" },
              { id: "res", name: "Research" },
            ].map((g) => (
              <SettingsCheckRow key={g.id}>
                <Checkbox checked={groups.includes(g.id)} onChange={() => toggle(g.id)} ariaLabel={g.name} />
                <span className="text-sm font-medium text-ink flex-1">{g.name}</span>
              </SettingsCheckRow>
            ))}
          </SettingsCheckList>
        </SettingsSection>
        <SettingsSection title="Training">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
            <SettingsStat label="Documents" value={142} />
            <SettingsStat label="Reviewed" value={37} />
            <SettingsStat label="Pending" value={5} />
            <SettingsStat label="Accuracy" value="58%" />
          </dl>
        </SettingsSection>
      </SettingsForm>
    </div>
  );
}

export function SettingsEditorDemo() {
  const editor = useSettingsDraft({ id: "catalog-editor", label: "Catalog edits", saved: { name: "Appealed to" } });
  const page = useSettingsDraft({ id: "catalog-form-page", label: "Catalog edits", saved: { name: "Inter-American Human Rights Archive" } });
  return (
    <div className="grid lg:grid-cols-2 gap-3">
      <div className="h-[18rem] rounded-md overflow-hidden border border-border">
        <SettingsEditor
          component="CatalogEditor"
          path={["Relationship types"]}
          title="Appealed to"
          onBack={() => {}}
          dirty={editor.dirty}
          valid={!!editor.draft.name.trim()}
          onSave={() => editor.markSaved()}
        >
          <SettingsSection>
            <SettingsField label="Name">
              <TextInput value={editor.draft.name} onChange={(e) => editor.update({ name: e.target.value })} />
            </SettingsField>
          </SettingsSection>
        </SettingsEditor>
      </div>
      <div className="h-[18rem] rounded-md overflow-hidden border border-border">
        <SettingsFormPage
          component="CatalogFormPage"
          title="Collection"
          dirty={page.dirty}
          onSave={() => page.markSaved()}
          onDiscard={page.discard}
        >
          <SettingsSection>
            <SettingsField label="Collection name">
              <TextInput value={page.draft.name} onChange={(e) => page.update({ name: e.target.value })} />
            </SettingsField>
          </SettingsSection>
        </SettingsFormPage>
      </div>
    </div>
  );
}
