import { atom } from "jotai";

/**
 * Notification + live-task state for the navbar Beacon.
 *
 * Two distinct things share the surface:
 *  - `Task`      — an in-flight background task (upload, import, PDF
 *                      processing, …). Drives the live pill in the navbar and
 *                      the TASKS section of the drawer. Null when idle.
 *  - `Notification`  — a discrete past event (success / error / warning / info)
 *                      that lands in the drawer's NOTIFICATIONS log. Completed
 *                      tasks convert into a notification.
 *
 * Mirrors Uwazi's notification surface (background tasks + outcome messages)
 * presented as one navbar beacon that opens a history drawer.
 */

export type NotificationKind = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  detail?: string;
  /** Expandable extra context — typically an error stack trace. */
  details?: string;
  /** epoch ms */
  time: number;
  read: boolean;
  /** One action the notification offers, by REFERENCE — a value naming what
   *  to act on (`ref` names an undo snapshot), never a callback: an atom
   *  holding closures owned by a component is how the Copy From preview came
   *  to set state on an unmounted form. */
  action?: NotificationAction;
}

export interface NotificationAction {
  label: string;
  /** `undo`: the Library's change layer (`undoAtom`). `settings-undo`: a
   *  child removed in an open Settings editor (`atoms/settingsUndo.ts`).
   *  `uploads`: shows an upload's failed files (`ref` is its queue id). */
  kind: "undo" | "settings-undo" | "uploads";
  ref: string;
}

export interface Task {
  id: string;
  /** verb phrase, e.g. "Uploading document batch" */
  label: string;
  /** the thing being acted on, e.g. the source filename */
  detail?: string;
  current: number;
  total: number;
  /** The task reports its own progress (an upload, an export): the beacon
   *  does not tick it toward completion. It finishes when `current` reaches
   *  `total`, as every task does. */
  driven?: boolean;
  /** What the completion notification says, when the generic "<label>
   *  complete. N items processed." would be wrong or vague. */
  done?: { title: string; detail?: string; action?: NotificationAction };
  /** A task that is not moving, and why: `waiting` (no connection), `paused`
   *  (by the reader, or files to choose again after a reload) or `failed`
   *  (only failed items left). The Beacon colours its mark by it: amber for
   *  the first two, seal for failed; absent is running, carbon. */
  tone?: "waiting" | "paused" | "failed";
  /** The drawer draws this task with the upload queue's own card
   *  (`UploadTaskCard`), which lists its files. */
  uploads?: boolean;
}

/** Empty at load: a notification appears only when an action records one. */
export const notificationsAtom = atom<Notification[]>([]);

/** In-flight tasks. Empty = idle beacon. */
export const tasksAtom = atom<Task[]>([]);

/** Whether the notifications drawer is open. */
export const beaconOpenAtom = atom(false);

export const unreadCountAtom = atom(
  (get) => get(notificationsAtom).filter((n) => !n.read).length,
);

/** Transient action messages. The Beacon drains them into `notificationsAtom`
 *  and flashes each one; only the catalog renders them as floating toasts. */
export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  detail?: string;
  action?: NotificationAction;
}
export const toastsAtom = atom<Toast[]>([]);
