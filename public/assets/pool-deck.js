import { lessons } from './swim-admin-data.js';
import { enrolled, openings, readEnrollment } from './enrollment-data.js';

const spotLabel = count => `${count} open ${count === 1 ? 'spot' : 'spots'}`;
let selected = lessons[0];
let lowCapacity = false;

export function renderPoolDeck(view) {
  const state = readEnrollment();
  const open = lesson => openings(state, lessons.indexOf(lesson));
  view.insertAdjacentHTML('beforeend', `
    <div class="deck-layout">
      <section class="pool" aria-labelledby="pool-title">
        <header><h2 id="pool-title">Upcoming lessons</h2><output id="capacity-summary"></output></header>
        <label class="capacity-filter"><input type="checkbox" id="low-capacity"> Show lessons with 3 or fewer spots</label>
        <div id="lanes"></div>
        <div class="pool-key"><span><i></i> Enrolled or held</span><span><i></i> Open</span></div>
      </section>
      <section class="ticket" aria-labelledby="lesson-title" aria-live="polite">
        <p class="ticket-label">Selected lesson</p>
        <h2 id="lesson-title"></h2>
        <div id="lesson-detail"></div>
      </section>
    </div>`);
  const lanes = view.querySelector('#lanes');
  const limit = view.querySelector('#low-capacity');
  const title = view.querySelector('#lesson-title');
  const detail = view.querySelector('#lesson-detail');
  limit.checked = lowCapacity;

  function select(lesson) {
    selected = lesson;
    lanes.querySelectorAll('button').forEach(button => {
      button.setAttribute('aria-pressed', String(lessons[Number(button.dataset.lesson)] === lesson));
    });
    title.textContent = lesson.name;
    detail.innerHTML = `<p class="ticket-schedule">${lesson.schedule}<br>Starts ${lesson.start}, 2026</p>
    <dl><div><dt>Availability</dt><dd>${open(lesson)} open · ${enrolled(state, lessons.indexOf(lesson))} enrolled</dd></div>
      <div><dt>Package</dt><dd>${lesson.sessions} sessions</dd></div>
      <div><dt>Age range</dt><dd>${lesson.ages} months</dd></div>
      <div><dt>Price</dt><dd>$${lesson.price} per session</dd></div></dl>
      <p class="ticket-total"><span>Package total</span><strong>$${lesson.price * lesson.sessions}</strong></p>`;
  }

  function render() {
    const visible = limit.checked ? lessons.filter(lesson => open(lesson) <= 3) : lessons;
    view.querySelector('#capacity-summary').textContent = spotLabel(visible.reduce((sum, lesson) => sum + open(lesson), 0));
    lanes.innerHTML = visible.map(lesson => `
      <button type="button" class="lane" data-lesson="${lessons.indexOf(lesson)}">
        <span class="lane-info"><strong>${lesson.name}</strong><small>${lesson.schedule}</small></span>
        <span class="lane-spots" aria-hidden="true" style="--slots:${lesson.capacity}">${Array.from({ length: lesson.capacity }, (_, i) => `<i class="${i < lesson.capacity - open(lesson) ? 'sold' : ''}"></i>`).join('')}</span>
        <span class="lane-count">${spotLabel(open(lesson))}<span aria-hidden="true"> ↗</span></span>
      </button>`).join('') || '<p class="empty">No lessons match this filter.</p>';
    if (!visible.length) {
      title.textContent = 'No lesson selected';
      detail.replaceChildren();
      return;
    }
    select(visible.includes(selected) ? selected : visible[0]);
  }

  lanes.addEventListener('click', event => {
    const button = event.target.closest('button[data-lesson]');
    if (button) select(lessons[Number(button.dataset.lesson)]);
  });
  limit.addEventListener('change', () => {
    lowCapacity = limit.checked;
    render();
  });
  render();
}
