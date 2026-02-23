import { state } from './state.js';
import { extractJsonObject } from './utils.js';
import { AIConfig, analyzeWithAI } from './ai-service.js';

export function showError(msg) {
    const div = document.createElement('div'); div.className = 'error'; div.textContent = msg;
    document.body.appendChild(div); setTimeout(() => div.remove(), 5000);
}
export function showSuccess(msg) {
    const div = document.createElement('div'); div.className = 'success'; div.textContent = msg;
    document.body.appendChild(div); setTimeout(() => div.remove(), 3000);
}

export function updateMetadata(file) {
    const el = document.getElementById('metadata');
    if (!el) return;
    const size = (file.size / 1024 / 1024).toFixed(2);
    el.innerHTML = `
        <div class="metadata-card"><div class="metadata-label">Filename</div><div class="metadata-value">${file.name.length>15?file.name.slice(0,15)+'...':file.name}</div></div>
        <div class="metadata-card"><div class="metadata-label">Size</div><div class="metadata-value">${size} MB</div></div>
        <div class="metadata-card"><div class="metadata-label">Type</div><div class="metadata-value">${file.type.split('/')[1].toUpperCase()}</div></div>
    `;
}

export function updatePowerupResults(text) {
    const el = document.getElementById('powerupResults');
    if (el) el.innerHTML = (text || '').replace(/\n/g, '<br>');
}

export function renderCards(containerId, cards) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const scoreClass = s => s >= 80 ? 'high' : s >= 60 ? 'medium' : 'low';
    el.innerHTML = `
        <div style="display:flex; justify-content: flex-end; margin-bottom: 10px;">
            <button class="control-btn" style="padding:6px 10px;" data-refresh="${containerId}">↻ Refresh</button>
        </div>
    ` + cards.map(c => {
        const score = typeof c.score === 'number' ? Math.max(0, Math.min(100, Math.round(c.score))) : 0;
        return `
            <div class="analysis-card">
                <div class="card-header"><div class="card-title">${escape(c.title)}</div><div class="card-score ${scoreClass(score)}">${score}/100</div></div>
                <div class="card-description">${escape(c.description)}</div>
            </div>
        `;
    }).join('');
}

function escape(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

export async function fillCardsFromAI(containerId, analysisType) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `<div class="analysis-card"><div class="card-header"><div class="card-title">AI analyzing…</div><div class="card-score medium">--</div></div><div class="card-description">Generating ${analysisType} insights.</div></div>`;
    const result = await analyzeWithAI(analysisType);
    if (!result?.analysis) {
        el.innerHTML = `<div class="analysis-card"><div class="card-header"><div class="card-title">AI unavailable</div><div class="card-score low">--</div></div><div class="card-description">Configure AI to fill this section.</div></div>`;
        return;
    }
    let parsed = extractJsonObject(result.analysis);
    if (!(parsed?.cards && Array.isArray(parsed.cards) && parsed.cards.length)) {
        const strict = `Return ONLY valid minified JSON with schema {"cards":[{"title":"string","score":0-100,"description":"string"}]}. No markdown.`;
        const retry = await analyzeWithAI(analysisType, strict);
        parsed = extractJsonObject(retry?.analysis || '');
    }
    if (parsed?.cards && Array.isArray(parsed.cards) && parsed.cards.length) {
        renderCards(containerId, parsed.cards.slice(0,5));
    } else {
        renderCards(containerId, [{ title: 'AI Analysis', score: 80, description: result.analysis }]);
    }
}

export function updateApiKeyUi() {
    const enabled = AIConfig.enabled;
    const label = enabled ? `AI: enabled (Bytez ${maskKey(AIConfig.apiKey)})` : 'AI: disabled';
    ['bytezKeyStatusUpload','bytezKeyStatusChat'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = label;
    });
}
function maskKey(k) { return k ? '***' + k.slice(-4) : 'Not set'; }

export function setupTooltips() {
    document.querySelectorAll('.help-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.tooltip;
            const tip = document.getElementById(id);
            if (!tip) return;
            document.querySelectorAll('.tooltip.show').forEach(t => t.classList.remove('show'));
            tip.classList.add('show');
            setTimeout(() => tip.classList.remove('show'), 5000);
        });
    });
}

export function setupSections() {
    document.querySelectorAll('.analysis-section .section-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const btn = header.querySelector('.expand-btn');
            content.classList.toggle('expanded');
            btn.classList.toggle('expanded');
        });
    });
}