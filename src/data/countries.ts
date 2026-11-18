import type { Country } from '../sim/types';

// Seed data: approximate, rounded figures. Leaders are fictionalized to avoid
// depicting real people; real-world country stats are used as a baseline.
type Seed = Omit<Country, 'relations'>;

const seeds: Seed[] = [
  { id: 'usa', name: 'United States', fantasy: false, systemId: 'presidential', leader: { name: 'President Hale', party: 'Federal Party', approval: 44 }, population: 335, economy: { gdpBn: 28000, growth: 2.3, unemployment: 4.0, inflation: 3.0, debtToGdp: 120 }, stability: 70, tourism: 85, culture: 95 },
  { id: 'gbr', name: 'United Kingdom', fantasy: false, systemId: 'constitutional-monarchy', leader: { name: 'PM Ashford', party: 'Union Party', approval: 38 }, population: 68, economy: { gdpBn: 3300, growth: 1.0, unemployment: 4.3, inflation: 2.8, debtToGdp: 100 }, stability: 72, tourism: 80, culture: 85 },
  { id: 'fra', name: 'France', fantasy: false, systemId: 'semi-presidential', leader: { name: 'President Moreau', party: 'Renouveau', approval: 35 }, population: 68, economy: { gdpBn: 3100, growth: 1.0, unemployment: 7.4, inflation: 2.2, debtToGdp: 112 }, stability: 65, tourism: 95, culture: 90 },
  { id: 'deu', name: 'Germany', fantasy: false, systemId: 'parliamentary', leader: { name: 'Chancellor Brandt', party: 'Mitte', approval: 40 }, population: 84, economy: { gdpBn: 4500, growth: 0.3, unemployment: 5.9, inflation: 2.3, debtToGdp: 63 }, stability: 78, tourism: 70, culture: 75 },
  { id: 'jpn', name: 'Japan', fantasy: false, systemId: 'constitutional-monarchy', leader: { name: 'PM Takeda', party: 'Liberal Union', approval: 33 }, population: 124, economy: { gdpBn: 4200, growth: 0.8, unemployment: 2.5, inflation: 2.5, debtToGdp: 250 }, stability: 85, tourism: 80, culture: 88 },
  { id: 'phl', name: 'Philippines', fantasy: false, systemId: 'presidential', leader: { name: 'President Reyes', party: 'Bagong Bayan', approval: 55 }, population: 117, economy: { gdpBn: 460, growth: 5.8, unemployment: 4.1, inflation: 3.5, debtToGdp: 60 }, stability: 60, tourism: 60, culture: 55 },
  { id: 'chn', name: 'China', fantasy: false, systemId: 'one-party', leader: { name: 'General Secretary Lin', party: "People's Party", approval: 70 }, population: 1410, economy: { gdpBn: 18500, growth: 4.8, unemployment: 5.1, inflation: 0.5, debtToGdp: 85 }, stability: 80, tourism: 65, culture: 70 },
  { id: 'eldmar', name: 'Kingdom of Eldmar', fantasy: true, systemId: 'constitutional-monarchy', leader: { name: 'Chancellor Vael', party: 'Crown Assembly', approval: 52 }, population: 22, economy: { gdpBn: 600, growth: 2.0, unemployment: 6.0, inflation: 3.0, debtToGdp: 70 }, stability: 68, tourism: 75, culture: 80 },
  { id: 'tarvos', name: 'Tarvos Republic', fantasy: true, systemId: 'presidential', leader: { name: 'President Kord', party: 'Iron Front', approval: 48 }, population: 40, economy: { gdpBn: 900, growth: 3.2, unemployment: 7.5, inflation: 5.0, debtToGdp: 55 }, stability: 55, tourism: 40, culture: 50 },
];

export function seedCountries(): Record<string, Country> {
  const out: Record<string, Country> = {};
  for (const s of seeds) {
    const relations: Record<string, number> = {};
    for (const o of seeds) if (o.id !== s.id) relations[o.id] = 0;
    out[s.id] = { ...s, relations };
  }
  return out;
}
