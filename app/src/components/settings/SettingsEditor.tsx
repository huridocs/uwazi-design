import { useState, type ReactNode } from "react";
import { SettingsContent } from "./SettingsContent";
import { SettingsButton } from "./SettingsButton";
import { SettingsForm } from "./SettingsSection";
import { SettingsIntro } from "./SettingsListPage";
import { SettingsSelectionBar, type SettingsSelection } from "./SettingsSelectionBar";
import { blockingSummary } from "../../utils/validation";

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
  /** What blocks saving, one line each ("Name is required"). With any, the
   *  commit is `aria-disabled`; pressing it does not save and the footer
   *  states the summary ("1 error blocks saving") as an alert, naming the
   *  first issue. Prefer this to hand-rolling `saveBlocked` + `footerStatus`. */
  issues?: string[];
}

/** The footer line `issues` produces after a save attempt. */
function IssuesSummary({ issues }: { issues: string[] }) {
  return (
    <span role="alert" className="min-w-0 truncate text-meta font-medium text-seal-label" title={issues.join("\n")}>
      {blockingSummary(issues.length, 0)}: {issues[0]}
    </span>
  );
}

/** `issues` wired onto the commit: an attempt with issues is refused and
 *  shown; without them it saves. */
function useIssues(issues: string[] | undefined, onSave: () => void) {
  const [attempted, setAttempted] = useState(false);
  const blocking = !!issues && issues.length > 0;
  return {
    blocked: attempted && blocking,
    trySave: () => {
      if (blocking) return setAttempted(true);
      setAttempted(false);
      onSave();
    },
  };
}

function CommitButton({
  variant,
  dirty,
  valid = true,
  saveBlocked = false,
  onSave,
  children,
}: Omit<SaveProps, "footerStatus" | "issues"> & { variant: "commit" | "success"; children: ReactNode }) {
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
 *  and is not guarded; the back arrow and breadcrumb are. `onCancel`
 *  defaults to `onBack`; an editor that discards and stays passes its own.
 *  While rows are ticked (`selection`), the footer's start shows the
 *  selection bar in place of `footerStart`. */
export function SettingsEditor({
  component,
  path,
  title,
  onBack,
  onCancel,
  status,
  selection,
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
  /** Back to the list (guarded). Also Cancel unless `onCancel` is given. */
  onBack: () => void;
  /** Cancel: the explicit discard, not guarded. Default `onBack`. */
  onCancel?: () => void;
  /** Processing state in the header (`SettingsContent.Header`'s `status`). */
  status?: ReactNode;
  /** Bulk actions over ticked rows. */
  selection?: SettingsSelection;
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
  const { issues, onSave, saveBlocked, ...rest } = save;
  const { blocked, trySave } = useIssues(issues, onSave);
  const selecting = !!selection && selection.count > 0;
  return (
    <SettingsContent component={component}>
      <SettingsContent.Header path={path} title={title} onBack={onBack} status={status} />
      <SettingsContent.Body>
        {intro && <SettingsIntro>{intro}</SettingsIntro>}
        {toolbar}
        <SettingsForm wide={wide}>{children}</SettingsForm>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        {selecting && selection ? (
          <SettingsSelectionBar {...selection} />
        ) : (
          footerStart && <div className="me-auto flex items-center gap-2 min-w-0">{footerStart}</div>
        )}
        {blocked ? <IssuesSummary issues={issues!} /> : footerStatus}
        <SettingsButton variant="ghost" size="sm" onClick={onCancel ?? onBack}>
          Cancel
        </SettingsButton>
        <CommitButton
          variant={isNew ? "commit" : "success"}
          {...rest}
          saveBlocked={saveBlocked || blocked}
          onSave={trySave}
        >
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
