import { useAtomValue, useStore } from "jotai";
import { registerCsvImport } from "../atoms/csvImports";
import { dataSourceAtom } from "../atoms/dataSource";
import { signedInUserAtom } from "../atoms/users";
import { templatesAtom } from "../atoms/templates";
import { useSettingsNotify } from "./useSettingsNotify";

/** Register an import in the collection shown and log it. Shared by this
 *  view and the Library's footer "Import CSV". */
export function useRegisterCsvImport() {
  const store = useStore();
  const corpus = useAtomValue(dataSourceAtom);
  const me = useAtomValue(signedInUserAtom);
  const templates = useAtomValue(templatesAtom(corpus));
  const { record } = useSettingsNotify();
  return (filename: string, templateId: string) => {
    const user = me?.username ?? "unknown";
    const id = registerCsvImport(store, { filename, templateId, user, corpus });
    // The Beacon task is the feedback; the log keeps the registration.
    record({
      method: "CREATE",
      domain: "csv-import",
      noun: "CSV import",
      id,
      name: filename,
      summary: `Registered CSV import “${filename}” (${templates.find((t) => t.id === templateId)?.name ?? templateId})`,
      notify: false,
    });
    return id;
  };
}
