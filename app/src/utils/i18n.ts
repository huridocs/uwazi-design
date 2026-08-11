/** Translation shim. Signature mirrors Uwazi's `t(scope, key, fallback?)`
 *  so swapping in a real i18n backend later is one file.
 *
 *  This is the CHROME's language (nav, tab strips, control labels) — a separate
 *  axis from `languageAtom`, which is the reading language of the document
 *  itself. The two must never be conflated: switching how you read a judgment
 *  is not switching the UI around it.
 *
 *  How a string joins: wrap the literal at its call site — `t("System", "Files")`
 *  — and add one row to STRINGS below. English is the key itself, so an
 *  untranslated string falls back to the literal and nothing ever renders as a
 *  bare key. The surface grows string-by-string; nothing needs restructuring.
 */

export type UiLanguage = "en" | "es" | "fr";

/** Switcher options — each language in its OWN name (endonyms are never
 *  translated). */
export const UI_LANGUAGES: { value: UiLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
];

/** Module-level current language. Kept in sync by `uiLanguageAtom`'s write
 *  (atoms/uiLanguage.ts), which is the only caller of `setUiLanguage` besides
 *  that module's init. Components that render t() strings subscribe to the
 *  atom so a switch re-renders them. */
let current: UiLanguage = "en";

export function setUiLanguage(lang: UiLanguage) {
  current = lang;
}

export function getUiLanguage(): UiLanguage {
  return current;
}

/** Keyed by the English string (Uwazi's convention: the key IS the English
 *  text). Only the translated surfaces are listed — everything else falls back
 *  to English via `t`'s fallback path. */
const STRINGS: Record<string, { es: string; fr: string }> = {
  // Navbar
  Library: { es: "Biblioteca", fr: "Bibliothèque" },
  Tools: { es: "Herramientas", fr: "Outils" },
  Settings: { es: "Configuración", fr: "Paramètres" },
  "Ask Bert": { es: "Pregunta a Bert", fr: "Demander à Bert" },
  Theme: { es: "Tema", fr: "Thème" },
  Light: { es: "Claro", fr: "Clair" },
  Dark: { es: "Oscuro", fr: "Sombre" },
  Auto: { es: "Auto", fr: "Auto" },
  "Test RTL layout": { es: "Probar diseño RTL", fr: "Tester la mise en page RTL" },
  "User settings": { es: "Configuración de usuario", fr: "Paramètres utilisateur" },
  "System settings": { es: "Configuración del sistema", fr: "Paramètres système" },
  "Interface language": { es: "Idioma de la interfaz", fr: "Langue de l'interface" },

  // Main tab strips
  Document: { es: "Documento", fr: "Document" },
  Metadata: { es: "Metadatos", fr: "Métadonnées" },
  Relationships: { es: "Relaciones", fr: "Relations" },
  Files: { es: "Archivos", fr: "Fichiers" },
  "Table of contents": { es: "Tabla de contenido", fr: "Table des matières" },

  // Library masthead controls
  Sort: { es: "Ordenar", fr: "Trier" },
  "Date added": { es: "Fecha de adición", fr: "Date d'ajout" },
  Title: { es: "Título", fr: "Titre" },
  Connections: { es: "Conexiones", fr: "Connexions" },
  Type: { es: "Tipo", fr: "Type" },
  Country: { es: "País", fr: "Pays" },
  "Display options": { es: "Opciones de visualización", fr: "Options d'affichage" },
  Filters: { es: "Filtros", fr: "Filtres" },
  Results: { es: "Resultados", fr: "Résultats" },
};

export function t(_scope: string, key: string, fallback?: string): string {
  const en = fallback ?? key;
  if (current === "en") return en;
  return STRINGS[key]?.[current] ?? en;
}
