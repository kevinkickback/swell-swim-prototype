const checkout = document.createElement('dialog');
checkout.className = 'gift-checkout';
checkout.setAttribute('aria-labelledby', 'gift-checkout-title');
checkout.innerHTML = `
  <header class="checkout-header">
    <p class="checkout-kicker">Swell Swim · Demo checkout</p>
    <form method="dialog"><button class="checkout-close" aria-label="Close gift checkout">×</button></form>
  </header>
  <h2 id="gift-checkout-title" tabindex="-1">Review your gift</h2>
  <div class="checkout-review">
    <p class="checkout-package"></p>
    <p>Includes a printable gift voucher and a small trinket for the stocking.</p>
    <dl class="checkout-total">
      <div><dt>Sample total</dt><dd></dd></div>
    </dl>
    <p class="checkout-note">This is a sample order. No payment or personal information is needed.</p>
    <button class="gift-action checkout-confirm" type="button">Place sample order</button>
  </div>
  <div class="gift-voucher" hidden>
    <div class="voucher-printout">
      <p class="checkout-kicker">Swell Swim · Fresno</p>
      <h3>Private swim lesson gift</h3>
      <p class="voucher-package"></p>
      <p class="voucher-code"></p>
      <p class="checkout-note">Sample voucher · Not redeemable</p>
    </div>
    <p class="voucher-note">For the sample gift, tuck the printed voucher into a stocking. The recipient would arrange lessons and pick up the trinket at the swim school.</p>
    <button class="gift-action checkout-print" type="button">Print sample voucher</button>
  </div>
`;
document.body.append(checkout);

const title = checkout.querySelector('#gift-checkout-title');
const review = checkout.querySelector('.checkout-review');
const voucher = checkout.querySelector('.gift-voucher');
const packageLabel = checkout.querySelector('.checkout-package');
const total = checkout.querySelector('.checkout-total dd');
const voucherPackage = checkout.querySelector('.voucher-package');
const voucherCode = checkout.querySelector('.voucher-code');

for (const trigger of document.querySelectorAll('[data-gift-package]')) {
  const { giftPackage, giftLessons } = trigger.dataset;
  const price = trigger.closest('[data-gift-offer]').querySelector('[data-gift-price]').textContent;
  const description = `${giftPackage} · ${giftLessons} private lessons (30 minutes each)`;

  trigger.addEventListener('click', () => {
    title.textContent = 'Review your gift';
    packageLabel.textContent = description;
    total.textContent = price;
    voucherPackage.textContent = description;
    voucherCode.textContent = `SWELL-DEMO-${giftLessons}`;
    voucher.hidden = true;
    review.hidden = false;
    checkout.showModal();
    title.focus();
  });
  trigger.hidden = false;
}

checkout.querySelector('.checkout-confirm').addEventListener('click', () => {
  title.textContent = 'Your sample gift is ready';
  review.hidden = true;
  voucher.hidden = false;
  title.focus();
});

checkout.querySelector('.checkout-print').addEventListener('click', () => window.print());
