import type { Country, SystemId } from '../sim/types';

// Seed data: approximate, rounded figures. Leaders of real countries are
// fictional so the game never depicts real people.
// Order matters: a world of size N uses the first N rows. The first 10 cover all 8 systems.

export const WORLD_SIZES = [10, 15, 25, 35, 50] as const;
export type WorldSize = (typeof WORLD_SIZES)[number];
export const WORLD_SIZE_LABELS: Record<WorldSize, string> = {
  10: 'Test (10)', 15: 'Small (15)', 25: 'Standard (25)', 35: 'Large (35)', 50: 'Realistic (50)',
};

type Row = [
  id: string, name: string, fantasy: 0 | 1, system: SystemId, leader: string, party: string, approval: number,
  popM: number, gdpBn: number, growth: number, unemp: number, infl: number, debt: number,
  stability: number, tourism: number, culture: number,
];

const ROWS: Row[] = [
  // --- 10 (test): one of every system ---
  ['usa', 'United States', 0, 'federal', 'President Hale', 'Federal Party', 44, 335, 28000, 2.3, 4.0, 3.0, 120, 70, 85, 95],
  ['chn', 'China', 0, 'one-party', 'Gen. Secretary Lin', "People's Party", 70, 1410, 18500, 4.8, 5.1, 0.5, 85, 80, 65, 70],
  ['deu', 'Germany', 0, 'parliamentary', 'Chancellor Brandt', 'Mitte', 40, 84, 4500, 0.3, 5.9, 2.3, 63, 78, 70, 75],
  ['fra', 'France', 0, 'semi-presidential', 'President Moreau', 'Renouveau', 35, 68, 3100, 1.0, 7.4, 2.2, 112, 65, 95, 90],
  ['gbr', 'United Kingdom', 0, 'constitutional-monarchy', 'PM Ashford', 'Union Party', 38, 68, 3300, 1.0, 4.3, 2.8, 100, 72, 80, 85],
  ['phl', 'Philippines', 0, 'presidential', 'President Reyes', 'Bagong Bayan', 55, 117, 460, 5.8, 4.1, 3.5, 60, 60, 60, 55],
  ['che', 'Switzerland', 0, 'direct-democracy', 'Council President Keller', 'Alpine Union', 60, 9, 900, 1.3, 2.3, 1.0, 38, 92, 75, 65],
  ['aurex', 'Aurex Consortium', 1, 'corporate-state', 'Chairman Vance', 'Board Majority', 50, 30, 1400, 3.5, 6.5, 2.5, 40, 66, 55, 60],
  ['eldmar', 'Kingdom of Eldmar', 1, 'constitutional-monarchy', 'Chancellor Vael', 'Crown Assembly', 52, 22, 600, 2.0, 6.0, 3.0, 70, 68, 75, 80],
  ['tarvos', 'Tarvos Republic', 1, 'presidential', 'President Kord', 'Iron Front', 48, 40, 900, 3.2, 7.5, 5.0, 55, 55, 40, 50],
  // --- 15 (small) ---
  ['jpn', 'Japan', 0, 'constitutional-monarchy', 'PM Takeda', 'Liberal Union', 33, 124, 4200, 0.8, 2.5, 2.5, 250, 85, 80, 88],
  ['ind', 'India', 0, 'parliamentary', 'PM Sharma', 'National Front', 58, 1430, 3900, 6.5, 7.8, 4.8, 82, 62, 65, 75],
  ['bra', 'Brazil', 0, 'federal', 'President Costa', 'Movimento Brasil', 45, 216, 2200, 2.5, 7.0, 4.5, 75, 55, 60, 70],
  ['rus', 'Russia', 0, 'semi-presidential', 'President Volkov', 'United Power', 65, 144, 2100, 1.5, 3.0, 7.5, 20, 60, 40, 55],
  ['kor', 'South Korea', 0, 'presidential', 'President Han', 'Saenuri Alliance', 36, 52, 1700, 2.0, 2.8, 2.3, 50, 75, 70, 85],
  // --- 25 (standard) ---
  ['mex', 'Mexico', 0, 'federal', 'President Ortega', 'Partido Nacional', 60, 129, 1800, 1.5, 2.8, 4.5, 50, 52, 85, 70],
  ['can', 'Canada', 0, 'constitutional-monarchy', 'PM Callahan', 'Maple Party', 39, 40, 2200, 1.2, 6.5, 2.4, 105, 85, 70, 70],
  ['ita', 'Italy', 0, 'parliamentary', 'PM Ricci', 'Fratellanza', 42, 59, 2300, 0.7, 6.5, 1.5, 137, 62, 92, 85],
  ['esp', 'Spain', 0, 'constitutional-monarchy', 'PM Navarro', 'Partido Ibérico', 40, 48, 1700, 2.5, 11.5, 2.8, 105, 66, 93, 78],
  ['aus', 'Australia', 0, 'constitutional-monarchy', 'PM Whitlock', 'Southern Labour', 45, 27, 1800, 1.8, 4.0, 3.2, 50, 86, 72, 65],
  ['idn', 'Indonesia', 0, 'presidential', 'President Santoso', 'Garuda Party', 65, 278, 1400, 5.0, 4.9, 2.3, 39, 62, 62, 55],
  ['tur', 'Türkiye', 0, 'presidential', 'President Aydın', 'Anatolian Party', 42, 85, 1100, 3.2, 8.7, 45.0, 30, 50, 82, 65],
  ['nga', 'Nigeria', 0, 'federal', 'President Okafor', 'Progress Congress', 35, 224, 400, 3.0, 5.0, 25.0, 45, 38, 25, 60],
  ['arg', 'Argentina', 0, 'federal', 'President Ferreyra', 'Libertad Nacional', 47, 46, 640, 4.0, 7.0, 40.0, 85, 48, 60, 65],
  ['myrr', 'Free Isles of Myrr', 1, 'direct-democracy', 'Speaker Ondine', 'Tidehall Assembly', 58, 6, 180, 2.2, 4.5, 2.0, 35, 82, 88, 70],
  // --- 35 (large) ---
  ['zaf', 'South Africa', 0, 'parliamentary', 'President Ndlovu', 'Rainbow Congress', 40, 62, 400, 1.0, 32.0, 4.5, 75, 45, 55, 55],
  ['egy', 'Egypt', 0, 'semi-presidential', 'President Hassan', 'Nile Front', 55, 112, 400, 3.8, 6.8, 20.0, 90, 50, 70, 60],
  ['vnm', 'Vietnam', 0, 'one-party', 'Gen. Secretary Tran', 'Workers Party', 72, 100, 470, 6.5, 2.2, 3.0, 37, 75, 65, 50],
  ['pol', 'Poland', 0, 'parliamentary', 'PM Kowalski', 'Civic Union', 43, 37, 900, 3.0, 2.9, 4.0, 55, 72, 60, 55],
  ['nld', 'Netherlands', 0, 'constitutional-monarchy', 'PM de Vries', 'Polder Party', 41, 18, 1150, 1.0, 3.7, 3.0, 45, 82, 72, 65],
  ['swe', 'Sweden', 0, 'constitutional-monarchy', 'PM Lindqvist', 'Nordic Moderates', 44, 11, 600, 1.2, 8.5, 2.0, 33, 85, 60, 70],
  ['ukr', 'Ukraine', 0, 'semi-presidential', 'President Kovalenko', 'Sovereign Ukraine', 60, 37, 190, 3.0, 12.0, 8.0, 90, 35, 15, 55],
  ['col', 'Colombia', 0, 'presidential', 'President Vargas', 'Pacto Andino', 38, 52, 360, 1.8, 10.0, 5.0, 55, 52, 58, 60],
  ['halvane', 'Halvane Trade League', 1, 'corporate-state', 'Chairwoman Sorel', 'Guild Bloc', 55, 14, 520, 4.2, 5.0, 2.8, 30, 70, 78, 65],
  ['vorlund', 'Vorlund Directorate', 1, 'one-party', 'High Secretary Graak', 'Unity Directorate', 68, 55, 700, 2.8, 4.0, 6.0, 65, 72, 30, 45],
  // --- 50 (realistic) ---
  ['chl', 'Chile', 0, 'presidential', 'President Muñoz', 'Frente Austral', 38, 20, 330, 2.3, 8.5, 4.0, 40, 64, 55, 50],
  ['per', 'Peru', 0, 'presidential', 'President Quispe', 'Perú Unido', 15, 34, 270, 3.0, 6.5, 2.5, 33, 40, 65, 55],
  ['tha', 'Thailand', 0, 'constitutional-monarchy', 'PM Chaiyaporn', 'Siam Forward', 42, 71, 520, 2.7, 1.0, 1.0, 63, 58, 90, 65],
  ['mys', 'Malaysia', 0, 'federal', 'PM Rahman', 'Harapan Coalition', 50, 34, 420, 4.5, 3.3, 2.0, 65, 66, 75, 55],
  ['pak', 'Pakistan', 0, 'parliamentary', 'PM Qureshi', 'Muslim League', 40, 240, 370, 2.5, 8.0, 12.0, 74, 38, 30, 50],
  ['bgd', 'Bangladesh', 0, 'parliamentary', 'PM Rahim', 'Awami Front', 45, 173, 450, 5.0, 5.0, 9.5, 40, 45, 25, 45],
  ['ken', 'Kenya', 0, 'presidential', 'President Mwangi', 'Jubilee Alliance', 40, 55, 110, 5.0, 5.6, 5.5, 70, 52, 60, 55],
  ['eth', 'Ethiopia', 0, 'federal', 'PM Bekele', 'Prosperity Party', 50, 126, 160, 6.5, 3.5, 25.0, 40, 35, 40, 50],
  ['nor', 'Norway', 0, 'constitutional-monarchy', 'PM Haugen', 'Fjord Labour', 46, 5.5, 480, 1.5, 4.0, 3.0, 43, 90, 72, 60],
  ['grc', 'Greece', 0, 'parliamentary', 'PM Papadakis', 'New Hellas', 38, 10.4, 250, 2.2, 9.5, 3.0, 160, 65, 92, 80],
  ['prt', 'Portugal', 0, 'semi-presidential', 'PM Fonseca', 'Partido Lusitano', 44, 10.4, 300, 1.9, 6.5, 2.4, 98, 80, 85, 65],
  ['isr', 'Israel', 0, 'parliamentary', 'PM Ben-Ami', 'Unity List', 32, 9.8, 520, 1.5, 3.4, 3.0, 62, 50, 55, 65],
  ['nzl', 'New Zealand', 0, 'constitutional-monarchy', 'PM Tane', 'Kiwi Labour', 43, 5.2, 250, 1.0, 4.5, 3.0, 45, 88, 80, 60],
  ['cub', 'Cuba', 0, 'one-party', 'First Secretary Morales', 'Revolutionary Party', 45, 11, 100, -1.0, 2.0, 30.0, 110, 55, 60, 70],
  ['duskmoor', 'Duskmoor Federation', 1, 'federal', 'High Governor Ashcombe', 'League of Marches', 46, 48, 650, 2.0, 8.0, 4.0, 80, 58, 45, 60],
];

function toCountry(r: Row): Omit<Country, 'relations'> {
  const [id, name, fantasy, systemId, leader, party, approval, population, gdpBn, growth, unemployment, inflation, debtToGdp, stability, tourism, culture] = r;
  return {
    id, name, fantasy: fantasy === 1, systemId, leader: { name: leader, party, approval }, population,
    economy: { gdpBn, growth, unemployment, inflation, debtToGdp }, stability, tourism, culture,
  };
}

export function seedCountries(size: WorldSize = 25): Record<string, Country> {
  const picked = ROWS.slice(0, size).map(toCountry);
  const out: Record<string, Country> = {};
  for (const c of picked) {
    const relations: Record<string, number> = {};
    for (const o of picked) if (o.id !== c.id) relations[o.id] = 0;
    out[c.id] = { ...c, relations };
  }
  return out;
}
