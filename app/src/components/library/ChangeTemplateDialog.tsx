import { useMemo, useState } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { AlertTriangle } from "lucide-react";
import { applyBulkEditAtom } from "../../atoms/entityOverlay";
import { languageAtom } from "../../atoms/language";
import { notificationsAtom } from "../../atoms/notifications";
import { getEntity, type Entity, type EntityType } from "../../data/entities";
import { isOverlayDeleted, type Corpus } from "../../data/entityOverlay";
import { planTemplateChange, templateChangeRecords, type TemplateChangePlan } from "../../utils/changeTemplate";
import { BULK_TASK_THRESHOLD, runBulkApply } from "../../utils/libraryTasks";
import { typeLabelColor } from "../../utils/typeColor";
import { BAR_GHOST } from "../shared/warmButton";
import { Modal, MODAL_BUTTON } from "../shared/Modal";
import { ModalList, ModalListRow, ModalSectionLabel, ModalTypeDot } from "../shared/ModalParts";

/** Change template — a dialog, not the drawer: it is one decision with a
 *  consequence list. Pick the target; for each source template the list says
 *  what is KEPT, what is DROPPED (with how many values go) and what is NEW
 *  (empty), recomputed as the target changes. Entities already on the target
 *  are skipped and counted. A warning names what will be deleted, and the
 *  confirm is seal when anything is. Undo restores records and templates. */
