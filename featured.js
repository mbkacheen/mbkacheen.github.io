'use strict';
(() => {
 const carousel=document.querySelector('.featured-carousel');
 if(!carousel)return;
 const slides=[
  {
    "src": "assets/jovita.jpg",
    "alt": "Interviu su Jovita Jankelaityte",
    "href": "https://www.youtube.com/watch?v=kCEm475it4I",
    "video": "kCEm475it4I",
    "title": "Aktorė Jovita Jankelaitytė — YESLI"
  },
  {
    "src": "assets/foto-gimtadienis-virselis.webp",
    "alt": "Gimtadienio šventė",
    "href": "fotografija.html#album-gimtadienis",
    "title": "Gimtadienio šventė"
  },
  {
    "src": "assets/sokis.jpg",
    "alt": "Šimtadienio solo šokis",
    "href": "https://www.youtube.com/watch?v=fU6kw7A7zWc",
    "video": "fU6kw7A7zWc",
    "title": "Šimtadienio solo šokis"
  },
  {
    "src": "assets/foto-pasirodymas-bare-virselis.webp",
    "alt": "Pasirodymas bare",
    "href": "fotografija.html#album-pasirodymas-bare",
    "title": "Pasirodymas bare"
  },
  {
    "src": "assets/julija.jpg",
    "alt": "Interviu su Julija Koženevska",
    "href": "https://www.youtube.com/watch?v=eyl1jXE_4JM",
    "video": "eyl1jXE_4JM",
    "title": "Julija Koženevska — YESLI"
  },
  {
    "src": "assets/foto-lankininku-varzybos-virselis.webp",
    "alt": "Lankininkų varžybos",
    "href": "fotografija.html#album-lankininku-varzybos",
    "title": "Lankininkų varžybos"
  },
  {
    "src": "assets/ferma.jpg",
    "alt": "Svajonių ūkis Lietuvoje",
    "href": "https://www.youtube.com/watch?v=Pv9Cp9Azm8Y",
    "video": "Pv9Cp9Azm8Y",
    "title": "Svajonių ūkis Lietuvoje — YESLI"
  }
];
 const link=carousel.querySelector('.hero-film');
 const image=link.querySelector('img');
 const caption=link.querySelector('.film-caption span');
 const controls=carousel.querySelector('.featured-controls');
 const dots=carousel.querySelector('.featured-dots');
 const toggle=carousel.querySelector('.featured-toggle');
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
 let current=0,playing=!reducedMotion.matches,timer;
 function reflect(){toggle.textContent=playing?'Pristabdyti':'Paleisti';toggle.setAttribute('aria-label',playing?'Pristabdyti automatinį darbų keitimą':'Paleisti automatinį darbų keitimą');}
 function show(index){
  current=index;
  const slide=slides[index];
  image.src=slide.src;image.alt=slide.alt;
  link.href=slide.href;link.dataset.title=slide.title;
  if(slide.video)link.dataset.video=slide.video;else delete link.dataset.video;
  const label=slide.video?'Žiūrėti projektą':'Peržiūrėti albumą';
  caption.textContent=label;link.setAttribute('aria-label',`${label}: ${slide.title}`);
  [...dots.children].forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  const preload=new Image();preload.src=slides[(index+1)%slides.length].src;
 }
 function schedule(){clearInterval(timer);timer=setInterval(()=>{
  const focusWithin=carousel.contains(document.activeElement)&&document.activeElement!==toggle;
  if(!playing||document.hidden||carousel.matches(':hover')||focusWithin||document.querySelector('dialog[open]'))return;
  show((current+1)%slides.length);
 },6000);}
 slides.forEach((slide,index)=>{const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Rodyti darbą: ${slide.title}`);button.setAttribute('aria-pressed',String(index===0));button.addEventListener('click',()=>{show(index);schedule();});dots.append(button);});
 toggle.addEventListener('click',()=>{playing=!playing;reflect();schedule();});
 reducedMotion.addEventListener('change',event=>{if(event.matches){playing=false;reflect();}});
 controls.hidden=false;show(0);reflect();schedule();
})();
