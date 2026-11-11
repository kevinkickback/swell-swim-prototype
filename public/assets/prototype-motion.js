const motionToggle = document.querySelector('.motion-toggle');
const motionStatus = document.querySelector('#motion-status');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const intro = document.querySelector('[data-motion-intro]');
const introLines = [...intro.children];
const offerCards = [...document.querySelectorAll('.gift-option')];
const feature = document.querySelector('[data-motion-feature]');
const motionEasing = 'cubic-bezier(0.22, 1, 0.36, 1)';
let entranceAnimations = [];

function stopEntrance() {
  for (const animation of entranceAnimations) animation.cancel();
  entranceAnimations = [];
}

function playEntrance() {
  const introAnimations = introLines.map((line, index) => line.animate(
    { transform: ['translateY(18px)', 'translateY(0)'], opacity: [0.5, 1] },
    { duration: 550, delay: index * 85, easing: motionEasing, fill: 'backwards' },
  ));

  const cardAnimations = offerCards.flatMap((card, index) => {
    const delay = 140 + index * 120;
    const photo = card.querySelector('.option-visual img');
    const price = card.querySelector('.option-price');

    return [
      card.animate(
        { transform: ['translateY(28px)', 'translateY(-5px)', 'translateY(0)'], opacity: [0.55, 1, 1] },
        { duration: 620, delay, easing: motionEasing, fill: 'backwards' },
      ),
      photo.animate(
        { transform: ['translateY(15px) rotate(-5deg)', 'translateY(-8px) rotate(2deg)', 'none'] },
        { duration: 650, delay: delay + 70, easing: motionEasing, fill: 'backwards' },
      ),
      price.animate(
        { transform: ['scale(0.78) rotate(-8deg)', 'scale(1.14) rotate(3deg)', 'none'] },
        { duration: 520, delay: delay + 165, easing: motionEasing, fill: 'backwards' },
      ),
    ];
  });

  entranceAnimations = [...introAnimations, ...cardAnimations];

  if (feature) {
    const photo = feature.querySelector('img');
    const price = document.querySelector('[data-gift-price]');
    entranceAnimations.push(
      photo.animate(
        { transform: ['scale(1.1)', 'scale(1)'], opacity: [0.68, 1] },
        { duration: 850, delay: 100, easing: motionEasing, fill: 'backwards' },
      ),
      price.animate(
        { transform: ['scale(0.8)', 'scale(1.12)', 'none'] },
        { duration: 520, delay: 420, easing: motionEasing, fill: 'backwards' },
      ),
    );
  }
}

function playReducedEntrance() {
  const subjects = feature ? [intro, feature] : [intro, ...offerCards];
  entranceAnimations = subjects.map((element, index) => element.animate(
    { opacity: [0.65, 1] },
    { duration: 360, delay: index * 80, easing: 'ease-out', fill: 'backwards' },
  ));
}

motionToggle.addEventListener('click', () => {
  const enabled = motionToggle.getAttribute('aria-checked') === 'false';
  motionToggle.setAttribute('aria-checked', String(enabled));
  document.body.dataset.motion = enabled ? 'enhanced' : 'original';
  stopEntrance();

  if (enabled) {
    if (reducedMotion.matches) playReducedEntrance();
    else playEntrance();
  }
});

reducedMotion.addEventListener('change', () => {
  stopEntrance();
  motionStatus.hidden = !reducedMotion.matches;
});
motionStatus.hidden = !reducedMotion.matches;
motionToggle.hidden = false;
