'use strict';

const albumCards = [...document.querySelectorAll('[data-open-album]')];
const albumList = document.querySelector('.photo-albums');
const photoViewer = document.querySelector('.photo-viewer');

if (albumList && photoViewer && typeof photoViewer.showModal === 'function') {
  const image = photoViewer.querySelector('.photo-viewer-image');
  const title = photoViewer.querySelector('#photo-viewer-title');
  const count = photoViewer.querySelector('[data-photo-count]');
  const previous = photoViewer.querySelector('[data-photo-prev]');
  const next = photoViewer.querySelector('[data-photo-next]');
  const close = photoViewer.querySelector('[data-photo-close]');
  let photos = [];
  let photoIndex = 0;
  let albumTrigger;

  function showPhoto() {
    const photo = photos[photoIndex];
    image.src = photo.href;
    image.alt = photo.querySelector('img').alt;
    count.textContent = `${photoIndex + 1} / ${photos.length}`;
    previous.disabled = photoIndex === 0;
    next.disabled = photoIndex === photos.length - 1;
  }

  function openAlbum(card) {
    const album = document.getElementById(card.dataset.openAlbum);
    photos = [...album.querySelectorAll('.photo-link')];
    photoIndex = 0;
    albumTrigger = card;
    title.textContent = card.querySelector('h3').textContent;
    showPhoto();
    if (!photoViewer.open) photoViewer.showModal();
    close.focus();
  }

  function openLinkedAlbum() {
    const card = albumCards.find(item => item.hash === location.hash);
    if (!card) return;
    card.scrollIntoView({ block: 'nearest' });
    openAlbum(card);
  }

  function move(step) {
    const index = photoIndex + step;
    if (index < 0 || index >= photos.length) return;
    photoIndex = index;
    showPhoto();
  }

  for (const card of albumCards) {
    card.setAttribute('aria-haspopup', 'dialog');
    card.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      openAlbum(card);
    });
  }

  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  close.addEventListener('click', () => photoViewer.close());
  photoViewer.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  });
  photoViewer.addEventListener('click', event => {
    if (event.target !== photoViewer) return;
    const bounds = photoViewer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) photoViewer.close();
  });
  photoViewer.addEventListener('close', () => {
    image.removeAttribute('src');
    albumTrigger.focus({ preventScroll: true });
  });

  albumList.hidden = true;
  openLinkedAlbum();
  window.addEventListener('hashchange', openLinkedAlbum);
}
