import type { Language } from "../../atoms/language";

/** The Sample's Countries thesaurus (`t6`) in its four languages, by value id.
 *  The records' translated values use these spellings (`data/entityMetadata.ts`
 *  `localized`), so a value keeps its id in every language. */
export const SAMPLE_COUNTRY_LABELS: Record<string, Record<Language, string>> = {
  "t6-argentina": { EN: "Argentina", ES: "Argentina", FR: "Argentine", AR: "الأرجنتين" },
  "t6-barbados": { EN: "Barbados", ES: "Barbados", FR: "Barbade", AR: "بربادوس" },
  "t6-bolivia": { EN: "Bolivia", ES: "Bolivia", FR: "Bolivie", AR: "بوليفيا" },
  "t6-brazil": { EN: "Brazil", ES: "Brasil", FR: "Brésil", AR: "البرازيل" },
  "t6-chile": { EN: "Chile", ES: "Chile", FR: "Chili", AR: "تشيلي" },
  "t6-colombia": { EN: "Colombia", ES: "Colombia", FR: "Colombie", AR: "كولومبيا" },
  "t6-costa-rica": { EN: "Costa Rica", ES: "Costa Rica", FR: "Costa Rica", AR: "كوستاريكا" },
  "t6-dominican-republic": { EN: "Dominican Republic", ES: "República Dominicana", FR: "République dominicaine", AR: "جمهورية الدومينيكان" },
  "t6-ecuador": { EN: "Ecuador", ES: "Ecuador", FR: "Équateur", AR: "الإكوادور" },
  "t6-el-salvador": { EN: "El Salvador", ES: "El Salvador", FR: "El Salvador", AR: "السلفادور" },
  "t6-guatemala": { EN: "Guatemala", ES: "Guatemala", FR: "Guatemala", AR: "غواتيمالا" },
  "t6-haiti": { EN: "Haiti", ES: "Haití", FR: "Haïti", AR: "هايتي" },
  "t6-honduras": { EN: "Honduras", ES: "Honduras", FR: "Honduras", AR: "هندوراس" },
  "t6-mexico": { EN: "Mexico", ES: "México", FR: "Mexique", AR: "المكسيك" },
  "t6-nicaragua": { EN: "Nicaragua", ES: "Nicaragua", FR: "Nicaragua", AR: "نيكاراغوا" },
  "t6-panama": { EN: "Panama", ES: "Panamá", FR: "Panama", AR: "بنما" },
  "t6-paraguay": { EN: "Paraguay", ES: "Paraguay", FR: "Paraguay", AR: "باراغواي" },
  "t6-peru": { EN: "Peru", ES: "Perú", FR: "Pérou", AR: "بيرو" },
  "t6-suriname": { EN: "Suriname", ES: "Surinam", FR: "Suriname", AR: "سورينام" },
  "t6-trinidad-and-tobago": { EN: "Trinidad and Tobago", ES: "Trinidad y Tobago", FR: "Trinité-et-Tobago", AR: "ترينيداد وتوباغو" },
  "t6-uruguay": { EN: "Uruguay", ES: "Uruguay", FR: "Uruguay", AR: "أوروغواي" },
  "t6-venezuela": { EN: "Venezuela", ES: "Venezuela", FR: "Venezuela", AR: "فنزويلا" },
};
