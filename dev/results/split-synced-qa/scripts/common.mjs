export const geo = () => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), cx: Math.round(b.left + b.width/2) }; };
  const sep = document.querySelector('[role=separator]');
  const panel = [...document.querySelectorAll('[role=dialog][data-state]')].filter(d => d.dataset.state === 'open');
  return {
    sep: r(sep), sepNow: sep?.getAttribute('aria-valuenow'),
    rails: [...document.querySelectorAll('[data-component=LibraryRail]')].map(r_ => ({ ...r(r_), inLayer: !!r_.closest('[data-part=split-rail-layer]') })),
    panels: panel.map(p => ({ ...r(p), title: p.getAttribute('aria-label') || document.getElementById(p.getAttribute('aria-labelledby'))?.textContent, inert: p.hasAttribute('inert'), owner: p.dataset.libraryPaneOwner })),
    brushes: document.querySelectorAll('[data-component=TimeBrush]').length,
    active: document.activeElement ? (document.activeElement.getAttribute('aria-label') || document.activeElement.textContent?.slice(0,30) || document.activeElement.tagName) : null,
    activeInPanel: panel.some(p => p.contains(document.activeElement)),
  };
};
