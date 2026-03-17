import { useState } from "react";
import { useAtom } from "jotai";
import { referencesAtom } from "../atoms/references";
import { SplitView } from "../components/layout/SplitView";
import { MainTabs } from "../components/layout/MainTabs";
import { DocMeta } from "../components/layout/DocMeta";
import { DocumentViewer } from "../components/viewer/DocumentViewer";
import { ReferencePanel } from "../components/references/ReferencePanel";
import { EntityPickerModal } from "./EntityPickerModal";
import { ToastContainer } from "./ToastContainer";

const mainTabs = [
  { id: "metadata", label: "Metadata" },
  { id: "document", label: "Document" },
  { id: "references", label: "References", count: 9 },
  { id: "relationships", label: "Relationships", count: 324 },
  { id: "files", label: "Files", count: 4 },
];

export function ReferencesView() {
  const [activeTab, setActiveTab] = useState("document");
  const [references] = useAtom(referencesAtom);

  // Update references count dynamically
  const tabs = mainTabs.map((t) =>
    t.id === "references" ? { ...t, count: references.length } : t
  );

  return (
    <>
      <SplitView
        left={
          <div className="flex flex-col h-full min-h-0 bg-paper">
            {/* Header: back + tabs + language badges */}
            <MainTabs
              tabs={tabs}
              activeId={activeTab}
              onChange={setActiveTab}
              languages={["EN", "ES"]}
            />
            {/* Document meta row */}
            <DocMeta />
            {/* Document viewer + action bar */}
            <DocumentViewer />
          </div>
        }
        right={<ReferencePanel />}
        defaultRightWidth={480}
        minRightWidth={380}
        maxRightWidth={600}
      />
      <EntityPickerModal />
      <ToastContainer />
    </>
  );
}
