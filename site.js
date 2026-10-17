'use strict';

// Everything works from a plain static directory. No service keys or build step.
const contactEmail = 'info@kacheen.lt';

document.querySelectorAll('[data-year]').forEach(element => {
  element.textContent = String(new Date().getFullYear());
});

const filterGroup = document.querySelector('.filters');
if (filterGroup) {
  filterGroup.hidden = false;
  filterGroup.addEventListener('click', event => {
    const button = event.target.closest('button[data-filter]');
    if (!button) return;
    filterGroup.querySelectorAll('button').forEach(item => {
      item.setAttribute('aria-pressed', String(item === button));
    });
    document.querySelectorAll('[data-category]').forEach(project => {
      project.hidden = button.dataset.filter !== 'all' && project.dataset.category !== button.dataset.filter;
    });
  });
}

const mediaDialog = document.querySelector('.media-dialog');
const mediaContainer = document.querySelector('#media-container');
let mediaTrigger;
if (mediaDialog && typeof mediaDialog.showModal === 'function') {
  document.querySelectorAll('[data-video], [data-spotify]').forEach(link => {
    link.addEventListener('click', event => {
      // Preserve opening a link in a new tab with modifier keys.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      const spotify = Boolean(link.dataset.spotify);
      const frame = document.createElement('iframe');
      frame.title = link.dataset.title;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
      frame.allowFullscreen = true;
      if (spotify) {
        frame.src = `https://open.spotify.com/embed/track/${encodeURIComponent(link.dataset.spotify)}?theme=0`;
        frame.className = 'spotify-frame';
      } else {
        frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(link.dataset.video)}?autoplay=1&rel=0`;
      }
      mediaContainer.replaceChildren(frame);
      document.querySelector('#media-title').textContent = link.dataset.title;
      document.querySelector('#media-original').href = link.href;
      mediaTrigger = link;
      mediaDialog.showModal();
      mediaDialog.querySelector('.dialog-close').focus();
    });
  });
  mediaDialog.querySelector('.dialog-close').addEventListener('click', () => mediaDialog.close());
  mediaDialog.addEventListener('click', event => {
    if (event.target !== mediaDialog) return;
    const bounds = mediaDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) mediaDialog.close();
  });
  mediaDialog.addEventListener('close', () => {
    mediaContainer.replaceChildren();
    if (mediaTrigger) mediaTrigger.focus({ preventScroll: true });
  });
}

const enquiryForm = document.querySelector('#enquiry-form');
if (enquiryForm) {
  const select = enquiryForm.elements.service;
  const services = {
    photo: 'Fotografija',
    audio: 'Garso įrašymas',
    video: 'Filmavimas ir montažas'
  };
  const requestedService = new URLSearchParams(location.search).get('service');
  if (Object.prototype.hasOwnProperty.call(services, requestedService)) select.value = services[requestedService];

  document.querySelectorAll('[data-service]').forEach(link => {
    link.addEventListener('click', () => { select.value = link.dataset.service; });
  });

  enquiryForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!enquiryForm.reportValidity()) return;
    const data = new FormData(enquiryForm);
    const get = name => String(data.get(name) || '').trim();
    const subject = `Kacheen užklausa: ${get('service')}`;
    const body = [
      'Labas, Albertai!', '', get('message'), '',
      `Paslauga: ${get('service')}`,
      `Data / laikotarpis: ${get('date') || 'Dar derinsime'}`,
      `Vieta: ${get('location') || 'Dar derinsime'}`, '',
      `Vardas: ${get('name')}`,
      `Atsakymui: ${get('email')}`
    ].join('\r\n');
    const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const status = document.querySelector('#form-status');
    status.replaceChildren(document.createTextNode('Laiškas paruoštas. Jei el. pašto programa neatsidarė, '));
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'copy-message';
    copyButton.textContent = 'nukopijuok užklausą';
    copyButton.addEventListener('click', async () => {
      const copyText = `Kam: ${contactEmail}\nTema: ${subject}\n\n${body}`;
      try {
        if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(copyText);
        status.textContent = `Užklausa nukopijuota. Įklijuok ją į laišką adresu ${contactEmail}.`;
      } catch {
        const text = document.createElement('textarea');
        text.value = copyText;
        text.readOnly = true;
        text.setAttribute('aria-label', 'Paruoštas laiško tekstas kopijavimui');
        status.replaceChildren(document.createTextNode('Nukopijuok šį tekstą į savo el. paštą:'), text);
        text.focus();
        text.select();
      }
    });
    status.append(copyButton, document.createTextNode(' ir išsiųsk el. paštu.'));
    // The visitor remains responsible for reviewing and sending the email.
    const emailLink = document.createElement('a');
    emailLink.href = mailto;
    emailLink.hidden = true;
    document.body.append(emailLink);
    emailLink.click();
    emailLink.remove();
  });
}
