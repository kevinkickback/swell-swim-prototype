import { lessons, families, purchases, applicants, staff } from '../../assets/swim-admin-data.js';
import { renderPoolDeck } from '../../assets/pool-deck.js';
import { renderShiftLog } from '../../assets/shift-log.js';
import { renderAccount, renderAttendance, renderSiteSettings } from '../../assets/admin-workflows.js';
import { renderMakeups, renderWaitlist } from '../../assets/enrollment-workflows.js';
import { enrolled, familyEnrollments, openings, readEnrollment } from '../../assets/enrollment-data.js';

const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  bag: '<path d="M5 8h14l2 13H3L5 8Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M2 20v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2m1-15a3 3 0 0 1 0 6m5 9v-2a4 4 0 0 0-3-4"/>',
  file: '<path d="M6 3h8l4 4v14H6zM14 3v5h4m-9 5h6m-6 4h6"/>',
  badge: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M6 16a3 3 0 0 1 6 0m3-6h3m-3 4h3"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="2" fill="#10264a"/><circle cx="16" cy="17" r="2" fill="#10264a"/>',
  money: '<circle cx="12" cy="12" r="9"/><path d="M15 8h-4a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4H9m3-10v12"/>',
};

const titles = {
  overview: ['Overview', ''],
  purchases: ['Purchases', 'Lesson purchases by family and transaction date.'],
  lessons: ['Lessons', 'Review lesson types and schedule make-up sessions.'],
  attendance: ['Attendance', 'Mark a sample roster and review attendance by session.'],
  waitlist: ['Waitlist', 'Manage openings, offers, and family responses.'],
  families: ['Families', 'Find parents and see their students and enrollments.'],
  staff: ['Staff & roles', 'Review team roles, account status, and job applications.'],
  settings: ['Site settings', 'Manage school details, registration, checkout, and lesson policies.'],
  account: ['My account', 'Edit your demo profile and notification preferences.'],
};

const sections = {
  lessons: { lessons: 'Lesson types', 'lessons/makeups': 'Make-up lessons' },
  staff: { staff: 'Staff directory', 'staff/applicants': 'Applicants' },
};
const previousRoutes = { makeups: 'lessons/makeups', applicants: 'staff/applicants' };

const themes = {
  'admin-dashboard': ['Streamline', 'Track revenue, recent purchases, and lesson capacity at a glance.'],
  'pool-deck': ['Pool Deck', 'Select a lesson lane to check its schedule, enrollment, and open spots.'],
  'shift-log': ['The Current', 'Follow recent purchases and applications alongside revenue and the hiring queue.'],
};
const theme = document.body.dataset.theme ?? 'admin-dashboard';
const themePicker = document.querySelector('#dashboard-theme');
const breadcrumb = document.querySelector('#breadcrumb');
const sectionIcons = {
  overview: 'grid', purchases: 'bag', lessons: 'calendar', attendance: 'file',
  waitlist: 'users', families: 'users', staff: 'badge', settings: 'settings', account: 'badge',
};
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const view = document.querySelector('#view');
const period = document.querySelector('#period');
const sum = (rows, field) => rows.reduce((total, row) => total + row[field], 0);
const icon = name => `<span data-icon="${name}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">${icons[name]}</svg></span>`;

document.querySelector('nav[aria-label="Dashboard sections"]').innerHTML = Object.entries(titles).map(([key, [label]]) => {
  const group = key === 'overview' ? '<p>Operations</p>' : key === 'staff' ? '<p>Administration</p>' : '';
  return `${group}<a href="#${key}">${icon(sectionIcons[key])}${label}</a>`;
}).join('');
themePicker.innerHTML = Object.entries(themes).map(([key, [label]]) => `<option value="${key}">${label}</option>`).join('');
themePicker.value = theme;
const periodIcon = document.querySelector('#period-control [data-icon]');
periodIcon.replaceWith(document.createRange().createContextualFragment(icon('calendar')));

