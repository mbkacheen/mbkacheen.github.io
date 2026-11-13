"use strict";

const naturalPitches = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const letters = Object.keys(naturalPitches);
const spellings = [
  ["C"], ["C♯", "D♭"], ["D"], ["D♯", "E♭"], ["E"], ["F"],
  ["F♯", "G♭"], ["G"], ["G♯", "A♭"], ["A"], ["A♯", "B♭"], ["B"],
];
const tuning = [64, 59, 55, 50, 45, 40];
const intervalDegrees = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7];
const lastFret = 22;
const exerciseTypes = document.querySelector("#exercise-types");
const exerciseOptions = [...exerciseTypes.querySelectorAll("button")];
const practicePage = document.querySelector("#practice-page");
const learnPage = document.querySelector("#learn-page");
const openPractice = document.querySelector("#open-practice");
const openPlay = document.querySelector("#open-play");
const openLearn = document.querySelector("#open-learn");
const prompt = document.querySelector(".prompt");
const shortcut = document.querySelector("#practice-shortcut");
const speed = document.querySelector("#speed");
const timedSettings = document.querySelectorAll("[data-timed]");
const answerTime = document.querySelector("#answer-time");
const answerView = document.querySelector("#answer-view");
const sound = document.querySelector("#sound");
const toneSelect = document.querySelector("#tone");
const soundStatus = document.querySelector("#sound-status");
const settings = document.querySelector("#settings");
const toggle = document.querySelector("#toggle");
const advance = document.querySelector("#advance");
const promptContent = document.querySelector(".prompt-content");
const promptLabel = document.querySelector("#prompt-label");
const noteDisplay = document.querySelector("#note");
const instruction = document.querySelector("#instruction");
const answer = document.querySelector("#answer");
const answerNote = document.querySelector("#answer-note");
const intervalAnswer = document.querySelector("#interval-answer");
const answerExamples = document.querySelector("#answer-examples");
const fretboard = document.querySelector("#fretboard");
const fretboardScroll = document.querySelector(".fretboard-scroll");
const countdown = document.querySelector("#countdown");
const seconds = document.querySelector("#seconds");
const bar = document.querySelector("#bar");

let note = "";
let rootClass = -1;
let round;
let timed = false;
let duration = 0;
let deadline = 0;
let roundTimer;
let animation;
let audioContext;
let practiceOutput;
let cueOutput;

const cueDelay = 1;
const noteSpacing = 0.55;
const noteLength = 0.42;
const minimumAnswerSeconds = Math.ceil(cueDelay + noteSpacing + noteLength);
const samplePitches = {
  guitar: [48, 52, 56, 60, 64, 69, 72],
  piano: [48, 52, 56, 60, 64, 68, 72],
};
const sampleCache = new Map();
let instrumentSamples;

function buildFretboard(board, maxFret) {
  const frets = Array.from({ length: maxFret + 1 }, (_, fret) => fret);
  board.innerHTML = `<thead><tr><th scope="col" aria-label="String"></th>${
    frets.map(fret => `<th scope="col">${fret}</th>`).join("")
  }</tr></thead><tbody>${
    tuning.map((open, index) => {
      const name = spellings[open % 12][0];
      return `<tr><th scope="row" aria-label="String ${index + 1}, ${name}">${name}</th>${
        frets.map(() => "<td><span></span></td>").join("")
      }</tr>`;
    }).join("")
  }</tbody>`;
  return Array.from(board.querySelectorAll("td"), (cell, index) => {
    const string = Math.floor(index / frets.length) + 1;
    const fret = index % frets.length;
    return { cell, string, fret, pitch: tuning[string - 1] + fret };
  });
}

const positions = buildFretboard(fretboard, lastFret);
const availablePitches = new Set(positions.map(position => position.pitch));

