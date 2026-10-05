import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ConfirmDelete } from "./ConfirmDelete";
import { Select } from "./Select";
import { useSettingsNotify } from "../../hooks/useSettingsNotify";
import {
  deleteRelationTypeAtom,
  groupUsageAtom,
  languageUsageAtom,
  relationTypeUsageAtom,
  templateUsageAtom,
  thesaurusUsageAtom,
  userUsageAtom,
} from "../../atoms/settingsUsage";
import { relationTypesAtom } from "../../atoms/references";
import { deleteThesaurusAtom } from "../../atoms/thesauri";
import { deleteGroupAtom, deleteUserAtom, type GroupWithMembers } from "../../atoms/users";
import { removeAccessMemberAtom } from "../../atoms/entityChanges";
import { dataSourceAtom } from "../../atoms/dataSource";
import { pageUsage } from "../../utils/settingsUsage";
import type {
  SettingsLanguage,
  SettingsMenuLink,
  SettingsPage,
  SettingsRelationType,
  SettingsTemplate,
  SettingsThesaurus,
  SettingsUser,
} from "../../data/settings";

/** One delete dialog per Settings domain: each reads its usage selector
 *  (`atoms/settingsUsage.ts`), refuses where Uwazi refuses, performs the
 *  delete it describes, and records it (`useSettingsNotify`). A page whose
 *  list is its own state passes `onDelete` to drop the row; a page on a store
 *  needs nothing. Each mounts only while open, so its selector runs only then. */

export function TemplateDelete({
  template,
  onCancel,
  onDelete,
}: {
  template: SettingsTemplate | null;
  onCancel: () => void;
  onDelete: (t: SettingsTemplate) => void;
}) {
  return template ? <TemplateDeleteOpen template={template} onCancel={onCancel} onDelete={onDelete} /> : null;
}

function TemplateDeleteOpen({
  template,
  onCancel,
  onDelete,
}: {
  template: SettingsTemplate;
  onCancel: () => void;
  onDelete: (t: SettingsTemplate) => void;
}) {
  const usage = useAtomValue(templateUsageAtom(template));
  const { record } = useSettingsNotify();
  return (
    <ConfirmDelete
      open
      title="Delete template"
      message={`Delete the ${template.name} template? No entities use it.`}
      impact={usage}
      onCancel={onCancel}
      onConfirm={() => {
        onDelete(template);
        record({ method: "DELETE", domain: "template", noun: "template", id: template.id, name: template.name });
        onCancel();
      }}
    />
  );
}

export function ThesaurusDelete({ thesaurus, onCancel }: { thesaurus: SettingsThesaurus | null; onCancel: () => void }) {
  return thesaurus ? <ThesaurusDeleteOpen thesaurus={thesaurus} onCancel={onCancel} /> : null;
}

function ThesaurusDeleteOpen({ thesaurus, onCancel }: { thesaurus: SettingsThesaurus; onCancel: () => void }) {
  const usage = useAtomValue(thesaurusUsageAtom(thesaurus.id));
  const corpus = useAtomValue(dataSourceAtom);
  const deleteThesaurus = useSetAtom(deleteThesaurusAtom);
  const { record } = useSettingsNotify();
  const values = thesaurus.itemCount;
  return (
    <ConfirmDelete
      open
      title="Delete thesaurus"
      message={`Delete the ${thesaurus.name} thesaurus and its ${values.toLocaleString()} ${values === 1 ? "value" : "values"}? No template uses it.`}
      impact={usage}
      onCancel={onCancel}
      onConfirm={() => {
        deleteThesaurus({ corpus, id: thesaurus.id });
        record({ method: "DELETE", domain: "thesaurus", noun: "thesaurus", id: thesaurus.id, name: thesaurus.name });
        onCancel();
      }}
    />
  );
}

export function RelationTypeDelete({
  type,
  types,
  onCancel,
  onDelete,
}: {
  type: SettingsRelationType | null;
  /** The page's list: the move-to choices. */
  types: SettingsRelationType[];
  onCancel: () => void;
  onDelete: (t: SettingsRelationType) => void;
}) {
  return type ? <RelationTypeDeleteOpen type={type} types={types} onCancel={onCancel} onDelete={onDelete} /> : null;
}

function RelationTypeDeleteOpen({
  type,
  types,
  onCancel,
  onDelete,
}: {
  type: SettingsRelationType;
  types: SettingsRelationType[];
  onCancel: () => void;
  onDelete: (t: SettingsRelationType) => void;
}) {
  const usage = useAtomValue(relationTypeUsageAtom(type));
  const registry = useAtomValue(relationTypesAtom);
  const remove = useSetAtom(deleteRelationTypeAtom);
  const { record } = useSettingsNotify();
  const [to, setTo] = useState("");
  // Move-to choices: the other types the references can name, and No label
  // (the Relationships panel's fallback).
  const fold = (s: string) => s.trim().toLowerCase();
  const options = [
    ...types
      .filter((t) => t.id !== type.id)
      .flatMap((t) => {
        const def = registry.find((d) => fold(d.label) === fold(t.name));
        return def && def.id !== usage.registryId ? [{ value: def.id, label: t.name }] : [];
      }),
    { value: "no_label", label: "No label" },
  ];
  const target = options.find((o) => o.value === to);
  return (
    <ConfirmDelete
      open
      title="Delete relationship type"
      message={
        usage.reassignable
          ? `Delete ${type.name}? Its references move to the type you choose first.`
          : `Delete ${type.name}? No references or relationship fields use it.`
      }
      impact={usage}
      confirmLabel={usage.reassignable ? "Move and delete" : "Delete"}
      confirmDisabled={usage.reassignable && !target}
      onCancel={onCancel}
      onConfirm={() => {
        if (usage.registryId) remove({ registryId: usage.registryId, to: usage.reassignable ? to : null });
        onDelete(type);
        record({
          method: "DELETE",
          domain: "relationType",
          noun: "relationship type",
          id: type.id,
          name: type.name,
          detail: usage.reassignable && target ? `${usage.references.toLocaleString()} references moved to ${target.label}.` : undefined,
        });
        onCancel();
      }}
    >
      {usage.reassignable && (
        <div className="space-y-1">
          <span id="reassign-label" className="block text-xs font-medium text-ink-secondary">
            Move references to
          </span>
          <Select
            value={to}
            options={[{ value: "", label: "Choose a type", disabled: true }, ...options]}
            onChange={setTo}
            ariaLabel="Move references to"
          />
        </div>
      )}
    </ConfirmDelete>
  );
}

