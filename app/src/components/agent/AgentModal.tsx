import { useEffect, useRef, useState, Fragment, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { X, ChevronDown, ChevronRight, Plus, Search, Bell, ArrowUp } from "lucide-react";
import { UwaziLoader } from "../shared/UwaziLoader";
import { EntityPill } from "../shared/EntityPill";
import {
  agentOpenAtom,
  agentScopeAtom,
  agentChainAtom,
  agentMessagesAtom,
  scopePresets,
  scopeLabels,
  sourceChain,
  shortcutLabel,
  type ContextSource,
  type ScopeId,
  type ChainNode,
  type NodeKind,
  type AgentMessage,
} from "../../atoms/agent";
import { appViewAtom } from "../../atoms/navigation";
import { languageAtom } from "../../atoms/language";
import { selectedRefIdsAtom } from "../../atoms/filters";
import { currentPageAtom } from "../../atoms/selection";
import { referencesAtom } from "../../atoms/references";
import { filesAtom } from "../../atoms/files";
import { entitiesAtom } from "../../atoms/entities";
import { activitiesAtom } from "../../atoms/notifications";
import { documentsByLanguage } from "../../data/document";

interface Chip {
  source: ContextSource;
  label: string;
  value: string;
}

export function AgentModal() {
  const [open, setOpen] = useAtom(agentOpenAtom);
  const [scope, setScope] = useAtom(agentScopeAtom);
  const [chainNodes, setChainNodes] = useAtom(agentChainAtom);
  const [messages, setMessages] = useAtom(agentMessagesAtom);
  const appView = useAtomValue(appViewAtom);
  const language = useAtomValue(languageAtom);
  const selectedRefIds = useAtomValue(selectedRefIdsAtom);
  const currentPage = useAtomValue(currentPageAtom);
  const references = useAtomValue(referencesAtom);
  const files = useAtomValue(filesAtom);
  const entities = useAtomValue(entitiesAtom);
  const setActivities = useSetAtom(activitiesAtom);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [focused, setFocused] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<number | null>(null);

  useEffect(() => () => { if (streamRef.current) window.clearTimeout(streamRef.current); }, []);

  // ⌘K / Ctrl-K toggles from anywhere; Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages, thinking, open]);

  // Resolve the enabled sources against the live app state.
  const viewLabel = appView === "entity" ? "Library" : appView === "import-csv" ? "Import CSV" : "Component catalog";
  const docTitle = documentsByLanguage[language]?.title ?? "Untitled document";
  const resolve = (s: ContextSource): Chip | null => {
    switch (s) {
      case "view":
        return { source: s, label: "View", value: viewLabel };
      case "document":
        return { source: s, label: "Document", value: docTitle };
      case "selection":
        return selectedRefIds.size > 0
          ? { source: s, label: "Selection", value: `${selectedRefIds.size} reference${selectedRefIds.size > 1 ? "s" : ""}` }
          : null;
      case "library":
        return { source: s, label: "Library", value: "Whole library" };
    }
  };
  // Context is a narrowing chain along `sourceChain` (broad → narrow). The
  // selection link is appended automatically when working on a document and
  // something is selected.
  const effectiveSources: ContextSource[] = [...scopePresets[scope]];
  if ((scope === "auto" || scope === "document") && selectedRefIds.size > 0) {
    effectiveSources.push("selection");
  }
  const scopeChips = sourceChain
    .filter((s) => effectiveSources.includes(s))
    .map(resolve)
    .filter((c): c is Chip => c !== null);
  const scopeText = scopeLabels[scope];

  // Dynamically chained nodes (deeper scope / facets / attachments).
  const nodeMeta = (n: ChainNode): { label: string; value: string } => {
    switch (n.kind) {
      case "page": return { label: "Page", value: `Page ${currentPage}` };
      case "selection": return { label: "Selection", value: `${selectedRefIds.size} ref${selectedRefIds.size !== 1 ? "s" : ""}` };
      case "template": return { label: "Template", value: "Structure" };
      case "connections": return { label: "Connections", value: `${references.length}` };
      case "files": return { label: "Files", value: `${files.length}` };
      case "entity": return { label: "Entity", value: n.title ?? "Entity" };
      case "file": return { label: "File", value: n.title ?? "File" };
    }
  };
  const hasKind = (k: NodeKind) => chainNodes.some((n) => n.kind === k);
  const addNode = (kind: NodeKind, extra?: { refId: string; title: string }) =>
    setChainNodes((prev) => [...prev, { uid: `${kind}-${Date.now()}`, kind, ...extra }]);
  const removeNode = (uid: string) => setChainNodes((prev) => prev.filter((n) => n.uid !== uid));

  // The full context chain Bert sees: scope spine + appended nodes.
  const chain = [
    ...scopeChips.map((c) => ({
      key: c.source,
      label: c.label,
      value: c.source === "document" ? shortDoc(c.value) : c.value,
      uid: null as string | null,
    })),
    ...chainNodes.map((n) => {
      const m = nodeMeta(n);
      return { key: n.uid, label: m.label, value: m.value, uid: n.uid };
    }),
  ];
  const sendActive = focused || input.trim().length > 0;

  // A short, context-aware canned reply keyed loosely off the prompt's intent.
  const docShort = shortDoc(docTitle);
  const ctx = chain.length ? chain.map((c) => c.value).join(" › ") : "no context";
  const replyFor = (q: string): string => {
    if (/summar|gist|tl;?dr|overview/i.test(q))
      return `Here's the short version of ${docShort}:\n\n• The Commission brought the case against the respondent State.\n• Core claims centre on the rights invoked and the State's duty to investigate.\n• The Court found violations and ordered reparations.\n\nWant me to expand any of these?`;
    if (/find|search|related|similar|cases?/i.test(q))
      return `Searching ${ctx}… I surfaced 3 related matters:\n\n• A companion case on the same rights\n• An earlier petition from the same period\n• A later judgment that cites this one\n\nOpen any of them, or refine the search?`;
    if (/extract|metadata|fields?|fill/i.test(q))
      return `I pulled the key fields from ${docShort} — parties, date of judgment, articles invoked, and the operative paragraphs. I can write these straight into the template; just confirm.`;
    if (/relationship|connect|graph|link/i.test(q))
      return `Tracing connections for ${docShort}: links to the issuing Court, the respondent State, and the people involved — with their inherited country and role. Want me to draft a relationship graph?`;
    return `Working in context of ${ctx}. I'd ground my answer in the documents in scope and cite the passages as I go, then summarise what I find.`;
  };

  // Stream a reply in token by token so it feels like Bert is typing.
  const stream = (full: string) => {
    setThinking(false);
    const id = `a-${Date.now()}`;
    setMessages((prev) => [...prev, { id, role: "agent", text: "" }]);
    const tokens = full.split(/(\s+)/);
    let i = 0;
    const step = () => {
      i += 2;
      const partial = tokens.slice(0, i).join("");
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: partial } : m)));
      if (i < tokens.length) streamRef.current = window.setTimeout(step, 26);
    };
    step();
  };

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { id: `u-${prev.length}-${trimmed.length}`, role: "user", text: trimmed }]);
    setInput("");
    setThinking(true);
    if (streamRef.current) window.clearTimeout(streamRef.current);

    const isTask = /re-?process|reprocess|re-?run|re-?index/i.test(trimmed);
    const delay = 500 + Math.round(Math.random() * 500);
    window.setTimeout(() => {
      if (isTask) {
        setActivities((prev) => [
          ...prev,
          { id: `agent-${prev.length}-${docTitle.length}`, label: "Re-processing document", detail: docTitle, current: 0, total: 100 },
        ]);
        stream(`On it — I've started re-processing “${docShort}”. You can close this; I'll keep working and you can track progress in your notifications.`);
      } else {
        stream(replyFor(trimmed));
      }
    }, delay);
  };

  if (!open) return null;

  const suggestions = ["Summarize this document", "Find related cases", "Re-process this document"];

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 pb-[8vh]">
      {/* Scrim */}
      <div className="absolute inset-0 bg-ink/30 animate-agent-scrim" onClick={() => setOpen(false)} aria-hidden />

      {/* Panel. "Bert" — named in tribute to a long-time HURIDOCS member.
          Landscape on desktop, anchored to the lower third. */}
      <div
        role="dialog"
        aria-label="Bert"
        className="relative w-full max-w-[46rem] max-h-[min(70vh,34rem)] bg-paper border border-border rounded-xl shadow-2xl flex flex-col animate-agent-modal overflow-hidden"
      >
        {/* Header + context (one calm top zone) */}
        <div className="shrink-0 border-b border-border-soft">
          <div className="flex items-center gap-2 px-5 h-11">
            {/* Bert's mark — the two Uwazi squares: Seal above Carbon, drop-in.
                Kept in a tight lockup with the wordmark. */}
            <span className="flex items-center gap-1.5">
              <span className="flex items-center">
                <BertMark px={6} gap={2} entrance />
              </span>
              <span className="text-[15px] font-semibold text-ink tracking-tight leading-none">Bert</span>
            </span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-ink-muted bg-warm rounded leading-none">{shortcutLabel}</kbd>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto flex items-center justify-center w-7 h-7 rounded-md text-ink-muted hover:bg-warm hover:text-ink-secondary transition-colors"
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>

          {/* Context row */}
          <div className="flex items-center gap-1.5 flex-wrap px-5 pb-2.5">
            <Dropdown
              trigger={
                <span className="inline-flex items-center gap-1 h-6 px-1.5 text-[11px] font-medium text-ink-secondary rounded-md hover:bg-warm transition-colors">
                  <span className="text-ink-tertiary">Context</span>
                  <span className="text-ink font-semibold">{scopeText}</span>
                  <ChevronDown size={11} className="text-ink-muted" />
                </span>
              }
            >
              {(close) => (
                <div className="py-1">
                  {(Object.keys(scopePresets) as ScopeId[]).map((id) => (
                    <button
                      key={id}
                      onClick={() => {
                        setScope(id);
                        close();
                      }}
                      className={`flex w-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        id === scope ? "text-ink bg-warm" : "text-ink-secondary hover:bg-warm"
                      }`}
                    >
                      {scopeLabels[id]}
                    </button>
                  ))}
                </div>
              )}
            </Dropdown>

            {chain.length > 0 && <span className="w-px h-3.5 bg-border" aria-hidden />}

            {/* The full context chain (scope spine + appended nodes), broad →
                narrow. Appended nodes can be removed; scope nodes follow the
                selector. */}
            {chain.map((chip, i) => (
              <Fragment key={chip.key}>
                {i > 0 && <ChevronRight size={12} className="text-ink-muted shrink-0" />}
                <span
                  title={`${chip.label}: ${chip.value}`}
                  className={`inline-flex items-center gap-1 h-6 ps-2 text-[11px] rounded-md bg-carbon-tint/50 ${
                    chip.uid ? "pe-0.5" : "pe-2"
                  }`}
                >
                  <span className="text-carbon font-semibold">{chip.label}</span>
                  <span className="text-ink-secondary truncate max-w-[10rem]">{chip.value}</span>
                  {chip.uid && (
                    <button
                      onClick={() => removeNode(chip.uid!)}
                      className="flex items-center justify-center w-4 h-4 rounded text-carbon/50 hover:text-carbon hover:bg-carbon/10 transition-colors"
                      aria-label={`Remove ${chip.label}`}
                    >
                      <X size={11} />
                    </button>
                  )}
                </span>
              </Fragment>
            ))}

            {/* Dynamic chaining: append a deeper scope step, a facet, or an item. */}
            <Dropdown
              trigger={
                <span className="inline-flex items-center gap-0.5 h-6 px-1.5 text-[11px] font-medium text-ink-tertiary rounded-md hover:bg-warm hover:text-ink-secondary transition-colors">
                  <Plus size={12} /> Add
                </span>
              }
            >
              {(close) => (
                <AddMenu
                  close={close}
                  hasKind={hasKind}
                  hasSelection={selectedRefIds.size > 0}
                  entities={entities}
                  files={files}
                  onAdd={(kind, extra) => addNode(kind, extra)}
                />
              )}
            </Dropdown>
          </div>
        </div>

        {/* Thread — role="log" + polite live region so streamed replies are
            announced to screen readers as they arrive. */}
        <div
          ref={threadRef}
          role="log"
          aria-live="polite"
          className="flex-1 overflow-y-auto px-5 py-4 min-h-[11rem]"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2.5 py-6">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-warm">
                <BertMark px={10} gap={3} />
              </div>
              <p className="text-sm font-semibold text-ink">Hi, I'm Bert.</p>
              <p className="text-xs text-ink-muted max-w-[19rem] leading-relaxed">
                A friendly hand for serious work — I'll act in the context shown above.
              </p>
              <div className="flex flex-col gap-1 w-full max-w-[20rem] mt-1">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="px-3 py-2 text-[13px] text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-lg transition-colors text-start"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {thinking && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-warm shrink-0">
                    <BertMark px={6} gap={2} />
                  </div>
                  <div className="flex items-center gap-1 px-3 h-9 bg-warm/60 rounded-2xl rounded-tl-md">
                    {[0, 0.15, 0.3].map((d) => (
                      <span
                        key={d}
                        className="agent-dot w-1.5 h-1.5 rounded-full bg-carbon"
                        style={{ animationDelay: `${d}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-5 pt-2 pb-5 shrink-0">
          <div className="flex items-center gap-2 bg-warm border border-border-soft rounded-xl pl-3.5 pr-2 py-2 focus-within:ring-2 focus-within:ring-carbon/20 focus-within:border-carbon/30 transition-shadow">
            <textarea
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Ask Bert anything, or describe a task…"
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted resize-none focus:outline-none max-h-32 py-0.5"
            />
            {/* Send: active while the input is focused or has text; the Uwazi
                mark animates while Bert is thinking. preventDefault on mousedown
                keeps the textarea focused through the click. */}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => send(input)}
              className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors shrink-0 ${
                sendActive ? "bg-ink hover:bg-ink/90" : "bg-vellum"
              }`}
              aria-label="Send"
            >
              {thinking ? (
                <UwaziLoader size="xs" color={sendActive ? "white" : "muted"} animate />
              ) : (
                <ArrowUp size={15} className={sendActive ? "text-paper" : "text-ink-muted"} />
              )}
            </button>
          </div>
          <p className="mt-1.5 px-1 flex items-center gap-1 text-[10px] text-ink-tertiary">
            <Bell size={10} /> Long-running tasks keep running in notifications after you close this.
          </p>
        </div>
      </div>
    </div>
  );
}

/** The "+ Add" menu for dynamic chaining — deepen the scope, attach a facet of
 *  the current entity, or attach a specific entity/file (with a search picker). */
function AddMenu({
  close,
  hasKind,
  hasSelection,
  entities,
  files,
  onAdd,
}: {
  close: () => void;
  hasKind: (k: NodeKind) => boolean;
  hasSelection: boolean;
  entities: { id: string; title: string; typeId: string }[];
  files: { id: string; name: string }[];
  onAdd: (kind: NodeKind, extra?: { refId: string; title: string }) => void;
}) {
  const [mode, setMode] = useState<"root" | "entity" | "file">("root");
  const [q, setQ] = useState("");

  if (mode === "entity" || mode === "file") {
    const isEntity = mode === "entity";
    const items = isEntity
      ? entities.filter((e) => e.title.toLowerCase().includes(q.toLowerCase())).slice(0, 40)
      : files.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 40);
    return (
      <div className="w-64">
        <div className="relative border-b border-border-soft">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${isEntity ? "entities" : "files"}…`}
            className="w-full h-8 pl-3 pr-8 text-xs font-medium bg-paper placeholder:text-ink-muted focus:outline-none"
          />
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        </div>
        <div className="max-h-50 overflow-auto py-1">
          {items.length === 0 ? (
            <div className="px-3 py-2 text-xs text-ink-muted">No matches.</div>
          ) : (
            items.map((it) => (
              <button
                key={it.id}
                onClick={() => {
                  onAdd(isEntity ? "entity" : "file", {
                    refId: it.id,
                    title: isEntity ? (it as { title: string }).title : (it as { name: string }).name,
                  });
                  close();
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-start text-ink-secondary hover:bg-warm transition-colors"
              >
                {isEntity ? (
                  <EntityPill typeId={(it as { typeId: string }).typeId} label={(it as { title: string }).title} />
                ) : (
                  <span className="truncate">{(it as { name: string }).name}</span>
                )}
              </button>
            ))
          )}
        </div>
        <button
          onClick={() => { setMode("root"); setQ(""); }}
          className="w-full px-3 py-1.5 text-[11px] text-ink-tertiary hover:bg-warm border-t border-border-soft text-start"
        >
          ← Back
        </button>
      </div>
    );
  }

  const item = (label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      className="flex w-full px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-warm transition-colors"
    >
      {label}
    </button>
  );
  const groupLabel = (t: string) => (
    <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">{t}</div>
  );

  return (
    <div className="w-52 py-1">
      {groupLabel("Deepen")}
      {!hasKind("page") && item("Page", () => { onAdd("page"); close(); })}
      {hasSelection && !hasKind("selection") && item("Selection", () => { onAdd("selection"); close(); })}
      {groupLabel("Facets")}
      {!hasKind("template") && item("Template", () => { onAdd("template"); close(); })}
      {!hasKind("connections") && item("Connections", () => { onAdd("connections"); close(); })}
      {!hasKind("files") && item("Files", () => { onAdd("files"); close(); })}
      {groupLabel("Attach")}
      {item("Entity…", () => setMode("entity"))}
      {item("File…", () => setMode("file"))}
    </div>
  );
}

/** Bert's identity mark — the two Uwazi squares, Seal above Carbon. */
function BertMark({ px = 6, gap = 2, entrance = false }: { px?: number; gap?: number; entrance?: boolean }) {
  return (
    <span className="inline-flex flex-col" style={{ gap }} aria-hidden>
      <span
        className={`rounded-[2px] bg-seal ${entrance ? "animate-fade-in-up" : ""}`}
        style={{ width: px, height: px, ...(entrance ? { animationDelay: "0.03s", animationFillMode: "both" } : {}) }}
      />
      <span
        className={`rounded-[2px] bg-carbon ${entrance ? "animate-fade-in-up" : ""}`}
        style={{ width: px, height: px, ...(entrance ? { animationDelay: "0.12s", animationFillMode: "both" } : {}) }}
      />
    </span>
  );
}

/** Shorten a long document title for a context chip (keep the case name). */
function shortDoc(title: string): string {
  const parts = title.split(" — ");
  const pick = parts.find((p) => /\bv\.?\b|vs\.?|Case/i.test(p)) ?? parts[0];
  return pick.replace(/^Case of\s+/i, "").trim();
}

function MessageBubble({ message }: { message: AgentMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] px-3 py-2 text-sm text-ink bg-parchment rounded-2xl rounded-br-md">
          {message.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-warm shrink-0 mt-1.5">
        <BertMark px={6} gap={2} />
      </div>
      <div className="max-w-[86%] px-3 py-2 text-sm text-ink leading-relaxed whitespace-pre-line bg-warm/60 rounded-2xl rounded-tl-md">
        {message.text}
      </div>
    </div>
  );
}

/** Popover for the context controls. Rendered in a portal + clamped to the
 *  viewport so it's never clipped by the modal's `overflow-hidden` or pushed
 *  off an edge. */
function Dropdown({
  trigger,
  children,
}: {
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const MENU_W = 160;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - MENU_W - 8));
      setPos({ top: r.bottom + 4, left });
    };
    place();
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <>
      <button ref={btnRef} onClick={() => setOpen((o) => !o)}>
        {trigger}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 90 }}
            className="min-w-[10rem] bg-paper border border-border rounded-lg shadow-lg overflow-hidden"
          >
            {children(() => setOpen(false))}
          </div>,
          document.body,
        )}
    </>
  );
}
