import type { ReactNode } from "react";
import { Inbox, SearchX } from "lucide-react";
import { SettingsButton } from "./SettingsButton";

/** What a settings list shows when it has no rows.
 *
 *  - With no `query`: the list is empty. It names the object ("No thesauri
 *    yet"), says in one line what one is for, and offers the create action.
 *  - With a `query`: the search matched nothing. It says so and offers to
 *    clear the search; the create action is not repeated.
 *
 *  Pass it as a `SettingsTable`'s `emptyState`. The table shows loading rows,
 *  not this, while a corpus is still loading. */
export function SettingsEmptyState({
  title,
  hint,
  icon,
  action,
  query,
  onClearQuery,
}: {
  /** "No thesauri yet". */
  title: string;
  /** One line on what the object is for. Bind the first word of a second
   *  sentence to the next with a non-breaking space. */
  hint?: ReactNode;
  icon?: ReactNode;
  /** The create action ("Add thesaurus"), shown only when the list is empty. */
  action?: { label: string; onClick: () => void };
  /** The live search. A non-empty query switches to the no-match state. */
  query?: string;
  onClearQuery?: () => void;
}) {
  const searching = !!query?.trim();
  return (
    <div
      data-component="SettingsEmptyState"
      data-state={searching ? "no-match" : "empty"}
      className="flex flex-col items-center gap-2 text-center"
    >
      <span aria-hidden className="flex items-center justify-center w-9 h-9 rounded-md bg-vellum text-ink-tertiary">
        {searching ? <SearchX size={16} /> : (icon ?? <Inbox size={16} />)}
      </span>
      <p data-part="title" className="text-sm font-medium text-ink">
        {searching ? <>Nothing matches “{query!.trim()}”</> : title}
      </p>
      {!searching && hint && (
        <p data-part="hint" className="max-w-sm text-xs text-ink-tertiary text-pretty">
          {hint}
        </p>
      )}
      {searching && onClearQuery ? (
        <SettingsButton variant="ghost" size="sm" className="mt-1" onClick={onClearQuery}>
          Clear search
        </SettingsButton>
      ) : !searching && action ? (
        <SettingsButton variant="secondary" size="sm" className="mt-1" onClick={action.onClick}>
          {action.label}
        </SettingsButton>
      ) : null}
    </div>
  );
}