export function UserDelete({ user, onCancel }: { user: SettingsUser | null; onCancel: () => void }) {
  return user ? <UserDeleteOpen user={user} onCancel={onCancel} /> : null;
}

function UserDeleteOpen({ user, onCancel }: { user: SettingsUser; onCancel: () => void }) {
  const usage = useAtomValue(userUsageAtom(user.id));
  const deleteUser = useSetAtom(deleteUserAtom);
  const unshare = useSetAtom(removeAccessMemberAtom);
  const { record } = useSettingsNotify();
  return (
    <ConfirmDelete
      open
      title="Delete user"
      message={`Delete ${user.username}? They can no longer sign in to this collection.`}
      impact={usage}
      onCancel={onCancel}
      onConfirm={() => {
        deleteUser(user.id);
        unshare(user.id);
        record({ method: "DELETE", domain: "user", noun: "user", id: user.id, name: user.username });
        onCancel();
      }}
    />
  );
}

export function GroupDelete({ group, onCancel }: { group: GroupWithMembers | null; onCancel: () => void }) {
  return group ? <GroupDeleteOpen group={group} onCancel={onCancel} /> : null;
}

function GroupDeleteOpen({ group, onCancel }: { group: GroupWithMembers; onCancel: () => void }) {
  const usage = useAtomValue(groupUsageAtom(group.id));
  const deleteGroup = useSetAtom(deleteGroupAtom);
  const unshare = useSetAtom(removeAccessMemberAtom);
  const { record } = useSettingsNotify();
  return (
    <ConfirmDelete
      open
      title="Delete group"
      message={
        group.memberCount
          ? `Delete the ${group.name} group? Its members keep their accounts.`
          : `Delete the ${group.name} group? It has no members.`
      }
      impact={usage}
      onCancel={onCancel}
      onConfirm={() => {
        deleteGroup(group.id);
        unshare(group.id);
        record({ method: "DELETE", domain: "group", noun: "group", id: group.id, name: group.name });
        onCancel();
      }}
    />
  );
}

export function LanguageDelete({
  language,
  onCancel,
  onDelete,
}: {
  language: SettingsLanguage | null;
  onCancel: () => void;
  onDelete: (l: SettingsLanguage) => void;
}) {
  return language ? <LanguageDeleteOpen language={language} onCancel={onCancel} onDelete={onDelete} /> : null;
}

function LanguageDeleteOpen({
  language,
  onCancel,
  onDelete,
}: {
  language: SettingsLanguage;
  onCancel: () => void;
  onDelete: (l: SettingsLanguage) => void;
}) {
  const usage = useAtomValue(languageUsageAtom(language));
  const { record } = useSettingsNotify();
  return (
    <ConfirmDelete
      open
      title="Uninstall language"
      message={`Uninstall ${language.label}? Other users will be affected by this action.`}
      impact={usage}
      confirmLabel="Uninstall"
      confirmWord="CONFIRM"
      onCancel={onCancel}
      onConfirm={() => {
        onDelete(language);
        record({
          method: "DELETE",
          domain: "language",
          noun: "language",
          id: language.key,
          name: language.label,
          message: `${language.label} uninstalled`,
        });
        onCancel();
      }}
    />
  );
}

export function PageDelete({
  page,
  menu,
  onCancel,
  onDelete,
}: {
  page: SettingsPage | null;
  /** The collection's menu links, to name those that lead to the page. */
  menu: SettingsMenuLink[];
  onCancel: () => void;
  onDelete: (p: SettingsPage) => void;
}) {
  const { record } = useSettingsNotify();
  if (!page) return null;
  return (
    <ConfirmDelete
      open
      title="Delete page"
      message={`Delete “${page.title}”?`}
      impact={pageUsage({ slug: page.slug, menu })}
      onCancel={onCancel}
      onConfirm={() => {
        onDelete(page);
        record({ method: "DELETE", domain: "page", noun: "page", id: page.id, name: page.title });
        onCancel();
      }}
    />
  );
}

/** A template's entity count, from the same selector the delete reads, so
 *  the list and the dialog never disagree. */
export function TemplateEntityCount({ template }: { template: SettingsTemplate }) {
  const usage = useAtomValue(templateUsageAtom(template));
  return <>{usage.entities.toLocaleString()}</>;
}

/** A relationship type's reference count, from the selector its delete reads. */
export function RelationTypeReferenceCount({ type }: { type: SettingsRelationType }) {
  const usage = useAtomValue(relationTypeUsageAtom(type));
  return (
    <>
      {usage.references.toLocaleString()} <span className="text-ink-tertiary">{usage.references === 1 ? "reference" : "references"}</span>
    </>
  );
}
