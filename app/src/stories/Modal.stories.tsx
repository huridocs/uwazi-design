import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlertTriangle } from "lucide-react";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_DANGER } from "../components/shared/Modal";
import { BAR_GHOST } from "../components/shared/warmButton";

/** The app's one modal. Every dialog renders through it: a `bg-overlay` scrim,
 *  a bordered paper panel in one of four widths, a 3rem header (title, inline
 *  subtitle, close), a body on the main gutter, and a 3rem footer on the bar
 *  ladder — one commit, ghosts for the rest, no bordered buttons. Check both
 *  themes: the panel's hairline is what holds it off the scrim in dark. */
const meta = {
  title: "Shared/Modal",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => {};
const ghost = `${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`;

export const Default: Story = {
  render: () => (
    <Modal
      onClose={noop}
      title="Upload 2 documents"
      subtitle="one template for the batch"
      footer={
        <>
          <button type="button" className={ghost}>Cancel</button>
          <button type="button" className={MODAL_COMMIT}>Upload</button>
        </>
      }
    >
      <p className="text-sm text-ink-secondary">The body sits on the panel's gutter; its first block starts one step below the header rule.</p>
    </Modal>
  ),
};

/** The narrow tier with a leading icon and a destructive commit. */
export const Destructive: Story = {
  render: () => (
    <Modal
      size="sm"
      onClose={noop}
      dismissOnScrim={false}
      title="Delete 3 entities"
      leading={
        <span aria-hidden className="shrink-0 w-8 h-8 rounded-md bg-seal-tint flex items-center justify-center">
          <AlertTriangle size={16} className="text-seal-label" />
        </span>
      }
      footer={
        <>
          <button type="button" className={ghost}>Cancel</button>
          <button type="button" className={MODAL_DANGER}>Delete</button>
        </>
      }
    >
      <p className="text-sm text-ink-secondary">Delete these entities? This cannot be undone.</p>
    </Modal>
  ),
};

/** A flush body: a toolbar strip and a list whose rows reach the panel edge
 *  (`bleed`), with no footer. */
export const Flush: Story = {
  render: () => (
    <Modal onClose={noop} size="sm" title="Create entity" subtitle="choose a template" flush height="md:h-[min(28rem,100%)] h-[min(28rem,100%)]">
      <div className="bleed shrink-0 py-2 border-b border-border">
        <input aria-label="Search templates" placeholder="Search templates" className="w-full h-8 px-2 text-xs bg-warm rounded-md" />
      </div>
      <ul className="bleed-flush flex-1 overflow-auto py-1">
        {["Person", "Court Case", "Country", "Judgment"].map((n) => (
          <li key={n} className="flex flex-col">
            <button type="button" className="bleed py-2 text-start text-xs text-ink hover:bg-parchment cursor-pointer">
              {n}
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  ),
};
