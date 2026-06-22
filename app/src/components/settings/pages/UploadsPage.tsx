import { useMemo, useState } from "react";
import { useSetAtom } from "jotai";
import { Upload, Image, FileText, Type, File, Search, X, LayoutGrid, List, Link2, Trash2 } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Table, type Column } from "../Table";
import { RowActions } from "../RowActions";
import { Select } from "../../shared/Select";
import { SegmentedControl } from "../../shared/SegmentedControl";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { seedUploads, type SettingsUpload } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

const typeIcon = { image: Image, pdf: FileText, font: Type, other: File };

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "image", label: "Images" },
  { value: "pdf", label: "PDFs" },
  { value: "font", label: "Fonts" },
  { value: "other", label: "Other" },
];

const VIEW_OPTIONS = [
  { id: "grid", label: "Grid", icon: LayoutGrid },
  { id: "list", label: "List", icon: List },
];

export function UploadsPage() {
  const setToasts = useSetAtom(toastsAtom);
  const toast = (message: string) =>
    setToasts((p) => [...p, { id: Date.now().toString(), message, type: "success" as const }]);

  const [uploads, setUploads] = useState<SettingsUpload[]>(seedUploads);
  const [confirm, setConfirm] = useState<SettingsUpload | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [view, setView] = useState("grid");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return uploads.filter((u) => {
      if (typeFilter !== "all" && u.type !== typeFilter) return false;
      if (q && !u.name.toLowerCase().includes(q) && !u.url.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [uploads, query, typeFilter]);

  const copyUrl = (u: SettingsUpload) => {
    navigator.clipboard?.writeText(u.url).catch(() => {});
    toast("URL copied");
  };

  const columns: Column<SettingsUpload>[] = [
    {
      id: "name",
      header: "File",
      cell: (u) => {
        const Icon = typeIcon[u.type];
        return (
          <div className="flex items-center gap-2 min-w-0">
            <Icon size={14} className="text-ink-muted shrink-0" />
            <span className="font-medium text-ink truncate">{u.name}</span>
          </div>
        );
      },
    },
    { id: "url", header: "URL", cell: (u) => <span dir="ltr" className="text-xs text-ink-tertiary truncate">{u.url}</span> },
    { id: "size", header: "Size", width: "7rem", cell: (u) => <span dir="ltr" className="text-xs text-ink-tertiary">{u.size}</span> },
    { id: "actions", header: "", width: "6rem", align: "right", cell: (u) => <RowActions label={u.name} onEdit={() => copyUrl(u)} onDelete={() => setConfirm(u)} /> },
  ];

  return (
    <SettingsContent>
      <SettingsContent.Header title="Uploads" />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          Assets you can reference from pages, custom CSS, or templates.
        </p>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[12rem] max-w-sm">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or URL…"
              className="w-full pl-8 pr-8 py-2 text-sm text-ink bg-warm border border-border rounded-md placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-parchment text-ink-muted hover:text-ink cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <Select value={typeFilter} options={TYPE_OPTIONS} onChange={setTypeFilter} ariaLabel="Filter by type" />
          <SegmentedControl value={view} options={VIEW_OPTIONS} onChange={setView} ariaLabel="View mode" />
        </div>

        {filtered.length === 0 ? (
          <div
            className="flex items-center justify-center rounded-lg bg-warm py-12 text-sm text-ink-tertiary"
            style={{ border: "1px solid var(--border-soft)" }}
          >
            No assets match your search.
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((u) => {
              const Icon = typeIcon[u.type];
              return (
                <div
                  key={u.id}
                  className="flex flex-col rounded-lg bg-paper overflow-hidden"
                  style={{ border: "1px solid var(--border-primary)" }}
                >
                  {/* Thumbnail (placeholder — no real images) */}
                  <div className="flex items-center justify-center aspect-[4/3] bg-warm">
                    <Icon size={28} className="text-ink-muted" />
                  </div>
                  <div className="flex flex-col gap-1 p-3">
                    <span className="text-sm font-medium text-ink truncate" title={u.name}>{u.name}</span>
                    <span className="text-xs text-ink-tertiary" dir="ltr">{u.size}</span>
                    <div className="flex items-center gap-1 mt-1.5">
                      <button
                        onClick={() => copyUrl(u)}
                        aria-label={`Copy URL for ${u.name}`}
                        className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium text-ink-secondary hover:bg-warm hover:text-ink transition-colors cursor-pointer"
                      >
                        <Link2 size={13} />
                        Copy URL
                      </button>
                      <button
                        onClick={() => setConfirm(u)}
                        aria-label={`Delete ${u.name}`}
                        className="ms-auto p-1.5 rounded-md text-ink-tertiary hover:bg-seal-tint hover:text-seal transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Table columns={columns} data={filtered} getRowId={(u) => u.id} />
        )}
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button
          variant="primary"
          size="sm"
          className="me-auto"
          icon={<Upload size={14} />}
          onClick={() => toast("File uploaded")}
        >
          Upload file
        </Button>
      </SettingsContent.Footer>

      <ConfirmDialog
        open={confirm !== null}
        title="Delete upload"
        message={`Delete “${confirm?.name}”? References to its URL will break.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirm) {
            setUploads((prev) => prev.filter((u) => u.id !== confirm.id));
            toast(`${confirm.name} deleted`);
          }
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </SettingsContent>
  );
}
