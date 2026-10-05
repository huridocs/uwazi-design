import type { ReactNode } from "react";
import { SettingsContent } from "./SettingsContent";
import { SettingsButton } from "./SettingsButton";
import { SettingsForm } from "./SettingsSection";
import { SettingsIntro } from "./SettingsListPage";

interface SaveProps {
  /** From `useSettingsDraft`. The commit is enabled only while dirty. */
  dirty: boolean;
  /** Further conditions for saving (a required name). Default true. */
  valid?: boolean;
  onSave: () => void;
  /** A save was attempted and blocked by an error: the commit stays
   *  focusable but reads as unavailable (`aria-disabled`). */
  saveBlocked?: boolean;
  /** A line before the buttons, on the footer's fixed row: a save-attempt
   *  summary (`role="alert"`) or a count. */
  footerStatus?: ReactNode;
}

function CommitButton({
  variant,
  dirty,
  valid = true,
  saveBlocked = false,
  onSave,
  children,
}: Omit<SaveProps, "footerStatus"> & { variant: "commit" | "success"; children: ReactNode }) {
  return (
    <SettingsButton
      variant={variant}
      size="sm"
      disabled={!dirty || !valid}
      aria-disabled={saveBlocked || undefined}
      className={saveBlocked ? "opacity-60" : undefined}
      onClick={onSave}
    >
      {children}
    </SettingsButton>
  );
}

/** The detail page a list opens (list → detail):
 *
 *    Header: breadcrumb to the list · title · back arrow (guarded)
 *    Body:   `SettingsForm` (40rem column, or `wide`) of `SettingsSection`s
 *    Footer: `footerStart` actions · Cancel (ghost) · the commit
 *
 *  A new record commits in ink with `createLabel` ("Create template"); an
 *  existing one saves in green with "Save". Cancel is the explicit discard
 *  and is not guarded; the back arrow and breadcrumb are. */
export function SettingsEditor({
  component,
  path,
  title,
  onBack,
  isNew = false,
  createLabel = "Create",
  saveLabel = "Save",
  intro,
  toolbar,
  wide = false,
  footerStart,
  footerStatus,
  overlays,
  children,
  ...save
}: SaveProps & {
  component: string;
  /** A line on what the editor is for, above the form. */
  intro?: ReactNode;
  /** A `SettingsToolbar` (search over a long grid), above the form. */
  toolbar?: ReactNode;
  /** The list's name, as the breadcrumb ("Templates"). */
  path: string[];
  title: ReactNode;
  /** Back to the list. Also Cancel. */
  onBack: () => void;
  isNew?: boolean;
  createLabel?: string;
  saveLabel?: string;
  wide?: boolean;
  /** Actions on the start of the footer, before Cancel (rare; a section's
   *  own action belongs on its heading). */
  footerStart?: ReactNode;
  overlays?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SettingsContent component={component}>
      <SettingsContent.Header path={path} title={title} onBack={onBack} />
      <SettingsContent.Body>
        {intro && <SettingsIntro>{intro}</SettingsIntro>}
        {toolbar}
        <SettingsForm wide={wide}>{children}</SettingsForm>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        {footerStart && <div className="me-auto flex items-center gap-2">{footerStart}</div>}
        {footerStatus}
        <SettingsButton variant="ghost" size="sm" onClick={onBack}>
          Cancel
        </SettingsButton>
        <CommitButton variant={isNew ? "commit" : "success"} {...save}>
          {isNew ? createLabel : saveLabel}
        </CommitButton>
      </SettingsContent.Footer>
      {overlays}
    </SettingsContent>
  );
}

/** A top-level page that is one form (Account, Collection, Filters):
 *
 *    Header: title
 *    Body:   intro line · `SettingsForm` of `SettingsSection`s
 *    Footer: Discard changes (ghost) · Save (green)
 *
 *  One save per page. Both buttons are enabled only while dirty; Discard
 *  returns the draft to the last save (`useSettingsDraft().discard`). The
 *  page stays open after Save, so `onSave` calls `markSaved`. */
export function SettingsFormPage({
  component,
  title,
  intro,
  onDiscard,
  saveLabel = "Save",
  wide = false,
  fill = false,
  footerStart,
  footerStatus,
  overlays,
  children,
  ...save
}: SaveProps & {
  component: string;
  title: string;
  /** The form grows to the body's height (Global CSS & JS's editor). */
  fill?: boolean;
  intro?: ReactNode;
  onDiscard: () => void;
  saveLabel?: string;
  wide?: boolean;
  footerStart?: ReactNode;
  overlays?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SettingsContent component={component}>
      <SettingsContent.Header title={title} />
      <SettingsContent.Body className={fill ? "flex flex-col" : ""}>
        {intro && <SettingsIntro>{intro}</SettingsIntro>}
        <SettingsForm wide={wide} fill={fill}>
          {children}
        </SettingsForm>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        {footerStart && <div className="me-auto flex items-center gap-2">{footerStart}</div>}
        {footerStatus}
        <SettingsButton variant="ghost" size="sm" disabled={!save.dirty} onClick={onDiscard}>
          Discard changes
        </SettingsButton>
        <CommitButton variant="success" {...save}>
          {saveLabel}
        </CommitButton>
      </SettingsContent.Footer>
      {overlays}
    </SettingsContent>
  );
}
