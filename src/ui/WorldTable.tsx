import { useGame } from '../store';
import { TIERS, tierOf } from '../sim/geo';
import { BLOCS } from '../data/geo';
import { SYSTEMS } from '../data/systems';
import { countryLabel } from '../data/local-names';
import type { Country } from '../sim/types';
import { Flag } from './Flag';
import { LeaderLink } from './LeaderCard';
import { DataTable, type Column } from './DataTable';

const fmt = (n: number, d = 1) => n.toFixed(d);
const TIER_ORDER = Object.keys(TIERS);

/** Every country in the world, sortable and filterable. */
export function WorldTable() {
  const { game } = useGame();
  const homeId = game.player!.countryId;
  const rows = Object.values(game.countries) as Country[];
  const columns: Column<Country>[] = [
    { key: 'country', label: 'Country', render: (x) => <><Flag id={x.id} size={12} /> {countryLabel(x)}</>, sort: (x) => countryLabel(x), filter: (x) => `${x.name} ${countryLabel(x)}` },
    { key: 'power', label: 'Power', render: (x) => TIERS[tierOf(x)].name, sort: (x) => TIER_ORDER.indexOf(tierOf(x)), filter: (x) => TIERS[tierOf(x)].name },
    { key: 'army', label: 'Army', render: (x) => <>{Math.round(x.military)}{x.nuclear ? ' ☢' : ''}</>, sort: (x) => x.military },
    { key: 'bloc', label: 'Bloc', render: (x) => BLOCS[x.bloc].name, sort: (x) => BLOCS[x.bloc].name, filter: (x) => BLOCS[x.bloc].name },
    { key: 'system', label: 'System', render: (x) => SYSTEMS[x.systemId].name, sort: (x) => SYSTEMS[x.systemId].name, filter: (x) => SYSTEMS[x.systemId].name },
    { key: 'leader', label: 'Leader', render: (x) => <><LeaderLink id={x.id} size={22} />{x.junta ? ' (junta)' : ''}</>, sort: (x) => x.leader.name, filter: (x) => x.leader.name },
    { key: 'approval', label: 'Approval', render: (x) => `${fmt(x.leader.approval, 0)}%`, sort: (x) => x.leader.approval },
    { key: 'gdp', label: 'GDP $bn', render: (x) => fmt(x.economy.gdpBn, 0), sort: (x) => x.economy.gdpBn },
    { key: 'growth', label: 'Growth', render: (x) => `${fmt(x.economy.growth)}%`, sort: (x) => x.economy.growth },
    { key: 'unemp', label: 'Unemp.', render: (x) => `${fmt(x.economy.unemployment)}%`, sort: (x) => x.economy.unemployment },
  ];
  const blocIds = Array.from(new Set(rows.map((x) => x.bloc)));
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(x) => x.id}
      rowClass={(x) => (x.id === homeId ? 'home' : '')}
      filterPlaceholder="Filter by country, leader, bloc, system"
      extraFilters={[
        { label: 'Bloc', options: blocIds.map((b) => ({ value: b, label: BLOCS[b].name })), test: (x, v) => x.bloc === v },
        { label: 'Power', options: TIER_ORDER.map((t) => ({ value: t, label: TIERS[t as keyof typeof TIERS].name })), test: (x, v) => tierOf(x) === v },
      ]}
    />
  );
}
