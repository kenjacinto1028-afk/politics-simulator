/** Each country's own name for itself (native script where it has one). Fantasy countries get invented ones. */
export const LOCAL_NAMES: Record<string, string> = {
  usa: 'United States', chn: '中国 · Zhōngguó', deu: 'Deutschland', fra: 'France', gbr: 'United Kingdom', phl: 'Pilipinas',
  che: 'Schweiz / Suisse / Svizzera', aurex: 'Aurex Holdings', eldmar: 'Eldmarrik', tarvos: 'Tarvosa',
  jpn: '日本 · Nippon', ind: 'भारत · Bhārat', bra: 'Brasil', rus: 'Россия · Rossiya', kor: '대한민국 · Daehan Minguk',
  mex: 'México', can: 'Canada', ita: 'Italia', esp: 'España', aus: 'Australia', idn: 'Indonesia', tur: 'Türkiye',
  nga: 'Nigeria', arg: 'Argentina', myrr: 'Myrrhavn', zaf: 'Suid-Afrika / iNingizimu Afrika', egy: 'مصر · Miṣr',
  vnm: 'Việt Nam', pol: 'Polska', nld: 'Nederland', swe: 'Sverige', ukr: 'Україна · Ukraina', col: 'Colombia',
  halvane: 'Halvaner Bund', vorlund: 'Vorlundsk Direktorat', chl: 'Chile', per: 'Perú', tha: 'ประเทศไทย · Prathet Thai',
  mys: 'Malaysia', pak: 'پاکستان · Pākistān', bgd: 'বাংলাদেশ · Bangladesh', ken: 'Kenya', eth: 'ኢትዮጵያ · Ītyōṗṗyā',
  nor: 'Norge', grc: 'Ελλάδα · Elláda', prt: 'Portugal', isr: 'ישראל · Yisra\'el', nzl: 'Aotearoa', cub: 'Cuba',
  duskmoor: 'Duskmoorlund',
};

/** "Germany (Deutschland)", or just the name when the local one is the same. */
export function countryLabel(c: { id: string; name: string }): string {
  const local = LOCAL_NAMES[c.id];
  return local && local !== c.name ? `${c.name} (${local})` : c.name;
}
