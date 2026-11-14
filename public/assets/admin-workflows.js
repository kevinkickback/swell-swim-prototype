import { lessons } from './swim-admin-data.js';
import { readEnrollment, rosterFor, sessionDate, swimmer } from './enrollment-data.js';

const defaults = {
  account: { name: 'Dylan West', email: 'dylan.west@example.com', digest: false },
  settings: {
    school: 'Swell Swim', email: 'hello@example.com', hold: 15, registration: true,
    policy: 'Please arrive 10 minutes before your lesson. Contact the office for help rescheduling.',
  },
  attendance: { '0-0': ['Present', 'Absent', 'Present'], '1-0': ['Present', 'Present', 'Excused', 'Present'] },
};
const storageKey = area => `swell-swim-demo-${area}`;

function load(area) {
  try {
    return { ...defaults[area], ...JSON.parse(localStorage.getItem(storageKey(area))) };
  } catch {
    return { ...defaults[area] };
  }
}

function save(area, value, status, message) {
  try {
    localStorage.setItem(storageKey(area), JSON.stringify(value));
    status.textContent = message;
    return true;
  } catch {
    status.textContent = 'Could not save in this browser. Your changes are still on this page.';
    return false;
  }
}

export function renderAccount(view) {
  view.innerHTML = `<section class="panel workflow-panel">
    <form class="admin-form">
      <div class="form-section"><h2>Profile</h2><p class="muted">Signed in as a demo administrator.</p>
        <div class="form-grid">
          <label>Display name <input name="name" autocomplete="off" required maxlength="80" pattern=".*\\S.*"></label>
          <label>Email address <input name="email" type="email" autocomplete="off" required maxlength="120"></label>
        </div>
      </div>
      <div class="form-section"><h2>Notifications</h2>
        <label class="form-check"><input type="checkbox" name="digest"> Receive a weekly activity digest</label>
        <p class="muted">This demo saves your preference without sending email.</p>
      </div>
      <div class="form-actions"><button class="primary-action">Save profile</button><p role="status"></p></div>
    </form>
  </section>`;
  const account = load('account');
  const form = view.querySelector('form');
  const { name, email, digest } = form.elements;
  name.value = account.name;
  email.value = account.email;
  digest.checked = account.digest;
  form.addEventListener('submit', event => {
    event.preventDefault();
    save('account', { name: name.value.trim(), email: email.value.trim(), digest: digest.checked },
      form.querySelector('[role="status"]'), 'Profile saved in this browser.');
  });
}

export function renderSiteSettings(view) {
  view.innerHTML = `<div class="workflow-layout">
    <section class="panel workflow-panel">
      <form class="admin-form">
        <div class="form-section"><h2>School details</h2>
          <div class="form-grid">
            <label>School name <input name="school" required maxlength="80" pattern=".*\\S.*"></label>
            <label>Contact email <input name="email" type="email" required maxlength="120"></label>
          </div>
        </div>
        <div class="form-section"><h2>Registration and checkout</h2>
          <label class="form-check"><input name="registration" type="checkbox"> Accept new registrations</label>
          <label>Checkout hold (minutes) <input name="hold" type="number" min="5" max="60" required></label>
          <p class="muted">Payments · Stripe demo mode</p>
        </div>
        <div class="form-section"><h2>Lesson policy</h2>
          <label>Policy shown to families <textarea name="policy" rows="4" maxlength="1000"></textarea></label>
        </div>
        <div class="form-actions"><button class="primary-action">Save site settings</button><p role="status"></p></div>
      </form>
    </section>
    <section class="panel workflow-panel registration-preview" aria-labelledby="preview-title">
      <h2 id="preview-title">Registration preview</h2>
      <h3 data-preview="school"></h3>
      <p data-preview="registration"></p>
      <p data-preview="hold" class="muted"></p>
      <p data-preview="policy"></p>
      <p data-preview="email" class="muted"></p>
      <p class="muted">Saved settings update this preview.</p>
    </section>
  </div>`;
  const form = view.querySelector('form');
  const { school, email, hold, registration, policy } = form.elements;

  function preview(settings) {
    const copy = {
      school: settings.school, email: settings.email, policy: settings.policy,
      registration: settings.registration ? 'Registration is open' : 'Registration is closed',
      hold: settings.registration ? `Your spot is held for ${settings.hold} minutes during checkout.` : '',
    };
    view.querySelectorAll('[data-preview]').forEach(element => {
      element.textContent = copy[element.dataset.preview];
      element.hidden = !element.textContent;
    });
  }

  const settings = load('settings');
  school.value = settings.school;
  email.value = settings.email;
  hold.value = settings.hold;
  registration.checked = settings.registration;
  policy.value = settings.policy;
  preview(settings);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const next = {
      school: school.value.trim(), email: email.value.trim(), hold: hold.valueAsNumber,
      registration: registration.checked, policy: policy.value.trim(),
    };
    if (save('settings', next, form.querySelector('[role="status"]'), 'Site settings saved in this browser.')) preview(next);
  });
}

