// World power data. Approximate and simplified for play.

export type BlocId = 'atlantic' | 'concord' | 'none' | 'crown' | 'iron';
export type ResourceId = 'oil' | 'food' | 'tech' | 'minerals' | 'industry';
export type RegionId = 'americas' | 'europe' | 'asia' | 'mideast-africa' | 'reaches';

export const BLOCS: Record<BlocId, { name: string; blurb: string; rival?: BlocId }> = {
  atlantic: { name: 'Atlantic Compact', blurb: 'Western democracies and their partners.', rival: 'concord' },
  concord: { name: 'Eastern Concord', blurb: 'A loose front against Western power.', rival: 'atlantic' },
  none: { name: 'Non-aligned', blurb: 'Friends with everyone, tied to no one.' },
  crown: { name: 'Crown League', blurb: 'The old kingdoms and free isles of the Far Reaches.', rival: 'iron' },
  iron: { name: 'Iron Pact', blurb: 'The hard-line states of the Far Reaches.', rival: 'crown' },
};

export const REGIONS: Record<RegionId, string> = {
  americas: 'Americas', europe: 'Europe', asia: 'Asia-Pacific', 'mideast-africa': 'Middle East and Africa', reaches: 'The Far Reaches',
};

export const RESOURCES: Record<ResourceId, { name: string; gives: string }> = {
  oil: { name: 'Oil and gas', gives: 'lower inflation' },
  food: { name: 'Food', gives: 'more stability' },
  tech: { name: 'Technology', gives: 'faster growth' },
  minerals: { name: 'Minerals', gives: 'some growth' },
  industry: { name: 'Factories', gives: 'more jobs' },
};

type GeoRow = [region: RegionId, bloc: BlocId, military: number, nuclear: 0 | 1, resource: ResourceId];

export const GEO: Record<string, GeoRow> = {
  usa: ['americas', 'atlantic', 100, 1, 'tech'], chn: ['asia', 'concord', 88, 1, 'industry'], deu: ['europe', 'atlantic', 38, 0, 'industry'],
  fra: ['europe', 'atlantic', 55, 1, 'food'], gbr: ['europe', 'atlantic', 52, 1, 'tech'], phl: ['asia', 'atlantic', 22, 0, 'food'],
  che: ['europe', 'none', 18, 0, 'tech'], aurex: ['reaches', 'none', 35, 0, 'tech'], eldmar: ['reaches', 'crown', 45, 0, 'food'],
  tarvos: ['reaches', 'iron', 58, 0, 'minerals'], jpn: ['asia', 'atlantic', 42, 0, 'tech'], ind: ['asia', 'none', 62, 1, 'industry'],
  bra: ['americas', 'none', 32, 0, 'food'], rus: ['europe', 'concord', 78, 1, 'oil'], kor: ['asia', 'atlantic', 46, 0, 'tech'],
  mex: ['americas', 'none', 18, 0, 'industry'], can: ['americas', 'atlantic', 24, 0, 'oil'], ita: ['europe', 'atlantic', 34, 0, 'industry'],
  esp: ['europe', 'atlantic', 28, 0, 'food'], aus: ['asia', 'atlantic', 32, 0, 'minerals'], idn: ['asia', 'none', 30, 0, 'minerals'],
  tur: ['mideast-africa', 'atlantic', 46, 0, 'industry'], nga: ['mideast-africa', 'none', 18, 0, 'oil'], arg: ['americas', 'none', 16, 0, 'food'],
  myrr: ['reaches', 'crown', 14, 0, 'food'], zaf: ['mideast-africa', 'none', 20, 0, 'minerals'], egy: ['mideast-africa', 'none', 36, 0, 'food'],
  vnm: ['asia', 'none', 30, 0, 'industry'], pol: ['europe', 'atlantic', 34, 0, 'industry'], nld: ['europe', 'atlantic', 22, 0, 'food'],
  swe: ['europe', 'atlantic', 24, 0, 'tech'], ukr: ['europe', 'atlantic', 42, 0, 'food'], col: ['americas', 'none', 22, 0, 'oil'],
  halvane: ['reaches', 'none', 22, 0, 'tech'], vorlund: ['reaches', 'iron', 62, 0, 'minerals'], chl: ['americas', 'none', 16, 0, 'minerals'],
  per: ['americas', 'none', 14, 0, 'minerals'], tha: ['asia', 'none', 22, 0, 'food'], mys: ['asia', 'none', 18, 0, 'oil'],
  pak: ['asia', 'concord', 45, 1, 'food'], bgd: ['asia', 'none', 14, 0, 'industry'], ken: ['mideast-africa', 'none', 12, 0, 'food'],
  eth: ['mideast-africa', 'none', 18, 0, 'food'], nor: ['europe', 'atlantic', 20, 0, 'oil'], grc: ['europe', 'atlantic', 26, 0, 'food'],
  prt: ['europe', 'atlantic', 16, 0, 'food'], isr: ['mideast-africa', 'atlantic', 48, 1, 'tech'], nzl: ['asia', 'atlantic', 12, 0, 'food'],
  cub: ['americas', 'concord', 14, 0, 'food'], duskmoor: ['reaches', 'iron', 42, 0, 'industry'],
};

/** Old rivalries: they start cold and stay touchy. */
export const RIVALRIES: [string, string][] = [
  ['usa', 'chn'], ['usa', 'rus'], ['usa', 'cub'], ['ind', 'pak'], ['chn', 'ind'], ['chn', 'jpn'], ['rus', 'ukr'], ['grc', 'tur'],
  ['eldmar', 'tarvos'], ['vorlund', 'eldmar'], ['aurex', 'halvane'], ['myrr', 'duskmoor'],
];

export const isRival = (a: string, b: string) => RIVALRIES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
