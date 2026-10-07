import { ScopeProvider } from "jotai-scope";
import { libraryPaneScopedAtoms } from "../atoms/library";
import { networkFindStepAtom } from "../atoms/network";
import { LibraryView } from "./LibraryView";

/** Split spike harness, dev builds only (`?splitSpike=2`, or `=1` for one
 *  scoped pane as the baseline). Two `LibraryView`s side by side, each in its
 *  own scope over the pane atoms. Not the Split layout: no divider, no shared
 *  chrome. Findings: dev/results/split-view/spike.md. */
const PANE_ATOMS = [...libraryPaneScopedAtoms, networkFindStepAtom];

export function splitSpikePanes(): number {
  if (!import.meta.env.DEV) return 0;
  const n = Number(new URLSearchParams(window.location.search).get("splitSpike"));
  return n === 1 || n === 2 ? n : 0;
}

export function LibrarySplitSpike({ panes }: { panes: 1 | 2 }) {
  return (
    <div data-component="LibrarySplitSpike" className="flex flex-1 min-h-0 overflow-hidden">
      {Array.from({ length: panes }, (_, i) => (
        <div
          key={i}
          data-pane={i}
          className="flex-1 min-w-0 flex flex-col overflow-hidden"
          style={{
            ...(i > 0 ? { borderInlineStart: "1px solid var(--border-primary)" } : null),
            // Layout in one pane does not reach the other (measured in the spike).
            contain: new URLSearchParams(window.location.search).has("contain") ? "strict" : undefined,
          }}
        >
          <ScopeProvider atoms={PANE_ATOMS} name={`pane-${i}`}>
            <LibraryView />
          </ScopeProvider>
        </div>
      ))}
      {/* `&half`: the baseline pane at a split pane's width, beside an empty one. */}
      {panes === 1 && new URLSearchParams(window.location.search).has("half") && <div className="flex-1 min-w-0" />}
    </div>
  );
}
