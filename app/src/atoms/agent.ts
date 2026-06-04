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

/** The pieces of app context the agent can be pointed at — ordered broad →
 *  narrow. The context is always a NARROWING CHAIN along this order, never an
 *  arbitrary set (so you can't mix "Whole library" with "This document"). */
export type ContextSource = "library" | "view" | "document" | "selection";
export const sourceChain: ContextSource[] = ["library", "view", "document", "selection"];

/** Named scope presets shown in the box's context selector. Each is a prefix /
 *  slice of the chain. */
export type ScopeId = "auto" | "document" | "view" | "library" | "none";

export const scopePresets: Record<ScopeId, ContextSource[]> = {
  // Auto = the natural working chain: the current view, narrowed to the open
  // document (+ the live selection when there is one — added at resolve time).
  auto: ["view", "document"],
  document: ["view", "document"],
  view: ["view"],
  library: ["library"],
  none: [],
};

export const scopeLabels: Record<ScopeId, string> = {
  auto: "Auto",
  document: "This document",
  view: "This view",
  library: "Whole library",
  none: "None",
};

/** Shortcut hint label — ⌘K on macOS, Ctrl K elsewhere. The handler binds
 *  both meta and ctrl, so the key works cross-platform regardless. */
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
export const shortcutLabel = isMac ? "⌘K" : "Ctrl K";

export const agentOpenAtom = atom(false);

/** The selected scope preset — the spine of the context chain. */
export const agentScopeAtom = atom<ScopeId>("auto");

/**
 * Dynamic chaining: extra nodes appended after the scope spine. Each is one of
 *  - a deeper scope step (page / selection),
 *  - a facet of the current entity (template / connections / files), or
 *  - a specific attached item (entity / file).
 * They chain on after the scope so you can aim Bert precisely.
 */
export type NodeKind =
  | "page"
  | "selection"
  | "template"
  | "connections"
  | "files"
  | "entity"
  | "file";

export interface ChainNode {
  uid: string;
  kind: NodeKind;
  /** For entity/file attachments. */
  refId?: string;
  title?: string;
}

/** Kinds that can only appear once in the chain. */
export const singletonNodeKinds: NodeKind[] = ["page", "selection", "template", "connections", "files"];

export const agentChainAtom = atom<ChainNode[]>([]);

export const agentMessagesAtom = atom<AgentMessage[]>([]);
