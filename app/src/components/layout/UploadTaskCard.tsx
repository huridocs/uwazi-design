import { useMemo, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ChevronDown, File, FileText, Film, Image as ImageIcon, Music, RotateCw, X } from "lucide-react";
import type { Task } from "../../atoms/notifications";
import {
  CHUNK,
  canRetry,
  cancelUploadsAtom,
  continueUploadsAtom,
  dismissFailedAtom,
  pauseUploadsAtom,
  retryUploadsAtom,
  uploadOnlineAtom,
  uploadQueueAtom,
  type UploadItem,
} from "../../atoms/fileUploads";
import type { FileKind } from "../../data/files";
import { UwaziLoader } from "../shared/UwaziLoader";

/** The upload queue's task in the notifications drawer: the Beacon task's
 *  line and bar, the queue's actions, and every file with its state, failed
 *  first. Ready files fold into one line. The list is virtualised: a batch
 *  can be thousands of files. */

const ROW_PX = 32;
/** A failed file's row has a second line for its reason. */
const FAILED_ROW_PX = 48;
const rowPx = (i: UploadItem) => (i.state === "failed" ? FAILED_ROW_PX : ROW_PX);
const LIST_MAX_PX = 256;
const OVERSCAN = 6;

const KIND_ICON: Record<FileKind, typeof File> = {
  pdf: FileText,
  document: File,
  audio: Music,
  video: Film,
  image: ImageIcon,
  link: File,
};

const size = (n: number) =>
  n >= 1024 ** 3
    ? `${(n / 1024 ** 3).toFixed(1)} GB`
    : n >= 1024 * 1024
      ? `${(n / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(n ? 1 : 0, Math.round(n / 1024))} KB`;

/** Failed first, then what is moving, then what waits; cancelled last. */
const ORDER: Record<UploadItem["state"], number> = {
  failed: 0,
  uploading: 1,
  uploaded: 2,
  processing: 2,
  queued: 3,
  interrupted: 4,
  cancelled: 5,
  ready: 6,
};

const GHOST = "inline-flex items-center gap-1 h-6 px-2 text-meta font-medium text-ink-secondary rounded-md hover:bg-warm transition-colors cursor-pointer";

