import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** The record laid out as a masonry, without giving up DOM order.
 *
 *  The two obvious ways to do this both break something:
 *
 *  - CSS `columns` reads TOP-TO-BOTTOM per column, so the second field lands
 *    halfway down the page, and it will split a card across a column break.
 *  - Distributing cards into N column arrays (the classic shortest-column-first
 *    hook) puts the DOM in column order, so a screen reader and the Tab key walk
 *    the record down column one, then back up for column two.
 *
 *  So: ONE grid, children in field order, fine-grained rows, and each item spans
 *  as many rows as it is tall.
 *
 *  Placement is SPARSE — CSS Grid's default. Each item goes into the first free
 *  position at or after the last one, so cards appear in the order the template
 *  declares them, full stop.
 *
 *  `dense` was tried in between and is out. It fills a hole with a card that
 *  comes LATER, so a two-column paragraph could pull the next-but-three field up
 *  beside it, and a record whose whole point is the template's sequence stopped
 *  reading in it. The empty half-row beside a wide card is not a defect to
 *  close: it is the honest shape of "this field is wide, and the next one comes
 *  after it".
 *
 *  Rows are 1px with `row-gap: 0`, and the gutter is the item's own bottom
 *  padding. It has to be that way round: `row-gap` sits between TRACKS, so an
 *  item spanning 200 rows would swallow 199 gaps.
 *
 *  Column count comes from a container query on the record, not the viewport —
 *  the same record renders in the main view, the 390px drawer and the preview
 *  overlay, and what it can afford is its own width. */

interface MasonryCtx {
  /** Gutter in px — the item's bottom padding, and the column gap. */
  gutter: number;
}
const Ctx = createContext<MasonryCtx | null>(null);

/** Thresholds are the record's own width, and they follow the CARDS: a metadata
 *  card holds a label and a value, and stops being readable well before it stops
 *  fitting. Two columns from 44rem (704px → ~346px each) and three from 66rem
 *  (1056px → ~344px each) keep a column at roughly the width the 390px drawer
 *  already proves is enough for one. Wider than that and a single column is
 *  mostly empty paper; narrower and the values start wrapping every line. */
const COLS = "grid-cols-1 @[44rem]:grid-cols-2 @[66rem]:grid-cols-3";

export function MasonryGrid({
  children,
  gutter = 12,
  className = "",
  containerRef,
}: {
  children: ReactNode;
  gutter?: number;
  className?: string;
  /** The record's root, for the deep-focus query that scrolls and flashes a
   *  field — it looks for `[data-field-key]` INSIDE the record, and the
   *  container is the record. */
  containerRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    // Two elements on purpose: an element cannot query ITSELF, so the
    // `@container` and the `@[…]:grid-cols-*` that read it can't be the same
    // node.
    <div ref={containerRef} className={`@container ${className}`}>
      <Ctx.Provider value={{ gutter }}>
        <div
          className={`grid items-start ${COLS}`}
          style={{ gridAutoRows: "1px", rowGap: 0, columnGap: `${gutter}px` }}
        >
          {children}
        </div>
      </Ctx.Provider>
    </div>
  );
}

/** One card in the masonry. Outside a `MasonryGrid` it is a plain wrapper, so
 *  the components that render these also work in the single-column hosts and in
 *  Storybook without a grid around them. */
export function MasonryItem({
  children,
  full = false,
  wide = false,
}: {
  children: ReactNode;
  /** Span every column. For a card whose content has its own minimum width — a
   *  connection TABLE, the details grid — so it keeps its shape while the record
   *  has room, rather than folding because a masonry column is narrow. */
  full?: boolean;
  /** Span TWO columns where there are three, one where there are two. For prose:
   *  a paragraph set in a third of a wide pane is a column of six-word lines,
   *  and at two columns there is no third to borrow. */
  wide?: boolean;
}) {
  const ctx = useContext(Ctx);
  const ref = useRef<HTMLDivElement>(null);
  const [span, setSpan] = useState<number | null>(null);

  // `useLayoutEffect` + an immediate first read: a span set after paint would
  // show every card stacked at 1px for a frame. The observer then keeps it true
  // as content arrives — a thumbnail decoding, a value resolving late — which is
  // the "no shift when a value loads" half of this.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!ctx || !el) return;
    const measure = () => setSpan(Math.ceil(el.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ctx]);

  if (!ctx) return <>{children}</>;
  return (
    <div
      ref={ref}
      className={
        full ? "col-span-full" : wide ? "@[66rem]:col-span-2" : undefined
      }
      style={{
        paddingBottom: `${ctx.gutter}px`,
        gridRowEnd: span ? `span ${span}` : undefined,
      }}
    >
      {children}
    </div>
  );
}
