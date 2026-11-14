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
const intervalOptions = [...exerciseTypes.querySelectorAll("button[value]")];
const drillChordChoices = document.querySelector("#drill-chords");
const chordOptions = new Map();
const randomIntervals = document.querySelector("#random-intervals");
const randomChords = document.querySelector("#random-chords");
const speedrun = document.querySelector("#speedrun");
const presetModes = [randomIntervals, randomChords, speedrun];
const intervalCount = document.querySelector("#interval-count");
const chordCount = document.querySelector("#chord-count");
const positionsHint = document.querySelector("#positions-hint");
const practicePage = document.querySelector("#practice-page");
const learnPage = document.querySelector("#learn-page");
const openPractice = document.querySelector("#open-practice");
const openMetronome = document.querySelector("#open-metronome");
const metronomePage = document.querySelector("#metronome-page");
const metronomeToggle = document.querySelector("#metronome-toggle");
const openPlay = document.querySelector("#open-play");
const openLearn = document.querySelector("#open-learn");
const prompt = document.querySelector(".prompt");
const shortcut = document.querySelector("#practice-shortcut");
const speed = document.querySelector("#speed");
const standardSettings = document.querySelectorAll("[data-standard-setting]");
const speedrunTimeSetting = document.querySelector("#speedrun-time-setting");
const speedrunTime = document.querySelector("#speedrun-time");
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
const positionAnswer = document.querySelector("#position-answer");
const chordAnswer = document.querySelector("#chord-answer");
const drillChordDiagram = chordAnswer.querySelector(".chord-diagram");
const fretboard = document.querySelector("#fretboard");
const fretboardScroll = document.querySelector(".fretboard-scroll");
const countdown = document.querySelector("#countdown");
const seconds = document.querySelector("#seconds");
const bar = document.querySelector("#bar");

let note = "";
let rootClass = -1;
let round;
let timed = true;
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
  const singleMarkers = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
  board.innerHTML = `<thead><tr><th scope="col" aria-label="String"></th>${
    frets.map(fret => `<th scope="col">${fret}</th>`).join("")
  }</tr></thead><tbody>${
    tuning.map((open, index) => {
      const name = spellings[open % 12][0];
      return `<tr><th scope="row" aria-label="String ${index + 1}, ${name}">${name}</th>${
        frets.map(fret => {
          const singleDot = index === 2 && singleMarkers.has(fret);
          const doubleDot = fret === 12 && (index === 1 || index === 3);
          const marker = singleDot || doubleDot ? ' class="fret-marker"' : "";
          return `<td${marker}><span></span></td>`;
        }).join("")
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
    const exercises = selectedExercises();
    const hasExercise = exercises.length > 0;
    toggle.disabled = !hasExercise;
    positionsHint.hidden = !exercises.some(option => chordOptions.has(option));
    shortcut.textContent = !hasExercise ? "Choose at least one exercise."
      : timed || isPressed(speedrun) ? "Space to start or stop" : "Space to start, show the answer, or advance";
    instruction.textContent = hasExercise ? "Find the note on the fretboard." : "Choose at least one exercise.";
    return;
  }
  const { semitones, count, string } = round;
  if (round.chord) {
    instruction.textContent = "Play one guitar shape for this chord.";
  } else if (string) {
    instruction.textContent = semitones ? `Start on string ${string}.` : `Play on string ${string}.`;
  } else {
    instruction.textContent = count === 1 ? "Find 1 position." : `Find ${count} different positions.`;
  }
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function selectedExercises() {
  if (isPressed(speedrun)) return [speedrun];
  if (isPressed(randomIntervals)) return intervalOptions.filter(option => Number(option.value) > 0);
  if (isPressed(randomChords)) return [...chordOptions.keys()];
  return [...intervalOptions, ...chordOptions.keys()].filter(isPressed);
}