export function ChangeTemplateDialog({
  ids,
  corpus,
  types,
  onClose,
}: {
  ids: string[];
  corpus: Corpus;
  types: EntityType[];
  onClose: () => void;
}) {
  const store = useStore();
  const language = useAtomValue(languageAtom);
  const applyBulk = useSetAtom(applyBulkEditAtom);
  // Frozen at open, like the bulk form.
  const [entities] = useState(() =>
    ids.filter((id) => !isOverlayDeleted(id)).map((id) => getEntity(id)).filter((e): e is Entity => !!e),
  );
  const [target, setTarget] = useState<string | null>(null);
  const plan: TemplateChangePlan | null = useMemo(
    () => (target ? planTemplateChange(entities, target, corpus, language) : null),
    [entities, target, corpus, language],
  );
  const targetName = types.find((t) => t.id === target)?.name ?? "";
  const n = plan?.changing.length ?? 0;
  const danger = (plan?.dropValues ?? 0) > 0;

  const confirm = () => {
    if (!plan || !target || n === 0) return;
    const note = `${n.toLocaleString()} ${n === 1 ? "entity" : "entities"} changed to ${targetName}.`;
    if (n > BULK_TASK_THRESHOLD) {
      runBulkApply(store, {
        corpus,
        entities: plan.changing,
        verb: "Changing template of",
        plan: (chunk) => ({ ...templateChangeRecords(chunk, target, corpus), lines: [], removes: 0, touched: chunk.length }),
      });
    } else {
      const { records, patches } = templateChangeRecords(plan.changing, target, corpus);
      const ref = applyBulk({ corpus, records, patches });
      store.set(notificationsAtom, (prev) => [
        {
          id: `n-${ref}`,
          kind: "success",
          title: note,
          detail: "Undo restores their template and values until your next bulk change or delete.",
          time: Date.now(),
          read: false,
          action: { label: "Undo", kind: "undo", ref },
        },
        ...prev,
      ]);
    }
    onClose();
  };

  return (
    <Modal
      component="ChangeTemplateDialog"
      size="lg"
      height="md:h-[min(34rem,100%)]"
      onClose={onClose}
      title="Change template"
      titleId="change-template-title"
      subtitle={
        <span className="tabular-nums">
          {entities.length.toLocaleString()} {entities.length === 1 ? "entity" : "entities"}
        </span>
      }
      flush
      footer={
        <>
          <button type="button" onClick={onClose} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            aria-disabled={n === 0 || undefined}
            className={`${MODAL_BUTTON} ${
              n === 0
                ? "bg-ink/40 text-paper cursor-not-allowed"
                : danger
                  ? "bg-seal text-white hover:bg-seal/90 cursor-pointer"
                  : "bg-ink text-paper hover:bg-ink/90 cursor-pointer"
            }`}
          >
            {n ? `Change ${n.toLocaleString()} ${n === 1 ? "entity" : "entities"} to ${targetName}` : "Change template"}
          </button>
        </>
      }
    >
      <div data-gutter-bleed className="bleed-flush flex-1 min-h-0 flex">
        <fieldset className="w-[13rem] shrink-0 min-h-0 flex flex-col border-e border-border">
          <legend className="sr-only">Target template</legend>
          <ModalList atEdge>
            {types.map((t) => (
              <ModalListRow
                key={t.id}
                selected={target === t.id}
                control={
                  <input
                    type="radio"
                    name="change-template-target"
                    checked={target === t.id}
                    onChange={() => setTarget(t.id)}
                    className="w-3.5 h-3.5 accent-ink shrink-0"
                  />
                }
                leading={<ModalTypeDot color={t.color} />}
                title={t.name}
              />
            ))}
          </ModalList>
        </fieldset>
        <div className="bleed flex-1 min-w-0 overflow-auto py-4 space-y-4 text-xs" aria-live="polite">
          {!plan ? (
            <p className="text-ink-tertiary">Choose the template to change to.</p>
          ) : (
            <>
              {plan.skipped > 0 && (
                <p className="text-ink-tertiary tabular-nums">
                  {plan.skipped.toLocaleString()} of {entities.length.toLocaleString()} are already {targetName}.
                </p>
              )}
              {plan.sources.map((s) => {
                const type = types.find((t) => t.id === s.typeId);
                const color = type?.color ?? "#6B7280";
                return (
                  <section key={s.typeId} data-part="source" className="space-y-1.5">
                    <h3 className="flex items-center gap-1.5 font-semibold">
                      <span style={{ color: typeLabelColor(color) }}>{type?.name ?? s.typeId}</span>
                      <span className="text-ink-tertiary font-normal">→ {targetName}</span>
                      <span className="text-meta text-ink-tertiary font-normal tabular-nums">{s.count.toLocaleString()}</span>
                    </h3>
                    <Group title="Kept" items={s.kept} />
                    <Group
                      title="Dropped"
                      warn
                      items={s.dropped.map((d) =>
                        d.values ? `${d.label}: ${d.values.toLocaleString()} ${d.values === 1 ? "value" : "values"} deleted` : d.label,
                      )}
                    />
                    <Group title="New" items={s.added.map((l) => `${l}: empty`)} />
                  </section>
                );
              })}
              <p className="text-meta text-ink-tertiary">Title, dates, files and connections are always kept.</p>
            </>
          )}
        </div>
      </div>
      {/* Always mounted: the warning appears and goes as the target changes,
          and the footer must not move. */}
      <p
        data-part="warning"
        className={`bleed shrink-0 min-h-8 flex items-center gap-1.5 text-xs ${danger ? "bg-warning-light text-ink" : "text-transparent"}`}
        aria-live="polite"
      >
        {danger && (
          <>
            <AlertTriangle size={13} className="text-warning shrink-0" aria-hidden />
            {plan!.dropValues.toLocaleString()} values on {plan!.dropEntities.toLocaleString()}{" "}
            {plan!.dropEntities === 1 ? "entity" : "entities"} will be deleted.{" "}
            {"Undo restores"} them until your next bulk change.
          </>
        )}
      </p>
    </Modal>
  );
}

function Group({ title, items, warn = false }: { title: string; items: string[]; warn?: boolean }) {
  if (!items.length) return null;
  return (
    <div className="flex gap-3">
      <span className="w-14 shrink-0 pt-0.5">
        <ModalSectionLabel as="span">{title}</ModalSectionLabel>
      </span>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {items.map((i) => (
          <li key={i} className={warn && /deleted$/.test(i) ? "text-warning" : "text-ink"}>
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
