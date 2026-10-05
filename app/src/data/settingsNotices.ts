import type { LogMethod } from "./settings";

/** Settings' notification texts, Uwazi's own (page-briefs.md, en.csv), in one
 *  place. `useSettingsNotify().record` reads it: a call names a variant with
 *  `notice`, or gets its domain's text for the action.
 *
 *  Two deliberate departures, from the briefs' "defects not to copy": bulk
 *  template deletes say "Template deleted." / "N templates deleted." instead of
 *  "Template(s) deleted successfully.", and Relationship types keep Uwazi's
 *  bare "Updated" only on its own page. */
export const SETTINGS_NOTICES = {
  error: "An error occurred",
  // Templates
  templateSaved: "Template saved successfully.",
  templateDefault: "Default template set successfully.",
  thesaurusCreatedInline: "Thesaurus created successfully.",
  relationTypeCreatedInline: "Relationship type created successfully.",
  // Thesauri
  thesaurusSaved: "Thesauri updated.",
  thesaurusDeleted: "Thesauri deleted",
  // Relationship types (one text for add, edit and delete)
  relationTypeUpdated: "Updated",
  // Users & Groups
  userCreated: "Added new user",
  userUpdated: "User updated",
  userDeleted: "Deleted user",
  groupCreated: "Group saved",
  groupUpdated: "Group updated",
  groupDeleted: "Deleted user group",
  userUnlocked: "Account unlocked successfully",
  user2faDisabled: "Disabled 2FA",
  passwordResetSent: "Instructions to reset the password were sent to the user",
  // Account
  accountUpdated: "Account updated",
  account2faEnabled: "2FA Enabled",
  // Collection, Global CSS & JS, Filters
  collectionSaved: "Settings updated",
  customisationSaved: "Saved successfully.",
  filtersSaved: "Filters saved",
  // Languages and Translations
  languageDefault: "Default language change success",
  languageReset: "Language reset success",
  languagesInstalled: "Languages installed successfully",
  languageUninstalled: "Language uninstalled successfully",
  translationsSaved: "Translations saved",
} as const;

export type NoticeKey = keyof typeof SETTINGS_NOTICES;

type Method = Exclude<LogMethod, "MIGRATE">;
type ByAction = Partial<Record<`${string}:${Method}`, NoticeKey>>;

/** A domain's text for an action when the call names none. */
export const DEFAULT_NOTICES: ByAction = {
  "template:CREATE": "templateSaved",
  "template:UPDATE": "templateSaved",
  "thesaurus:CREATE": "thesaurusSaved",
  "thesaurus:UPDATE": "thesaurusSaved",
  "thesaurus:DELETE": "thesaurusDeleted",
  "relationType:CREATE": "relationTypeUpdated",
  "relationType:UPDATE": "relationTypeUpdated",
  "relationType:DELETE": "relationTypeUpdated",
  "user:CREATE": "userCreated",
  "user:UPDATE": "userUpdated",
  "user:DELETE": "userDeleted",
  "group:CREATE": "groupCreated",
  "group:UPDATE": "groupUpdated",
  "group:DELETE": "groupDeleted",
  "language:DELETE": "languageUninstalled",
  "translations:UPDATE": "translationsSaved",
};

/** Single-text domains whose page wording is replaced by Uwazi's whatever the
 *  call passes. */
export const FIXED_NOTICES: ByAction = {
  "collection:UPDATE": "collectionSaved",
  "customisation:UPDATE": "customisationSaved",
  "filters:UPDATE": "filtersSaved",
};
