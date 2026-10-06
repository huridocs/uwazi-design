import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { NetworkCanvas } from "../components/library/NetworkCanvas";
import { demoColorOf, demoNetwork, demoTypeNameOf } from "../data/network/demo";

/** A whole collection as one graph on a canvas: the Library's Network view.
 *  Positions come in precomputed (`placement`, and `focus` for a filter's own
 *  layout); `strength` marks matches and their neighbours, toggles hide nodes
 *  and edges (`nodeOn`, `edgeOn`).
 *  Zoomed out, a large collection reads as one mark per community; zooming
 *  in, or clicking a mark, opens it into nodes. The keyboard list after the
 *  canvas reaches the best-connected records. */
const meta = {
  title: "Library/NetworkCanvas",
  component: NetworkCanvas,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof NetworkCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ overview = false, filtered = false }: { overview?: boolean; filtered?: boolean }) {
  const { graph, placement, titles } = useMemo(() => demoNetwork(), []);
  const [selected, setSelected] = useState(-1);
  const n = graph.ids.length;
  const nodeOn = useMemo(() => new Uint8Array(n).fill(1), [n]);
  const edgeOn = useMemo(() => new Uint8Array(graph.a.length).fill(1), [graph]);
  // "Filtered": the first two cases' records match; their neighbours are strength 1.
  const strength = useMemo(() => {
    if (!filtered) return null;
    const s = new Uint8Array(n);
    graph.ids.forEach((id, i) => {
      if (/^case-[01]($|-)/.test(id)) s[i] = 2;
    });
    for (let e = 0; e < graph.a.length; e++) {
      if (s[graph.a[e]] === 2 && !s[graph.b[e]]) s[graph.b[e]] = 1;
      if (s[graph.b[e]] === 2 && !s[graph.a[e]]) s[graph.a[e]] = 1;
    }
    return s;
  }, [filtered, graph, n]);
  return (
    <div className="h-[32rem] bg-warm p-3">
      <NetworkCanvas
        graph={graph}
        placement={placement}
        colorOf={demoColorOf}
        typeNameOf={demoTypeNameOf}
        titleOf={(i) => titles[i]}
        nodeOn={nodeOn}
        edgeOn={edgeOn}
        strength={strength}
        hubDegree={6}
        hubEdges="faint"
        overview={overview}
        selected={selected}
        onSelect={setSelected}
        label="Network of the demo collection"
      />
    </div>
  );
}

const args = {} as Story["args"];

export const Default: Story = { args, render: () => <Demo /> };

/** Community marks at the first fit; zoom or click a mark to open it. */
export const Minimal: Story = { args, render: () => <Demo overview /> };

/** While filtering: matches full, neighbours small, the rest as points. */
export const AllStates: Story = { args, render: () => <Demo filtered /> };
