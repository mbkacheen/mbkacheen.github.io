 'use strict';
document.querySelectorAll('[data-open-album]').forEach(link=>link.addEventListener('click',()=>{const album=document.getElementById(link.dataset.openAlbum);if(album)album.open=true;}));
function openHashedAlbum(){const album=document.getElementById(location.hash.slice(1));if(album&&album.matches('.photo-album'))album.open=true;}
openHashedAlbum();window.addEventListener('hashchange',openHashedAlbum);
const photoViewer=document.querySelector('.photo-viewer');
if(photoViewer&&typeof photoViewer.showModal==='function'){
 let photoLinks=[],photoIndex=0,photoTrigger;
 const image=photoViewer.querySelector('.photo-viewer-image');
 const prev=photoViewer.querySelector('[data-photo-prev]');
 const next=photoViewer.querySelector('[data-photo-next]');
 function showPhoto(){const link=photoLinks[photoIndex];image.src=link.href;image.alt=link.querySelector('img').alt;photoViewer.querySelector('#photo-viewer-title').textContent=link.dataset.photoTitle;photoViewer.querySelector('[data-photo-count]').textContent=`${photoIndex+1} / ${photoLinks.length}`;prev.disabled=photoIndex===0;next.disabled=photoIndex===photoLinks.length-1;}
 function move(step){const index=photoIndex+step;if(index>=0&&index<photoLinks.length){photoIndex=index;showPhoto();}}
 document.querySelectorAll('.photo-link').forEach(link=>link.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();photoTrigger=link;photoLinks=[...document.querySelectorAll('.photo-link')].filter(item=>item.dataset.photoGroup===link.dataset.photoGroup);photoIndex=photoLinks.indexOf(link);showPhoto();photoViewer.showModal();photoViewer.querySelector('[data-photo-close]').focus();}));
 prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));photoViewer.querySelector('[data-photo-close]').addEventListener('click',()=>photoViewer.close());
 photoViewer.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}if(event.key==='ArrowRight'){event.preventDefault();move(1);}});
 photoViewer.addEventListener('click',event=>{if(event.target!==photoViewer)return;const bounds=photoViewer.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)photoViewer.close();});
 photoViewer.addEventListener('close',()=>{image.removeAttribute('src');if(photoTrigger)photoTrigger.focus({preventScroll:true});});
}
