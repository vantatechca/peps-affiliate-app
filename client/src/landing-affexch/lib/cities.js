/* City catalog and per-city offer generator.
   - TOP_CITIES: the 10 quick-select tiles in the modal
   - ALL_CITIES: every city with at least one AFFEXCH merchant (live DB)
   - offersForCity(city): returns 4 deterministic local business offers
     for any city in the catalog. Output shape matches PeptideOffers cards.

   Regenerated from the live vendor_profiles table by
   scripts/generate-cities-js.ts. Ordered by merchant density. */

const PEPTIDES = [
  { name: "BPC-157",    price: "$120", earn: "+$24", badge: "20%" },
  { name: "TB-500",     price: "$140", earn: "+$28", badge: "20%" },
  { name: "CJC-1295",   price: "$95",  earn: "+$19", badge: "20%" },
  { name: "Ipamorelin", price: "$90",  earn: "+$18", badge: "20%" },
  { name: "Sermorelin", price: "$110", earn: "+$22", badge: "20%" },
  { name: "Epithalon",  price: "$130", earn: "+$26", badge: "20%" },
];

/* AFFEXCH merchant cities. `tag` is a short 3-letter business prefix. */
export const ALL_CITIES = [
  { id: "toronto", name: "Toronto", country: "CA", tag: "TOR", neighborhoods: ["Yorkville", "Queen West", "Liberty Village", "The Annex"] }, // 138
  { id: "vancouve", name: "Vancouver", country: "CA", tag: "VAN", neighborhoods: ["Yaletown", "Kitsilano", "Gastown", "Mount Pleasant"] }, // 59
  { id: "calgary", name: "Calgary", country: "CA", tag: "CAL", neighborhoods: ["Kensington", "Inglewood", "Mission", "Beltline"] }, // 51
  { id: "edmonton", name: "Edmonton", country: "CA", tag: "EDM", neighborhoods: ["Whyte Avenue", "Garneau", "124 Street", "Downtown"] }, // 36
  { id: "montreal", name: "Montreal", country: "CA", tag: "MON", neighborhoods: ["Plateau", "Mile End", "Old Port", "Westmount"] }, // 35
  { id: "ottawa", name: "Ottawa", country: "CA", tag: "OTT", neighborhoods: ["Glebe", "ByWard Market", "Westboro", "Hintonburg"] }, // 20
  { id: "mississa", name: "Mississauga", country: "CA", tag: "MIS", neighborhoods: ["Port Credit", "Streetsville", "Square One", "Erin Mills"] }, // 18
  { id: "winnipeg", name: "Winnipeg", country: "CA", tag: "WIN", neighborhoods: ["Exchange District", "Osborne Village", "Wolseley", "Corydon"] }, // 16
  { id: "burnaby", name: "Burnaby", country: "CA", tag: "BUR", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 13
  { id: "surrey", name: "Surrey", country: "CA", tag: "SUR", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 12
  { id: "victoria", name: "Victoria", country: "CA", tag: "VIC", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 9
  { id: "halifax", name: "Halifax", country: "CA", tag: "HAL", neighborhoods: ["South End", "North End", "Spring Garden", "Waterfront"] }, // 8
  { id: "etobicok", name: "Etobicoke", country: "CA", tag: "ETO", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 7
  { id: "richmond", name: "Richmond", country: "CA", tag: "RIC", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 7
  { id: "kitchene", name: "Kitchener", country: "CA", tag: "KIT", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 6
  { id: "laval", name: "Laval", country: "CA", tag: "LAV", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 6
  { id: "regina", name: "Regina", country: "CA", tag: "REG", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 6
  { id: "saskatoo", name: "Saskatoon", country: "CA", tag: "SAS", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 6
  { id: "barrie", name: "Barrie", country: "CA", tag: "BAR", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 5
  { id: "hamilton", name: "Hamilton", country: "CA", tag: "HAM", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 5
  { id: "newwestm", name: "New Westminster", country: "CA", tag: "NEW", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 5
  { id: "northyor", name: "North York", country: "CA", tag: "NOR", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 5
  { id: "frederic", name: "Fredericton", country: "CA", tag: "FRE", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 4
  { id: "guelph", name: "Guelph", country: "CA", tag: "GUE", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 4
  { id: "london", name: "London", country: "CA", tag: "LON", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 4
  { id: "princege", name: "Prince George", country: "CA", tag: "PRI", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 4
  { id: "quebecci", name: "Quebec City", country: "CA", tag: "QUE", neighborhoods: ["Saint-Roch", "Old Quebec", "Sillery", "Montcalm"] }, // 4
  { id: "stjohns", name: "St. Johns", country: "CA", tag: "STJ", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 4
  { id: "kelowna", name: "Kelowna", country: "CA", tag: "KEL", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 3
  { id: "moncton", name: "Moncton", country: "CA", tag: "MON", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 3
  { id: "northvan", name: "North Vancouver", country: "CA", tag: "NOR", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 3
  { id: "oakville", name: "Oakville", country: "CA", tag: "OAK", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 3
  { id: "peterbor", name: "Peterborough", country: "CA", tag: "PET", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 3
  { id: "saintjoh", name: "Saint John", country: "CA", tag: "SAI", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 3
  { id: "stcathar", name: "St. Catharines", country: "CA", tag: "STC", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 3
  { id: "waterloo", name: "Waterloo", country: "CA", tag: "WAT", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 3
  { id: "yellowkn", name: "Yellowknife", country: "CA", tag: "YEL", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 3
  { id: "brampton", name: "Brampton", country: "CA", tag: "BRA", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 2
  { id: "brandon", name: "Brandon", country: "CA", tag: "BRA", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 2
  { id: "brossard", name: "Brossard", country: "CA", tag: "BRO", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 2
  { id: "burlingt", name: "Burlington", country: "CA", tag: "BUR", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 2
  { id: "charlott", name: "Charlottetown", country: "CA", tag: "CHA", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 2
  { id: "coquitla", name: "Coquitlam", country: "CA", tag: "COQ", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 2
  { id: "gatineau", name: "Gatineau", country: "CA", tag: "GAT", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 2
  { id: "kingston", name: "Kingston", country: "CA", tag: "KIN", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 2
  { id: "markham", name: "Markham", country: "CA", tag: "MAR", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 2
  { id: "nanaimo", name: "Nanaimo", country: "CA", tag: "NAN", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 2
  { id: "northbay", name: "North Bay", country: "CA", tag: "NOR", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 2
  { id: "richmondx", name: "Richmond Hill", country: "CA", tag: "RIC", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 2
  { id: "sherbroo", name: "Sherbrooke", country: "CA", tag: "SHE", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 2
  { id: "thornhil", name: "Thornhill", country: "CA", tag: "THO", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 2
  { id: "thunderb", name: "Thunder Bay", country: "CA", tag: "THU", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 2
  { id: "vaughan", name: "Vaughan", country: "CA", tag: "VAU", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 2
  { id: "westmoun", name: "Westmount", country: "CA", tag: "WES", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 2
  { id: "airdrie", name: "Airdrie", country: "CA", tag: "AIR", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "ajax", name: "Ajax", country: "CA", tag: "AJA", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "amherst", name: "Amherst", country: "CA", tag: "AMH", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "bowmanvi", name: "Bowmanville", country: "CA", tag: "BOW", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "calgaryx", name: "Calgary.", country: "CA", tag: "CAL", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "concord", name: "Concord", country: "CA", tag: "CON", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "dartmout", name: "Dartmouth", country: "CA", tag: "DAR", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "delta", name: "Delta", country: "CA", tag: "DEL", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "drummond", name: "Drummondville", country: "CA", tag: "DRU", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "fortmcmu", name: "Fort McMurray", country: "CA", tag: "FOR", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "grandepr", name: "Grande Prairie", country: "CA", tag: "GRA", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "greaters", name: "Greater Sudbury", country: "CA", tag: "GRE", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "kamloops", name: "Kamloops", country: "CA", tag: "KAM", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "montlaur", name: "Mont Laurier", country: "CA", tag: "MON", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "mountpea", name: "Mount Pearl", country: "CA", tag: "MOU", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "nepean", name: "Nepean", country: "CA", tag: "NEP", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "newmarke", name: "Newmarket", country: "CA", tag: "NEW", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "niagaraf", name: "Niagara Falls", country: "CA", tag: "NIA", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "oshawa", name: "Oshawa", country: "CA", tag: "OSH", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "portmood", name: "Port Moody", country: "CA", tag: "POR", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "saintlau", name: "Saint Laurent", country: "CA", tag: "SAI", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "scarboro", name: "Scarborough", country: "CA", tag: "SCA", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "southamp", name: "Southampton", country: "CA", tag: "SOU", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "stthomas", name: "St Thomas", country: "CA", tag: "STT", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "stonypla", name: "Stony Plain", country: "CA", tag: "STO", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "sudbury", name: "Sudbury", country: "CA", tag: "SUD", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "summersi", name: "Summerside", country: "CA", tag: "SUM", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "troisriv", name: "Trois-Rivieres", country: "CA", tag: "TRO", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "unionvil", name: "Unionville", country: "CA", tag: "UNI", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "westvanc", name: "West Vancouver", country: "CA", tag: "WES", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "whiteroc", name: "White Rock", country: "CA", tag: "WHI", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "whitehor", name: "Whitehorse", country: "CA", tag: "WHI", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "windsor", name: "Windsor", country: "CA", tag: "WIN", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "woodbrid", name: "Woodbridge", country: "CA", tag: "WOO", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
  { id: "york", name: "York", country: "CA", tag: "YOR", neighborhoods: ["Downtown", "Riverside", "Heights", "Old Town"] }, // 1
];

/* First 10 entries — surfaced as quick-select tiles in the modal. */
export const TOP_CITIES = ALL_CITIES.slice(0, 10);

/* Business-name templates — index 0..3 maps to the 4 cards. */
const BIZ_TEMPLATES = [
  (c, h) => `${h} Peptide Lab`,
  (c, h) => `${c.tag} ${h} BioRx`,
  (c, h) => `${h} Compound Pharmacy`,
  (c, h) => `${h} Wellness Group`,
];

/* Deterministic offer generator — same city always produces the same 4
   offers, so reloading the page keeps the catalog stable. */
export function offersForCity(city) {
  if (!city) return [];
  const seed = city.id.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0);
  return Array.from({ length: 4 }, (_, i) => {
    const hood = city.neighborhoods[i % city.neighborhoods.length];
    const pep = PEPTIDES[(seed + i * 3) % PEPTIDES.length];
    return {
      id: `${city.id}-${i}`,
      business: BIZ_TEMPLATES[i](city, hood),
      peptide: pep.name,
      neighborhood: hood,
      city: city.name,
      country: city.country,
      price: pep.price,
      earn: pep.earn,
      badge: pep.badge,
    };
  });
}

/* Filter helper for the search input. */
export function searchCities(query) {
  if (!query) return [];
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.tag.toLowerCase().includes(q) ||
      c.country.toLowerCase() === q
  ).slice(0, 8);
}
