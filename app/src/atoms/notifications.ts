import { atom } from "jotai";

/**
 * Notification + live-activity state for the navbar Beacon.
 *
 * Two distinct things share the surface:
 *  - `Activity`      — an in-flight background task (upload, import, PDF
 *                      processing, …). Drives the live pill in the navbar and
 *                      the TASKS section of the drawer. Null when idle.
 *  - `Notification`  — a discrete past event (success / error / warning / info)
 *                      that lands in the drawer's NOTIFICATIONS log. Completed
 *                      activities convert into a notification.
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
}

export interface Activity {
  id: string;
  /** verb phrase, e.g. "Uploading document batch" */
  label: string;
  /** the thing being acted on, e.g. the source filename */
  detail?: string;
  current: number;
  total: number;
}

const now = Date.now();
const min = 60_000;
const hour = 60 * min;
const day = 24 * hour;

/** Seeded to mirror the reference drawer. */
export const notificationsAtom = atom<Notification[]>([
  {
    id: "n-1",
    kind: "success",
    title: "Entity saved successfully.",
    detail: "All fields were valid.",
    time: now - 20_000,
    read: false,
  },
  {
    id: "n-2",
    kind: "info",
    title: "A new version of Uwazi is available.",
    time: now - 3 * min,
    read: false,
  },
  {
    id: "n-3",
    kind: "warning",
    title: "Some fields could not be validated.",
    detail: "Check highlighted fields and try again.",
    time: now - 20 * min,
    read: false,
  },
  {
    id: "n-4",
    kind: "error",
    title: "Failed to save entity.",
    detail: "A network timeout occurred. Please retry.",
    details: "ETIMEDOUT: connect ETIMEDOUT 10.0.0.4:443\n    at TLSSocket.onConnectEnd (net.js:1145:8)",
    time: now - 2 * hour,
    read: true,
  },
  {
    id: "n-5",
    kind: "success",
    title: "Batch import completed.",
    detail: "120 documents imported.",
    time: now - day,
    read: true,
  },
  {
    id: "n-6",
    kind: "warning",
    title: "Storage usage above 80%.",
    time: now - 3 * day,
    read: true,
  },
  {
    id: "n-7",
    kind: "error",
    title: "Scheduled export failed.",
    detail: "Disk quota exceeded.",
    details: "ENOSPC: no space left on device, write\n    at WriteStream.write (fs.js:812:3)",
    time: now - 16 * day,
    read: true,
  },
]);

/** In-flight tasks. Empty = idle beacon. */
export const activitiesAtom = atom<Activity[]>([
  { id: "a-1", label: "Uploading document batch", detail: "velasquez-corpus.csv", current: 25, total: 100 },
  { id: "a-2", label: "Processing PDFs", detail: "12 files", current: 4, total: 12 },
]);

/** Whether the notifications drawer is open. */
export const beaconOpenAtom = atom(false);

export const unreadCountAtom = atom(
  (get) => get(notificationsAtom).filter((n) => !n.read).length,
);
