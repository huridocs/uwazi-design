import { FileText, ExternalLink } from "lucide-react";
import { EntityTypeTag } from "../shared/EntityTypeTag";
import { CountBadge } from "../shared/CountBadge";

interface RelatedDocCardProps {
  title: string;
  entityTypeId: string;
  referenceCount: number;
}

export function RelatedDocCard({ title, entityTypeId, referenceCount }: RelatedDocCardProps) {
  return (
    <article
      data-component="RelatedDocCard"
      className="flex items-center gap-3 px-3 py-2.5 border border-border/60 rounded-md
      hover:bg-warm transition-colors cursor-pointer group">
      <FileText size={16} data-part="icon" aria-hidden className="text-ink-muted shrink-0" />
      <div className="flex-1 min-w-0">
        <h3 data-part="title" className="text-sm text-ink truncate">
          {title}
        </h3>
        <EntityTypeTag typeId={entityTypeId} />
      </div>
      <CountBadge count={referenceCount} />
      <ExternalLink
        size={14}
        data-part="open"
        aria-hidden
        className="text-ink-muted opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0"
      />
    </article>
  );
}