function table(headers, rows) {
  const cell = (value, index, tag) => `<${tag}${headers[index] === 'Total' ? ' class="amount"' : ''}${tag === 'th' ? ' scope="col"' : ''}>${value}</${tag}>`;
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="${document.querySelector('#page-title').textContent} table"><table><thead><tr>${headers.map((header, i) => cell(header, i, 'th')).join('')}</tr></thead><tbody>${rows.length
    ? rows.map(row => `<tr>${row.map((value, i) => cell(value, i, 'td')).join('')}</tr>`).join('')
    : `<tr><td colspan="${headers.length}">No matching records.</td></tr>`}</tbody></table></div>`;
}

function purchaseTable(rows) {
  return table(['When', 'Name', 'Purchased', 'Total'], rows.map(row => [
    `Nov ${row.day}, 2026`, `<span class="person">${row.name}</span>`,
    `${row.lesson}${row.quantity > 1 ? ` × ${row.quantity}` : ''}`, currency.format(row.total),
  ]));
}

function revenueChart(rows, days, plotHeight = 135) {
  const start = 15 - days;
  const daily = Array.from({ length: days }, (_, i) => sum(rows.filter(row => row.day === start + i), 'total'));
  const scale = Math.ceil(Math.max(...daily) / 300) * 300 || 300;
  const slot = 450 / days;
  const barWidth = Math.min(slot * 0.55, 36);
  const baseline = 15 + plotHeight;
  const ticks = [scale, scale * 2 / 3, scale / 3, 0].map((value, i) => {
    const y = 15 + i * plotHeight / 3;
    return `<line class="gridline" x1="56" x2="506" y1="${y}" y2="${y}"/>
      <text x="48" y="${y + 4}" text-anchor="end">${currency.format(value)}</text>`;
  });
  const bars = daily.map((amount, i) => {
    const center = 56 + slot * (i + 0.5);
    const height = amount * plotHeight / scale;
    const label = `Nov ${start + i}`;
    return `<rect class="bar${i === days - 1 ? ' latest' : ''}" x="${center - barWidth / 2}" y="${baseline - height}" width="${barWidth}" height="${height}" rx="4"><title>${label}, ${currency.format(amount)}</title></rect>
      ${days === 7 || i % 2 === 0 || i === days - 1 ? `<text x="${center}" y="${baseline + 24}" text-anchor="middle">${i === 0 ? label : start + i}</text>` : ''}`;
  });
  return `<svg class="chart" viewBox="0 0 520 ${baseline + 35}" role="img" aria-label="Daily purchase revenue for ${days} days"><desc>${daily.map((amount, i) => `November ${start + i}, ${currency.format(amount)}`).join('; ')}</desc>${ticks.join('')}${bars.join('')}</svg>`;
}

function overviewMetrics(rows, days, includeRevenue = true) {
  const enrollment = readEnrollment();
  const pending = applicants.filter(row => ['New', 'Under review', 'On hold'].includes(row[3])).length;
  const metrics = [
    ['Purchase revenue', currency.format(sum(rows, 'total')), `Over ${days} days`, 'money'],
    ['Purchases', rows.length, `${sum(rows, 'quantity')} lesson packages`, 'bag'],
    ['Open lesson spots', lessons.reduce((total, _, index) => total + openings(enrollment, index), 0), `${lessons.length} lesson types`, 'calendar'],
    ['Open applications', pending, `${applicants.length} total applications`, 'file'],
  ];
  return `<section class="metrics" aria-label="Key metrics">${metrics.slice(includeRevenue ? 0 : 1).map(([label, value, detail, symbol]) => `
    <div class="metric"><span class="metric-label">${label}${icon(symbol)}</span><strong>${value}</strong><small>${detail}</small></div>`).join('')}</section>`;
}

function lessonCapacity() {
  const enrollment = readEnrollment();
  return `<section class="panel"><div class="section-head"><div><h2>Lesson capacity</h2><p>Enrollment by lesson type</p></div><a class="text-link" href="#lessons">View lessons →</a></div>
        <ul class="capacity-list">${lessons.map((lesson, index) => {
          const count = enrolled(enrollment, index);
          return `<li><div><strong>${lesson.name}</strong><span>${count} / ${lesson.capacity} enrolled</span></div><progress aria-label="${lesson.name} enrollment" value="${count}" max="${lesson.capacity}"></progress></li>`;
        }).join('')}</ul>
      </section>`;
}

function renderOverview(rows, days) {
  const recent = `<section class="panel"><div class="section-head"><h2>Recent purchases</h2><a class="text-link" href="#purchases">View purchases →</a></div>${purchaseTable(rows.slice(0, 5))}</section>`;
  if (theme === 'shift-log') {
    const reportOpen = view.querySelector('.log-report')?.open ?? false;
    view.replaceChildren();
    const revenue = `
      <section class="log-performance" aria-labelledby="log-performance-title">
        <header><div><h2 id="log-performance-title">Purchase revenue</h2><strong>${currency.format(sum(rows, 'total'))}</strong></div><span>Nov ${15 - days}–14 · USD</span></header>
        ${revenueChart(rows, days, 64)}
        <a href="#purchases">View purchases <span aria-hidden="true">↗</span></a>
      </section>`;
    renderShiftLog(view, rows, 15 - days, revenue);
    view.insertAdjacentHTML('beforeend', `<details class="log-report"><summary>Key metrics, lesson capacity, and recent purchases</summary><div>${overviewMetrics(rows, days, false)}${lessonCapacity()}${recent}</div></details>`);
    view.querySelector('.log-report').open = reportOpen;
    return;
  }
  view.innerHTML = overviewMetrics(rows, days);
  if (theme === 'pool-deck') renderPoolDeck(view);
  view.insertAdjacentHTML('beforeend', `<div class="middle">
    <section class="panel"><div class="section-head"><div><h2>Purchase revenue</h2><p>Nov ${15 - days}–14, 2026 · USD</p></div></div>${revenueChart(rows, days)}</section>
    ${lessonCapacity()}</div>${recent}`);
}

const options = values => values.map(value => `<option>${value}</option>`).join('');
const search = label => `<label><span class="sr-only">${label}</span><input id="record-search" type="search" placeholder="${label}"></label>`;
const filter = (label, values) => `<label><span class="sr-only">${label}</span><select id="record-filter">${options(values)}</select></label>`;

function filterable(container, controls, update) {
  container.innerHTML = `<section class="panel"><div class="filter-bar">${controls}<span id="result-count" class="result-count" aria-live="polite"></span></div><div id="results"></div></section>`;
  const refresh = () => {
    const query = container.querySelector('input')?.value.trim().toLowerCase() ?? '';
    const selected = container.querySelector('select')?.value;
    const [headers, rows] = update(query, selected);
    container.querySelector('#result-count').textContent = `${rows.length} ${rows.length === 1 ? 'record' : 'records'}`;
    container.querySelector('#results').innerHTML = table(headers, rows);
  };
  container.querySelector('input')?.addEventListener('input', refresh);
  container.querySelector('select')?.addEventListener('change', refresh);
  refresh();
}

function sectionContent(page, route) {
  view.innerHTML = `<div class="section-nav" role="group" aria-label="${titles[page][0]} sections">
    ${Object.entries(sections[page]).map(([hash, label]) =>
      `<a href="#${hash}"${route === hash ? ' aria-current="location"' : ''}>${label}</a>`).join('')}
    </div><div></div>`;
  return view.lastElementChild;
}

function render() {
  const hash = location.hash.slice(1);
  const route = Object.hasOwn(previousRoutes, hash) ? previousRoutes[hash] : hash;
  const parent = route.split('/')[0];
  const page = Object.hasOwn(titles, route) || (Object.hasOwn(sections, parent) && Object.hasOwn(sections[parent], route))
    ? parent : 'overview';
  const [title, description] = titles[page];
  const [heading, summary] = page === 'overview' ? themes[theme] : [title, description];
  document.title = `${heading} · Swell Swim Admin`;
  document.querySelector('#page-title').textContent = heading;
  if (breadcrumb) breadcrumb.textContent = title;
  document.querySelector('#page-description').textContent = summary;
  document.querySelector('#period-control').hidden = !['overview', 'purchases'].includes(page);
  document.querySelectorAll('nav a').forEach(link => {
    if (link.hash === `#${page}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  const days = Number(period.value);
  const rows = purchases.filter(row => row.day >= 15 - days);
  const enrollment = readEnrollment();
  const content = Object.hasOwn(sections, page) ? sectionContent(page, route) : view;
  switch (page === 'overview' ? page : route) {
    case 'overview':
      renderOverview(rows, days);
      break;
    case 'purchases':
      view.innerHTML = `<section class="panel"><div class="section-head"><h2>Nov ${15 - days}–14, 2026</h2><span class="muted">${rows.length} purchases</span></div>${purchaseTable(rows)}</section>`;
      break;
    case 'lessons':
      content.innerHTML = `<section class="panel">${table(['Title', 'Per session', 'Sessions', 'Ages (months)', 'Starts', 'Enrolled / cap', 'Open', 'Schedule'], lessons.map((lesson, index) => [lesson.name, currency.format(lesson.price), lesson.sessions, lesson.ages, lesson.start, `${enrolled(enrollment, index)} / ${lesson.capacity}`, openings(enrollment, index), lesson.schedule]))}</section>`;
      break;
    case 'families':
      filterable(content, search('Search parents or students'), query => [
        ['Parent', 'Email', 'Students', 'Enrollments'], families
          .filter(family => `${family.parent} ${family.students}`.toLowerCase().includes(query))
          .map(family => [family.parent, `${family.parent.toLowerCase().replace(' ', '.')}@example.com`, family.students, familyEnrollments(enrollment, families.indexOf(family))]),
      ]);
      break;
    case 'staff/applicants':
      filterable(content, filter('Application status', ['All statuses', 'New', 'Under review', 'Approved', 'Denied', 'On hold']), (_, selected) => [
        ['Applicant', 'Position', 'Submitted', 'Status'], applicants
          .filter(row => selected === 'All statuses' || selected === row[3])
          .map(([name, position, submitted, status]) => [name, position, submitted, `<span class="pill ${status.toLowerCase().replace(' ', '-')}">${status}</span>`]),
      ]);
      break;
    case 'staff':
      filterable(content, search('Search staff') + filter('Staff role', ['All roles', 'Admin', 'Office', 'Instructor']), (query, role) => [
        ['Person', 'Email', 'Role', 'Status'], staff
          .filter(([name, assigned]) => name.toLowerCase().includes(query) && (role === 'All roles' || assigned === role))
          .map(([name, assigned, status]) => [name, `${name.toLowerCase().replace(' ', '.')}@example.com`, assigned, status]),
      ]);
      break;
    case 'settings':
      renderSiteSettings(view);
      break;
    case 'account':
      renderAccount(view);
      break;
    case 'attendance':
      renderAttendance(view);
      break;
    case 'lessons/makeups':
      renderMakeups(content);
      break;
    case 'waitlist':
      renderWaitlist(view);
      break;
  }
}

period.addEventListener('change', render);
themePicker.addEventListener('change', () => {
  const target = new URL(`../${themePicker.value}/`, location.href);
  target.hash = location.hash === '#workspace' ? '' : location.hash;
  if (period.value !== '7') target.searchParams.set('period', period.value);
  location.assign(target);
});
if (new URLSearchParams(location.search).get('period') === '14') period.value = '14';
window.addEventListener('hashchange', () => {
  if (location.hash === '#workspace') return;
  const fromSection = document.activeElement?.closest('.section-nav');
  render();
  if (fromSection) view.querySelector('.section-nav [aria-current]')?.focus();
  else if (document.activeElement?.closest('nav') === null) document.querySelector('#workspace').focus();
});
render();
