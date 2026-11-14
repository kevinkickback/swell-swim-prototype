const lessons = [
  { name: 'Water Confidence', price: 30, sessions: 4, ages: '36–71', start: 'Nov 21', sold: 20, capacity: 20, schedule: 'Saturdays · 9:00 AM' },
  { name: 'Stroke Foundations', price: 40, sessions: 4, ages: '72–131', start: 'Nov 21', sold: 12, capacity: 16, schedule: 'Saturdays · 10:30 AM' },
  { name: 'Parent & Tot', price: 25, sessions: 4, ages: '12–35', start: 'Nov 22', sold: 8, capacity: 12, schedule: 'Sundays · 9:30 AM' },
  { name: 'Private Coaching', price: 60, sessions: 2, ages: '60+', start: 'Nov 23', sold: 4, capacity: 8, schedule: 'Mondays · 4:00 PM' },
];

const families = [
  { parent: 'Morgan Park', students: 'Charlie, Quinn', enrollments: 2 },
  { parent: 'Riley Brooks', students: 'Jamie, Robin', enrollments: 2 },
  { parent: 'Jordan Ellis', students: 'Drew', enrollments: 1 },
  { parent: 'Casey Lane', students: 'Ari', enrollments: 1 },
  { parent: 'Cameron Wells', students: 'Reese', enrollments: 1 },
  { parent: 'Taylor Moss', students: 'Sam', enrollments: 1 },
  { parent: 'Avery Chen', students: 'Emery', enrollments: 1 },
  { parent: 'Rowan Patel', students: 'Blair', enrollments: 1 },
];

// Each row is a purchase within the Nov 1–14 sample reporting window.
const purchases = [
  [14, 0, 0, 2], [14, 1, 1, 2], [14, 2, 0, 1], [13, 3, 2, 1],
  [13, 4, 0, 1], [12, 5, 1, 1], [12, 6, 3, 1], [11, 0, 1, 1],
  [11, 1, 0, 1], [10, 7, 2, 1], [9, 2, 0, 1], [8, 3, 3, 1],
  [8, 4, 1, 1], [7, 5, 2, 1], [6, 6, 1, 1], [5, 7, 0, 1],
  [4, 0, 2, 1], [4, 1, 2, 1], [3, 2, 1, 1], [2, 4, 0, 1], [1, 5, 3, 1],
].map(([day, family, lesson, quantity]) => ({
  day, name: families[family].parent, lesson: lessons[lesson].name, quantity,
  total: lessons[lesson].price * lessons[lesson].sessions * quantity,
}));

const applicants = [
  ['Marin Reed', 'Swim instructor', 'Nov 14', 'New'],
  ['Parker Vale', 'Swim instructor', 'Nov 12', 'Under review'],
  ['River Hall', 'Office coordinator', 'Nov 10', 'On hold'],
  ['Sage Bell', 'Swim instructor', 'Nov 7', 'Approved'],
  ['Sky Linden', 'Office coordinator', 'Nov 4', 'Denied'],
];

const staff = [
  ['Dylan West', 'Admin', 'Active'], ['Nico Hayes', 'Office', 'Active'],
  ['Blake Hall', 'Instructor', 'Active'], ['Lee Foster', 'Instructor', 'Active'],
  ['Jules Day', 'Instructor', 'Archived'],
];

export { lessons, families, purchases, applicants, staff };
