// Theme from ?theme=dark, and EntityPill styling from data-c (same recipe as EntityPill.tsx:
// 12% tint fill, 25% border, label mixed 55% toward --text-primary, true-colour dot).
if (new URLSearchParams(location.search).get("theme") === "dark") document.documentElement.classList.add("dark");
const C = { causa:"#C03B22", sent:"#65A30D", juez:"#DB2777", res:"#D97706", pais:"#2563EB", medida:"#7C3AED", geo:"#A16207", corte:"#0891B2" };
for (const el of document.querySelectorAll("[data-c]")) {
  const c = C[el.dataset.c];
  if (el.classList.contains("pill")) {
    el.style.backgroundColor = c + "20";
    el.style.border = `1px solid ${c}40`;
    el.style.color = `color-mix(in srgb, ${c} 55%, var(--text-primary))`;
    const i = document.createElement("i"); i.style.backgroundColor = c; el.prepend(i);
  } else {
    el.style.backgroundColor = c;
  }
}
