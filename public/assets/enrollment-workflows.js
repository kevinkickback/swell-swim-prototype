import { lessons } from './swim-admin-data.js';
import {
  enrolled, makeupOpenings, openings, originalRoster, readEnrollment, rosterFor,
  sessionDate, swimmer, swimmers, writeEnrollment,
} from './enrollment-data.js';

const lessonOptions = lessons.map((lesson, index) => `<option value="${index}">${lesson.name}</option>`).join('');
const swimmerOptions = people => people.map(person =>
  `<option value="${person.id}">${person.name} · ${person.parent}</option>`).join('');

function openForm(view, heading, fields, submitLabel, update) {
  const dialog = view.querySelector('dialog');
  const intro = dialog.querySelector('h2');
  intro.textContent = heading;
  dialog.querySelector('.dialog-fields').innerHTML = fields;
  dialog.querySelector('[type="submit"]').textContent = submitLabel;
  const status = dialog.querySelector('[role="status"]');
  status.textContent = '';
  dialog.querySelector('form').onsubmit = event => {
    event.preventDefault();
    const state = readEnrollment();
    const message = update(state, new FormData(event.currentTarget));
    if (message) {
      status.textContent = message;
      return;
    }
    try {
      writeEnrollment(state);
    } catch {
      status.textContent = 'This browser could not save the change.';
      return;
    }
    dialog.close();
    view.querySelector('[data-saved]').textContent = 'Changes saved in this browser.';
    enrollmentRefresh.get(view)();
  };
  dialog.showModal();
  return dialog.querySelector('form');
}

const enrollmentRefresh = new WeakMap();

function layout(view, title, action, description) {
  view.innerHTML = `<div class="enrollment-toolbar">
    <p class="muted">${description}</p><button type="button" class="primary-action" data-add>${action}</button>
  </div><p data-saved role="status"></p>
  <div class="enrollment-layout">
    <section class="panel workflow-panel"><h2>${title}</h2><ul class="enrollment-list"></ul></section>
    <section class="panel workflow-panel" aria-labelledby="enrollment-chart-title"><h2 id="enrollment-chart-title"></h2><div class="enrollment-chart"></div></section>
  </div>
  <dialog class="enrollment-dialog" aria-labelledby="enrollment-dialog-title">
    <form class="admin-form">
      <h2 id="enrollment-dialog-title"></h2>
      <div class="dialog-fields"></div>
      <div class="form-actions"><button class="primary-action" type="submit"></button><button type="button" class="secondary-action" data-close>Cancel</button></div>
      <p role="status"></p>
    </form>
  </dialog>`;
  view.querySelector('[data-close]').onclick = () => view.querySelector('dialog').close();
}

function chart(view, title, rows) {
  view.querySelector('#enrollment-chart-title').textContent = title;
  view.querySelector('.enrollment-chart').innerHTML = rows.map(row => `
    <div><div class="enrollment-chart-label"><strong>${row.label}</strong><span>${row.detail}</span></div>
    <progress value="${row.value}" max="${Math.max(1, row.max)}" aria-label="${row.label}: ${row.detail}"></progress></div>`).join('');
}

function entryRow(entry, meta, badge, action, actionLabel) {
  const person = swimmer(entry.swimmer);
  return `<li>
    <div><strong>${person.name}</strong><small>${person.parent} · ${lessons[entry.lesson].name}</small><small>${meta}</small></div>
    <span class="pill">${badge}</span>
    ${action ? `<button type="button" class="secondary-action" data-action="${action}" data-id="${entry.id}">${actionLabel}</button>` : ''}
  </li>`;
}

function bindList(view, handler) {
  view.querySelector('.enrollment-list').onclick = event => {
    const button = event.target.closest('[data-action]');
    if (button) handler(button.dataset.action, button.dataset.id);
  };
}

