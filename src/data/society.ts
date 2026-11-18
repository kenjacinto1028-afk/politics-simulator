// Country scores and the leader's policy for each area. Kept simple on purpose:
// one 0..100 score and one three-way policy per area.

export type StatId =
  | 'health' | 'education' | 'crime' | 'pollution' | 'energy' | 'housing' | 'infrastructure' | 'food'
  | 'press' | 'corruption' | 'inequality' | 'tech' | 'unrest' | 'intel' | 'elderly' | 'migration';

/** good: which way is better for the country. */
export const STATS: Record<StatId, { name: string; blurb: string; good: 'high' | 'low' | 'none'; group: 'people' | 'safety' | 'economy' | 'planet' }> = {
  health: { name: 'Health', blurb: 'Hospitals, doctors and how long people live.', good: 'high', group: 'people' },
  education: { name: 'Education', blurb: 'Schools and skills. Pays off slowly in growth and science.', good: 'high', group: 'people' },
  housing: { name: 'Housing', blurb: 'How affordable homes are. Low means young people can\'t start families.', good: 'high', group: 'people' },
  elderly: { name: 'Elderly', blurb: 'Share of people over 65 (%). Older countries grow slower.', good: 'none', group: 'people' },
  migration: { name: 'Migration', blurb: 'Net people arriving per 1,000 a year. Negative means people leave.', good: 'none', group: 'people' },
  inequality: { name: 'Inequality', blurb: 'Gap between rich and poor. High feeds crime and anger.', good: 'low', group: 'people' },
  crime: { name: 'Crime', blurb: 'Street crime and gangs. Scares tourists and retirees.', good: 'low', group: 'safety' },
  unrest: { name: 'Unrest', blurb: 'Protests and strikes. Very high means riots.', good: 'low', group: 'safety' },
  press: { name: 'Press freedom', blurb: 'Free media expose scandals and corruption.', good: 'high', group: 'safety' },
  corruption: { name: 'Corruption', blurb: 'Bribes and waste. Slows growth and angers business.', good: 'low', group: 'safety' },
  intel: { name: 'Intelligence', blurb: 'Your spy agency. Protects you and runs operations abroad.', good: 'high', group: 'safety' },
  infrastructure: { name: 'Infrastructure', blurb: 'Roads, rail, ports and internet. Wears down without upkeep.', good: 'high', group: 'economy' },
  tech: { name: 'Science and tech', blurb: 'Research and new industries. Drives long-term growth.', good: 'high', group: 'economy' },
  energy: { name: 'Energy security', blurb: 'How much energy you make yourself. Low means price shocks hurt.', good: 'high', group: 'economy' },
  food: { name: 'Food security', blurb: 'Enough food at fair prices. Low means hunger and unrest.', good: 'high', group: 'economy' },
  pollution: { name: 'Pollution', blurb: 'Dirty air and water. Hurts health and warms the planet.', good: 'low', group: 'planet' },
};

export type PolicyId =
  | 'immigration' | 'healthcare' | 'schools' | 'policing' | 'climate' | 'energy' | 'housing' | 'building' | 'tourism'
  | 'culture' | 'press' | 'corruption' | 'welfare' | 'research' | 'farming' | 'disasters' | 'protest' | 'spying';

type Mods = Partial<Record<StatId | 'tourism' | 'culture', number>>;
export interface PolicyLevel {
  name: string;
  /** Extra public spending, % of GDP. */
  spend?: number;
  /** Shifts in where each score settles. */
  stats?: Mods;
  groups?: Partial<Record<'workers' | 'business' | 'retirees' | 'students', number>>;
  growth?: number;
}
export interface PolicyDef { name: string; area: string; levels: [PolicyLevel, PolicyLevel, PolicyLevel] }

const mid = (name: string): PolicyLevel => ({ name });

