import { FileText, ExternalLink } from "lucide-react";
import { EntityPill } from "../shared/EntityPill";
import { CountBadge } from "../shared/CountBadge";

interface RelatedDocCardProps {
  title: string;
  entityTypeId: string;
  referenceCount: number;
}

export function RelatedDocCard({ title, entityTypeId, referenceCount }: RelatedDocCardProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border border-border/60 rounded-lg
      hover:bg-warm transition-colors cursor-pointer group">
      <FileText size={16} className="text-ink-muted shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink truncate">{title}</p>
        <EntityPill typeId={entityTypeId} size="sm" />
      </div>
      <CountBadge count={referenceCount} />
      <ExternalLink
        size={14}
        className="text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      />
    </div>
  );
}
