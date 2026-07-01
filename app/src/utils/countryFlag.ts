// Country name → flag emoji, keyed by lowercased EN + ES names. Covers the mock
// seed + the CEJIL corpus (Inter-American system) countries. Returns undefined
// for non-countries (e.g. a region like "Central America") so callers can treat
// the value as plain text.
const FLAGS: Record<string, string> = {
  argentina: "🇦🇷",
  bolivia: "🇧🇴",
  brazil: "🇧🇷",
  brasil: "🇧🇷",
  chile: "🇨🇱",
  colombia: "🇨🇴",
  "costa rica": "🇨🇷",
  cuba: "🇨🇺",
  ecuador: "🇪🇨",
  "el salvador": "🇸🇻",
  guatemala: "🇬🇹",
  haiti: "🇭🇹",
  haití: "🇭🇹",
  honduras: "🇭🇳",
  mexico: "🇲🇽",
  méxico: "🇲🇽",
  nicaragua: "🇳🇮",
  panama: "🇵🇦",
  panamá: "🇵🇦",
  paraguay: "🇵🇾",
  peru: "🇵🇪",
  perú: "🇵🇪",
  "dominican republic": "🇩🇴",
  "república dominicana": "🇩🇴",
  suriname: "🇸🇷",
  surinam: "🇸🇷",
  "trinidad and tobago": "🇹🇹",
  "trinidad y tobago": "🇹🇹",
  uruguay: "🇺🇾",
  venezuela: "🇻🇪",
  // Judge nationalities reach beyond the respondent states.
  barbados: "🇧🇧",
  jamaica: "🇯🇲",
  "united states": "🇺🇸",
  "estados unidos": "🇺🇸",
  spain: "🇪🇸",
  españa: "🇪🇸",
  france: "🇫🇷",
  francia: "🇫🇷",
  italy: "🇮🇹",
  italia: "🇮🇹",
};

export function countryFlag(name?: string | null): string | undefined {
  if (!name) return undefined;
  return FLAGS[name.trim().toLowerCase()];
}
