import { families, lessons } from './swim-admin-data.js';

const storageKey = 'swell-swim-demo-enrollment';
const startingState = {
  makeups: [{ id: 'sample-makeup', swimmer: '2-0', lesson: 0, missed: 0, booked: null }],
  waitlist: [
    { id: 'sample-wait-1', swimmer: '5-0', lesson: 0, status: 'Waiting' },
    { id: 'sample-wait-2', swimmer: '6-0', lesson: 0, status: 'Waiting' },
  ],
  cancellations: {},
};
const baseRosters = [
  ['0-0', '2-0', '4-0'],
  ['0-1', '1-0', '5-0', '6-0'],
  ['1-1', '3-0'],
  ['7-0'],
];
const firstDates = [21, 21, 22, 23];
const clinicCapacity = 2;
const dates = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

export const sessionDate = (lesson, session) => dates.format(Date.UTC(2026, 10, firstDates[lesson] + session * 7));

export function readEnrollment() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? structuredClone(startingState);
  } catch {
    return structuredClone(startingState);
  }
}

export function writeEnrollment(state) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

export const swimmers = families.flatMap((family, familyId) =>
  family.students.split(', ').map((name, index) => ({
    id: `${familyId}-${index}`, familyId, name, parent: family.parent,
  })));

export const swimmer = id => swimmers.find(person => person.id === id);
export const originalRoster = lesson => baseRosters[lesson];

export function enrolled(state, lesson) {
  return lessons[lesson].sold - (state.cancellations[lesson] ?? 0) +
    state.waitlist.filter(entry => entry.lesson === lesson && entry.status === 'Enrolled').length;
}

export function openings(state, lesson) {
  const reserved = state.waitlist.filter(entry => entry.lesson === lesson && entry.status === 'Offered').length;
  return lessons[lesson].capacity - enrolled(state, lesson) - reserved;
}

export function rosterFor(state, lesson, session) {
  const reportedAbsences = new Set(state.makeups.filter(entry => entry.lesson === lesson && entry.missed === session)
    .map(entry => entry.swimmer));
  const accepted = state.waitlist.filter(entry => entry.lesson === lesson && entry.status === 'Enrolled')
    .map(entry => ({ id: entry.swimmer, makeup: false }));
  const makeups = state.makeups.filter(entry => entry.lesson === lesson && entry.booked === session)
    .map(entry => ({ id: entry.swimmer, makeup: true }));
  const scheduled = session < lessons[lesson].sessions
    ? [...baseRosters[lesson].map(id => ({ id, makeup: false })), ...accepted]
    : [];
  return [...scheduled.map(person => ({ ...person, key: person.id, absenceReported: reportedAbsences.has(person.id) })),
    ...makeups.map(person => ({ ...person, key: `makeup-${person.id}` }))];
}

export function makeupOpenings(state, lesson, session) {
  const booked = state.makeups.filter(entry => entry.lesson === lesson && entry.booked === session).length;
  return Math.max(0, clinicCapacity - booked);
}

export function familyEnrollments(state, familyId) {
  return families[familyId].enrollments + state.waitlist.filter(entry =>
    entry.status === 'Enrolled' && swimmer(entry.swimmer).familyId === familyId).length;
}
