/**
 * Country-aware emergency numbers. Curated list of the most common tourist
 * destinations; expand as needed.
 *
 * Sources cross-referenced with national emergency services pages.
 * Numbers reflect the primary emergency line in each country. Where a single
 * "generic" number covers all services (e.g. "112" or "911"), it's set there
 * and individual police/ambulance/fire entries are omitted.
 */

export type CountryCode = string; // ISO 3166-1 alpha-2

export type EmergencyNumbers = {
  generic?: string;
  police?: string;
  ambulance?: string;
  fire?: string;
};

export type CountryEntry = {
  code: CountryCode;
  name: string;
  numbers: EmergencyNumbers;
};

export const EMERGENCY_COUNTRIES: CountryEntry[] = [
  { code: "US", name: "United States", numbers: { generic: "911" } },
  { code: "CA", name: "Canada", numbers: { generic: "911" } },
  { code: "MX", name: "Mexico", numbers: { generic: "911" } },
  { code: "BR", name: "Brazil", numbers: { police: "190", ambulance: "192", fire: "193" } },
  { code: "AR", name: "Argentina", numbers: { police: "911", ambulance: "107", fire: "100" } },
  { code: "CL", name: "Chile", numbers: { police: "133", ambulance: "131", fire: "132" } },
  { code: "GB", name: "United Kingdom", numbers: { generic: "999", police: "999", ambulance: "999", fire: "999" } },
  { code: "IE", name: "Ireland", numbers: { generic: "112" } },
  { code: "FR", name: "France", numbers: { generic: "112", police: "17", ambulance: "15", fire: "18" } },
  { code: "DE", name: "Germany", numbers: { generic: "112", police: "110" } },
  { code: "ES", name: "Spain", numbers: { generic: "112" } },
  { code: "PT", name: "Portugal", numbers: { generic: "112" } },
  { code: "IT", name: "Italy", numbers: { generic: "112" } },
  { code: "NL", name: "Netherlands", numbers: { generic: "112" } },
  { code: "BE", name: "Belgium", numbers: { generic: "112", police: "101" } },
  { code: "CH", name: "Switzerland", numbers: { generic: "112", police: "117", ambulance: "144", fire: "118" } },
  { code: "AT", name: "Austria", numbers: { generic: "112", police: "133", ambulance: "144", fire: "122" } },
  { code: "SE", name: "Sweden", numbers: { generic: "112" } },
  { code: "NO", name: "Norway", numbers: { police: "112", ambulance: "113", fire: "110" } },
  { code: "DK", name: "Denmark", numbers: { generic: "112" } },
  { code: "FI", name: "Finland", numbers: { generic: "112" } },
  { code: "PL", name: "Poland", numbers: { generic: "112", police: "997", ambulance: "999", fire: "998" } },
  { code: "GR", name: "Greece", numbers: { generic: "112", police: "100", ambulance: "166", fire: "199" } },
  { code: "TR", name: "Turkey", numbers: { generic: "112", police: "155", fire: "110" } },
  { code: "RU", name: "Russia", numbers: { generic: "112", police: "102", ambulance: "103", fire: "101" } },
  { code: "AE", name: "United Arab Emirates", numbers: { police: "999", ambulance: "998", fire: "997" } },
  { code: "SA", name: "Saudi Arabia", numbers: { police: "999", ambulance: "997", fire: "998" } },
  { code: "EG", name: "Egypt", numbers: { police: "122", ambulance: "123", fire: "180" } },
  { code: "ZA", name: "South Africa", numbers: { police: "10111", ambulance: "10177" } },
  { code: "MA", name: "Morocco", numbers: { police: "19", ambulance: "15", fire: "15" } },
  { code: "KE", name: "Kenya", numbers: { generic: "999", police: "999" } },
  { code: "IN", name: "India", numbers: { generic: "112", police: "100", ambulance: "102", fire: "101" } },
  { code: "PK", name: "Pakistan", numbers: { police: "15", ambulance: "115", fire: "16" } },
  { code: "CN", name: "China", numbers: { police: "110", ambulance: "120", fire: "119" } },
  { code: "JP", name: "Japan", numbers: { police: "110", ambulance: "119", fire: "119" } },
  { code: "KR", name: "South Korea", numbers: { police: "112", ambulance: "119", fire: "119" } },
  { code: "TW", name: "Taiwan", numbers: { police: "110", ambulance: "119", fire: "119" } },
  { code: "HK", name: "Hong Kong", numbers: { generic: "999" } },
  { code: "SG", name: "Singapore", numbers: { police: "999", ambulance: "995", fire: "995" } },
  { code: "TH", name: "Thailand", numbers: { generic: "191", ambulance: "1669", fire: "199" } },
  { code: "VN", name: "Vietnam", numbers: { police: "113", ambulance: "115", fire: "114" } },
  { code: "ID", name: "Indonesia", numbers: { generic: "112", police: "110", ambulance: "118", fire: "113" } },
  { code: "MY", name: "Malaysia", numbers: { generic: "999" } },
  { code: "PH", name: "Philippines", numbers: { generic: "911" } },
  { code: "AU", name: "Australia", numbers: { generic: "000", police: "131444" } },
  { code: "NZ", name: "New Zealand", numbers: { generic: "111" } },
];

export const EMERGENCY_NUMBERS: Record<CountryCode, EmergencyNumbers> =
  Object.fromEntries(EMERGENCY_COUNTRIES.map((c) => [c.code, c.numbers]));

export function getCountryEntry(code: string): CountryEntry | undefined {
  const upper = code?.toUpperCase();
  return EMERGENCY_COUNTRIES.find((c) => c.code === upper);
}
