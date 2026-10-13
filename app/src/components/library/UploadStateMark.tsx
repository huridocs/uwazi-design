import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { selectAtom } from "jotai/utils";
import { uploadEntityStateAtom, type UploadMark } from "../../atoms/fileUploads";
import { UwaziLoader } from "../shared/UwaziLoader";

const LABEL: Record<UploadMark, string> = {
  uploading: "Uploading",
  waiting: "Waiting",
  paused: "Upload paused",
  processing: "Processing",
  failed: "Upload failed",
};

/** An uploaded entity's state while its file is not ready, on its Library
 *  card and row. No number: the Beacon's task carries the progress. Draws
 *  nothing for every other entity; only ids the queue made (`new-…`) read
 *  the queue, so the thousands of corpus cards subscribe to nothing. */
export function UploadStateMark({ entityId }: { entityId: string }) {
  if (!entityId.startsWith("new-")) return null;
  return <Mark entityId={entityId} />;
}

function Mark({ entityId }: { entityId: string }) {
  const one = useMemo(() => selectAtom(uploadEntityStateAtom, (m) => m.get(entityId)), [entityId]);
  const mark = useAtomValue(one);
  if (!mark) return null;
  const tone = mark === "failed" ? "seal" : mark === "uploading" || mark === "processing" ? "carbon" : "warning";
  return (
    <span
      data-component="UploadStateMark"
      data-state={mark}
      className={`inline-flex items-center gap-1 text-meta font-medium ${
        mark === "failed" ? "text-seal-label" : mark === "waiting" || mark === "paused" ? "text-warning" : "text-ink-tertiary"
      }`}
    >
      <UwaziLoader size="xs" color={tone} animate={mark === "uploading" || mark === "processing"} />
      {LABEL[mark]}
    </span>
  );
}
