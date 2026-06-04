import { atom } from "jotai";

/**
 * State for the agent chat — a centered modal openable from anywhere (navbar
 * button or ⌘K) that works in the context of wherever it was opened. The
 * context is configurable in the box itself via the scope selector / chips.
 */

export type AgentRole = "user" | "agent";
export interface AgentMessage {
  id: string;
  role: AgentRole;
  text: string;
}

/** The pieces of app context the agent can be pointed at. */
export type ContextSource = "view" | "document" | "selection" | "library";

/** Named scope presets shown in the box's context selector. */
export type ScopeId = "auto" | "document" | "view" | "selection" | "library" | "none";

export const scopePresets: Record<ScopeId, ContextSource[]> = {
  auto: ["view", "document", "selection"],
  document: ["document"],
  view: ["view"],
  selection: ["selection"],
  library: ["library"],
  none: [],
};

export const scopeLabels: Record<ScopeId, string> = {
  auto: "Auto",
  document: "This document",
  view: "This view",
  selection: "Selection",
  library: "Whole library",
  none: "None",
};

/** Shortcut hint label — ⌘K on macOS, Ctrl K elsewhere. The handler binds
 *  both meta and ctrl, so the key works cross-platform regardless. */
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
export const shortcutLabel = isMac ? "⌘K" : "Ctrl K";

export const agentOpenAtom = atom(false);

/** The enabled context sources — the source of truth. Presets set this; the
 *  user can also remove individual chips (→ "Custom"). Default = Auto. */
export const agentSourcesAtom = atom<ContextSource[]>([...scopePresets.auto]);

export const agentMessagesAtom = atom<AgentMessage[]>([]);

/** The current scope label: a preset name when the enabled set matches one,
 *  otherwise "Custom". */
export function scopeIdForSources(sources: ContextSource[]): ScopeId | "custom" {
  const key = [...sources].sort().join(",");
  for (const [id, preset] of Object.entries(scopePresets)) {
    if ([...preset].sort().join(",") === key) return id as ScopeId;
  }
  return "custom";
}
