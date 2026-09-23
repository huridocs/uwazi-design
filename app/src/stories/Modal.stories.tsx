import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlertTriangle } from "lucide-react";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_DANGER } from "../components/shared/Modal";
import { BAR_GHOST } from "../components/shared/warmButton";
import {
  MODAL_INPUT,
  ModalField,
  ModalList,
  ModalListRow,
  ModalSearchRow,
  ModalSectionLabel,
  ModalStatus,
  ModalTypeDot,
} from "../components/shared/ModalParts";

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

/** A flush body built from the shared body parts (`ModalParts.tsx`): the
 *  search strip, a list of rows at the one row height, trailing meta, and the
 *  empty line. Every picker modal is this shape. */
export const Flush: Story = {
  render: () => <PickerBody />,
};

/** The form parts: a field with its always-mounted hint, a section label,
 *  and rows that are labels around their radio. */
export const FormParts: Story = {
  render: () => (
    <Modal onClose={noop} title="New item" subtitle="form parts" footer={<button type="button" className={MODAL_COMMIT}>Save</button>}>
      <div className="space-y-4">
        <ModalField label="Title" htmlFor="story-title" hint="Pre-filled; edit as needed.">
          <input id="story-title" defaultValue="Untitled" className={MODAL_INPUT} />
        </ModalField>
        <div className="bleed-flush">
          <div className="bleed pb-1">
            <ModalSectionLabel as="span">Kind</ModalSectionLabel>
          </div>
          <ul>
            {["Primary", "Supporting"].map((k, i) => (
              <ModalListRow
                key={k}
                selected={i === 0}
                control={<input type="radio" name="story-kind" defaultChecked={i === 0} className="w-3.5 h-3.5 accent-ink" />}
                title={k}
              />
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  ),
};

function PickerBody() {
  const [q, setQ] = useState("");
  const items = [
    { name: "Person", color: "#8B5CF6", meta: "Default" },
    { name: "Court Case", color: "#2563EB" },
    { name: "Country", color: "#059669" },
    { name: "Judgment", color: "#D97706" },
  ].filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal onClose={noop} size="md" title="Create entity" subtitle="choose a template" flush height="md:h-[min(34rem,100%)]">
      <ModalSearchRow value={q} onChange={setQ} placeholder="Search templates" ariaLabel="Search templates" />
      <ModalList>
        {items.length === 0 && <ModalStatus as="li">No template matches that name.</ModalStatus>}
        {items.map((i) => (
          <ModalListRow key={i.name} onClick={noop} leading={<ModalTypeDot color={i.color} />} title={i.name} meta={i.meta} />
        ))}
      </ModalList>
    </Modal>
  );
}
