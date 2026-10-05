import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ConfirmDelete } from "./ConfirmDelete";
import { Select } from "./Select";
import { useSettingsNotify } from "../../hooks/useSettingsNotify";
import { useRelationTypeUndo } from "../../hooks/useRelationTypeUndo";
import {
  groupUsageAtom,
  languageUsageAtom,
  relationTypeUsageAtom,
  thesaurusUsageAtom,
  userUsageAtom,
} from "../../atoms/settingsUsage";
import {
  deleteRelationTypeAtom,
  settingsRelationTypesAtom,
  type RelationTypeDeletion,
} from "../../atoms/relationTypes";
import type { RelationTypeDef } from "../../atoms/references";
import { NO_LABEL_RELATION_TYPE } from "../../data/references";
import { deleteThesaurusAtom } from "../../atoms/thesauri";
import { deleteGroupAtom, deleteUserAtom, type GroupWithMembers } from "../../atoms/users";
import { removeAccessMemberAtom } from "../../atoms/entityChanges";
import { dataSourceAtom } from "../../atoms/dataSource";
import { pageUsage } from "../../utils/settingsUsage";
import type {
  SettingsLanguage,
  SettingsMenuLink,
  SettingsPage,
  SettingsThesaurus,
  SettingsUser,
} from "../../data/settings";

/** One delete dialog per Settings domain: each reads its usage selector
 *  (`atoms/settingsUsage.ts`), refuses where Uwazi refuses, performs the
 *  delete it describes, and records it (`useSettingsNotify`). A page whose
 *  list is its own state passes `onDelete` to drop the row; a page on a store
 *  needs nothing. Each mounts only while open, so its selector runs only then. */

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
  onCancel,
  onDeleted,
}: {
  type: RelationTypeDef | null;
  onCancel: () => void;
  /** After the delete, what it removed. */
  onDeleted?: (deletion: RelationTypeDeletion, movedTo: string | null) => void;
}) {
  return type ? <RelationTypeDeleteOpen type={type} onCancel={onCancel} onDeleted={onDeleted} /> : null;
}

function RelationTypeDeleteOpen({
  type,
  onCancel,
  onDeleted,
}: {
  type: RelationTypeDef;
  onCancel: () => void;
  onDeleted?: (deletion: RelationTypeDeletion, movedTo: string | null) => void;
}) {
  const usage = useAtomValue(relationTypeUsageAtom(type.id));
  const registry = useAtomValue(settingsRelationTypesAtom);
  const remove = useSetAtom(deleteRelationTypeAtom);
  const prepareUndo = useRelationTypeUndo();
  const { record } = useSettingsNotify();
  const [to, setTo] = useState("");
  // Move-to choices: every other type, and No label (the Relationships
  // panel's fallback for an untyped reference).
  const options = [
    ...registry.filter((t) => t.id !== type.id).map((t) => ({ value: t.id, label: t.label })),
    { value: NO_LABEL_RELATION_TYPE, label: "No label" },
  ];
  const target = options.find((o) => o.value === to);
  const n = usage.references;
  return (
    <ConfirmDelete
      open
      title="Delete relationship type"
      message={
        usage.reassignable
          ? `Delete ${type.label}? Its ${n.toLocaleString()} ${n === 1 ? "reference moves" : "references move"} to the type you choose, then the type is deleted. Undo in the notifications puts both back.`
          : `Delete ${type.label}? No references or relationship fields use it.`
      }
      impact={usage}
      confirmLabel={usage.reassignable ? "Move and delete" : "Delete"}
      confirmDisabled={usage.reassignable && !target}
      onCancel={onCancel}
      onConfirm={() => {
        const deletion = remove({ id: type.id, to: usage.reassignable ? to : null });
        if (!deletion) return onCancel();
        // One notification, carrying the registry's Undo (it works from
        // anywhere, not only while this page is open).
        record({
          method: "DELETE",
          domain: "relationType",
          noun: "relationship type",
          id: type.id,
          name: type.label,
          message: `${type.label} deleted`,
          detail:
            deletion.moved && target
              ? `${deletion.moved.refIds.length.toLocaleString()} references moved to ${target.label}. Undo puts the type and its references back.`
              : "Undo puts the type back.",
          action: prepareUndo(deletion),
        });
        onDeleted?.(deletion, usage.reassignable && target ? target.label : null);
        onCancel();
      }}
    >
      {usage.reassignable && (
        <div className="space-y-1">
          <span className="block text-xs font-medium text-ink-secondary">Move references to</span>
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
        if (!deleteUser(user.id)) return onCancel();
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
          log: false,
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
        record({ log: false, method: "DELETE", domain: "page", noun: "page", id: page.id, name: page.title });
        onCancel();
      }}
    />
  );
}

/** A relationship type's reference count and templates, from the selector
 *  its delete reads. */
export function RelationTypeReferenceCount({ id }: { id: string }) {
  const usage = useAtomValue(relationTypeUsageAtom(id));
  return (
    <>
      {usage.pending ? "…" : usage.references.toLocaleString()}{" "}
      <span className="text-ink-tertiary">{!usage.pending && usage.references === 1 ? "reference" : "references"}</span>
    </>
  );
}

export function RelationTypeTemplates({ id }: { id: string }) {
  const usage = useAtomValue(relationTypeUsageAtom(id));
  return (
    <span className="flex flex-wrap gap-1">
      {usage.templates.map((t) => (
        <span key={t} className="text-meta text-ink-secondary bg-vellum px-1.5 py-px rounded-md w-fit whitespace-nowrap">
          {t}
        </span>
      ))}
    </span>
  );
}
