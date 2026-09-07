import { MetadataCard } from "./MetadataCard";
import type { MetadataItem } from "./items";
import { FillableValue } from "./MetadataRecord";

/** Every short scalar in the record, in one card, as a label-over-value grid.
 *
 *  Each of these was its own bordered card with its own heading, and a dozen of
 *  them down a pane is what "all looks mixed up" was about: the chrome outweighed
 *  the content, and a masonry packing them by height put a date next to a
 *  paragraph next to a country with nothing to read across.
 *
 *  So they are one card and a grid. No borders BETWEEN cells — the card's own
 *  edge is the only line, and rules between forty words would be the ruled table
 *  this record already left behind. The columns come from a container query on
 *  the card, so the 390px drawer and the preview overlay get one column of the
 *  same thing rather than a different component.
 *
 *  `data-field-key` is on the CELL. Deep-focus from Results scrolls to a field
 *  and flashes it; landing on the whole details card would flash a dozen values
 *  to point at one. The flash paints the label and its value together, which is
 *  the field. */
export function DetailsGrid({ items }: { items: MetadataItem[] }) {
  if (items.length === 0) return null;
  return (
    <MetadataCard title="Details">
      <div className="@container">
        <div
          className="grid grid-cols-1 @[26rem]:grid-cols-2 @[44rem]:grid-cols-3
            gap-x-6 gap-y-3"
        >
          {items.map((item) => (
            <div key={item.id} data-field-key={item.id} className="min-w-0 space-y-0.5">
              <div className="font-semibold text-meta uppercase tracking-wider text-ink-tertiary">
                {item.label}
              </div>
              {/* Same `FillableValue` the cards use — a cell is still a value a
                  metadata field can be filled from, and click-to-fill must not
                  care which shape the record chose to draw it in. */}
              <div className="text-sm font-medium leading-relaxed text-ink">
                <FillableValue item={item} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </MetadataCard>
  );
}
