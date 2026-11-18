// A simple robot player, used by tests and balance checks.
import { rngFor } from './engine';
import { availableActions, comebackOptions, doAction, resolveEvent, runAgain, runForHigher, type CampaignAction } from './career';
import { higherOfficeBlocker, meetGroup, nextOffice } from './mayor';
import { decideBill, visitCity } from './governor';
import { castVote, floorSpeech } from './legislator';
import { answerAsk, briefLeader, choosePortfolio, launchInitiative } from './cabinet';
import { canAddress, courtParliament, nationalAddress } from './nation';
import { PORTFOLIOS } from '../data/cabinet-content';
import { SYSTEMS } from '../data/systems';
import { kindOf } from './offices';
import { askEndorsement, endorseBlocker, meetContact, visibleContacts } from './people';
import { buyback, choosePatron, consultCoalition, lobbyCapital, negotiateUnions, patronBlocker, payRespects, royalOccasion } from './systems';
import type { GameState } from './types';

/** A simple player robot: answers every prompt, campaigns, governs a little, and always reaches higher. */
export function playMonth(g: GameState, rngSalt: number): GameState {
  let i = 0;
  const r = () => rngFor(g, rngSalt + i++);
  const mode = SYSTEMS[g.countries[g.player!.countryId].systemId].advancement;
  for (let k = 0; k < 8; k++) {
    const p = g.player!;
    if (p.retired) return g;
    if (p.pendingEvent) { g = resolveEvent(g, Math.floor(r()() * p.pendingEvent.choices.length)); continue; }
    if (p.region?.pendingBill) { g = decideBill(g, r()() < 0.6); continue; }
    if (p.seat?.pendingVote) { g = castVote(g, p.seat.pendingVote.partyWantsYes); continue; }
    if (p.ministry?.pendingAsk) { g = answerAsk(g, p.ministry.boss < 70); continue; }
    if (!p.office && !p.campaign) { const opts = comebackOptions(g); g = runAgain(g, r(), opts[opts.length - 1]); continue; }
    if (p.actionsLeft <= 0) break;
    const before = g;
    // Work the system's signature rule and the people around you.
    const sysId = g.countries[p.countryId].systemId;
    const m = p.sys.meter;
    if (sysId === 'one-party' && !p.sys.patronId) {
      const pat = visibleContacts(g).find((c) => !patronBlocker(g, c.id));
      if (pat) { g = choosePatron(g, pat.id); if (g !== before) continue; }
      const boss = visibleContacts(g).filter((c) => c.party === 'yours' && c.rung > Math.max(0, p.highestRung)).sort((a, b) => b.relation - a.relation)[0];
      if (boss && k % 2 === 0) { g = meetContact(g, boss.id, r()); if (g !== before) continue; }
    }
    const upkeep = sysId === 'one-party' && p.sys.patronId && m < 55 ? payRespects(g, r())
      : sysId === 'parliamentary' && m < 40 ? consultCoalition(g, r())
      : sysId === 'semi-presidential' && m < 35 ? negotiateUnions(g, r())
      : sysId === 'constitutional-monarchy' && m < 45 ? royalOccasion(g, r())
      : sysId === 'federal' && m < 40 ? lobbyCapital(g, r())
      : sysId === 'corporate-state' && m < 35 && p.funds > 60 ? buyback(g) : g;
    if (upkeep !== g) { g = upkeep; continue; }
    if (p.campaign) {
      const backer = visibleContacts(g).find((c) => !endorseBlocker(p, c));
      if (backer) { g = askEndorsement(g, backer.id); continue; }
    }
    const next = nextOffice(g);
    if (next && !higherOfficeBlocker(g)) { g = runForHigher(g, next, r()); if (g !== before) continue; }
    const kind = kindOf(p.office);
    if (p.campaign || !p.office) {
      const acts = availableActions(mode, !!p.campaign, !!p.office, kind === 'local');
      const pref: CampaignAction[] = p.funds < 30 && k % 3 === 0 ? ['fundraise'] : mode === 'election' ? ['ads', 'rally', 'door-knock', 'party-work', 'fundraise'] : mode === 'shares' ? ['buy-shares', 'ads', 'fundraise'] : ['party-work', 'rally', 'fundraise'];
      const a = pref.find((x) => acts.includes(x) && g !== (g = doAction(g, x, r())));
      if (a) continue;
    } else if (kind === 'cabinet') {
      const m = p.ministry!;
      if (!m.portfolio) g = choosePortfolio(g, 'economy');
      else {
        const d = PORTFOLIOS[m.portfolio].initiatives.find((x) => !m.done.includes(x.id));
        if (d) g = launchInitiative(g, d.id);
        if (g === before) g = briefLeader(g, r());
      }
    } else if (kind === 'head') {
      if (canAddress(g)) g = nationalAddress(g);
      else if (mode !== 'election' && p.loyalty < 45) g = doAction(g, mode === 'shares' ? (p.funds >= 30 ? 'buy-shares' : 'fundraise') : 'party-work', r());
      else g = courtParliament(g, r());
    } else if (kind === 'regional') g = visitCity(g, 0, r());
    else if (kind === 'legislative') g = floorSpeech(g, r());
    else g = meetGroup(g, 'workers', r());
    if (g === before) g = doAction(g, 'fundraise', r());
    if (g === before) break;
  }
  return g;
}