function isPressed(button) {
  return button.getAttribute("aria-pressed") === "true";
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
  const speedrunActive = isPressed(speedrun);
  speedrunTimeSetting.hidden = !speedrunActive;
  for (const setting of standardSettings) {
    setting.hidden = speedrunActive || (!timed && setting.hasAttribute("data-timed"));
  }
  toggle.textContent = speedrunActive ? "Start speedrun" : timed ? "Start timed drill" : "Start practice";
  if (!speedrunActive) updateSoundSetting();
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

function playSample(pitch, onset, samples = instrumentSamples, output = cueOutput) {
  const sample = samples.reduce((closest, candidate) =>
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
  envelope.connect(output);
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
  const speedrunActive = isPressed(speedrun);
  if ((speedrunActive ? "play" : sound.value) !== phase || !practiceOutput) return;
  cueOutput = audioContext.createGain();
  cueOutput.connect(practiceOutput);
  const startTime = audioContext.currentTime + (speedrunActive ? 0 : cueDelay);
  if (round.chord) {
    playChord(round.frets, startTime, instrumentSamples, cueOutput);
    return;
  }
  const { semitones } = round;
  const rootPitch = 48 + rootClass;
  const pitches = semitones ? [rootPitch, rootPitch + semitones] : [rootPitch];
  for (const [index, pitch] of pitches.entries()) {
    const onset = startTime + index * noteSpacing;
    if (instrumentSamples) playSample(pitch, onset);
    else playSynth(pitch, onset);
  }
}

function playChord(frets, onset, samples, output) {
  output.gain.value = 0.45;
  const pitches = frets.flatMap((fret, index) =>
    fret === null ? [] : [stringsLowToHigh[index] + fret]);
  pitches.forEach((pitch, index) => {
    const at = onset + index * 0.028;
    if (samples) playSample(pitch, at, samples, output);
    else playSynth(pitch, at, output);
  });
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
  const exercise = randomItem(selectedExercises());
  const speedrunActive = exercise === speedrun;
  const nextChord = chordOptions.get(exercise);
  if (speedrunActive) {
    const choices = spellings.map((_, pitch) => pitch).filter(pitch => pitch !== rootClass);
    rootClass = randomItem(choices);
    round = { semitones: 0, count: 1, string: 0 };
  } else if (nextChord) {
    const choices = spellings.map((_, pitch) => pitch).filter(pitch => pitch !== rootClass);
    rootClass = randomItem(choices);
    round = { chord: nextChord, frets: getChordVoicings(nextChord, rootClass)[0].frets };
  } else {
    const semitones = Number(exercise.value);
    const string = answerView.value.startsWith("string-") ? Number(answerView.value.slice(7)) : 0;
    const maxPositions = timed ? 3 : 4;
    const count = Math.floor(Math.random() * maxPositions) + 1;
    round = { semitones, count, string };
    const choices = [...new Set(playableRoots().map(position => position.pitch % 12))]
      .filter(pitch => pitch !== rootClass);
    rootClass = randomItem(choices);
  }
  note = randomItem(spellings[rootClass]);
  promptLabel.textContent = exercise.textContent.trim();
  updateInstruction();
  noteDisplay.textContent = note;
  noteDisplay.removeAttribute("aria-hidden");
  promptContent.hidden = false;

  if (speedrunActive) {
    startTimer(Number(speedrunTime.value) * 1000, nextRound);
  } else if (timed) {
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
  const { chord, semitones } = round;
  positionAnswer.hidden = Boolean(chord);
  chordAnswer.hidden = !chord;
  if (chord) {
    answerNote.textContent = `${note} ${chord.name.toLowerCase()}`;
    renderChordDiagram(drillChordDiagram, round.frets);
  } else {
    answerNote.textContent = semitones ? `${note} → ${higherNote(semitones)}` : note;
    intervalAnswer.hidden = !semitones;
    const roots = playableRoots().filter(position => position.pitch % 12 === rootClass);
    renderAnswer(roots, semitones);
    fretboardScroll.scrollLeft = 0;
  }
  answer.hidden = false;
}

function renderAnswer(roots, semitones) {
  const upperName = higherNote(semitones);
  const rootSet = new Set(roots);
  const upperPitches = new Set(roots.map(position => position.pitch + semitones));
  for (const position of positions) {
    const { cell, pitch } = position;
    const root = rootSet.has(position);
    const upper = semitones > 0 && upperPitches.has(pitch);
    cell.classList.toggle("match", root || upper);
    cell.classList.toggle("upper", upper);
    cell.classList.toggle("root", root);
    cell.firstElementChild.textContent = root ? note : upper ? upperName : "";
    if (root && upper) cell.setAttribute("aria-label", `${note}, root or higher note`);
    else cell.removeAttribute("aria-label");
  }
}

async function start() {
  const speedrunActive = isPressed(speedrun);
  prompt.hidden = false;
  soundStatus.hidden = true;
  settings.disabled = true;
  toggle.classList.add("running");
  toggle.textContent = speedrunActive ? "Stop speedrun" : timed ? "Stop drill" : "Stop practice";
  if (speedrunActive || sound.value !== "off") {
    let output;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      audioContext ??= new Audio();
      output = audioContext.createGain();
      output.connect(audioContext.destination);
      practiceOutput = output;
      const instrument = speedrunActive ? "guitar" : toneSelect.value;
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
  countdown.hidden = !timed && !speedrunActive;
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

exerciseTypes.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button || settings.disabled) return;
  const manualOptions = [...intervalOptions, ...chordOptions.keys()];
  if (presetModes.includes(button)) {
    for (const mode of presetModes) mode.setAttribute("aria-pressed", String(mode === button));
    for (const option of manualOptions) option.setAttribute("aria-pressed", "false");
  } else if (manualOptions.includes(button)) {
    for (const mode of presetModes) mode.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-pressed", String(!isPressed(button)));
  }
  for (const [options, label] of [[intervalOptions, intervalCount], [[...chordOptions.keys()], chordCount]]) {
    const count = options.filter(isPressed).length;
    label.textContent = count ? ` · ${count} selected` : "";
  }
  updateInstruction();
  updateMode();
});
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
  if (event.code !== "Space" || event.defaultPrevented || event.isComposing ||
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const inDrill = !practicePage.hidden;
  if (!inDrill && metronomePage.hidden) return;
  const target = event.target;
  if (target instanceof Element && (target.isContentEditable ||
      target.closest("input, select, textarea") ||
      (!inDrill && target !== metronomeToggle && target.closest("button, a, summary")))) return;
  event.preventDefault();
  if (event.repeat) return;
  if (!inDrill) metronomeToggle.click();
  else if (timed || isPressed(speedrun) || !settings.disabled) toggle.click();
  else if (!advance.hidden) advance.click();
});
updateInstruction();
updateMode();

const intervalChoices = document.querySelector("#learn-intervals");
const scaleChoices = document.querySelector("#learn-scales");
const exploreIntervals = document.querySelector("#explore-intervals");
const exploreScales = document.querySelector("#explore-scales");
const intervalIntro = document.querySelector("#interval-intro");
const scaleIntro = document.querySelector("#scale-intro");
const chordChoices = document.querySelector("#learn-chords");
const exploreChords = document.querySelector("#explore-chords");
const chordIntro = document.querySelector("#chord-intro");
const chordShape = document.querySelector("#chord-shape");
const chordDiagram = document.querySelector("#chord-diagram");
const chordVoicing = document.querySelector("#chord-voicing");
const otherNotes = document.querySelector("#learn-other-notes");
const learnName = document.querySelector("#learn-interval-name");
const learnDistance = document.querySelector("#learn-distance");
const learnExplanation = document.querySelector("#learn-explanation");
const learnPairs = document.querySelector("#learn-pairs");
const learnRoot = document.querySelector("#learn-root");
const hearInterval = document.querySelector("#hear-interval");
const learnSoundStatus = document.querySelector("#learn-sound-status");
const learnPositions = buildFretboard(document.querySelector("#learn-fretboard"), lastFret);
const intervalNames = intervalOptions.map(option => ({
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
// Shape offsets are listed from low E to high E. Null means a muted string.
const chords = [
  { name: "Major", offsets: [0, 4, 7], degrees: [1, 3, 5], e: [0, 2, 2, 1, 0, 0], a: [null, 0, 2, 2, 2, 0] },
  { name: "Minor", offsets: [0, 3, 7], degrees: [1, 3, 5], e: [0, 2, 2, 0, 0, 0], a: [null, 0, 2, 2, 1, 0] },
  { name: "Dominant 7", offsets: [0, 4, 7, 10], degrees: [1, 3, 5, 7], e: [0, 2, 0, 1, 0, 0], a: [null, 0, 2, 0, 2, 0] },
  { name: "Major 7", offsets: [0, 4, 7, 11], degrees: [1, 3, 5, 7], e: [0, 2, 1, 1, 0, 0], a: [null, 0, 2, 1, 2, 0] },
  { name: "Minor 7", offsets: [0, 3, 7, 10], degrees: [1, 3, 5, 7], e: [0, 2, 0, 0, 0, 0], a: [null, 0, 2, 0, 1, 0] },
  { name: "Sus2", offsets: [0, 2, 7], degrees: [1, 2, 5], e: [0, 2, 4, null, 0, 0], a: [null, 0, 2, 2, 0, 0] },
  { name: "Sus4", offsets: [0, 5, 7], degrees: [1, 4, 5], e: [0, 2, 2, 2, 0, 0], a: [null, 0, 2, 2, 3, 0] },
  { name: "Diminished", offsets: [0, 3, 6], degrees: [1, 3, 5], e: [0, 1, 2, 0, null, null], a: [null, 0, 1, 2, 1, null] },
  { name: "Augmented", offsets: [0, 4, 8], degrees: [1, 3, 5], e: [0, 3, 2, 1, null, null], a: [null, 0, 3, 2, 2, null] },
  { name: "Half-diminished 7", offsets: [0, 3, 6, 10], degrees: [1, 3, 5, 7], e: [0, 1, 0, 0, null, null], a: [null, 0, 1, 0, 1, null] },
  { name: "Power chord", offsets: [0, 7], degrees: [1, 5], e: [0, 2, 2, null, null, null], a: [null, 0, 2, 2, null, null] },
];
const chordButtons = [];
const stringsLowToHigh = [...tuning].reverse();
const stringLabels = ["Low E", "A", "D", "G", "B", "High E"];
const openChordShapes = {
  Major: { 0: [null, 3, 2, 0, 1, 0], 2: [null, null, 0, 2, 3, 2], 7: [3, 2, 0, 0, 0, 3] },
  Minor: { 2: [null, null, 0, 2, 3, 1] },
  "Dominant 7": {
    0: [null, 3, 2, 3, 1, 3],
    2: [null, null, 0, 2, 1, 2],
    7: [3, 2, 0, 0, 0, 1],
    11: [null, 2, 1, 2, 0, 2],
  },
  "Major 7": { 0: [null, 3, 2, 0, 0, 0], 2: [null, null, 0, 2, 2, 2] },
  "Minor 7": { 2: [null, null, 0, 2, 1, 1] },
  Sus2: { 2: [null, null, 0, 2, 3, 0] },
  Sus4: { 2: [null, null, 0, 2, 3, 3] },
};
let lesson;
let scale = scales[0];
let chord = chords[0];
let explorer = "intervals";
let chordVoicings;
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
  const metronome = page === "metronome";
  const nextTimed = page === "play";
  if (settings.disabled && (learn || metronome || nextTimed !== timed)) stop();
  if (!metronome) stopMetronome();
  timed = nextTimed;
  updateInstruction();
  if (!settings.disabled) updateMode();
  stopLessonAudio();
  learnPage.hidden = !learn;
  practicePage.hidden = learn || metronome;
  metronomePage.hidden = !metronome;
  openPractice.setAttribute("aria-pressed", String(page === "practice"));
  openPlay.setAttribute("aria-pressed", String(nextTimed));
  openLearn.setAttribute("aria-pressed", String(learn));
  openMetronome.setAttribute("aria-pressed", String(metronome));
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
  markLearnNotes(namesByPitch, pitchClass);
}

function markLearnNotes(namesByPitch, pitchClass) {
  for (const { cell, pitch } of learnPositions) {
    const name = namesByPitch.get(pitch % 12);
    const root = pitch % 12 === pitchClass;
    cell.classList.toggle("match", Boolean(name));
    cell.classList.toggle("root", root);
    cell.classList.toggle("upper", Boolean(name) && !root);
    cell.firstElementChild.textContent = name ?? "";
  }
}

function selectChord(nextChord) {
  stopLessonAudio();
  chord = nextChord;
  const rootNote = learnRoot.value;
  const pitchClass = Number(learnRoot.selectedOptions[0].dataset.pitchClass);
  const names = chord.offsets.map((offset, index) =>
    spellAbove(rootNote, pitchClass, offset, chord.degrees[index] - 1));
  const namesByPitch = new Map(chord.offsets.map((offset, index) => [(pitchClass + offset) % 12, names[index]]));
  learnName.textContent = `${rootNote} ${chord.name.toLowerCase()}`;
  learnDistance.textContent = chord.offsets.length === 3 ? "Triad" : `${chord.offsets.length} chord tones`;
  learnExplanation.textContent = names.join(" · ");
  learnPairs.textContent = "Chord formula · " + chord.degrees.map((degree, index) => {
    const majorOffset = scales[0].offsets[degree - 1];
    const alteration = chord.offsets[index] - majorOffset;
    return (alteration < 0 ? "♭" : alteration > 0 ? "♯" : "") + degree;
  }).join(" · ");
  learnSoundStatus.hidden = true;
  for (const button of chordButtons) {
    button.setAttribute("aria-pressed", String(button.textContent === chord.name));
  }
  markLearnNotes(namesByPitch, pitchClass);
  chordVoicings = getChordVoicings(chord, pitchClass);
  chordVoicing.replaceChildren(...chordVoicings.map(({ label }, index) => new Option(label, index)));
  showChordVoicing();
}

function getChordVoicings(chord, pitchClass) {
  const voicings = [[chord.e, 0], [chord.a, 1]].map(([shape, rootString]) => {
    const fret = (pitchClass - stringsLowToHigh[rootString] % 12 + 12) % 12;
    const frets = shape.map(offset => offset === null ? null : offset + fret);
    const label = fret === 0 && frets.includes(0) ? `Open shape · ${stringLabels[rootString]} root`
      : `${stringLabels[rootString]} string root · fret ${fret}`;
    return { frets, label };
  }).sort((a, b) => Number(b.frets.includes(0)) - Number(a.frets.includes(0)));
  const openFrets = openChordShapes[chord.name]?.[pitchClass];
  if (openFrets) voicings.unshift({ frets: openFrets, label: "Open shape" });
  return voicings;
}

function showChordVoicing() {
  stopLessonAudio();
  learnSoundStatus.hidden = true;
  const { frets } = chordVoicings[Number(chordVoicing.value)];
  renderChordDiagram(chordDiagram, frets);
}

function renderChordDiagram(diagram, frets) {
  const chordGrid = diagram.querySelector(".chord-grid");
  const chordStringMarks = diagram.querySelector(".chord-string-marks");
  const chordStartFret = diagram.querySelector(".chord-start-fret");
  const firstFret = frets.includes(0) ? 1 : Math.min(...frets.filter(fret => fret > 0));
  chordGrid.classList.toggle("has-nut", firstFret === 1);
  chordStartFret.textContent = firstFret === 1 ? "" : `${firstFret} fr`;
  diagram.setAttribute("aria-label", frets.map((fret, index) => {
    const string = stringLabels[index];
    return `${string}: ${fret === null ? "muted" : fret === 0 ? "open" : `fret ${fret}`}`;
  }).join(", "));
  chordStringMarks.replaceChildren(...frets.map((fret, index) => {
    const row = document.createElement("div");
    const label = document.createElement("span");
    const mark = document.createElement("span");
    label.textContent = stringLabels[index];
    mark.className = "chord-string-symbol";
    mark.textContent = fret === null ? "×" : fret === 0 ? "○" : "";
    row.append(label, mark);
    return row;
  }).reverse());
  const dots = frets.flatMap((fret, index) => {
    if (fret === null || fret === 0) return [];
    const dot = document.createElement("span");
    dot.className = "chord-dot";
    dot.style.gridColumn = fret - firstFret + 1;
    dot.style.gridRow = frets.length - index;
    return [dot];
  });
  chordGrid.replaceChildren(chordStartFret, ...dots);
}

function openExplorer(nextExplorer) {
  explorer = nextExplorer;
  for (const [key, button, intro, choices] of [
    ["intervals", exploreIntervals, intervalIntro, intervalChoices],
    ["scales", exploreScales, scaleIntro, scaleChoices],
    ["chords", exploreChords, chordIntro, chordChoices],
  ]) {
    const active = key === explorer;
    button.setAttribute("aria-pressed", String(active));
    intro.hidden = choices.hidden = !active;
  }
  chordShape.hidden = explorer !== "chords";
  if (explorer === "chords") {
    hearInterval.textContent = "Hear chord";
    otherNotes.textContent = "Other chord notes";
    selectChord(chord);
  } else if (explorer === "scales") {
    hearInterval.textContent = "Hear scale";
    otherNotes.textContent = "Other scale notes";
    selectScale(scale);
  } else {
    hearInterval.textContent = "Hear interval";
    otherNotes.textContent = "Higher note";
    selectLesson(lesson);
  }
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

for (const item of chords) {
  const option = document.createElement("button");
  option.type = "button";
  option.textContent = item.name;
  option.setAttribute("aria-pressed", "false");
  chordOptions.set(option, item);
  drillChordChoices.append(option);

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = item.name;
  button.addEventListener("click", () => selectChord(item));
  chordButtons.push(button);
  chordChoices.append(button);
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
    const guitar = loadSamples("guitar");
    const samples = await (explorer === "chords" ? guitar.catch(() => null) : guitar);
    if (lessonOutput !== output) return;
    const onset = audioContext.currentTime + 0.03;
    if (explorer === "chords") {
      const { frets } = chordVoicings[Number(chordVoicing.value)];
      playChord(frets, onset, samples, output);
      return;
    }
    const pitch = 48 + Number(learnRoot.selectedOptions[0].dataset.pitchClass);
    const offsets = explorer === "scales" ? [...scale.offsets, 12] : [0, lesson.semitones];
    const spacing = explorer === "scales" ? 0.46 : noteSpacing;
    offsets.forEach((offset, index) => playSample(pitch + offset, onset + index * spacing, samples, output));
  } catch {
    if (output && lessonOutput !== output) return;
    stopLessonAudio();
    learnSoundStatus.textContent = "Guitar audio could not play. Try again.";
    learnSoundStatus.hidden = false;
  }
});

learnRoot.addEventListener("change", () => openExplorer(explorer));
exploreIntervals.addEventListener("click", () => openExplorer("intervals"));
exploreScales.addEventListener("click", () => openExplorer("scales"));
exploreChords.addEventListener("click", () => openExplorer("chords"));
chordVoicing.addEventListener("change", showChordVoicing);
openPractice.addEventListener("click", () => openPage("practice"));
openPlay.addEventListener("click", () => openPage("play"));
openLearn.addEventListener("click", () => openPage("learn"));
selectLesson(intervalNames.find(interval => interval.semitones === 7));

const metronomeBpm = document.querySelector("#metronome-bpm");
const metronomeMeter = document.querySelector("#metronome-meter");
const metronomeBeats = document.querySelector("#metronome-beats");
const metronomeStatus = document.querySelector("#metronome-status");
const tapTempo = document.querySelector("#tap-tempo");
let bpm = Number(metronomeBpm.value);
let metronomeRun;
let taps = [];

function drawMetronomeBeats() {
  const beats = Array.from({ length: Number(metronomeMeter.value) }, () => document.createElement("span"));
  metronomeBeats.replaceChildren(...beats);
}

function updateTempo(value) {
  if (Number.isFinite(value)) {
    bpm = Math.min(Number(metronomeBpm.max), Math.max(Number(metronomeBpm.min), Math.round(value)));
  }
  metronomeBpm.value = bpm;
}

function scheduleMetronome(run) {
  const now = audioContext.currentTime;
  if (run.nextBeat < now) run.nextBeat = now + 0.015;
  const beats = metronomeBeats.children;
  while (run.nextBeat < now + 0.1) {
    const beat = run.beat % beats.length;
    const at = run.nextBeat;
    const click = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    click.frequency.value = beat === 0 ? 1400 : 880;
    envelope.gain.setValueAtTime(beat === 0 ? 0.28 : 0.17, at);
    envelope.gain.exponentialRampToValueAtTime(0.001, at + 0.045);
    click.connect(envelope).connect(run.output);
    click.onended = () => {
      click.disconnect();
      envelope.disconnect();
    };
    click.start(at);
    click.stop(at + 0.05);

    const flash = setTimeout(() => {
      run.flashes.delete(flash);
      if (metronomeRun !== run) return;
      for (const dot of beats) dot.classList.remove("active");
      beats[beat]?.classList.add("active");
    }, (at - now) * 1000);
    run.flashes.add(flash);
    run.beat = (beat + 1) % beats.length;
    run.nextBeat += 60 / bpm;
  }
}

async function startMetronome() {
  updateTempo(metronomeBpm.valueAsNumber);
  metronomeStatus.hidden = true;
  const run = { beat: 0, flashes: new Set() };
  metronomeRun = run;
  metronomeToggle.textContent = "Stop metronome";
  metronomeToggle.classList.add("running");
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    audioContext ??= new Audio();
    await audioContext.resume();
    if (metronomeRun !== run) return;
    run.output = audioContext.createGain();
    run.output.connect(audioContext.destination);
    run.nextBeat = audioContext.currentTime + 0.025;
    scheduleMetronome(run);
    run.timer = setInterval(() => scheduleMetronome(run), 25);
  } catch {
    if (metronomeRun !== run) return;
    stopMetronome();
    metronomeStatus.textContent = "Audio is unavailable in this browser.";
    metronomeStatus.hidden = false;
  }
}

function stopMetronome() {
  const run = metronomeRun;
  if (!run) return;
  metronomeRun = undefined;
  clearInterval(run.timer);
  for (const flash of run.flashes) clearTimeout(flash);
  run.output?.disconnect();
  for (const dot of metronomeBeats.children) dot.classList.remove("active");
  metronomeToggle.textContent = "Start metronome";
  metronomeToggle.classList.remove("running");
}

metronomeBpm.addEventListener("change", () => updateTempo(metronomeBpm.valueAsNumber));
metronomeMeter.addEventListener("change", drawMetronomeBeats);
tapTempo.addEventListener("click", () => {
  const now = performance.now();
  if (now - taps.at(-1) > 2400) taps = [];
  taps.push(now);
  if (taps.length > 5) taps.shift();
  if (taps.length > 1) updateTempo(60000 * (taps.length - 1) / (now - taps[0]));
});
metronomeToggle.addEventListener("click", () => {
  if (metronomeRun) stopMetronome();
  else startMetronome();
});
openMetronome.addEventListener("click", () => openPage("metronome"));
drawMetronomeBeats();
