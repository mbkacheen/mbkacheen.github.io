'use strict';
(() => {
 const carousel=document.querySelector('.featured-carousel');
 if(!carousel)return;
 const slides=[
  {
    "alt": "Interviu su Jovita Jankelaityte",
    "href": "https://www.youtube.com/watch?v=kCEm475it4I",
    "video": "kCEm475it4I",
    "title": "Aktorė Jovita Jankelaitytė — YESLI",
    "caption": "Jovita Jankelaitytė / YESLI"
  },
  {
    "src": "assets/foto-lankininku-varzybos-virselis.webp",
    "alt": "Lankininkų varžybos",
    "href": "fotografija.html#album-lankininku-varzybos",
    "title": "Lankininkų varžybos",
    "fit": "cover"
  },
  {
    "alt": "Šimtadienio solo šokis",
    "href": "https://www.youtube.com/watch?v=fU6kw7A7zWc",
    "video": "fU6kw7A7zWc",
    "title": "Šimtadienio solo šokis",
    "caption": "Šimtadienio solo šokis / SJSG"
  },
  {
    "src": "assets/foto-pasirodymas-bare-virselis.webp",
    "alt": "Pasirodymas bare",
    "href": "fotografija.html#album-pasirodymas-bare",
    "title": "Pasirodymas bare",
    "fit": "cover"
  },
  {
    "alt": "Interviu su Julija Koženevska",
    "href": "https://www.youtube.com/watch?v=eyl1jXE_4JM",
    "video": "eyl1jXE_4JM",
    "title": "Julija Koženevska — YESLI",
    "caption": "Julija Koženevska / YESLI"
  },
  {
    "alt": "Svajonių ūkis Lietuvoje",
    "href": "https://www.youtube.com/watch?v=Pv9Cp9Azm8Y",
    "video": "Pv9Cp9Azm8Y",
    "title": "Svajonių ūkis Lietuvoje — YESLI",
    "caption": "Svajonių ūkis Lietuvoje / YESLI"
  }
];
 const link=carousel.querySelector('.hero-film');
 const image=link.querySelector('img');
 const frame=link.querySelector('.featured-frame');
 const title=link.querySelector('.preview-slide-title');
 const caption=link.querySelector('.preview-slide-action');
 const controls=carousel.querySelector('.featured-controls');
 const dots=carousel.querySelector('.featured-dots');
 const toggle=carousel.querySelector('.featured-toggle');
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
 let current=0,playing=!reducedMotion.matches,timer,requestNumber=0,outgoing;
 function finishTransition(){frame.getAnimations({subtree:true}).forEach(animation=>animation.cancel());if(outgoing){outgoing.remove();outgoing=null;}}
 function reflect(){toggle.textContent=playing?'Pristabdyti':'Paleisti';toggle.setAttribute('aria-label',playing?'Pristabdyti automatinį darbų keitimą':'Paleisti automatinį darbų keitimą');}
 async function show(index,animate=true){
  const request=++requestNumber;
  const slide=slides[index];
  let source;
  if (slide.video) {
    source = await getYouTubeThumbnail(slide.video);
  } else {
    const ready = new Image();
    ready.src = slide.src;
    try { await ready.decode(); } catch { return; }
    source = slide.src;
  }
  if(request!==requestNumber)return;
  finishTransition();
  const shouldAnimate=animate&&index!==current&&!reducedMotion.matches;
  if(shouldAnimate){outgoing=image.cloneNode();outgoing.className='featured-outgoing';outgoing.alt='';outgoing.setAttribute('aria-hidden','true');outgoing.removeAttribute('fetchpriority');frame.append(outgoing);}
  current=index;
  if (source) image.src = source;
  else image.removeAttribute('src');
  image.style.visibility = source ? '' : 'hidden';
  image.alt=slide.alt;image.style.objectFit=slide.fit||'contain';
  link.href=slide.href;link.dataset.title=slide.title;
  if(slide.video)link.dataset.video=slide.video;else delete link.dataset.video;
  const label=slide.video?'Žiūrėti projektą':'Peržiūrėti albumą';
  title.textContent=slide.caption||slide.title;
  caption.textContent=label;link.setAttribute('aria-label',`${label}: ${slide.title}`);
  [...dots.children].forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  if(shouldAnimate){
   const options={duration:650,easing:'cubic-bezier(.22,.61,.36,1)'};
   image.animate([{transform:'translateX(100%)'},{transform:'translateX(0)'}],options);
   const old=outgoing;
   old.animate([{transform:'translateX(0)'},{transform:'translateX(-100%)'}],options).finished.then(()=>{old.remove();if(outgoing===old)outgoing=null;}).catch(()=>{});
  }
 }
 function schedule(){clearInterval(timer);timer=setInterval(()=>{
  const focusWithin=carousel.contains(document.activeElement)&&document.activeElement!==toggle;
  if(!playing||document.hidden||carousel.matches(':hover')||focusWithin||document.querySelector('dialog[open]'))return;
  show((current+1)%slides.length);
 },6000);}
 slides.forEach((slide,index)=>{const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Rodyti darbą: ${slide.title}`);button.setAttribute('aria-pressed',String(index===0));button.addEventListener('click',()=>{show(index);schedule();});dots.append(button);});
 toggle.addEventListener('click',()=>{playing=!playing;reflect();schedule();});
 reducedMotion.addEventListener('change',event=>{if(event.matches){playing=false;finishTransition();reflect();}});
 controls.hidden=false;show(0,false);reflect();schedule();
})();