export function UploadTaskCard({ task }: { task: Task }) {
  const q = useAtomValue(uploadQueueAtom);
  const online = useAtomValue(uploadOnlineAtom);
  const pause = useSetAtom(pauseUploadsAtom);
  const cancel = useSetAtom(cancelUploadsAtom);
  const retry = useSetAtom(retryUploadsAtom);
  const dismiss = useSetAtom(dismissFailedAtom);
  const resume = useSetAtom(continueUploadsAtom);
  const [showReady, setShowReady] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);

  const items = q?.items ?? [];
  const sorted = useMemo(() => [...items].sort((a, b) => ORDER[a.state] - ORDER[b.state]), [items]);
  const ready = sorted.filter((i) => i.state === "ready");
  const rows = showReady ? sorted : sorted.filter((i) => i.state !== "ready");
  const failed = items.filter((i) => i.state === "failed");
  const retryable = failed.filter(canRetry);
  const interrupted = items.some((i) => i.state === "interrupted");
  const sending = items.some((i) => i.state === "queued" || i.state === "uploading");
  const nonPdf = items.some((i) => i.kind !== "pdf" && i.state !== "cancelled");
  const pct = Math.round((task.current / task.total) * 100);
  const tone = task.tone === "failed" ? "seal" : task.tone ? "warning" : "carbon";
  const bar = task.tone === "failed" ? "bg-seal" : task.tone ? "bg-warning" : "bg-carbon";
  const stateWord = task.tone === "failed" ? "Failed" : task.tone === "waiting" ? "Waiting" : task.tone === "paused" ? "Paused" : "Running";

  // An action may remove its own button (Retry failed, Continue) or its row:
  // the focus goes to the file list, or to the drawer's Close when the card
  // itself has gone, never to <body>.
  const keepFocus = () =>
    requestAnimationFrame(() => {
      const list = listRef.current;
      if (list?.isConnected) list.focus();
      else document.querySelector<HTMLElement>('[data-component="NotificationsSlideOver"] [data-part="close"]')?.focus();
    });

  // Rows have two heights, so their tops are summed once per list.
  const tops = useMemo(() => {
    const out = new Array<number>(rows.length + 1);
    out[0] = 0;
    rows.forEach((r, k) => (out[k + 1] = out[k] + rowPx(r)));
    return out;
  }, [rows]);
  let at = 0;
  while (at < rows.length && tops[at + 1] <= top) at++;
  const first = Math.max(0, at - OVERSCAN);
  const visible = Math.ceil(LIST_MAX_PX / ROW_PX) + OVERSCAN * 2;
  const shown = rows.slice(first, first + visible);

  return (
    <article data-part="task" data-upload-task={task.id} className="bg-paper border border-border-soft rounded-lg px-3 py-2.5">
      {/* Coarse, for screen readers: the visible line moves with every file. */}
      <p role="status" className="sr-only">
        {`${task.label}. ${Math.floor(pct / 10) * 10}%.`}
      </p>
      <div aria-live="off">
        <div className="flex items-center gap-2">
          <span className="shrink-0 flex items-center">
            <UwaziLoader size="xs" color={tone} animate={!task.tone} />
          </span>
          <h4 data-part="task-label" className="text-sm font-semibold text-ink truncate flex-1">
            {task.label}
          </h4>
          <span className={`text-meta font-medium shrink-0 ${task.tone === "failed" ? "text-seal-label" : task.tone ? "text-warning" : "text-carbon"}`}>{stateWord}</span>
        </div>
        {task.detail && <div className="mt-0.5 ms-[1.375rem] text-meta text-ink-tertiary truncate">{task.detail}</div>}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-vellum overflow-hidden">
            <div className={`h-full rounded-full ${bar} beacon-spring`} style={{ width: `${pct}%`, transitionProperty: "width", transitionDuration: "0.5s" }} />
          </div>
          <span className="text-meta font-semibold text-ink-tertiary tabular-nums shrink-0">{pct}%</span>
        </div>

        <div data-part="upload-actions" className="mt-2 -ms-2 flex flex-wrap items-center gap-0.5">
          {interrupted && (
            <button type="button" className={`${GHOST} text-ink`} onClick={() => void resume().then(keepFocus)}>
              Continue
            </button>
          )}
          {sending && (
            <button type="button" className={GHOST} onClick={() => pause(!q?.paused)}>
              {q?.paused ? "Resume all" : "Pause all"}
            </button>
          )}
          {retryable.length > 0 && (
            <button type="button" className={GHOST} onClick={() => {
                retry();
                keepFocus();
              }}>
              <RotateCw size={11} aria-hidden /> Retry failed
            </button>
          )}
          {failed.length > 0 && !sending && !interrupted && (
            <button type="button" className={GHOST} onClick={() => {
                dismiss();
                keepFocus();
              }}>
              Dismiss failed
            </button>
          )}
          {(sending || interrupted) && (
            <button type="button" className={`${GHOST} ms-auto`} onClick={() => {
                cancel();
                keepFocus();
              }}>
              Cancel all
            </button>
          )}
        </div>

        {rows.length > 0 && (
          <div
            ref={listRef}
            data-part="upload-list"
            tabIndex={0}
            role="list"
            aria-label="Files in this upload"
            onScroll={(e) => setTop(e.currentTarget.scrollTop)}
            className="mt-2 -mx-3 overflow-y-auto border-t border-border-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-carbon/30"
            style={{ maxHeight: `${LIST_MAX_PX / 16}rem` }}
          >
            <div style={{ height: `${tops[rows.length] / 16}rem`, position: "relative" }}>
              {shown.map((i, k) => (
                <FileRow
                  key={i.key}
                  item={i}
                  online={online}
                  paused={!!q?.paused}
                  top={tops[first + k]}
                  onRetry={() => {
                    retry([i.key]);
                    keepFocus();
                  }}
                  onCancel={() => {
                    (i.state === "failed" ? dismiss : cancel)([i.key]);
                    keepFocus();
                  }}
                />
              ))}
            </div>
          </div>
        )}
        {ready.length > 0 && (
          <button
            type="button"
            aria-expanded={showReady}
            onClick={() => setShowReady((v) => !v)}
            className="mt-1 -ms-2 inline-flex items-center gap-1 h-6 px-2 text-meta font-medium text-ink-tertiary rounded-md hover:bg-warm hover:text-ink-secondary transition-colors cursor-pointer"
          >
            <ChevronDown size={12} aria-hidden className={`transition-transform ${showReady ? "rotate-180" : ""}`} />
            {ready.length.toLocaleString()} ready
          </button>
        )}

        {(nonPdf || interrupted || !online || q?.resumed) && (
          <div data-part="upload-notes" className="mt-2 space-y-1 text-meta text-ink-tertiary text-pretty">
            {(interrupted || !online || q?.resumed) && (
              <p>
                Files already uploaded are safe. An unfinished file continues from its last {CHUNK / (1024 * 1024)} MB part. This
                resume is the prototype&rsquo;s: Uwazi takes each file in one request and would need a resumable (tus) endpoint.
              </p>
            )}
            {nonPdf && (
              <p>
                A file that is not a PDF becomes an entity with the file attached. Uwazi creates entities from PDFs only, so
                this needs a server change.
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function FileRow({
  item: i,
  online,
  paused,
  top,
  onRetry,
  onCancel,
}: {
  item: UploadItem;
  online: boolean;
  paused: boolean;
  top: number;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const Icon = KIND_ICON[i.kind] ?? File;
  const pct = i.size ? Math.floor((i.sent / i.size) * 100) : 0;
  const wait = i.until ? Math.max(0, Math.ceil((i.until - Date.now()) / 1000)) : 0;
  const state =
    i.state === "failed"
      ? "Failed"
      : i.state === "uploading"
        ? `${pct}%`
        : i.state === "queued"
          ? !online
            ? "Waiting"
            : paused
              ? "Paused"
              : i.attempts
                ? `Retrying${wait ? ` in ${wait} s` : ""}`
                : "Queued"
          : i.state === "interrupted"
            ? i.offset
              ? `Interrupted at ${Math.floor((i.offset / i.size) * 100)}%`
              : "Interrupted"
            : i.state === "uploaded"
              ? "Uploaded"
              : i.state === "processing"
                ? "Processing"
                : i.state === "ready"
                  ? "Ready"
                  : "Cancelled";
  const tone =
    i.state === "failed" ? "text-seal-label" : i.state === "uploading" ? "text-carbon" : i.state === "interrupted" ? "text-warning" : "text-ink-tertiary";
  const cancellable = ["queued", "uploading", "interrupted", "failed"].includes(i.state);
  const failed = i.state === "failed";
  return (
    <div
      role="listitem"
      data-part="upload-file"
      data-state={i.state}
      className="absolute inset-x-0 flex flex-col justify-center ps-3 pe-2 border-b border-border-soft/60"
      style={{ top: `${top / 16}rem`, height: `${rowPx(i) / 16}rem` }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={12} className="shrink-0 text-ink-muted" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-xs text-ink" title={i.name}>
          {i.name}
        </span>
        <span className="shrink-0 text-meta text-ink-tertiary tabular-nums">{size(i.size)}</span>
        <span className={`shrink-0 text-meta font-medium tabular-nums ${tone}`}>{failed ? "Failed" : state}</span>
        <span className="shrink-0 flex items-center">
          {canRetry(i) && (
            <button type="button" onClick={onRetry} aria-label={`Retry ${i.name}`} title="Retry" className="flex items-center justify-center w-6 h-6 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink cursor-pointer">
              <RotateCw size={12} aria-hidden />
            </button>
          )}
          {cancellable ? (
            <button
              type="button"
              onClick={onCancel}
              aria-label={`${failed ? "Dismiss" : "Cancel"} ${i.name}`}
              title={failed ? "Dismiss" : "Cancel"}
              className="flex items-center justify-center w-6 h-6 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink cursor-pointer"
            >
              <X size={12} aria-hidden />
            </button>
          ) : (
            <span className="w-6 h-6" aria-hidden />
          )}
        </span>
      </div>
      {failed && (
        <p className="ms-5 me-14 text-meta text-seal-label truncate" title={i.error}>
          {i.error ?? "The upload did not finish."}
        </p>
      )}
      {i.state === "uploading" && (
        <span aria-hidden className="absolute bottom-0 start-0 h-px bg-carbon" style={{ width: `${pct}%` }} />
      )}
    </div>
  );
}
