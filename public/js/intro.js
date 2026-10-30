/* Efek logo landing & login: tiap huruf menyala bergantian seperti papan LED. */
(function () {
  'use strict';
  document.querySelectorAll('.logo-dot[data-animate]').forEach((logo) => {
    const text = logo.textContent;
    logo.setAttribute('aria-label', text);
    logo.innerHTML = [...text]
      .map((ch, i) => `<span class="ch" style="--i:${i}" aria-hidden="true">${ch === ' ' ? '&nbsp;' : ch}</span>`)
      .join('');
  });
})();
