import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Sparkles, X, ChevronDown, Plus, ArrowUp, Bell } from "lucide-react";
import {
  agentOpenAtom,
  agentSourcesAtom,
  agentMessagesAtom,
  scopePresets,
  scopeLabels,
  scopeIdForSources,
  type ContextSource,
  type ScopeId,
  type AgentMessage,
} from "../../atoms/agent";
import { appViewAtom } from "../../atoms/navigation";
import { languageAtom } from "../../atoms/language";
import { selectedRefIdsAtom } from "../../atoms/filters";
import { activitiesAtom } from "../../atoms/notifications";
import { documentsByLanguage } from "../../data/document";

interface Chip {
  source: ContextSource;
  label: string;
  value: string;
}

export function AgentModal() {
  const [open, setOpen] = useAtom(agentOpenAtom);
  const [sources, setSources] = useAtom(agentSourcesAtom);
  const [messages, setMessages] = useAtom(agentMessagesAtom);
  const appView = useAtomValue(appViewAtom);
  const language = useAtomValue(languageAtom);
  const selectedRefIds = useAtomValue(selectedRefIdsAtom);
  const setActivities = useSetAtom(activitiesAtom);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

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
        return { source: s, label: "Scope", value: "Whole library" };
    }
  };
  const chips = sources.map(resolve).filter((c): c is Chip => c !== null);
  const scopeId = scopeIdForSources(sources);
  const scopeText = scopeId === "custom" ? "Custom" : scopeLabels[scopeId];
  const availableToAdd = (["view", "document", "selection", "library"] as ContextSource[]).filter(
    (s) => !sources.includes(s),
  );

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: AgentMessage = { id: `u-${messages.length}-${trimmed.length}`, role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    const isTask = /re-?process|reprocess|re-run|reindex|re-index/i.test(trimmed);
    window.setTimeout(() => {
      let reply: string;
      if (isTask) {
        setActivities((prev) => [
          ...prev,
          { id: `agent-${prev.length}-${docTitle.length}`, label: "Re-processing document", detail: docTitle, current: 0, total: 100 },
        ]);
        reply = `Started re-processing “${docTitle}”. You can close this — I'll keep working and you can track progress in notifications.`;
      } else {
        const scopeBlurb = chips.length
          ? `Working in context of ${chips.map((c) => c.value).join(" · ")}.`
          : "No context attached — answering generally.";
        reply = `${scopeBlurb} (Prototype response — wire me to a real agent to actually do this.)`;
      }
      setMessages((prev) => [...prev, { id: `a-${prev.length}`, role: "agent", text: reply }]);
      setThinking(false);
    }, 700);
  };

  if (!open) return null;

  const suggestions = ["Summarize this document", "Find related cases", "Re-process this document"];

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[10vh]">
      {/* Scrim */}
      <div className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} aria-hidden />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Assistant"
        className="relative w-full max-w-[34rem] max-h-[72vh] bg-paper border border-border rounded-xl shadow-2xl flex flex-col animate-fade-in-up overflow-hidden"
      >
        {/* Header + context (one calm top zone) */}
        <div className="shrink-0 border-b border-border-soft">
          <div className="flex items-center gap-2 px-4 h-11">
            <Sparkles size={15} className="text-carbon" />
            <span className="text-sm font-semibold text-ink">Assistant</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-ink-muted bg-warm rounded leading-none">⌘K</kbd>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto flex items-center justify-center w-7 h-7 rounded-md text-ink-muted hover:bg-warm hover:text-ink-secondary transition-colors"
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>

          {/* Context row */}
          <div className="flex items-center gap-1.5 flex-wrap px-4 pb-2.5">
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
                        setSources([...scopePresets[id]]);
                        close();
                      }}
                      className={`flex w-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        id === scopeId ? "text-ink bg-warm" : "text-ink-secondary hover:bg-warm"
                      }`}
                    >
                      {scopeLabels[id]}
                    </button>
                  ))}
                </div>
              )}
            </Dropdown>

            {chips.length > 0 && <span className="w-px h-3.5 bg-border" aria-hidden />}

            {chips.map((chip) => (
              <span
                key={chip.source}
                title={chip.value}
                className="group inline-flex items-center gap-1 h-6 pl-2 pr-0.5 text-[11px] rounded-md bg-carbon-tint/50"
              >
                <span className="text-carbon font-semibold">{chip.label}</span>
                <span className="text-ink-secondary truncate max-w-[9rem]">
                  {chip.source === "document" ? shortDoc(chip.value) : chip.value}
                </span>
                <button
                  onClick={() => setSources(sources.filter((s) => s !== chip.source))}
                  className="flex items-center justify-center w-4 h-4 rounded text-carbon/50 hover:text-carbon hover:bg-carbon/10 transition-colors"
                  aria-label={`Remove ${chip.label}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}

            {availableToAdd.length > 0 && (
              <Dropdown
                align="right"
                trigger={
                  <span className="inline-flex items-center gap-0.5 h-6 px-1.5 text-[11px] font-medium text-ink-tertiary rounded-md hover:bg-warm hover:text-ink-secondary transition-colors">
                    <Plus size={12} /> Add
                  </span>
                }
              >
                {(close) => (
                  <div className="py-1">
                    {availableToAdd.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setSources([...sources, s]);
                          close();
                        }}
                        className="flex w-full px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-warm transition-colors capitalize"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </Dropdown>
            )}
          </div>
        </div>

        {/* Thread */}
        <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-4 min-h-[11rem]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2.5 py-6">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-carbon-tint">
                <Sparkles size={17} className="text-carbon" />
              </div>
              <p className="text-sm font-semibold text-ink">How can I help?</p>
              <p className="text-xs text-ink-muted max-w-[18rem] leading-relaxed">
                I'll work in the context shown above.
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
                <div className="flex items-center gap-2 text-xs text-ink-muted ps-8">
                  <Sparkles size={13} className="text-carbon animate-pulse" /> Thinking…
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-3 pt-2 pb-2.5 shrink-0">
          <div className="flex items-center gap-2 bg-warm border border-border-soft rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-carbon/20 focus-within:border-carbon/30 transition-shadow">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Ask anything, or describe a task…"
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted resize-none focus:outline-none max-h-32 py-0.5"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim()}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-ink text-paper disabled:opacity-25 disabled:cursor-default hover:bg-ink/90 transition-colors shrink-0"
              aria-label="Send"
            >
              <ArrowUp size={15} />
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
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-carbon-tint shrink-0 mt-0.5">
        <Sparkles size={12} className="text-carbon" />
      </div>
      <div className="max-w-[86%] px-3 py-2 text-sm text-ink leading-relaxed bg-warm/60 rounded-2xl rounded-tl-md">
        {message.text}
      </div>
    </div>
  );
}

/** Lightweight popover used by the context controls. */
function Dropdown({
  trigger,
  children,
  align = "left",
}: {
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)}>{trigger}</button>
      {open && (
        <div
          className={`absolute top-full mt-1 min-w-[9rem] bg-paper border border-border rounded-lg shadow-lg overflow-hidden z-20 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
