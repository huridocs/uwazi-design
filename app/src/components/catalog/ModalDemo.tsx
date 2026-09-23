import { useState } from "react";
import { Modal, MODAL_BUTTON, MODAL_COMMIT } from "../shared/Modal";
import { BAR_GHOST } from "../shared/warmButton";

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