export function renderMakeups(view) {
  layout(view, 'Make-up requests', 'Report an absence', 'Book a replacement in a make-up clinic of the same lesson type.');
  const list = view.querySelector('.enrollment-list');
  function render() {
    const state = readEnrollment();
    list.innerHTML = state.makeups.map(entry => {
      const missed = `Missed ${sessionDate(entry.lesson, entry.missed)}`;
      if (entry.booked === null) return entryRow(entry, missed, 'Needs booking', 'book', 'Book make-up');
      return entryRow(entry, `${missed} · Clinic ${sessionDate(entry.lesson, entry.booked)}`, 'Booked');
    }).join('') || '<li>No requests yet.</li>';
    const booked = state.makeups.filter(entry => entry.booked !== null).length;
    chart(view, 'Request status', [
      { label: 'Needs booking', value: state.makeups.length - booked, max: state.makeups.length, detail: state.makeups.length - booked },
      { label: 'Booked', value: booked, max: state.makeups.length, detail: booked },
    ]);
  }
  view.querySelector('[data-add]').onclick = () => {
    const form = openForm(view, 'Report an absence', `
      <label>Lesson type <select name="lesson">${lessonOptions}</select></label>
      <label>Swimmer <select name="swimmer" required></select></label>
      <label>Missed session <select name="missed"></select></label>`, 'Create request', (state, values) => {
      const lesson = Number(values.get('lesson'));
      const missed = Number(values.get('missed'));
      const person = values.get('swimmer');
      if (!rosterFor(state, lesson, missed).some(item => item.id === person)) return 'Choose a swimmer on this roster.';
      if (state.makeups.some(entry => entry.lesson === lesson && entry.missed === missed && entry.swimmer === person)) {
        return 'A request already exists for this swimmer and session.';
      }
      state.makeups.unshift({ id: crypto.randomUUID(), lesson, missed, swimmer: person, booked: null });
    });
    function setOptions() {
      const lesson = Number(form.elements.lesson.value);
      form.elements.swimmer.innerHTML = swimmerOptions(rosterFor(readEnrollment(), lesson, 0).map(person => swimmer(person.id)));
      form.elements.missed.innerHTML = Array.from({ length: lessons[lesson].sessions }, (_, i) =>
        `<option value="${i}">${sessionDate(lesson, i)}</option>`).join('');
    }
    form.elements.lesson.onchange = setOptions;
    setOptions();
    form.elements.lesson.focus();
  };
  bindList(view, (_, id) => {
    const state = readEnrollment();
    const request = state.makeups.find(entry => entry.id === id);
    const options = [lessons[request.lesson].sessions, lessons[request.lesson].sessions + 1].map(session => {
      const open = makeupOpenings(state, request.lesson, session);
      return `<option value="${session}"${open ? '' : ' disabled'}>${sessionDate(request.lesson, session)} · ${open} open</option>`;
    }).join('');
    openForm(view, 'Book make-up lesson', `
      <p>${swimmer(request.swimmer).name} · ${lessons[request.lesson].name}</p>
      <label>Replacement session <select name="session" required><option value="">Choose a clinic</option>${options}</select></label>
      <p class="muted">The replacement appears in Attendance after booking.</p>`, 'Confirm booking', (next, values) => {
      const entry = next.makeups.find(item => item.id === id);
      const session = Number(values.get('session'));
      if (!entry || entry.booked !== null || !makeupOpenings(next, entry.lesson, session)) return 'This booking is no longer available.';
      if (next.makeups.some(item => item.lesson === entry.lesson && item.swimmer === entry.swimmer && item.booked === session)) {
        return 'This swimmer already has a make-up booked in that clinic.';
      }
      entry.booked = session;
    });
  });
  enrollmentRefresh.set(view, render);
  render();
}