function updateInstruction() {
  if (!round) {
    const hasExercise = exerciseOptions.some(option => option.getAttribute("aria-pressed") === "true");
    toggle.disabled = !hasExercise;
    shortcut.textContent = hasExercise ? "Space to start or stop" : "Choose at least one exercise.";
    instruction.textContent = hasExercise ? "Find the note on the fretboard." : "Choose at least one exercise.";
    return;
  }
  const { semitones, view, string } = round;
  if (string) {
    instruction.textContent = semitones ? `Start on string ${string}.` : `Play on string ${string}.`;
  } else if (answerView.value === "random") {
    instruction.textContent = view === "1" ? "Find 1 position." : `Find ${view} different positions.`;
  } else {
    instruction.textContent = semitones ? "Play up from the root." : "Find the note on the fretboard.";
  }
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function higherNote(semitones, rootNote = note, pitchClass = rootClass) {
  return spellAbove(rootNote, pitchClass, semitones, intervalDegrees[semitones]);
}

function spellAbove(rootNote, pitchClass, semitones, steps) {
  const letter = letters[(letters.indexOf(rootNote[0]) + steps) % letters.length];
  const alteration = (pitchClass + semitones - naturalPitches[letter] + 18) % 12 - 6;
  return letter + (alteration < 0 ? "♭" : "♯").repeat(Math.abs(alteration));
}

function updateSoundSetting() {
  const soundOnAnswer = timed && sound.value === "answer";
  if (soundOnAnswer && Number(answerTime.value) < minimumAnswerSeconds) {
    answerTime.value = answerTime.value === "0" ? "3" : String(minimumAnswerSeconds);
  }
  for (const option of answerTime.options) {
    option.disabled = soundOnAnswer && Number(option.value) < minimumAnswerSeconds;
  }
}

function updateMode() {
  for (const setting of timedSettings) setting.hidden = !timed;
  toggle.textContent = timed ? "Start timed drill" : "Start practice";
  updateSoundSetting();
}

function showSoundStatus(message) {
  soundStatus.textContent = message;
  soundStatus.hidden = false;
}

function loadSamples(instrument) {
  if (!sampleCache.has(instrument)) {
    const loading = Promise.all(samplePitches[instrument].map(async pitch => {
      const response = await fetch(`samples/${instrument}-${pitch}.wav`, {
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error(`Sample download failed: ${response.status}`);
      return { pitch, buffer: await audioContext.decodeAudioData(await response.arrayBuffer()) };
    })).catch(error => {
      sampleCache.delete(instrument);
      throw error;
    });
    sampleCache.set(instrument, loading);
  }
  return sampleCache.get(instrument);
}

function playSample(pitch, onset) {
  const sample = instrumentSamples.reduce((closest, candidate) =>
    Math.abs(candidate.pitch - pitch) < Math.abs(closest.pitch - pitch) ? candidate : closest);
  const source = audioContext.createBufferSource();
  const envelope = audioContext.createGain();
  source.buffer = sample.buffer;
  source.playbackRate.value = 2 ** ((pitch - sample.pitch) / 12);
  envelope.gain.setValueAtTime(0.001, onset);
  envelope.gain.linearRampToValueAtTime(1.8, onset + 0.005);
  envelope.gain.setValueAtTime(1.8, onset + 0.33);
  envelope.gain.linearRampToValueAtTime(0, onset + noteLength);
  source.connect(envelope);
  envelope.connect(cueOutput);
  source.onended = () => {
    source.disconnect();
    envelope.disconnect();
  };
  source.start(onset);
  source.stop(onset + noteLength);
}

function playSynth(pitch, onset, output = cueOutput) {
  const oscillator = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const envelope = audioContext.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.value = 440 * 2 ** ((pitch - 69) / 12);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2200, onset);
  filter.frequency.exponentialRampToValueAtTime(700, onset + noteLength);
  envelope.gain.setValueAtTime(0.001, onset);
  envelope.gain.linearRampToValueAtTime(0.16, onset + 0.035);
  envelope.gain.exponentialRampToValueAtTime(0.001, onset + noteLength);
  oscillator.connect(filter);
  filter.connect(envelope);
  envelope.connect(output);
  oscillator.onended = () => {
    oscillator.disconnect();
    filter.disconnect();
    envelope.disconnect();
  };
  oscillator.start(onset);
  oscillator.stop(onset + noteLength);
}

function playCue(phase) {
  cueOutput?.disconnect();
  cueOutput = undefined;
  if (sound.value !== phase || !practiceOutput) return;
  cueOutput = audioContext.createGain();
  cueOutput.connect(practiceOutput);
  const { semitones } = round;
  const rootPitch = 48 + rootClass;
  const pitches = semitones ? [rootPitch, rootPitch + semitones] : [rootPitch];
  const startTime = audioContext.currentTime + cueDelay;
  for (const [index, pitch] of pitches.entries()) {
    const onset = startTime + index * noteSpacing;
    if (instrumentSamples) playSample(pitch, onset);
    else playSynth(pitch, onset);
  }
}

function updateCountdown() {
  const remaining = Math.max(0, deadline - performance.now());
  seconds.textContent = `${Math.ceil(remaining / 1000)}s`;
  bar.style.transform = `scaleX(${remaining / duration})`;
  if (remaining > 0) animation = requestAnimationFrame(updateCountdown);
}

function startTimer(milliseconds, onElapsed) {
  duration = milliseconds;
  deadline = performance.now() + duration;
  cancelAnimationFrame(animation);
  updateCountdown();
  roundTimer = setTimeout(onElapsed, duration);
}

function nextRound() {
  answer.hidden = true;
  const exercise = randomItem(exerciseOptions.filter(option => option.getAttribute("aria-pressed") === "true"));
  const semitones = Number(exercise.value);
  let view = answerView.value;
  if (view === "random") {
    const number = Math.floor(Math.random() * tuning.length) + 1;
    view = Math.random() < 0.5 ? `string-${number}` : String(number);
  }
  const string = view.startsWith("string-") ? Number(view.slice(7)) : 0;
  round = { semitones, view, string };
  const choices = [...new Set(playableRoots().map(position => position.pitch % 12))]
    .filter(pitch => pitch !== rootClass);
  rootClass = randomItem(choices);
  note = randomItem(spellings[rootClass]);
  promptLabel.textContent = exercise.textContent.trim();
  updateInstruction();
  noteDisplay.textContent = note;
  noteDisplay.removeAttribute("aria-hidden");
  promptContent.hidden = false;

  if (timed) {
    const reveal = Number(answerTime.value) ? showAnswer : nextRound;
    startTimer(Number(speed.value) * 1000, reveal);
  } else {
    advance.textContent = "Show answer";
    advance.hidden = false;
  }
  playCue("play");
}

function playableRoots() {
  const { semitones, string } = round;
  return positions.filter(position =>
    (!string || position.string === string) && availablePitches.has(position.pitch + semitones));
}

function showAnswer() {
  displayAnswer();
  if (timed) {
    startTimer(Number(answerTime.value) * 1000, nextRound);
  } else {
    advance.textContent = "Next prompt";
  }
  playCue("answer");
}

function displayAnswer() {
  promptContent.hidden = true;
  const { semitones, string, view } = round;
  answerNote.textContent = semitones ? `${note} → ${higherNote(semitones)}` : note;
  intervalAnswer.hidden = !semitones;
  const roots = playableRoots().filter(position => position.pitch % 12 === rootClass);
  const showExamples = !string && view !== "all";
  const examples = showExamples ? selectExamples(roots, semitones, Number(view)) : [];
  answerExamples.hidden = !showExamples;
  answerExamples.replaceChildren(...examples.map(({ root, upper }) => {
    const item = document.createElement("li");
    item.textContent = upper ? `${positionLabel(root)} → ${positionLabel(upper)}` : positionLabel(root);
    return item;
  }));
  renderAnswer(roots, examples, semitones, showExamples);
  answer.hidden = false;
  fretboardScroll.scrollLeft = 0;
}

function selectExamples(roots, semitones, count) {
  const byFret = roots.slice().sort((a, b) => a.fret - b.fret || b.string - a.string);
  const firstOnString = new Set(tuning.map((_, index) => byFret.find(root => root.string === index + 1)));
  const orderedRoots = [...byFret.filter(root => firstOnString.has(root)), ...byFret.filter(root => !firstOnString.has(root))];
  return orderedRoots.slice(0, count).map(root => {
    if (!semitones) return { root };
    const higher = positions.filter(position => position.pitch === root.pitch + semitones)
      .sort((a, b) => Math.abs(a.fret - root.fret) - Math.abs(b.fret - root.fret));
    return { root, upper: higher[0] };
  });
}

function positionLabel({ string, fret }) {
  return `String ${string}, ${fret === 0 ? "open" : `fret ${fret}`}`;
}

function renderAnswer(roots, examples, semitones, showExamples) {
  const upperName = higherNote(semitones);
  const visibleRoots = showExamples ? examples.map(example => example.root) : roots;
  const rootSet = new Set(visibleRoots);
  const upperSet = new Set(examples.map(example => example.upper));
  const upperPitches = new Set(visibleRoots.map(position => position.pitch + semitones));
  for (const position of positions) {
    const { cell, pitch } = position;
    const root = rootSet.has(position);
    const upper = semitones > 0 && (showExamples ? upperSet.has(position) : upperPitches.has(pitch));
    cell.classList.toggle("match", root || upper);
    cell.classList.toggle("upper", upper);
    cell.classList.toggle("root", root);
    cell.firstElementChild.textContent = root ? note : upper ? upperName : "";
    if (root && upper) cell.setAttribute("aria-label", `${note}, root or higher note`);
    else cell.removeAttribute("aria-label");
  }
}

async function start() {
  prompt.hidden = false;
  soundStatus.hidden = true;
  settings.disabled = true;
  toggle.classList.add("running");
  toggle.textContent = timed ? "Stop drill" : "Stop practice";
  if (sound.value !== "off") {
    let output;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      audioContext ??= new Audio();
      output = audioContext.createGain();
      output.connect(audioContext.destination);
      practiceOutput = output;
      const instrument = toneSelect.value;
      instrumentSamples = undefined;
      // Resume from the Start button gesture before waiting for recordings.
      const resume = audioContext.resume();
      if (instrument !== "synth") {
        showSoundStatus("Loading instrument sounds…");
        const [, samples] = await Promise.all([resume, loadSamples(instrument).catch(() => null)]);
        if (practiceOutput !== output) return;
        instrumentSamples = samples;
        if (!samples) showSoundStatus("The instrument recording could not load. Using Synth for this session.");
        else soundStatus.hidden = true;
      } else {
        await resume;
      }
      if (practiceOutput !== output) return;
    } catch {
      if (output && practiceOutput !== output) return;
      output?.disconnect();
      practiceOutput = undefined;
      showSoundStatus("Sound could not load. Practice will continue silently.");
    }
  }
  countdown.hidden = !timed;
  nextRound();
}

function stop() {
  clearTimeout(roundTimer);
  cancelAnimationFrame(animation);
  cueOutput?.disconnect();
  cueOutput = undefined;
  practiceOutput?.disconnect();
  practiceOutput = undefined;
  soundStatus.hidden = true;
  countdown.hidden = true;
  advance.hidden = true;
  prompt.hidden = true;
  answer.hidden = true;
  promptContent.hidden = false;
  settings.disabled = false;
  toggle.classList.remove("running");
  updateMode();
  promptLabel.textContent = "Ready";
  noteDisplay.textContent = "–";
  noteDisplay.setAttribute("aria-hidden", "true");
  round = undefined;
  updateInstruction();
}

for (const option of exerciseOptions) {
  option.addEventListener("click", () => {
    option.setAttribute("aria-pressed", String(option.getAttribute("aria-pressed") !== "true"));
    updateInstruction();
  });
}
sound.addEventListener("change", updateSoundSetting);
advance.addEventListener("click", () => {
  if (answer.hidden) showAnswer();
  else nextRound();
});
toggle.addEventListener("click", () => {
  if (settings.disabled) stop();
  else start();
});
document.addEventListener("keydown", event => {
  if (practicePage.hidden || event.code !== "Space" || event.defaultPrevented || event.isComposing ||
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const target = event.target;
  if (target instanceof Element && target !== toggle &&
      (target.isContentEditable || target.closest("input, select, textarea, button, a, summary"))) return;
  event.preventDefault();
  if (!event.repeat) toggle.click();
});
updateInstruction();
updateMode();

const intervalChoices = document.querySelector("#learn-intervals");
const scaleChoices = document.querySelector("#learn-scales");
const exploreIntervals = document.querySelector("#explore-intervals");
const exploreScales = document.querySelector("#explore-scales");
const intervalIntro = document.querySelector("#interval-intro");
const scaleIntro = document.querySelector("#scale-intro");
const otherNotes = document.querySelector("#learn-other-notes");
const learnName = document.querySelector("#learn-interval-name");
const learnDistance = document.querySelector("#learn-distance");
const learnExplanation = document.querySelector("#learn-explanation");
const learnPairs = document.querySelector("#learn-pairs");
const learnRoot = document.querySelector("#learn-root");
const hearInterval = document.querySelector("#hear-interval");
const learnSoundStatus = document.querySelector("#learn-sound-status");
const learnPositions = buildFretboard(document.querySelector("#learn-fretboard"), lastFret);
const intervalNames = exerciseOptions.map(option => ({
  semitones: Number(option.value),
  name: option.textContent.trim(),
})).filter(interval => interval.semitones).sort((a, b) => a.semitones - b.semitones);
const learnButtons = [];
const scales = [
  { name: "Major (Ionian)", offsets: [0, 2, 4, 5, 7, 9, 11] },
  { name: "Dorian", offsets: [0, 2, 3, 5, 7, 9, 10] },
  { name: "Phrygian", offsets: [0, 1, 3, 5, 7, 8, 10] },
  { name: "Lydian", offsets: [0, 2, 4, 6, 7, 9, 11] },
  { name: "Mixolydian", offsets: [0, 2, 4, 5, 7, 9, 10] },
  { name: "Natural minor (Aeolian)", offsets: [0, 2, 3, 5, 7, 8, 10] },
  { name: "Locrian", offsets: [0, 1, 3, 5, 6, 8, 10] },
  { name: "Harmonic minor", offsets: [0, 2, 3, 5, 7, 8, 11] },
  { name: "Melodic minor (ascending)", offsets: [0, 2, 3, 5, 7, 9, 11] },
  { name: "Major pentatonic", offsets: [0, 2, 4, 7, 9], steps: [0, 1, 2, 4, 5] },
  { name: "Minor pentatonic", offsets: [0, 3, 5, 7, 10], steps: [0, 2, 3, 4, 6] },
  { name: "Minor blues", offsets: [0, 3, 5, 6, 7, 10], steps: [0, 2, 3, 4, 4, 6] },
];
const scaleButtons = [];
let lesson;
let scale = scales[0];
let exploringScales = false;
let lessonOutput;

for (const [pitchClass, names] of spellings.entries()) {
  for (const name of names) {
    const option = new Option(name, name);
    option.dataset.pitchClass = String(pitchClass);
    learnRoot.add(option);
  }
}
learnRoot.value = "E";

function stopLessonAudio() {
  lessonOutput?.disconnect();
  lessonOutput = undefined;
}

function openPage(page) {
  const learn = page === "learn";
  const nextTimed = page === "play";
  if (settings.disabled && (learn || nextTimed !== timed)) stop();
  timed = nextTimed;
  if (!settings.disabled) updateMode();
  stopLessonAudio();
  learnPage.hidden = !learn;
  practicePage.hidden = learn;
  openPractice.setAttribute("aria-pressed", String(page === "practice"));
  openPlay.setAttribute("aria-pressed", String(nextTimed));
  openLearn.setAttribute("aria-pressed", String(learn));
  learnSoundStatus.hidden = true;
}

function selectLesson(interval) {
  stopLessonAudio();
  lesson = interval;
  const { semitones, name } = interval;
  const rootNote = learnRoot.value;
  const pitchClass = Number(learnRoot.selectedOptions[0].dataset.pitchClass);
  const upper = higherNote(semitones, rootNote, pitchClass);
  const rootPitches = [...availablePitches].filter(pitch =>
    pitch % 12 === pitchClass && availablePitches.has(pitch + semitones)).sort((a, b) => a - b);
  const upperPitches = new Set(rootPitches.map(pitch => pitch + semitones));
  const rootSet = new Set(rootPitches);
  const pitchLabel = (spelling, pitch) => {
    const accidental = spelling.slice(1);
    const alteration = accidental.startsWith("♭") ? -accidental.length : accidental.length;
    return `${spelling}${Math.floor((pitch - alteration) / 12) - 1}`;
  };
  learnName.textContent = name;
  learnDistance.textContent = semitones === 1 ? "1 semitone" : `${semitones} semitones`;
  learnExplanation.textContent = `Play ${rootNote}, then ${upper} above it. Every matching position is marked, including across strings.`;
  learnPairs.textContent = "Pair by octave · " + rootPitches.map(pitch =>
    `${pitchLabel(rootNote, pitch)} → ${pitchLabel(upper, pitch + semitones)}`).join(" · ");
  learnSoundStatus.hidden = true;
  for (const button of learnButtons) {
    button.setAttribute("aria-pressed", String(Number(button.value) === semitones));
  }
  for (const { cell, pitch } of learnPositions) {
    const root = rootSet.has(pitch);
    const higher = upperPitches.has(pitch);
    cell.classList.toggle("match", root || higher);
    cell.classList.toggle("root", root);
    cell.classList.toggle("upper", higher);
    cell.firstElementChild.textContent = root ? pitchLabel(rootNote, pitch) : higher ? pitchLabel(upper, pitch) : "";
  }
}

function selectScale(nextScale) {
  stopLessonAudio();
  scale = nextScale;
  const rootNote = learnRoot.value;
  const pitchClass = Number(learnRoot.selectedOptions[0].dataset.pitchClass);
  const scaleNotes = scale.offsets.map((offset, index) =>
    spellAbove(rootNote, pitchClass, offset, scale.steps?.[index] ?? index));
  const namesByPitch = new Map(scale.offsets.map((offset, index) =>
    [(pitchClass + offset) % 12, scaleNotes[index]]));
  const steps = [...scale.offsets.slice(1), 12].map((offset, index) => offset - scale.offsets[index]);
  learnName.textContent = `${rootNote} ${scale.name}`;
  learnDistance.textContent = `${scaleNotes.length} notes per octave`;
  learnExplanation.textContent = [...scaleNotes, rootNote].join(" → ");
  learnPairs.textContent = `Steps in semitones · ${steps.join(" · ")}`;
  learnSoundStatus.hidden = true;
  for (const button of scaleButtons) {
    button.setAttribute("aria-pressed", String(button.textContent === scale.name));
  }
  for (const { cell, pitch } of learnPositions) {
    const name = namesByPitch.get(pitch % 12);
    const root = pitch % 12 === pitchClass;
    cell.classList.toggle("match", Boolean(name));
    cell.classList.toggle("root", root);
    cell.classList.toggle("upper", Boolean(name) && !root);
    cell.firstElementChild.textContent = name ?? "";
  }
}

function openExplorer(showScales) {
  exploringScales = showScales;
  exploreIntervals.setAttribute("aria-pressed", String(!showScales));
  exploreScales.setAttribute("aria-pressed", String(showScales));
  intervalIntro.hidden = intervalChoices.hidden = showScales;
  scaleIntro.hidden = scaleChoices.hidden = !showScales;
  hearInterval.textContent = showScales ? "Hear scale" : "Hear interval";
  otherNotes.textContent = showScales ? "Other scale notes" : "Higher note";
  if (showScales) selectScale(scale);
  else selectLesson(lesson);
}

for (const interval of intervalNames) {
  const button = document.createElement("button");
  button.type = "button";
  button.value = String(interval.semitones);
  button.textContent = interval.name;
  button.addEventListener("click", () => selectLesson(interval));
  learnButtons.push(button);
  intervalChoices.append(button);
}

for (const item of scales) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = item.name;
  button.addEventListener("click", () => selectScale(item));
  scaleButtons.push(button);
  scaleChoices.append(button);
}

hearInterval.addEventListener("click", async () => {
  stopLessonAudio();
  learnSoundStatus.hidden = true;
  let output;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    audioContext ??= new Audio();
    output = audioContext.createGain();
    output.connect(audioContext.destination);
    lessonOutput = output;
    await audioContext.resume();
    if (lessonOutput !== output) return;
    const onset = audioContext.currentTime + 0.03;
    const pitch = 48 + Number(learnRoot.selectedOptions[0].dataset.pitchClass);
    const offsets = exploringScales ? [...scale.offsets, 12] : [0, lesson.semitones];
    const spacing = exploringScales ? 0.46 : noteSpacing;
    offsets.forEach((offset, index) => playSynth(pitch + offset, onset + index * spacing, output));
  } catch {
    if (output && lessonOutput !== output) return;
    stopLessonAudio();
    learnSoundStatus.textContent = "Audio is unavailable in this browser.";
    learnSoundStatus.hidden = false;
  }
});

learnRoot.addEventListener("change", () => openExplorer(exploringScales));
exploreIntervals.addEventListener("click", () => openExplorer(false));
exploreScales.addEventListener("click", () => openExplorer(true));
openPractice.addEventListener("click", () => openPage("practice"));
openPlay.addEventListener("click", () => openPage("play"));
openLearn.addEventListener("click", () => openPage("learn"));
selectLesson(intervalNames.find(interval => interval.semitones === 7));
