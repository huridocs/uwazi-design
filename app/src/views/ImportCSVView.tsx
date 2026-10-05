import { useEffect, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { ImportCSVLayout } from "../components/import-csv/ImportCSVLayout";
import { ImportList } from "../components/import-csv/ImportList";
import { ImportStatusPage } from "../components/import-csv/ImportStatusPage";
import { NewImportModal } from "../components/import-csv/NewImportModal";
import { csvImports } from "../atoms/csvImports";
import { useRegisterCsvImport } from "../hooks/useRegisterCsvImport";
import { openNewImportOnArrivalAtom, type AppView } from "../atoms/navigation";

/** Tools › Import CSV (Uwazi's `/settings/csv` and `/settings/csv/:id`): the
 *  imports list, one import's status page, and the upload modal. Imports run
 *  in the background (`atoms/csvImports.ts`), so leaving the view does not
 *  stop them. */
export function ImportCSVView({ onNavigate }: { onNavigate?: (view: AppView) => void }) {
  const imports = useAtomValue(csvImports.listAtom);
  const [openId, setOpenId] = useState<string | null>(null);
  // Arriving from the Library's "Import CSV" opens the modal straight away.
  const [openNewOnArrival, setOpenNewOnArrival] = useAtom(openNewImportOnArrivalAtom);
  const [modalOpen, setModalOpen] = useState(openNewOnArrival);
  useEffect(() => {
    if (openNewOnArrival) setOpenNewOnArrival(false);
  }, [openNewOnArrival, setOpenNewOnArrival]);
  const register = useRegisterCsvImport();

  const open = imports.find((i) => i.id === openId) ?? null;

  return (
    <ImportCSVLayout onNavigate={onNavigate}>
      {open ? (
        <ImportStatusPage entry={open} onBack={() => setOpenId(null)} />
      ) : (
        <ImportList imports={imports} onView={setOpenId} onNewImport={() => setModalOpen(true)} />
      )}
      <NewImportModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onImport={(filename, templateId) => {
          register(filename, templateId);
          setModalOpen(false);
        }}
      />
    </ImportCSVLayout>
  );
}