export function renderWaitlist(view) {
  layout(view, 'Waitlist queue', 'Add to waitlist', 'Offers hold one place until the family accepts or declines.');
  const toolbar = view.querySelector('.enrollment-toolbar');
  toolbar.insertAdjacentHTML('beforeend', '<button type="button" class="secondary-action" data-cancel-spot>Simulate cancellation</button>');
  const list = view.querySelector('.enrollment-list');
  function render() {
    const state = readEnrollment();
    // Only the first waiting family for a lesson can receive its next offer.
    const next = new Set(lessons.map((_, lesson) => state.waitlist.find(entry => entry.lesson === lesson && entry.status === 'Waiting')?.id));
    list.innerHTML = state.waitlist.map(entry => {
      const open = openings(state, entry.lesson);
      const canOffer = next.has(entry.id) && open > 0;
      const action = entry.status === 'Offered' ? 'respond' : canOffer ? 'offer' : '';
      return entryRow(entry, `${open} open · ${enrolled(state, entry.lesson)} enrolled`, entry.status, action,
        entry.status === 'Offered' ? 'Record response' : 'Offer spot');
    }).join('') || '<li>No families are waiting.</li>';
    chart(view, 'Class capacity', lessons.map((lesson, index) => {
      const count = enrolled(state, index);
      const open = openings(state, index);
      const held = lesson.capacity - count - open;
      return {
        label: lesson.name, value: count + held, max: lesson.capacity,
        detail: `${count} enrolled${held ? ` · ${held} held` : ''} · ${open} open`,
      };
    }));
  }
  view.querySelector('[data-add]').onclick = () => {
    const form = openForm(view, 'Add to waitlist', `
      <label>Lesson type <select name="lesson">${lessonOptions}</select></label>
      <label>Swimmer <select name="swimmer" required></select></label>`, 'Add swimmer', (state, values) => {
      const lesson = Number(values.get('lesson'));
      const person = values.get('swimmer');
      if (!eligible(state, lesson).some(item => item.id === person)) return 'This swimmer already has a place or a waitlist entry.';
      state.waitlist.push({ id: crypto.randomUUID(), swimmer: person, lesson, status: 'Waiting' });
    });
    function setOptions() {
      const available = eligible(readEnrollment(), Number(form.elements.lesson.value));
      form.elements.swimmer.innerHTML = swimmerOptions(available);
      form.querySelector('[type="submit"]').disabled = !available.length;
    }
    form.elements.lesson.onchange = setOptions;
    setOptions();
    form.elements.lesson.focus();
  };
  view.querySelector('[data-cancel-spot]').onclick = () => openForm(view, 'Simulate a cancellation', `
    <label>Lesson type <select name="lesson">${lessonOptions}</select></label>
    <p class="muted">Release one spot from the demo's existing enrollment.</p>`, 'Release spot', (state, values) => {
    const lesson = Number(values.get('lesson'));
    const count = state.cancellations[lesson] ?? 0;
    if (count >= lessons[lesson].sold - originalRoster(lesson).length) return 'No additional demo spots can be released.';
    state.cancellations[lesson] = count + 1;
  });
  bindList(view, (action, id) => {
    const entry = readEnrollment().waitlist.find(item => item.id === id);
    const recipient = `<p>${swimmer(entry.swimmer).name} · ${lessons[entry.lesson].name}</p>`;
    if (action === 'offer') {
      openForm(view, 'Offer an open spot', `${recipient}<p class="muted">Reserve a place for this family in the demo.</p>`,
        'Confirm offer', state => {
          const next = state.waitlist.find(item => item.lesson === entry.lesson && item.status === 'Waiting');
          if (next?.id !== id || openings(state, entry.lesson) < 1) return 'This spot is no longer available.';
          next.status = 'Offered';
        });
    } else {
      openForm(view, 'Record family response', `${recipient}<label>Response <select name="response"><option value="Enrolled">Accepted</option><option value="Declined">Declined</option></select></label>`,
        'Save response', (state, values) => {
          const current = state.waitlist.find(item => item.id === id);
          if (current?.status !== 'Offered') return 'This offer already has a response.';
          current.status = values.get('response');
        });
    }
  });
  enrollmentRefresh.set(view, render);
  render();
}

function eligible(state, lesson) {
  return swimmers.filter(person => !originalRoster(lesson).includes(person.id) &&
    !state.waitlist.some(entry => entry.lesson === lesson && entry.swimmer === person.id && entry.status !== 'Declined'));
}
