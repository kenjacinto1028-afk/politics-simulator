import type { EventDef, Effects } from '../sim/types';

const C = (label: string, effects: Effects, log: string) => ({ label, effects, log });
type Tags = Omit<EventDef, 'id' | 'title' | 'text' | 'choices'>;
const E = (id: string, title: string, text: string, choices: ReturnType<typeof C>[], tags: Tags = {}): EventDef =>
  ({ id: 'x-' + id, title, text, choices, ...tags });

export const MORE_EVENTS: EventDef[] = [
  // ---------- OUT OF OFFICE (8) ----------
  E('out-debate', 'Debate Invitation', 'A local station invites you to debate in {city}. Your opponent is a polished speaker.', [
    C('Accept and prepare hard (-$10k)', { funds: -10, popularity: 5, loyalty: 2 }, 'A well-prepared candidate holds their own on stage.'),
    C('Decline and hold a rally', { popularity: -3, funds: 8, groups: { workers: 3 } }, 'The candidate skips the debate for a rally.'),
  ], { kinds: ['out'] }),
  E('out-endorse', 'Newspaper Endorsement', 'The {city} Gazette will endorse you, but its editor wants a say in your platform.', [
    C('Take the endorsement', { popularity: 5, groups: { business: 4, students: -3 }, loyalty: -2 }, 'The Gazette backs the candidate on its front page.'),
    C('Politely refuse', { popularity: -1, groups: { students: 3 }, loyalty: 2 }, 'The candidate turns down the Gazette\'s endorsement.'),
  ], { kinds: ['out'] }),
  E('out-doorknock', 'Door-to-Door Week', 'Volunteers offer to knock on 5,000 doors in {city}. It is tiring work.', [
    C('Join them every evening', { popularity: 6, funds: -5, loyalty: 2 }, 'The candidate is seen at thousands of doorsteps.'),
    C('Send volunteers alone', { popularity: 2, funds: 5 }, 'Volunteers cover the district without the candidate.'),
  ], { kinds: ['out'] }),
  E('out-oldpost', 'Old Posts Surface', 'Someone digs up jokes you posted ten years ago. Some are not funny now.', [
    C('Apologize clearly', { popularity: -2, groups: { students: 3 }, loyalty: 2 }, 'The candidate apologizes for old online posts.'),
    C('Call it a smear', { popularity: -5, funds: 10, groups: { students: -4 } }, 'The candidate calls old posts a political smear.'),
  ], { kinds: ['out'] }),
  E('out-donor', 'Big Check', 'A wealthy donor offers $30k but wants a meeting about zoning after the election.', [
    C('Take the money', { funds: 30, popularity: -3, groups: { business: 5, workers: -3 } }, 'A large donation lands in the campaign account.'),
    C('Return the check', { funds: -5, popularity: 3, loyalty: 3 }, 'The candidate sends a big donor\'s check back.'),
  ], { kinds: ['out'] }),
  E('out-volunteers', 'Student Volunteers', 'A campus group wants to run your social media in exchange for a promise on tuition.', [
    C('Promise a tuition review', { groups: { students: 9, business: -3 }, popularity: 3 }, 'Students rally behind a tuition pledge.'),
    C('Thank them, no promises', { groups: { students: -3 }, loyalty: 2 }, 'The candidate declines to commit on tuition.'),
  ], { kinds: ['out'] }),
  E('out-faithforum', 'Community Forum', 'Local congregations host a forum in {city} and invite every candidate.', [
    C('Attend and listen', { popularity: 3, clergy: 5, funds: -3 }, 'The candidate spends an evening listening to local congregations.'),
    C('Skip it for a union hall event', { groups: { workers: 6 }, clergy: -3 }, 'The candidate picks a union hall over a faith forum.'),
  ], { kinds: ['out'] }),
  E('out-poll', 'Bad Poll Numbers', 'A new poll puts you behind. Your team is nervous.', [
    C('Shake up the campaign team (-$15k)', { funds: -15, popularity: 3, loyalty: -2 }, 'The candidate fires the campaign manager after a bad poll.'),
    C('Stay the course', { popularity: -2, loyalty: 3 }, 'The candidate shrugs off bad polling.'),
  ], { kinds: ['out'] }),

  // ---------- LOCAL (8) ----------
  E('loc-bridge', 'Bridge Inspection', 'Engineers find cracks in the old river bridge. It carries 20,000 cars a day.', [
    C('Close it and repair (-$80k)', { treasury: -80, services: 6, happiness: -3, popularity: 2 }, 'The mayor closes the river bridge for repairs.'),
    C('Add weight limits only', { services: -3, popularity: -2, funds: 5 }, 'The bridge stays open with a weight limit.'),
  ], { kinds: ['local'] }),
  E('loc-market', 'Farmers Market Fight', 'Vendors want the market moved to the main square. Shops nearby object.', [
    C('Move it to the square', { culture: 5, jobs: 2, happiness: 3, groups: { business: -4, retirees: 3 } }, 'The farmers market moves to the main square.'),
    C('Keep it where it is', { culture: -1, groups: { business: 4 } }, 'The market stays put after shopkeepers complain.'),
  ], { kinds: ['local'] }),
  E('loc-bikes', 'Bike Lane Battle', 'Cyclists want protected lanes downtown. Drivers say it will worsen traffic.', [
    C('Build the lanes (-$35k)', { treasury: -35, happiness: 3, services: 2, groups: { students: 7, retirees: -4 } }, 'New protected bike lanes open downtown.'),
    C('Shelve the plan', { groups: { students: -5, retirees: 3 }, popularity: -1 }, 'The bike lane plan is shelved.'),
  ], { kinds: ['local'] }),
  E('loc-library', 'Library Hours', 'The library budget is tight. Cut Sunday hours or find the money.', [
    C('Fund full hours (-$25k)', { treasury: -25, culture: 5, happiness: 3, groups: { students: 5, retirees: 3 } }, 'The library keeps its Sunday hours.'),
    C('Cut Sundays', { culture: -4, funds: 3, groups: { students: -4, retirees: -3 } }, 'The library closes on Sundays.'),
  ], { kinds: ['local'] }),
  E('loc-dogpark', 'Dog Park Dispute', 'Neighbors are at war over a proposed dog park next to a playground.', [
    C('Build it across town', { happiness: 2, treasury: -15, popularity: 1 }, 'The dog park is built far from the playground.'),
    C('Let the council decide', { popularity: -3, loyalty: 2 }, 'The mayor passes the dog park fight to the council.'),
  ], { kinds: ['local'] }),
  E('loc-heat', 'Heat Wave', 'Temperatures hit record highs in {city}. Older residents are at risk.', [
    C('Open cooling centers (-$30k)', { treasury: -30, happiness: 4, services: 3, groups: { retirees: 7 } }, 'Cooling centers open across {city}.'.replace('{city}', 'town')),
    C('Issue a warning only', { happiness: -4, groups: { retirees: -5 } }, 'The city issues a heat warning and little else.'),
  ], { kinds: ['local'] }),
  E('loc-vacant', 'Empty Storefronts', 'Downtown has 30 empty shops. A developer offers cheap apartments instead.', [
    C('Approve the apartments', { jobs: 4, happiness: 2, culture: -3, groups: { business: 5, students: 4 } }, 'Empty storefronts will become apartments.'),
    C('Offer rent help to small shops (-$40k)', { treasury: -40, culture: 4, jobs: 3, groups: { business: 3 } }, 'The city subsidizes rents for small shops.'),
  ], { kinds: ['local'] }),
  E('loc-parade', 'Parade Permit', 'A group wants to hold a loud parade through a quiet neighborhood on a holiday.', [
    C('Approve the route', { culture: 5, happiness: 2, groups: { retirees: -4 } }, 'The parade rolls through the old neighborhood.'),
    C('Move it to the park', { culture: 1, popularity: -2, groups: { retirees: 3 } }, 'The parade is moved to the city park.'),
  ], { kinds: ['local'] }),

  // ---------- REGIONAL (8) ----------
  E('reg-wildfire', 'Wildfire Season', 'Dry hills are burning in the north of the state. Crews are stretched thin.', [
    C('Fund more crews and aircraft (-$120k)', { treasury: -120, popularity: 5, groups: { retirees: 4, workers: 3 } }, 'The governor funds extra firefighting crews.'),
    C('Request help from the capital', { popularity: -4, loyalty: 2 }, 'The state waits for outside help as fires spread.'),
  ], { kinds: ['regional'] }),
  E('reg-tollroad', 'Toll Road Plan', 'A private firm will build a highway if it can charge tolls for 30 years.', [
    C('Sign the deal', { popularity: -2, funds: 15, groups: { business: 7, workers: -4 } }, 'A private toll road deal is signed.'),
    C('Build it publicly (-$140k)', { treasury: -140, popularity: 3, groups: { workers: 5 } }, 'The state pays for the new highway itself.'),
  ], { kinds: ['regional'] }),
  E('reg-university', 'University Funding', 'The state university asks for a 10% budget increase after years of cuts.', [
    C('Grant the increase (-$90k)', { treasury: -90, groups: { students: 8, business: -3 }, popularity: 2 }, 'The state boosts university funding.'),
    C('Freeze the budget', { groups: { students: -7 }, funds: 5 }, 'The university budget is frozen again.'),
  ], { kinds: ['regional'] }),
  E('reg-water', 'River Rights', 'Two counties argue over who gets river water in a dry year.', [
    C('Favor the farming county', { groups: { business: 6, workers: 2 }, popularity: -2, happiness: 0 }, 'Farms win the river water fight.'),
    C('Split it evenly', { popularity: 1, loyalty: 2, groups: { business: -2 } }, 'The governor splits river water between counties.'),
  ], { kinds: ['regional'] }),
  E('reg-tourism', 'Tourism Campaign', 'The tourism board wants a big ad campaign: "Come see the real thing."', [
    C('Fund the campaign (-$60k)', { treasury: -60, popularity: 3, groups: { business: 6, workers: 3 } }, 'The state launches a big tourism campaign.'),
    C('Pass', { groups: { business: -3 } }, 'The tourism campaign is dropped.'),
  ], { kinds: ['regional'] }),
  E('reg-prison', 'Prison Overcrowding', 'A court orders the state to cut prison crowding or release inmates early.', [
    C('Build a new wing (-$130k)', { treasury: -130, groups: { retirees: 3, students: -3 }, popularity: 1 }, 'The state expands its prisons.'),
    C('Release low-risk inmates', { popularity: -4, groups: { students: 5, retirees: -6 } }, 'Some low-risk inmates are released early.'),
  ], { kinds: ['regional'] }),
  E('reg-farm', 'Farm Crisis', 'A bad harvest and low prices leave farmers asking for help.', [
    C('Emergency loans (-$100k)', { treasury: -100, groups: { workers: 6, business: 4 }, popularity: 3 }, 'Farmers get emergency state loans.'),
    C('Let the market sort it out', { popularity: -4, groups: { workers: -5, business: 2 } }, 'The governor declines to bail out farms.'),
  ], { kinds: ['regional'] }),
  E('reg-mascot', 'State Fair Scandal', 'The state fair\'s prize cow was swapped for a lookalike. Everyone is laughing.', [
    C('Order a (serious) investigation (-$10k)', { treasury: -10, popularity: 2 }, 'The governor orders a cow investigation.'),
    C('Make a joke and move on', { popularity: 4, loyalty: -1 }, 'The governor jokes about the great cow swap.'),
  ], { kinds: ['regional'] }),

  // ---------- LEGISLATIVE (8) ----------
  E('leg-filibuster', 'Marathon Speech', 'An opponent is stalling a bill with a ten-hour speech. Your side is tired.', [
    C('Wait it out', { popularity: -1, loyalty: 3 }, 'The legislature sits through a marathon speech.'),
    C('Cut a deal to end it', { loyalty: -3, funds: 5, popularity: 1 }, 'A late-night deal ends the marathon speech.'),
  ], { kinds: ['legislative'] }),
  E('leg-pork', 'Pet Project', 'Leaders offer a new bridge in your district if you back their budget.', [
    C('Take the bridge', { popularity: 5, loyalty: 4, groups: { students: -4, business: 3 } }, 'A new bridge is promised for the member\'s district.'),
    C('Vote on principle', { popularity: -2, loyalty: -5, groups: { students: 4 } }, 'The member refuses to trade votes for a bridge.'),
  ], { kinds: ['legislative'] }),
  E('leg-hearing', 'Committee Hearing', 'You chair a hearing on a chemical spill. The company\'s lawyers are polite and slippery.', [
    C('Grill them hard', { popularity: 5, funds: -5, groups: { business: -5, workers: 4 } }, 'The committee chair grills company lawyers.'),
    C('Keep it civil', { popularity: -1, funds: 10, groups: { business: 4 } }, 'The hearing stays polite and short.'),
  ], { kinds: ['legislative'] }),
  E('leg-leak', 'Leaked Draft', 'Someone leaks your party\'s secret draft bill to the press.', [
    C('Own it and defend it', { popularity: 2, loyalty: 3, groups: { workers: -2 } }, 'The party defends its leaked draft bill.'),
    C('Hunt for the leaker', { loyalty: -4, popularity: -2 }, 'A hunt for the leaker splits the caucus.'),
  ], { kinds: ['legislative'] }),
  E('leg-amend', 'Poison Pill', 'Opponents attach an unpopular rider to a bill you like.', [
    C('Vote yes anyway', { popularity: -4, loyalty: 4 }, 'The bill passes with an unpopular rider.'),
    C('Vote no and explain', { popularity: 3, loyalty: -4, groups: { workers: -2 } }, 'The member votes down a bill over its rider.'),
  ], { kinds: ['legislative'] }),
  E('leg-townhall', 'Angry Town Hall', 'Constituents pack your town hall to shout about a new law.', [
    C('Stay and answer every question', { popularity: 5, funds: -3, loyalty: -2 }, 'The member takes questions for three hours.'),
    C('Leave early', { popularity: -5, loyalty: 2 }, 'The member walks out of a heated town hall.'),
  ], { kinds: ['legislative'] }),
  E('leg-lobbyist', 'Lobbyist Lunch', 'A lobbyist offers a nice lunch and a donation if you soften a safety rule.', [
    C('Accept the donation', { funds: 25, popularity: -4, groups: { business: 6, workers: -5 } }, 'A lobbyist\'s donation raises eyebrows.'),
    C('Decline and say so publicly', { funds: -5, popularity: 4, groups: { business: -4 } }, 'The member publicly rejects a lobbyist\'s offer.'),
  ], { kinds: ['legislative'] }),
  E('leg-walkout', 'Walkout Threat', 'Your caucus threatens to walk out unless you back a leadership bill.', [
    C('Back the bill', { loyalty: 6, popularity: -3 }, 'The member backs leadership and avoids a walkout.'),
    C('Join the walkout', { loyalty: -6, popularity: 4 }, 'The member joins a dramatic walkout.'),
  ], { kinds: ['legislative'] }),

  // ---------- CABINET (8) ----------
  E('cab-leak', 'Leaked Memo', 'A memo from your ministry shows officials ignoring a safety warning.', [
    C('Fire the official responsible', { popularity: 3, loyalty: -3, groups: { workers: 2 } }, 'A ministry official is fired over a leaked memo.'),
    C('Defend your staff', { popularity: -5, loyalty: 3 }, 'The minister defends staff over a leaked memo.'),
  ], { kinds: ['cabinet'] }),
  E('cab-budget', 'Budget Squeeze', 'The finance ministry wants 5% cuts across the board.', [
    C('Accept the cuts', { loyalty: 5, popularity: -3, treasury: 8 }, 'The ministry takes budget cuts without a fight.'),
    C('Fight for your budget', { loyalty: -4, popularity: 3, treasury: -10 }, 'The minister wins money in a budget fight.'),
  ], { kinds: ['cabinet'] }),
  E('cab-contract', 'Big Contract', 'Two firms bid for a huge ministry contract. One is run by your old friend.', [
    C('Pick the cheapest bid (saves $10bn)', { treasury: 10, popularity: 3, groups: { business: -2 } }, 'The ministry awards the contract to the cheapest bidder.'),
    C('Pick your friend (adds $10bn to debt)', { treasury: -10, funds: 20, popularity: -6 }, 'A contract to the minister\'s friend raises questions.'),
  ], { kinds: ['cabinet'] }),
  E('cab-reform', 'Reform Package', 'Your staff drafted a big reform of the ministry. Unions are wary.', [
    C('Push it through', { popularity: 3, loyalty: 2, groups: { workers: -7, business: 4 } }, 'The minister pushes a major ministry reform.'),
    C('Consult the unions first', { popularity: 1, groups: { workers: 6 }, loyalty: -2 }, 'The minister consults unions before reform.'),
  ], { kinds: ['cabinet'] }),
  E('cab-summit', 'Foreign Counterpart Visit', 'A foreign minister visits. A trade deal is possible, but costs a politically awkward concession.', [
    C('Sign the deal (adds $15bn to debt)', { treasury: -15, groups: { business: 8, workers: -5 }, popularity: 2 }, 'A new trade deal is signed with a foreign minister.'),
    C('Stall politely', { groups: { business: -3 }, loyalty: 3 }, 'The minister stalls on a foreign trade deal.'),
  ], { kinds: ['cabinet'] }),
  E('cab-report', 'Auditor\'s Report', 'The national auditor finds $2bn wasted in your ministry.', [
    C('Admit it and clean up', { popularity: 3, loyalty: -3, treasury: 5 }, 'The minister admits waste and orders a cleanup.'),
    C('Dispute the numbers', { popularity: -4, loyalty: 3 }, 'The minister disputes the auditor\'s figures.'),
  ], { kinds: ['cabinet'] }),
  E('cab-crisis', 'Midnight Crisis', 'A phone call at 3am: a major system has gone down across the country.', [
    C('Fly to the control room', { popularity: 4, loyalty: 2, funds: -5 }, 'The minister takes charge in the middle of the night.'),
    C('Let deputies handle it', { popularity: -4, loyalty: -2 }, 'The minister is slow to react to a national outage.'),
  ], { kinds: ['cabinet'] }),
  E('cab-pet', 'Pet Policy Pitch', 'You can pitch a pet project to the leader, who has little patience.', [
    C('Pitch it boldly (-$20bn if approved)', { treasury: -20, popularity: 5, loyalty: 3 }, 'The minister wins approval for a pet project.'),
    C('Wait for a better moment', { loyalty: 1 }, 'The minister holds a pet project for later.'),
  ], { kinds: ['cabinet'] }),

  // ---------- HEAD (8) ----------
  E('head-address', 'National Address', 'You can give a prime-time speech on the state of the nation.', [
    C('Be hopeful and bold', { popularity: 6, loyalty: -2 }, 'The leader gives a stirring national address.'),
    C('Be blunt about problems', { popularity: -2, groups: { students: 4, retirees: 3 } }, 'The leader gives a blunt speech about national problems.'),
  ], { kinds: ['head'] }),
  E('head-disaster', 'Earthquake', 'A major quake hits {country}\'s second-largest city. Thousands are homeless.', [
    C('Mass rebuilding fund (adds $30bn to debt)', { treasury: -30, popularity: 7, groups: { workers: 6 } }, 'A huge rebuilding fund follows the quake.'),
    C('Targeted aid only (adds $10bn to debt)', { treasury: -10, popularity: 1, groups: { business: 3 } }, 'Aid after the quake is limited to the worst-hit areas.'),
  ], { kinds: ['head'] }),
  E('head-medal', 'Olympic Glory', 'Your athletes won a stunning gold medal. Everyone wants a photo with them.', [
    C('Throw a national parade (-$2bn)', { treasury: -2, popularity: 6, groups: { students: 4 } }, 'A national parade honors the champions.'),
    C('Send a warm message', { popularity: 2 }, 'The leader sends congratulations to the champions.'),
  ], { kinds: ['head'] }),
  E('head-bank', 'Central Bank Clash', 'The central bank wants higher interest rates. Borrowers will suffer.', [
    C('Back the bank', { popularity: -4, groups: { retirees: 6, business: -4, workers: -4 } }, 'The leader backs rate hikes.'),
    C('Pressure the bank to wait (adds $10bn to debt)', { treasury: -10, popularity: 3, groups: { workers: 5, retirees: -5 } }, 'The leader pressures the central bank to hold rates.'),
  ], { kinds: ['head'] }),
  E('head-summit', 'Summit Photo-Op', 'World leaders gather. Your rival back home mocks the trip as a vacation.', [
    C('Go and make deals', { popularity: -2, groups: { business: 6 }, loyalty: 2 }, 'The leader attends a world summit.'),
    C('Stay home', { popularity: 3, groups: { business: -4 } }, 'The leader skips the summit to stay home.'),
  ], { kinds: ['head'] }),
  E('head-pardon', 'Pardon Request', 'A beloved folk singer jailed for fraud asks for a pardon. Fans fill the streets.', [
    C('Grant the pardon', { popularity: 4, loyalty: -3, groups: { students: 5, retirees: -5 } }, 'The leader pardons a folk singer.'),
    C('Refuse', { popularity: -3, groups: { retirees: 4 } }, 'The leader refuses a folk singer\'s pardon.'),
  ], { kinds: ['head'] }),
  E('head-census', 'Census Results', 'New figures show the country is older and more crowded than planned.', [
    C('Fund new housing (adds $25bn to debt)', { treasury: -25, popularity: 3, groups: { workers: 5, students: 5 } }, 'A national housing push follows the census.'),
    C('Redraw priorities only', { popularity: -1, groups: { retirees: 3 } }, 'The leader reacts to the census with a policy review.'),
  ], { kinds: ['head'] }),
  E('head-media', 'Hostile Press', 'A top newspaper runs a harsh investigation into your family\'s finances.', [
    C('Open your books', { popularity: 3, loyalty: -2, funds: -5 }, 'The leader publishes family finances.'),
    C('Attack the newspaper', { popularity: -5, loyalty: 3, groups: { students: -4 } }, 'The leader lashes out at a newspaper.'),
  ], { kinds: ['head'] }),

  // ---------- SYSTEMS: presidential ----------
  E('sys-pres-order', 'Executive Order Temptation', 'Your lawyers say an executive order could work around the legislature. It is legally shaky.', [
    C('Sign the order', { meter: -10, popularity: 3, loyalty: 2 }, 'An executive order skips the legislature.'),
    C('Negotiate with legislators', { meter: 6, popularity: -2 }, 'The administration seeks legislative support instead.'),
  ], { systems: ['presidential'], kinds: ['head', 'cabinet'] }),
  E('sys-pres-court', 'Court Ruling', 'A top court strikes down one of your signature policies.', [
    C('Accept and rewrite it', { meter: -5, popularity: -2 }, 'The administration accepts a court defeat.'),
    C('Attack the judges', { meter: 8, popularity: -4, groups: { students: -4 } }, 'The administration attacks a court ruling.'),
  ], { systems: ['presidential'], kinds: ['head', 'cabinet'] }),
  E('sys-pres-veto', 'Veto Showdown', 'The hostile legislature sends you a bill you dislike but which voters support.', [
    C('Veto it', { meter: -7, loyalty: 4, popularity: -3 }, 'A bill is vetoed in a high-profile fight.'),
    C('Sign it', { meter: 8, popularity: 4, loyalty: -4 }, 'A bill is signed into law after a tense debate.'),
  ], { systems: ['presidential'], kinds: ['head', 'legislative'] }),
  E('sys-pres-pc', 'Spend Political Capital', 'Allies ask you to spend clout on a tough nomination fight.', [
    C('Spend it', { meter: -12, loyalty: 6 }, 'The nomination fight is won, at a cost.'),
    C('Save your strength', { meter: 5, loyalty: -4 }, 'A nomination is left to the legislature.'),
  ], { systems: ['presidential'] }),

  // parliamentary
  E('sys-par-partner', 'Partner\'s Demand', 'Your coalition partner wants a ministry swapped, or it threatens to leave.', [
    C('Give them the ministry', { meter: 12, loyalty: -4, popularity: -2 }, 'The coalition partner gets a ministry.'),
    C('Refuse', { meter: -12, loyalty: 4 }, 'The coalition partner is turned down and fumes.'),
  ], { systems: ['parliamentary'] }),
  E('sys-par-list', 'Party List Ranking', 'The party is ranking its candidate list. Rivals want your slot lower.', [
    C('Lobby members hard', { loyalty: 5, funds: -10, meter: -4 }, 'A candidate lobbies for a higher list ranking.'),
    C('Accept the slot', { loyalty: -2, meter: 4 }, 'A candidate accepts a lower list slot.'),
  ], { systems: ['parliamentary'] }),
  E('sys-par-confidence', 'Confidence Vote', 'The opposition calls a vote of no confidence. You need every vote.', [
    C('Buy partner votes with a concession', { meter: -8, popularity: -2, loyalty: 4 }, 'The government survives a confidence vote.'),
    C('Rely on the whip', { meter: 8, loyalty: -4, popularity: 2 }, 'The government survives on party discipline.'),
  ], { systems: ['parliamentary'], kinds: ['head', 'cabinet', 'legislative'] }),
  E('sys-par-budget', 'Coalition Budget Talks', 'Partners disagree about the budget. Talks drag into the night.', [
    C('Split the difference', { meter: 8, popularity: -2, groups: { business: -2 } }, 'Coalition partners agree a compromise budget.'),
    C('Push your version', { meter: -10, popularity: 3, loyalty: 3 }, 'A party pushes its own budget on partners.'),
  ], { systems: ['parliamentary'] }),

  // semi-presidential
  E('sys-semi-strike', 'Rail Strike', 'Rail workers strike over reform. Commuters are stuck.', [
    C('Withdraw the reform', { meter: 12, popularity: 2, groups: { workers: 6, business: -5 } }, 'The reform is pulled after a rail strike.'),
    C('Hold firm', { meter: -12, popularity: -3, groups: { workers: -7, business: 4 } }, 'The government holds firm against the rail strike.'),
  ], { systems: ['semi-presidential'] }),
  E('sys-semi-protest', 'Square Protest', 'Thousands gather downtown to protest rising prices.', [
    C('Meet the organizers', { meter: 8, popularity: 3, groups: { workers: 4 } }, 'Leaders meet protest organizers.'),
    C('Wait for it to fade', { meter: -8, popularity: -3 }, 'Protests grow as leaders wait.'),
  ], { systems: ['semi-presidential'] }),
  E('sys-semi-cohab', 'Cohabitation Spat', 'The president and prime minister disagree publicly on foreign policy.', [
    C('Side with the president', { meter: -6, loyalty: 3, popularity: 1 }, 'The president wins a foreign policy spat.'),
    C('Side with the prime minister', { meter: -4, loyalty: -2, popularity: 2 }, 'The prime minister wins a foreign policy spat.'),
  ], { systems: ['semi-presidential'], kinds: ['head', 'cabinet'] }),
  E('sys-semi-pension', 'Pension Age Debate', 'A plan to raise the retirement age lands on your desk.', [
    C('Back it', { meter: -12, groups: { retirees: -6, business: 5 }, popularity: -3 }, 'A higher retirement age is backed.'),
    C('Shelve it', { meter: 8, groups: { retirees: 5, business: -4 } }, 'Plans to raise the retirement age are shelved.'),
  ], { systems: ['semi-presidential'] }),

  // constitutional monarchy
  E('sys-mon-visit', 'Royal Visit', 'The monarch will visit {city}. Hosting means money, traffic and cameras.', [
    C('Host lavishly (-$40k)', { meter: 12, popularity: 3, funds: -10 }, 'A royal visit is celebrated with lavish events.'),
    C('Keep it simple', { meter: 4, popularity: 1 }, 'A royal visit is kept short and simple.'),
  ], { systems: ['constitutional-monarchy'], kinds: ['local', 'out'] }),
  E('sys-mon-jubilee', 'Royal Jubilee', 'The crown marks its anniversary. A big party is planned nationwide.', [
    C('Back a big celebration', { meter: 10, popularity: 3, groups: { retirees: 5, students: -3 } }, 'A national jubilee is celebrated.'),
    C('Call for restraint', { meter: -8, popularity: 1, groups: { students: 3 } }, 'Calls for a quieter jubilee anger royalists.'),
  ], { systems: ['constitutional-monarchy'] }),
  E('sys-mon-scandal', 'Royal Scandal', 'A minor royal is caught in an embarrassing scandal. Reporters want your opinion.', [
    C('Defend the family', { meter: 8, popularity: -3, groups: { students: -4, retirees: 3 } }, 'A politician defends the royal family in a scandal.'),
    C('Call for answers', { meter: -10, popularity: 4, groups: { students: 4 } }, 'A politician calls for royal answers.'),
  ], { systems: ['constitutional-monarchy'] }),
  E('sys-mon-honours', 'Honours List', 'The crown is drawing up honours. A friend of yours wants one.', [
    C('Recommend your friend', { meter: 6, loyalty: 3, popularity: -2 }, 'A politician puts a friend forward for an honour.'),
    C('Recommend a local hero', { meter: 8, popularity: 3 }, 'A local hero is put forward for a royal honour.'),
  ], { systems: ['constitutional-monarchy'] }),

  // one-party
  E('sys-one-patron', 'Patron\'s Request', 'Your patron asks you to find a job for a nephew. It is not strictly allowed.', [
    C('Find the job', { meter: 12, popularity: -2, loyalty: 3 }, 'A patron\'s nephew lands a government job.'),
    C('Decline politely', { meter: -12, popularity: 2 }, 'A request from a patron is turned down.'),
  ], { systems: ['one-party'] }),
  E('sys-one-faction', 'Faction Struggle', 'Two party factions are fighting. Each wants your support.', [
    C('Back the reformers', { meter: -8, loyalty: -3, popularity: 3, groups: { students: 4 } }, 'A politician backs party reformers.'),
    C('Back the old guard', { meter: 8, loyalty: 4, groups: { retirees: 4, students: -3 } }, 'A politician backs the party old guard.'),
  ], { systems: ['one-party'] }),
  E('sys-one-inspect', 'Anti-Corruption Inspection', 'Inspectors are going through the books of your office.', [
    C('Open every file', { meter: 8, popularity: 3, funds: -10 }, 'Inspectors find clean books.'),
    C('Quietly tidy things up', { meter: -10, loyalty: 3, funds: 10 }, 'Inspectors find some files missing.'),
  ], { systems: ['one-party'] }),
  E('sys-one-selfcrit', 'Self-Criticism Session', 'The party asks every official to criticize their own mistakes in a meeting.', [
    C('Be honest', { meter: 8, loyalty: 3, popularity: -2 }, 'An official gives an honest self-criticism.'),
    C('Give a safe speech', { meter: 2, loyalty: 1 }, 'An official gives a careful self-criticism.'),
  ], { systems: ['one-party'] }),

  // federal
  E('sys-fed-mandate', 'Federal Mandate', 'The capital orders states and cities to adopt a new standard without paying for it.', [
    C('Comply', { meter: 10, popularity: -3, groups: { business: -2 } }, 'A federal mandate is accepted without funding.'),
    C('Refuse loudly', { meter: -12, popularity: 5, loyalty: 2 }, 'Local leaders refuse a federal mandate.'),
  ], { systems: ['federal'], kinds: ['local', 'regional'] }),
  E('sys-fed-grant', 'Federal Grant', 'The capital offers a big grant, tied to conditions you dislike.', [
    C('Accept the grant', { meter: 10, popularity: 2, groups: { business: -3 } }, 'A federal grant arrives with conditions.'),
    C('Turn it down', { meter: -8, popularity: 3, loyalty: 3 }, 'A federal grant is turned down.'),
  ], { systems: ['federal'] }),
  E('sys-fed-rights', 'States\' Rights Fight', 'A federal court ruling overrides a local law many here love.', [
    C('Sue the capital', { meter: -12, popularity: 5, funds: -10 }, 'A lawsuit challenges the capital.'),
    C('Comply and complain', { meter: 8, popularity: -3 }, 'Local leaders comply, grumbling.'),
  ], { systems: ['federal'] }),
  E('sys-fed-visit', 'Federal Inspector', 'A federal inspector tours your office and asks pointed questions.', [
    C('Give the full tour', { meter: 8, popularity: -1, loyalty: 2 }, 'A federal inspector leaves satisfied.'),
    C('Stall on paperwork', { meter: -8, popularity: 2 }, 'A federal inspector is met with delays.'),
  ], { systems: ['federal'] }),

  // direct democracy
  E('sys-dd-signature', 'Signature Drive', 'Activists collect signatures against one of your policies.', [
    C('Meet and compromise', { meter: 10, popularity: 1, loyalty: -2 }, 'A signature drive ends in compromise.'),
    C('Campaign against it', { meter: -8, popularity: 3, funds: -10 }, 'A signature drive is met with a counter campaign.'),
  ], { systems: ['direct-democracy'] }),
  E('sys-dd-referendum', 'Referendum Campaign', 'A referendum on a tax change is coming. Polls are tight.', [
    C('Campaign for it (-$15k)', { meter: 6, funds: -15, groups: { business: 3 } }, 'A referendum campaign gets under way.'),
    C('Stay neutral', { meter: -4, loyalty: -2 }, 'A politician stays neutral in a referendum.'),
  ], { systems: ['direct-democracy'] }),
  E('sys-dd-assembly', 'Citizen Assembly', 'Random citizens will advise on a hard issue. They might disagree with you.', [
    C('Promise to follow them', { meter: 12, popularity: 3, loyalty: -3 }, 'A citizen assembly is promised a real hearing.'),
    C('Treat it as advice only', { meter: -8, loyalty: 2 }, 'A citizen assembly is treated as advice only.'),
  ], { systems: ['direct-democracy'] }),
  E('sys-dd-ballot', 'Ballot Overload', 'Voters face 14 questions on the ballot. Turnout is falling.', [
    C('Cut the ballot', { meter: 6, popularity: 2, groups: { students: -3 } }, 'The ballot is shortened to fight voter fatigue.'),
    C('Add a voter guide (-$20k)', { meter: 8, funds: -20, groups: { students: 4 } }, 'A new voter guide helps citizens decide.'),
  ], { systems: ['direct-democracy'] }),

  // corporate state
  E('sys-corp-earnings', 'Earnings Call', 'Your quarterly results are middling. Investors are listening.', [
    C('Promise bold growth', { meter: 10, popularity: 1, loyalty: -2 }, 'A bold growth promise lifts shares.'),
    C('Be honest', { meter: -6, popularity: 2, loyalty: 2 }, 'An honest earnings call disappoints investors.'),
  ], { systems: ['corporate-state'] }),
  E('sys-corp-activist', 'Activist Investor', 'An activist investor demands cost cuts and a new strategy.', [
    C('Give them a board seat', { meter: 10, groups: { workers: -6, business: 5 } }, 'An activist investor gets a board seat.'),
    C('Resist', { meter: -10, groups: { workers: 4 }, loyalty: 3 }, 'Management resists an activist investor.'),
  ], { systems: ['corporate-state'] }),
  E('sys-corp-takeover', 'Takeover Rumor', 'Rumors say a rival firm wants to buy your division.', [
    C('Buy back shares (-$20k)', { meter: 8, funds: -20 }, 'Executives buy back shares to calm rumors.'),
    C('Ignore the rumors', { meter: -10, popularity: -1 }, 'Executives ignore takeover talk.'),
  ], { systems: ['corporate-state'] }),
  E('sys-corp-dividend', 'Dividend Decision', 'You can raise the dividend or invest in the future.', [
    C('Raise the dividend', { meter: 8, funds: 15, popularity: -2, groups: { workers: -3 } }, 'Shareholders get a bigger dividend.'),
    C('Invest in staff and tools', { meter: -4, popularity: 3, groups: { workers: 6 } }, 'Profits are invested in staff and tools.'),
  ], { systems: ['corporate-state'] }),

  // ---------- RELIGION (10) ----------
  E('rel-holiday', 'Holy Day Closures', '{faith} leaders want shops closed on a major holy day. Business owners disagree.', [
    C('Back the closures', { clergy: 8, groups: { business: -6, retirees: 3 }, popularity: -1 }, 'The holy day closure is backed.'),
    C('Leave it to shops', { clergy: -6, groups: { business: 4 } }, 'Shops decide for themselves on the holy day.'),
  ], { minReligiosity: 30 }),
  E('rel-schools', 'Faith Schools Funding', 'Faith schools ask for public money for new buildings.', [
    C('Fund them (-$50k)', { clergy: 8, groups: { students: -4, retirees: 4 }, treasury: -50 }, 'Faith schools get public building money.'),
    C('Decline', { clergy: -7, groups: { students: 4 }, treasury: 0 }, 'Public money for faith schools is declined.'),
  ], { minReligiosity: 35, kinds: ['local', 'regional'] }),
  E('rel-charity', 'Charity Drive', 'Local congregations run a food drive and invite you to help.', [
    C('Serve food in person', { clergy: 6, popularity: 4, funds: -5 }, 'Officials help serve at a faith charity drive.'),
    C('Send a donation (-$10k)', { clergy: 4, funds: -10, popularity: 1 }, 'A donation backs a faith charity drive.'),
  ], { minReligiosity: 30, kinds: ['local', 'out', 'regional'] }),
  E('rel-building', 'New Place of Worship', 'A congregation wants to build a large house of worship. Neighbors worry about parking.', [
    C('Approve with conditions', { clergy: 5, groups: { retirees: -2, business: 2 }, popularity: 1 }, 'A new house of worship is approved with conditions.'),
    C('Deny the permit', { clergy: -8, popularity: -2, groups: { retirees: 3 } }, 'A permit for a house of worship is denied.'),
  ], { minReligiosity: 30, kinds: ['local'] }),
  E('rel-leader-adv', 'Faith Leader\'s Blessing', '{name}, {role}, offers to publicly bless your campaign, but wants a promise.', [
    C('Make the promise', { clergy: 8, contact: 15, popularity: 3, groups: { students: -5 } }, 'A faith leader publicly blesses a politician.'),
    C('Accept without promise', { clergy: 2, contact: -5, popularity: 1 }, 'A blessing is accepted with no promises.'),
  ], { minReligiosity: 40, about: 'faith' }),
  E('rel-leader-feud', 'Faith Leader Criticism', '{name}, {role}, denounces your policy from the pulpit.', [
    C('Meet and explain', { clergy: 5, contact: 12, popularity: -1, loyalty: -2 }, 'A politician meets a critical faith leader.'),
    C('Hold your position', { clergy: -8, contact: -15, groups: { students: 4 } }, 'A politician stands firm against a faith leader.'),
  ], { minReligiosity: 40, about: 'faith' }),
  E('rel-festival', 'Festival of Lights', 'The big {faith} festival is coming. Planners ask for city or state support.', [
    C('Support the festival (-$30k)', { clergy: 6, popularity: 3, culture: 4, treasury: -30 }, 'The festival gets official support.'.replace('official', 'public')),
    C('Let congregations manage', { clergy: -2, popularity: -1 }, 'Congregations manage the festival alone.'),
  ], { minReligiosity: 35, kinds: ['local'] }),
  E('rel-bioethics', 'Bioethics Bill', 'Faith leaders in {country} oppose a medical research bill. Scientists back it.', [
    C('Pass it with safeguards', { clergy: -5, groups: { students: 7, business: 3 }, popularity: 1 }, 'The bioethics bill passes with added safeguards.'),
    C('Delay for more review', { clergy: 7, groups: { students: -6 }, popularity: -1 }, 'The bioethics bill is delayed for review.'),
  ], { minReligiosity: 45, kinds: ['legislative', 'cabinet', 'head'] }),
  E('rel-dispute', 'Interfaith Dispute', 'Two faith communities argue over a shared sacred site.', [
    C('Broker a shared-use deal', { clergy: 5, popularity: 3, funds: -5 }, 'A shared-use deal is struck for a sacred site.'),
    C('Stay out of it', { clergy: -4, popularity: -2 }, 'Officials stay out of an interfaith dispute.'),
  ], { minReligiosity: 40 }),
  E('rel-prayer', 'Prayer Before Meetings', 'Council members ask to open meetings with a prayer. Others say it excludes people.', [
    C('Allow a moment of reflection for all', { clergy: 3, groups: { students: 2 }, popularity: 1 }, 'A moment of reflection opens meetings.'),
    C('Hold prayers as requested', { clergy: 7, groups: { students: -6 }, popularity: -1 }, 'Prayers open council meetings.'),
  ], { minReligiosity: 50, kinds: ['local', 'regional', 'legislative'] }),

  // ---------- RELATIONSHIPS (12) ----------
  E('rel2-favor', 'A Favor Asked', '{name}, {role}, asks you to speak at their fundraiser.', [
    C('Go (-$5k)', { contact: 15, funds: -5, loyalty: 2 }, 'A politician headlines a colleague\'s fundraiser.'),
    C('Decline', { contact: -10 }, 'A colleague\'s fundraiser request is turned down.'),
  ], { about: 'peer' }),
  E('rel2-endorse', 'Endorsement Offer', '{name}, {role}, offers a public endorsement, hoping you return it later.', [
    C('Accept the deal', { contact: 15, popularity: 4, loyalty: 2 }, 'Two politicians trade public endorsements.'),
    C('Stay independent', { contact: -6, popularity: 1 }, 'A politician refuses to trade endorsements.'),
  ], { about: 'peer' }),
  E('rel2-sister', 'Sister City Offer', 'The mayor, {name}, of a nearby city proposes a sister-city deal with {city}.', [
    C('Sign it (-$15k)', { contact: 18, culture: 5, jobs: 2, treasury: -15, groups: { business: 3 }, feat: 'sister-city' }, 'Two cities sign a sister-city agreement.'),
    C('Pass for now', { contact: -8 }, 'A sister-city offer is put off.'),
  ], { about: 'peer', kinds: ['local'] }),
  E('rel2-joint', 'Joint Project', 'Governor {name} proposes a shared highway and rail project.', [
    C('Share the cost (-$100k)', { contact: 20, treasury: -100, popularity: 3, groups: { business: 5, workers: 4 } }, 'Two states launch a joint rail and highway project.'),
    C('Go it alone', { contact: -10, popularity: -1 }, 'A joint project is declined.'),
  ], { about: 'peer', kinds: ['regional'] }),
  E('rel2-feud', 'Public Feud', '{name}, {role}, takes a swipe at you in a TV interview.', [
    C('Hit back', { contact: -20, popularity: 3, loyalty: 2 }, 'Two politicians trade insults on air.'),
    C('Stay above it', { contact: 5, popularity: 1 }, 'A politician ignores an on-air jab.'),
  ], { about: 'peer' }),
  E('rel2-blame', 'Take the Blame', '{name}, {role}, asks you to take the blame for a messy failure. They will owe you.', [
    C('Take it', { contact: 22, loyalty: 4, popularity: -5 }, 'A politician takes the blame for a superior.'),
    C('Refuse', { contact: -20, popularity: 2, loyalty: -3 }, 'A politician refuses to take the fall.'),
  ], { about: 'superior' }),
  E('rel2-secret', 'Secret Deal', '{name}, {role}, an opponent, offers a quiet deal: you back off a topic, they back off yours.', [
    C('Take the deal', { contact: 15, popularity: -2, funds: 10, loyalty: -3 }, 'Rivals strike a quiet truce.'),
    C('Refuse', { contact: -10, popularity: 3 }, 'A secret deal offer is turned away.'),
  ], { about: 'rival' }),
  E('rel2-ally-scandal', 'Ally in Trouble', '{name}, {role}, a close ally, is caught in a spending scandal.', [
    C('Stand by them', { contact: 20, popularity: -4, loyalty: 2 }, 'A politician stands by a scandal-hit ally.'),
    C('Distance yourself', { contact: -20, popularity: 3 }, 'A politician distances themselves from a scandal-hit ally.'),
  ], { about: 'peer' }),
  E('rel2-mentor', 'Mentor\'s Advice', '{name}, {role}, offers to mentor you, if you attend their party events.', [
    C('Accept', { contact: 18, loyalty: 5, funds: -5, popularity: -1 }, 'A senior politician takes a junior under their wing.'),
    C('Politely decline', { contact: -6, loyalty: -1 }, 'A mentor offer is politely declined.'),
  ], { about: 'superior' }),
  E('rel2-rival-smear', 'Rival\'s Dirt', 'You hear {name}, {role}, has an embarrassing secret. A journalist asks.', [
    C('Leak it', { contact: -25, popularity: 2, loyalty: -4 }, 'A rival\'s secret reaches the press.'),
    C('Stay silent', { contact: 8, popularity: 1, loyalty: 2 }, 'A rival\'s secret stays secret.'),
  ], { about: 'rival' }),
  E('rel2-faith-charity', 'Faith Leader\'s Cause', '{name}, {role}, asks for your help backing a shelter.', [
    C('Back it (-$15k)', { contact: 18, clergy: 6, funds: -15, popularity: 2 }, 'A politician backs a faith leader\'s shelter.'),
    C('Send best wishes', { contact: -4, clergy: -2 }, 'A shelter appeal gets only warm words.'),
  ], { about: 'faith', minReligiosity: 30 }),
  E('rel2-promo', 'Pull Strings', '{name}, {role}, can get your name on a promotion list, but you will owe a favor.', [
    C('Accept the help', { contact: 20, loyalty: 6, popularity: -2 }, 'A politician gets a boost from a superior.'),
    C('Earn it alone', { contact: -5, loyalty: -2, popularity: 2 }, 'A politician turns down a superior\'s help.'),
  ], { about: 'superior' }),
];