const attendanceStatuses = ['Unmarked', 'Present', 'Absent', 'Excused'];

export function renderAttendance(view) {
  view.innerHTML = `<section class="panel workflow-panel">
    <form class="admin-form">
      <div class="form-grid form-section">
        <label>Lesson type <select name="lesson">${lessons.map((lesson, index) => `<option value="${index}">${lesson.name}</option>`).join('')}</select></label>
        <label>Session <select name="session"></select></label>
      </div>
      <div class="form-section"><h2>Sample roster</h2><p><a class="text-link" href="#lessons/makeups">Manage make-up lessons →</a></p><div class="attendance-roster"></div></div>
      <div class="form-actions"><button class="primary-action">Save attendance</button><p role="status"></p></div>
    </form>
  </section>
  <section class="panel workflow-panel attendance-report">
    <h2>Attendance for this lesson</h2>
    <p class="muted">Share of the sample roster marked present by session.</p>
    <div class="attendance-bars"></div>
  </section>`;
  const form = view.querySelector('form');
  const { lesson, session } = form.elements;
  const roster = form.querySelector('.attendance-roster');
  const status = form.querySelector('[role="status"]');
  const bars = view.querySelector('.attendance-bars');
  let records = load('attendance');
  const enrollment = readEnrollment();
  const key = index => `${lesson.value}-${index}`;
  const date = index => sessionDate(Number(lesson.value), index);
  const studentsFor = index => rosterFor(enrollment, Number(lesson.value), index);
  const markFor = (marks, person, index) => {
    const mark = Array.isArray(marks) ? marks[index] : marks[person.key];
    return mark ?? (person.absenceReported ? 'Absent' : 'Unmarked');
  };

  function renderBars() {
    bars.innerHTML = [...session.options].map(option => {
      const index = Number(option.value);
      const people = studentsFor(index);
      const total = people.length;
      const marked = people.map((person, position) => markFor(records[key(index)] ?? {}, person, position));
      const present = marked.filter(value => value === 'Present').length;
      const recorded = marked.filter(value => value !== 'Unmarked').length;
      return `<div class="attendance-bar"><strong>${date(index)}</strong>
        <progress value="${present}" max="${total}" aria-label="${date(index)} students present"></progress>
        <span>${recorded ? `${present} / ${total} present` : 'Awaiting attendance'}</span></div>`;
    }).join('');
  }

  function renderRoster() {
    const marked = records[key(session.value)] ?? [];
    roster.innerHTML = studentsFor(Number(session.value)).map((person, index) => {
      const { name, parent } = swimmer(person.id);
      const detail = person.makeup ? ' · Make-up' : person.absenceReported ? ' · Absence reported' : '';
      return `<label class="roster-row"><span><strong>${name}</strong><small>${parent}${detail}</small></span>
        <select data-person="${person.key}" aria-label="Attendance for ${name}">${attendanceStatuses.map(value =>
          `<option${value === markFor(marked, person, index) ? ' selected' : ''}>${value}</option>`).join('')}</select></label>`;
    }).join('');
    status.textContent = '';
  }

  function renderSessions() {
    const regular = lessons[lesson.value].sessions;
    const clinics = enrollment.makeups.filter(entry => entry.lesson === Number(lesson.value) && entry.booked !== null).map(entry => entry.booked);
    session.innerHTML = [...new Set([...Array.from({ length: regular }, (_, index) => index), ...clinics])].sort((a, b) => a - b)
      .map(index => `<option value="${index}">${date(index)}${index >= regular ? ' · Make-up clinic' : ''}</option>`).join('');
    renderRoster();
    renderBars();
  }

  lesson.addEventListener('change', renderSessions);
  session.addEventListener('change', renderRoster);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const marks = Object.fromEntries([...roster.querySelectorAll('select')].map(select => [select.dataset.person, select.value]));
    const next = { ...load('attendance'), [key(session.value)]: marks };
    if (save('attendance', next, status, 'Attendance saved in this browser.')) {
      records = next;
      renderBars();
    }
  });
  renderSessions();
}
