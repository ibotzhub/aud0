import { state } from './state.js';
import { ui } from './ui-builder.js';
import { showError } from './ui.js';

export async function initAudioContext() {
    if (!window.AudioContext && !window.webkitAudioContext) {
        showError('Web Audio API not supported');
        return false;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioCtx();
    return true;
}

export function setupAudioElement(file) {
    // ... copy from original, but use state.audioElement etc.
    // Ensure you set state.audioElement = newAudio;
}

function setupWebAudioGraph() {
    // ... copy from original, using state.xxx
}

export function startRealTimeAnalysis() {
    state.isPlaying = true;
    if (!state.animationFrames.waterfall) animateWaterfall();
    if (!state.animationFrames.neural) animateNeuralNetwork();
    if (!state.animationFrames.particles) animateParticles();
    if (!state.animationFrames.stereo) animateStereoField();
}

export function stopRealTimeAnalysis() {
    state.isPlaying = false;
}

function updateRealTimeScores() {
    // ... copy from original, update ui.flowScore etc.
}

// Visualisation functions – copy from original, replace canvas contexts with ui.xxxCtx
function animateWaterfall() {
    // use ui.waterfallCanvas to get context
    const canvas = ui.waterfallCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // ... rest of animation code, using state.analyserNode, state.frequencyData
    state.animationFrames.waterfall = requestAnimationFrame(animateWaterfall);
}

function animateNeuralNetwork() {
    // similar
}

function animateParticles() {
    // similar
}

function animateStereoField() {
    // similar
}

// Mode setters
export function setWaterfallMode(mode) { /* ... */ }
export function setNeuralMode(mode) { /* ... */ }
export function setParticleMode(mode) { /* ... */ }
export function setStereoMode(mode) { /* ... */ }

export function setIsolationMix(val) { /* ... */ }
export function applyIsolationMode(mode) { /* ... */ }