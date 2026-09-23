import { useState } from "react";
import { Modal, MODAL_BUTTON, MODAL_COMMIT } from "../shared/Modal";
import { BAR_GHOST } from "../shared/warmButton";
import { ModalList, ModalListRow, ModalSearchRow, ModalStatus, ModalTypeDot } from "../shared/ModalParts";

const DEMO_TYPES = [
  { name: "Person", color: "#8B5CF6" },
  { name: "Court Case", color: "#2563EB" },
  { name: "Country", color: "#059669" },
  { name: "Judgment", color: "#D97706" },
];

/** Opens a picker built from the shared body parts (`ModalParts.tsx`). */
export function ModalPartsDemo() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const shown = DEMO_TYPES.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
        Open picker
      </button>
      {open && (
        <Modal
          size="md"
          height="md:h-[min(34rem,100%)]"
          onClose={() => setOpen(false)}
          title="Create entity"
          subtitle="choose a template"
          flush
        >
          <ModalSearchRow value={q} onChange={setQ} placeholder="Search templates" ariaLabel="Search templates" autoFocus />
          <ModalList>
            {shown.length === 0 && <ModalStatus as="li">No template matches that name.</ModalStatus>}
            {shown.map((t, i) => (
              <ModalListRow
                key={t.name}
                onClick={() => setOpen(false)}
                leading={<ModalTypeDot color={t.color} />}
                title={t.name}
                meta={i === 0 ? "Default" : undefined}
              />
            ))}
          </ModalList>
        </Modal>
      )}
    </div>
  );
}

/** Opens the shared `Modal` at each width tier. */
export function ModalDemo() {
  const [size, setSize] = useState<"sm" | "md" | "lg" | "xl" | null>(null);
  return (
    <div className="flex items-center gap-2">
      {(["sm", "md", "lg", "xl"] as const).map((s) => (
        <button key={s} type="button" onClick={() => setSize(s)} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
          Open {s}
        </button>
      ))}
      {size && (
        <Modal
          size={size}
          onClose={() => setSize(null)}
          title={`Modal · ${size}`}
          subtitle="inline subtitle"
          footer={
            <>
              <button type="button" onClick={() => setSize(null)} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
                Cancel
              </button>
              <button type="button" onClick={() => setSize(null)} className={MODAL_COMMIT}>
                Save
              </button>
            </>
          }
        >
          <p className="text-sm text-ink-secondary">Body on the main gutter.</p>
        </Modal>
      )}
    </div>
  );
}
