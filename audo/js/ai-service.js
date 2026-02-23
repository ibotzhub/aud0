import { state } from './state.js';
import { getItem, setItem, removeItem } from './storage.js';
import { showSuccess, showError } from './ui.js';

export const AIConfig = {
    provider: 'bytez',
    apiKey: getItem('BYTEZ_KEY') || '',
    classificationModel: 'aaraki/wav2vec2-base-finetuned-ks',
    chatModel: 'Qwen/Qwen2-Audio-7B-Instruct',
    enabled: false
};

const AI_AUDIO_WINDOW_STORAGE_KEY = 'BYTEZ_AI_AUDIO_WINDOW';
const DEFAULT_AI_AUDIO_WINDOW = '15';
const AI_FULL_FILE_MAX_BYTES = 6 * 1024 * 1024; // 6 MB

export function getAiAudioWindowSetting() {
    const raw = (getItem(AI_AUDIO_WINDOW_STORAGE_KEY) || DEFAULT_AI_AUDIO_WINDOW).trim();
    if (raw === 'full') return { mode: 'full' };
    const seconds = parseInt(raw, 10);
    return { mode: 'clip', seconds: Number.isFinite(seconds) ? seconds : 15 };
}

export function setAiAudioWindowSetting(value) {
    if (!['10','15','20','30','45','60','full'].includes(value)) return;
    setItem(AI_AUDIO_WINDOW_STORAGE_KEY, value);
    state.currentAudioClipDataUrl = null;
    state.currentAudioClipGeneratedAtMs = 0;
}

export function initializeBytez() {
    AIConfig.enabled = !!AIConfig.apiKey;
    return AIConfig.enabled;
}

function getBytezAuthHeader(key) {
    const k = (key || '').trim();
    if (!k) return '';
    if (/^(Key|Bearer)\s+/i.test(k)) return k;
    return k;
}

async function bytezPost(modelPath, payload) {
    if (!AIConfig.enabled) throw new Error('Bytez API key not set');
    const url = `https://api.bytez.com/models/v2/${modelPath}`;
    const headers = {
        'Authorization': getBytezAuthHeader(AIConfig.apiKey),
        'Content-Type': 'application/json'
    };
    let lastErr;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
            let data, text;
            try { data = await res.json(); } catch { text = await res.text(); }
            if (!res.ok) {
                const msg = (data && (data.error || data.message)) || text || `HTTP ${res.status}`;
                if ([429,502,503,504].includes(res.status) && attempt < 3) {
                    lastErr = new Error(msg);
                    await new Promise(r => setTimeout(r, 500 * attempt));
                    continue;
                }
                throw new Error(msg);
            }
            if (data?.error) throw new Error(data.error);
            return data?.output ?? null;
        } catch (err) {
            lastErr = err;
            if (attempt === 3) throw err;
            await new Promise(r => setTimeout(r, 500 * attempt));
        }
    }
    throw lastErr;
}

export async function uploadFileToTemporaryHost(file) {
    if (!file) return null;
    const services = [
        { url: 'https://tmp.ninja/api.php?d=upload', method: 'POST', field: 'file' },
        { url: 'https://file.io', method: 'POST', field: 'file' },
        { url: 'https://0x0.st', method: 'PUT' }
    ];
    for (const svc of services) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        try {
            let response;
            if (svc.method === 'PUT') {
                response = await fetch(svc.url, { method: 'PUT', body: file, signal: controller.signal });
            } else {
                const fd = new FormData();
                fd.append(svc.field, file);
                response = await fetch(svc.url, { method: 'POST', body: fd, signal: controller.signal });
            }
            clearTimeout(timeoutId);
            if (response.ok) {
                const text = await response.text();
                const url = text.trim().match(/^https?:\/\//) ? text.trim() : null;
                if (url) return url;
            }
        } catch (e) {
            clearTimeout(timeoutId);
            if (e.name !== 'AbortError') console.warn(`${svc.url} failed:`, e);
        }
    }
    return null;
}

async function getCurrentAudioDataUrl() {
    if (state.currentAudioDataUrl) return state.currentAudioDataUrl;
    if (!state.currentAudioFile) return null;
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onloadend = () => {
            state.currentAudioDataUrl = reader.result;
            resolve(reader.result);
        };
        reader.readAsDataURL(state.currentAudioFile);
    });
}

function isAudioPlaying() {
    return !!(state.audioElement && !state.audioElement.paused && !state.audioElement.ended);
}

function canCaptureStream() {
    return !!(state.audioElement && typeof state.audioElement.captureStream === 'function');
}

