/* The public site's own words — buttons, empty states, labels — per language.
 * Content comes from the config; these are the site's chrome. */
const STRINGS = {
  search: { en: "Search", es: "Buscar", fr: "Rechercher", ar: "بحث" },
  results: { en: "results", es: "resultados", fr: "résultats", ar: "نتائج" },
  noResults: { en: "Nothing matches. Try fewer words or clear a filter.", es: "No hay coincidencias. Pruebe con menos palabras o quite un filtro.", fr: "Aucun résultat. Essayez moins de mots ou retirez un filtre.", ar: "لا توجد نتائج. جرّب كلمات أقل أو أزل عامل تصفية." },
  clear: { en: "Clear all", es: "Quitar todo", fr: "Tout effacer", ar: "مسح الكل" },
  filters: { en: "Filters", es: "Filtros", fr: "Filtres", ar: "عوامل التصفية" },
  loading: { en: "Loading…", es: "Cargando…", fr: "Chargement…", ar: "جارٍ التحميل…" },
  error: { en: "This part of the page couldn't load.", es: "Esta parte de la página no pudo cargarse.", fr: "Cette partie de la page n'a pas pu se charger.", ar: "تعذر تحميل هذا الجزء من الصفحة." },
  retry: { en: "Try again", es: "Reintentar", fr: "Réessayer", ar: "أعد المحاولة" },
  empty: { en: "Nothing here yet.", es: "Aún no hay nada aquí.", fr: "Rien ici pour l'instant.", ar: "لا شيء هنا بعد." },
  viewAll: { en: "View all", es: "Ver todo", fr: "Tout voir", ar: "عرض الكل" },
  poweredBy: { en: "Published with Uwazi", es: "Publicado con Uwazi", fr: "Publié avec Uwazi", ar: "نُشر باستخدام Uwazi" },
  notFound: { en: "This page doesn't exist.", es: "Esta página no existe.", fr: "Cette page n'existe pas.", ar: "هذه الصفحة غير موجودة." },
  entityMissing: { en: "This record isn't in the collection.", es: "Este registro no está en la colección.", fr: "Cet enregistrement n'est pas dans la collection.", ar: "هذا السجل غير موجود في المجموعة." },
  home: { en: "Home", es: "Inicio", fr: "Accueil", ar: "الرئيسية" },
  copy: { en: "Copy", es: "Copiar", fr: "Copier", ar: "نسخ" },
  copied: { en: "Copied", es: "Copiado", fr: "Copié", ar: "تم النسخ" },
  download: { en: "Download PDF", es: "Descargar PDF", fr: "Télécharger le PDF", ar: "تنزيل PDF" },
  noDocument: { en: "No document attached to this record.", es: "Este registro no tiene documento.", fr: "Aucun document pour cet enregistrement.", ar: "لا يوجد مستند لهذا السجل." },
  send: { en: "Send", es: "Enviar", fr: "Envoyer", ar: "إرسال" },
  name: { en: "Name", es: "Nombre", fr: "Nom", ar: "الاسم" },
  email: { en: "Email", es: "Correo", fr: "E-mail", ar: "البريد الإلكتروني" },
  message: { en: "Message", es: "Mensaje", fr: "Message", ar: "الرسالة" },
  close: { en: "Close", es: "Cerrar", fr: "Fermer", ar: "إغلاق" },
  previous: { en: "Previous", es: "Anterior", fr: "Précédent", ar: "السابق" },
  next: { en: "Next", es: "Siguiente", fr: "Suivant", ar: "التالي" },
  located: { en: "located records", es: "registros ubicados", fr: "enregistrements localisés", ar: "سجلات محددة الموقع" },
  menu: { en: "Menu", es: "Menú", fr: "Menu", ar: "القائمة" },
  language: { en: "Language", es: "Idioma", fr: "Langue", ar: "اللغة" },
  more: { en: "more", es: "más", fr: "de plus", ar: "أخرى" },
  year: { en: "Year", es: "Año", fr: "Année", ar: "السنة" },
  decade: { en: "Decade", es: "Década", fr: "Décennie", ar: "العقد" },
  country: { en: "Country", es: "País", fr: "Pays", ar: "البلد" },
  status: { en: "Status", es: "Estado", fr: "Statut", ar: "الحالة" },
  template: { en: "Type", es: "Tipo", fr: "Type", ar: "النوع" },
  date: { en: "Date", es: "Fecha", fr: "Date", ar: "التاريخ" },
  title: { en: "Title", es: "Título", fr: "Titre", ar: "العنوان" },
  signup: { en: "Your email", es: "Su correo", fr: "Votre e-mail", ar: "بريدك الإلكتروني" },
  shareOn: { en: "Share on", es: "Compartir en", fr: "Partager sur", ar: "شارك على" },
  copyLink: { en: "Copy link", es: "Copiar enlace", fr: "Copier le lien", ar: "نسخ الرابط" },
  current: { en: "current", es: "actual", fr: "actuel", ar: "الحالي" },
  thanks: { en: "Thanks — you're signed up.", es: "Gracias, ya está suscrito.", fr: "Merci, vous êtes inscrit.", ar: "شكرًا، تم تسجيلك." },
  sent: { en: "Sent. We'll reply by email.", es: "Enviado. Responderemos por correo.", fr: "Envoyé. Nous répondrons par e-mail.", ar: "تم الإرسال. سنرد عبر البريد." },
} as const;

export type UiKey = keyof typeof STRINGS;
export const ui = (k: UiKey, lang: string) => (STRINGS[k] as Record<string, string>)[lang] ?? STRINGS[k].en;

/** Labels for the built-in keys a block can group or filter by. */
export const BUILTIN_KEYS = ["country", "status", "year", "decade", "template", "date", "title"] as const;
