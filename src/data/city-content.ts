import type { GroupId } from '../sim/types';

export type StatKey = 'crime' | 'services' | 'jobs' | 'happiness' | 'culture';

export const GROUPS: Record<GroupId, { name: string; weight: number; cares: string }> = {
  workers: { name: 'Workers', weight: 0.35, cares: 'jobs and welfare' },
  business: { name: 'Business owners', weight: 0.2, cares: 'low taxes and jobs' },
  retirees: { name: 'Retirees', weight: 0.25, cares: 'safety and services' },
  students: { name: 'Students', weight: 0.2, cares: 'culture and services' },
};

export interface ProjectDef {
  id: string; name: string; cost: number; months: number; blurb: string;
  /** Lasting change to city stat targets once built. */
  stats: Partial<Record<StatKey, number>>;
  /** One-time approval change with each group when finished. */
  groups: Partial<Record<GroupId, number>>;
}

export const PROJECTS: ProjectDef[] = [
  { id: 'park', name: 'Riverside Park', cost: 60, months: 4, blurb: 'Green space for families.', stats: { happiness: 5, culture: 2 }, groups: { retirees: 5, students: 3 } },
  { id: 'community', name: 'Community Center', cost: 80, months: 5, blurb: 'Sports, classes and meeting rooms.', stats: { happiness: 4, crime: -4 }, groups: { workers: 5, students: 3 } },
  { id: 'library', name: 'Library & Tech Hub', cost: 90, months: 6, blurb: 'Coding classes and co-working.', stats: { culture: 5, jobs: 3 }, groups: { students: 8 } },
  { id: 'police', name: 'New Police Station', cost: 120, months: 6, blurb: 'Faster response in the east side.', stats: { crime: -10 }, groups: { retirees: 7, business: 3, students: -2 } },
  { id: 'bizpark', name: 'Business Park', cost: 150, months: 8, blurb: 'Offices and light industry.', stats: { jobs: 10 }, groups: { business: 10, workers: 4 } },
  { id: 'housing', name: 'Affordable Housing', cost: 160, months: 9, blurb: '1,200 new low-rent homes.', stats: { happiness: 6 }, groups: { workers: 8, students: 5, business: -4 } },
  { id: 'stadium', name: 'City Stadium', cost: 250, months: 10, blurb: 'Concerts and a home for the local team.', stats: { culture: 9, jobs: 4 }, groups: { business: 5, workers: 4, retirees: -3 } },
  { id: 'metro', name: 'Metro Line', cost: 300, months: 12, blurb: 'Rail across the city center.', stats: { services: 14, jobs: 4 }, groups: { workers: 7, students: 7, business: 3 } },
];

export interface LawDef {
  id: string; name: string; blurb: string;
  /** Shifts to city stat targets while active. */
  stats: Partial<Record<StatKey, number>>;
  /** Shifts to each group's approval target while active (also applied once, halved, on passing). */
  groups: Partial<Record<GroupId, number>>;
  /** Multiplier change on tax revenue, e.g. -0.1 = 10% less. */
  revenue?: number;
}

export const LAWS: LawDef[] = [
  { id: 'curfew', name: 'Youth Night Curfew', blurb: 'Under-18s off the streets after 11pm.', stats: { crime: -7 }, groups: { retirees: 10, students: -16, workers: -2 } },
  { id: 'rent', name: 'Rent Control', blurb: 'Caps rent increases at 3% a year.', stats: { happiness: 4, jobs: -3 }, groups: { workers: 10, students: 6, business: -16, retirees: -3 } },
  { id: 'smallbiz', name: 'Small Business Tax Break', blurb: 'Lower local taxes for firms under 50 staff.', stats: { jobs: 6 }, groups: { business: 12, students: -4, workers: -2 }, revenue: -0.1 },
  { id: 'green', name: 'Green Zones', blurb: 'Car-free streets and more trees downtown.', stats: { culture: 4, services: 3, jobs: -2 }, groups: { students: 10, business: -8, workers: -4 } },
  { id: 'transit', name: 'Free Public Transit', blurb: 'Buses and trams are free for everyone.', stats: { services: 6, happiness: 3 }, groups: { workers: 8, students: 8, business: -8, retirees: -4 }, revenue: -0.08 },
  { id: 'tourism', name: 'Tourism Push', blurb: 'Marketing, festivals and longer bar hours.', stats: { culture: 6, jobs: 3, crime: 2 }, groups: { business: 8, retirees: -8, workers: 2 } },
  { id: 'seniors', name: 'Senior Care Program', blurb: 'Home visits and free clinics for over-65s.', stats: { happiness: 3 }, groups: { retirees: 14, students: -5, business: -5 }, revenue: -0.05 },
  { id: 'vendors', name: 'Street Vendor Permits', blurb: 'Legalize food stalls and markets.', stats: { jobs: 4, culture: 2 }, groups: { workers: 6, business: -8, retirees: -3 } },
];

export const COUNCIL_FIRST = ['Ana', 'Ben', 'Carla', 'Dev', 'Elif', 'Frank', 'Grace', 'Hugo', 'Iris', 'Jonah', 'Kiko', 'Luis', 'Maya', 'Noel'];
export const COUNCIL_LAST = ['Adler', 'Bose', 'Castro', 'Dunn', 'Ekwueme', 'Fischer', 'Garcia', 'Holm', 'Ito', 'Jensen', 'Kaur', 'Lopez', 'Marsh', 'Novak'];