export const POLICIES: Record<PolicyId, PolicyDef> = {
  immigration: { name: 'Immigration', area: 'Population and migration', levels: [
    { name: 'Closed', spend: 0.2, groups: { workers: 3, students: -4, business: -4 }, growth: -0.2 },
    mid('Balanced'),
    { name: 'Open', groups: { workers: -4, business: 5, students: 3 }, growth: 0.3, stats: { housing: -5 } },
  ] },
  healthcare: { name: 'Health system', area: 'Health', levels: [
    { name: 'Private', spend: -2, stats: { health: -8, inequality: 5 }, groups: { business: 4, workers: -4, retirees: -5 } },
    mid('Mixed'),
    { name: 'Public', spend: 3, stats: { health: 10, inequality: -4 }, groups: { workers: 4, retirees: 5, business: -4 } },
  ] },
  schools: { name: 'Schools', area: 'Education', levels: [
    { name: 'Basic', spend: -1, stats: { education: -8 }, groups: { students: -6, business: 2 } },
    mid('Standard'),
    { name: 'Free university', spend: 1.5, stats: { education: 10, tech: 3 }, groups: { students: 8, business: -2 } },
  ] },
  policing: { name: 'Policing', area: 'Crime and police', levels: [
    { name: 'Soft', spend: -0.5, stats: { crime: 8, unrest: -3, press: 3 }, groups: { students: 4, retirees: -5 } },
    mid('Balanced'),
    { name: 'Tough', spend: 0.8, stats: { crime: -10, unrest: 5, press: -4 }, groups: { retirees: 5, students: -5 } },
  ] },
  climate: { name: 'Climate', area: 'Environment and climate', levels: [
    { name: 'Growth first', stats: { pollution: 12 }, growth: 0.3, groups: { business: 4, students: -6 } },
    mid('Balanced'),
    { name: 'Green', spend: 1, stats: { pollution: -12, health: 2 }, growth: -0.2, groups: { students: 6, business: -3 } },
  ] },
  energy: { name: 'Energy', area: 'Energy', levels: [
    { name: 'Fossil fuels', stats: { pollution: 8, energy: 5 }, groups: { workers: 2, students: -3 } },
    mid('Mixed'),
    { name: 'Clean power', spend: 1, stats: { pollution: -8, energy: 10 }, groups: { students: 3, business: -1 } },
  ] },
  housing: { name: 'Housing', area: 'Housing', levels: [
    { name: 'Free market', stats: { housing: -8, inequality: 3 }, growth: 0.2, groups: { business: 4, students: -4 } },
    mid('Balanced'),
    { name: 'Public homes and rent caps', spend: 1.5, stats: { housing: 12, inequality: -3 }, groups: { workers: 4, students: 4, business: -4 } },
  ] },
  building: { name: 'Building', area: 'Infrastructure and transport', levels: [
    { name: 'Repairs only', spend: -1, stats: { infrastructure: -8 } },
    mid('Normal'),
    { name: 'Build big', spend: 2, stats: { infrastructure: 12, corruption: 3 }, growth: 0.2, groups: { workers: 3, business: 3 } },
  ] },
  tourism: { name: 'Tourism', area: 'Tourism', levels: [
    { name: 'Limit visitors', stats: { tourism: -12, housing: 3 }, groups: { students: 2, business: -3 } },
    mid('Normal'),
    { name: 'Promote abroad', spend: 0.3, stats: { tourism: 12, housing: -3 }, groups: { business: 3 } },
  ] },
  culture: { name: 'Arts and sports', area: 'Culture, sports and entertainment', levels: [
    { name: 'Minimal', spend: -0.3, stats: { culture: -8 }, groups: { students: -2 } },
    mid('Normal'),
    { name: 'Big funding', spend: 0.6, stats: { culture: 10, tourism: 3, unrest: -2 }, groups: { students: 3, retirees: 1 } },
  ] },
  press: { name: 'Media', area: 'Media and press freedom', levels: [
    { name: 'State control', stats: { press: -25, unrest: -5, corruption: 5 }, groups: { students: -6 } },
    mid('Normal'),
    { name: 'Fully free', stats: { press: 15, corruption: -4, unrest: 3 }, groups: { students: 4 } },
  ] },
  corruption: { name: 'Anti-corruption', area: 'Corruption', levels: [
    { name: 'Look away', stats: { corruption: 10 }, groups: { business: 2 } },
    mid('Normal'),
    { name: 'Crackdown', spend: 0.3, stats: { corruption: -12 }, groups: { business: -2, workers: 2 } },
  ] },
  welfare: { name: 'Redistribution', area: 'Inequality', levels: [
    { name: 'Low taxes on the rich', spend: -2, stats: { inequality: 10 }, growth: 0.2, groups: { business: 5, workers: -5 } },
    mid('Moderate'),
    { name: 'Strong safety net', spend: 2.5, stats: { inequality: -10, unrest: -3 }, growth: -0.1, groups: { workers: 5, business: -4 } },
  ] },
  research: { name: 'Research', area: 'Science and technology', levels: [
    { name: 'Low', spend: -0.5, stats: { tech: -8 } },
    mid('Normal'),
    { name: 'High R&D', spend: 1, stats: { tech: 12 }, groups: { students: 3, business: 2 } },
  ] },
  farming: { name: 'Farming', area: 'Food and farming', levels: [
    { name: 'Rely on imports', stats: { food: -8 }, groups: { workers: -2 } },
    mid('Balanced'),
    { name: 'Farm subsidies', spend: 1, stats: { food: 12, pollution: 2 }, groups: { workers: 3, retirees: 2 } },
  ] },
  disasters: { name: 'Disaster readiness', area: 'Disasters', levels: [
    { name: 'Low', spend: -0.3 },
    mid('Normal'),
    { name: 'High', spend: 0.5, stats: { infrastructure: 2 } },
  ] },
  protest: { name: 'Protest rights', area: 'Rights and protests', levels: [
    { name: 'Restricted', stats: { unrest: -10, press: -8 }, groups: { students: -6, retirees: 2 } },
    mid('Normal'),
    { name: 'Protected', stats: { unrest: 4, press: 5 }, groups: { students: 5 } },
  ] },
  spying: { name: 'Spy agency', area: 'Intelligence', levels: [
    { name: 'Small', spend: -0.2, stats: { intel: -15 } },
    mid('Normal'),
    { name: 'Large', spend: 0.5, stats: { intel: 15, press: -3 } },
  ] },
};

export const POLICY_IDS = Object.keys(POLICIES) as PolicyId[];
