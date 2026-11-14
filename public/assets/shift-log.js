import { applicants } from './swim-admin-data.js';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const weekdays = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });
const applications = applicants.map(([name, subject, date, result]) => ({
  day: Number(date.slice(4)), name, subject, result, type: 'application', label: 'Application',
}));
const queue = applicants.filter(([, , , status]) => ['New', 'Under review', 'On hold'].includes(status));
let activityType = 'all';
let activitySearch = '';
let selectedEntry;

export function renderShiftLog(view, purchases, firstDay, revenue) {
  view.insertAdjacentHTML('beforeend', `
    <div class="log-workspace">
    <section class="journal" aria-labelledby="activity-title">
      <div class="journal-tools">
        <div><h2 id="activity-title">Shift monitor</h2><p id="activity-count" class="result" aria-live="polite"></p></div>
        <form id="log-filters" class="log-filters" role="search" aria-label="Filter activity">
          <div class="log-segments" role="group" aria-label="Activity type">
            <button type="button" data-type="all">All activity</button><button type="button" data-type="purchase">Purchases</button><button type="button" data-type="application">Applications</button>
          </div>
          <label><span class="sr-only">Search activity</span><input type="search" id="activity-search" placeholder="Search activity"></label>
        </form>
      </div>
      <div id="feed" tabindex="0" role="region" aria-label="Dated activity entries"></div>
    </section>
    <aside class="log-context">
      ${revenue}
      <section class="log-inspector" aria-labelledby="log-detail-title">
        <h2 id="log-detail-title">Entry details</h2>
        <div id="log-detail" aria-live="polite"></div>
      </section>
      <section class="log-queue" aria-labelledby="log-queue-title">
        <header><h2 id="log-queue-title">Hiring queue</h2><a href="#staff/applicants">All applicants ↗</a></header>
        <ul>${queue.map(([name, role, , status]) => `<li><strong>${name}</strong><span>${role}</span><small>${status}</small></li>`).join('')}</ul>
      </section>
    </aside></div>`);
  const events = [
    ...purchases.map(({ day, name, lesson, quantity, total }) => ({
      day, name, type: 'purchase', label: 'Purchase',
      subject: quantity > 1 ? `${lesson} × ${quantity}` : lesson,
      result: money.format(total),
    })),
    ...applications.filter(event => event.day >= firstDay),
  ].sort((a, b) => b.day - a.day).map((event, index) => ({
    ...event, key: JSON.stringify([event.day, event.name, event.subject, event.result, index]),
  }));

  const filters = view.querySelector('#log-filters');
  const types = [...view.querySelectorAll('[data-type]')];
  const search = view.querySelector('#activity-search');
  const feed = view.querySelector('#feed');
  const count = view.querySelector('#activity-count');
  const detail = view.querySelector('#log-detail');
  search.value = activitySearch;

  function showEntry(event, scroll = false) {
    selectedEntry = event?.key;
    feed.querySelectorAll('button').forEach(button => {
      button.setAttribute('aria-pressed', String(events[Number(button.dataset.entry)] === event));
    });
    detail.innerHTML = event ? `
      <p class="log-kind">${event.label} · Nov ${event.day}, 2026</p>
      <h3>${event.name}</h3>
      <p>${event.subject}</p>
      <dl><div><dt>${event.type === 'purchase' ? 'Purchase total' : 'Application status'}</dt><dd>${event.result}</dd></div></dl>
      <a href="#${event.type === 'purchase' ? 'purchases' : 'staff/applicants'}" class="text-link">View ${event.type === 'purchase' ? 'purchases' : 'applicants'} ↗</a>`
      : '<p>No matching entry to inspect.</p>';
    if (scroll && window.matchMedia('(max-width: 1050px)').matches) {
      // Keep keyboard focus on the chosen row while bringing its details into view.
      detail.closest('section').scrollIntoView({ block: 'nearest' });
    }
  }

  function render() {
    types.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.type === activityType)));
    activitySearch = search.value;
    const query = activitySearch.trim().toLowerCase();
    const matches = events.filter(event => (activityType === 'all' || event.type === activityType) &&
      `${event.name} ${event.subject} ${event.result}`.toLowerCase().includes(query));
    const byDay = new Map();
    matches.forEach(event => {
      if (!byDay.has(event.day)) byDay.set(event.day, []);
      byDay.get(event.day).push(event);
    });
    count.textContent = `${matches.length} ${matches.length === 1 ? 'entry' : 'entries'}`;
    feed.innerHTML = [...byDay].map(([day, items]) => `
      <section class="log-day">
        <h3><time datetime="2026-11-${String(day).padStart(2, '0')}"><span>Nov</span><strong>${day}</strong><small>${weekdays.format(Date.UTC(2026, 10, day))}</small></time></h3>
        <ul>${items.map(event => `<li><button type="button" class="log-entry ${event.type}" data-entry="${events.indexOf(event)}" aria-controls="log-detail">
          <span class="entry-name"><span class="entry-initials" aria-hidden="true">${event.name.split(' ').map(part => part[0]).join('')}</span><strong>${event.name}</strong><small>${event.subject}</small></span>
          <span class="entry-result"><small>${event.label}</small><strong>${event.result}</strong></span>
        </button></li>`).join('')}</ul>
      </section>`).join('') || '<p class="empty">No activity matches your filters.</p>';
    showEntry(matches.find(event => event.key === selectedEntry) ?? matches[0]);
  }

  feed.addEventListener('click', event => {
    const button = event.target.closest('button[data-entry]');
    if (button) showEntry(events[Number(button.dataset.entry)], true);
  });
  filters.addEventListener('submit', event => event.preventDefault());
  types.forEach(button => button.addEventListener('click', () => {
    activityType = button.dataset.type;
    render();
  }));
  search.addEventListener('input', render);
  render();
}