async function captureAudioClip(seconds) {
    if (!canCaptureStream() || !isAudioPlaying()) return null;
    const stream = state.audioElement.captureStream();
    if (!stream) return null;
    if (typeof MediaRecorder === 'undefined') return null;
    const mime = ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/ogg'].find(t => MediaRecorder.isTypeSupported(t)) || '';
    const chunks = [];
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const promise = new Promise((resolve, reject) => {
        recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
        recorder.onerror = reject;
        recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
            if (!blob.size) return resolve(null);
            const reader = new FileReader();
            reader.onloadend = () => {
                state.currentAudioClipDataUrl = reader.result;
                state.currentAudioClipGeneratedAtMs = Date.now();
                resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        };
    });
    recorder.start(250);
    setTimeout(() => recorder.stop(), seconds * 1000);
    return promise;
}

export async function getCurrentAudioBytezAudioContent() {
    if (state.audioElement?.src && /^https?:\/\//i.test(state.audioElement.src)) {
        return { type: 'audio', url: state.audioElement.src };
    }
    const setting = getAiAudioWindowSetting();
    if (setting.mode === 'clip' && isAudioPlaying()) {
        const clip = await captureAudioClip(setting.seconds);
        if (clip) return { type: 'audio', base64: clip };
    }
    if (state.currentAudioFile) {
        if (state.currentAudioFile.size > AI_FULL_FILE_MAX_BYTES) {
            const publicUrl = await uploadFileToTemporaryHost(state.currentAudioFile);
            if (publicUrl) {
                state.uploadedFileUrl = publicUrl;
                return { type: 'audio', url: publicUrl };
            }
            // fallback to clip if playing
            if (isAudioPlaying()) {
                const clip = await captureAudioClip(15);
                if (clip) return { type: 'audio', base64: clip };
            }
            throw new Error('File too large. Use clip mode (15s) or press play.');
        }
        const b64 = await getCurrentAudioDataUrl();
        if (b64) return { type: 'audio', base64: b64 };
    }
    return null;
}

export async function analyzeWithAI(analysisType = 'general', userPrompt = null) {
    if (!AIConfig.enabled) return null;
    try {
        let prompt = userPrompt;
        if (!prompt) {
            const prompts = {
                psychological: 'Return ONLY JSON with 3 cards: {"cards":[{"title":"string","score":0-100,"description":"string"}]}. Psychological analysis.',
                narrative: 'Return JSON with 2-3 cards. Narrative analysis.',
                technical: 'Return JSON with 2-4 cards. Technical analysis.',
                cultural: 'Return JSON with 2-3 cards. Cultural analysis.',
                gaming: 'Return JSON with 2-3 cards. Gaming analysis.',
                genre: 'Genre analysis: provide 2-5 plausible genres, mood tags, similar artists. Return JSON with cards.',
                general: 'Provide a comprehensive analysis.'
            };
            prompt = prompts[analysisType] || prompts.general;
        }
        const audio = await getCurrentAudioBytezAudioContent();
        if (!audio) throw new Error('No audio available');
        const messages = [{ role: 'user', content: [{ type: 'text', text: prompt }, audio] }];
        const output = await bytezPost(AIConfig.chatModel, { messages, stream: false, params: { max_length: 250, temperature: 0.5 } });
        const text = typeof output === 'string' ? output : output?.content || output?.text || JSON.stringify(output);
        return { type: analysisType, analysis: text, timestamp: Date.now() };
    } catch (err) {
        showError(`AI error: ${err.message}`);
        return null;
    }
}

export function setBytezApiKey(key) {
    AIConfig.apiKey = (key || '').trim();
    if (AIConfig.apiKey) {
        setItem('BYTEZ_KEY', AIConfig.apiKey);
    } else {
        removeItem('BYTEZ_KEY');
    }
    AIConfig.enabled = !!AIConfig.apiKey;
    initializeBytez();
    // update UI (import from ui)
}

export function clearBytezApiKey() {
    AIConfig.apiKey = '';
    AIConfig.enabled = false;
    removeItem('BYTEZ_KEY');
}

export async function testBytezKey(key) {
    const k = (key || AIConfig.apiKey || '').trim();
    if (!k) { showError('Enter a key'); return false; }
    try {
        const res = await fetch('https://api.bytez.com/models', {
            method: 'HEAD',
            headers: { 'Authorization': getBytezAuthHeader(k) }
        });
        if (res.status === 200 || res.status === 401 || res.status === 403) {
            if (res.status === 401 || res.status === 403) {
                showError('Key rejected (401/403)');
                return false;
            }
            showSuccess('Key is valid');
            return true;
        }
        showError(`Unexpected response: ${res.status}`);
        return false;
    } catch (e) {
        showError(`Network error: ${e.message}`);
        return false;
    }
}