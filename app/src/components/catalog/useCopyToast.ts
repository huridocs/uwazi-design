import { useSetAtom } from "jotai";
import { toastsAtom } from "../../atoms/references";

export function useCopyToast() {
  const setToasts = useSetAtom(toastsAtom);

  return (text: string, label?: string) => {
    navigator.clipboard.writeText(text);
    setToasts((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        message: label ? `Copied ${label}` : "Copied to clipboard",
        type: "info" as const,
      },
    ]);
  };
}
