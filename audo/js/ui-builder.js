/**
 * ui-builder.js
 * Builds the entire DOM into #app and exposes all element references
 * via the shared `ui` object. Import `buildUI` and call it once on
 * DOMContentLoaded before any other module touches the DOM.
 */

// ─── Shared element reference object ─────────────────────────────────────────
export const ui = {
    // Upload panel
    uploadZone: null,
    uploadBtn: null,
    fileInput: null,
    fileStatus: null,
    goBtn: null,

    // API key – upload panel
    keyInputUpload: null,
    keySaveUpload: null,
    keyClearUpload: null,
    keyTestUpload: null,
    aiAudioSendModeUpload: null,

    // Main layout
    mainLayout: null,

    // Player / metadata
    audioElement: null,

    // Real‑time score displays (used by audio-context.js)
    flowScore: null,
    tensionScore: null,
    complexityScore: null,

    // Visualisation canvases
    waterfallCanvas: null,
    neuralCanvas: null,
    particleCanvas: null,
    stereoCanvas: null,

    // Chat / sidebar
    conversationHistory: null,
    chatInput: null,
    sendChatBtn: null,
    keyInputChat: null,
    keySaveChat: null,
    keyClearChat: null,
    keyTestChat: null,
    aiAudioSendModeChat: null,
};

// ─── Helper: create element with optional attrs + innerHTML ───────────────────
function el(tag, attrs = {}, inner = '') {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'className') e.className = v;
        else if (k === 'style') e.style.cssText = v;
        else e.setAttribute(k, v);
    }
    if (inner) e.innerHTML = inner;
    return e;
}

// ─── API‑key widget (reusable, appears twice) ─────────────────────────────────
function buildApiKeyBox(suffix) {
    const box = el('div', { className: 'api-key-box' });

    // Title row
    const titleRow = el('div', { className: 'api-key-title' });
    const label = el('span', {}, '🔑 Bytez API Key');
    const status = el('span', { className: 'api-key-status', id: `bytezKeyStatus${suffix}` }, 'AI: disabled');
    titleRow.append(label, status);

    // Input row
    const inputRow = el('div', { className: 'api-key-row' });
    const input = el('input', {
        type: 'password',
        className: 'api-key-input',
        id: `keyInput${suffix}`,
        placeholder: 'Enter Bytez API key…',
        autocomplete: 'off'
    });
    const saveBtn  = el('button', { className: 'api-key-btn',           id: `keySave${suffix}`  }, 'Save');
    const clearBtn = el('button', { className: 'api-key-btn secondary', id: `keyClear${suffix}` }, 'Clear');
    const testBtn  = el('button', { className: 'api-key-btn',           id: `keyTest${suffix}`  }, 'Test');
    inputRow.append(input, saveBtn, clearBtn, testBtn);

    // Audio window row
    const windowRow = el('div', { className: 'api-key-row', style: 'margin-top:10px;' });
    const windowLabel = el('span', { style: 'font-size:0.82em;color:var(--text-secondary);white-space:nowrap;' }, 'Audio window:');
    const windowSelect = el('select', {
        className: 'api-key-select',
        id: `aiAudioSendMode${suffix}`,
        style: 'flex:1;'
    }, `
        <option value="10">10 seconds</option>
        <option value="15" selected>15 seconds (default)</option>
        <option value="20">20 seconds</option>
        <option value="30">30 seconds</option>
        <option value="45">45 seconds</option>
        <option value="60">60 seconds</option>
        <option value="full">Full file</option>
    `);
    windowRow.append(windowLabel, windowSelect);

    const help = el('div', { className: 'api-key-help' },
        'Get your key at <a href="https://bytez.com" target="_blank" style="color:var(--primary)">bytez.com</a>. ' +
        '"Audio window" controls how much audio is sent to the AI per request.'
    );

    box.append(titleRow, inputRow, windowRow, help);
    return { box, input, saveBtn, clearBtn, testBtn, windowSelect, status };
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────
function buildUploadZone() {
    const zone = el('div', { className: 'upload-zone', id: 'uploadZone' });

    zone.innerHTML = `
        <div style="font-size:4em;margin-bottom:20px;">🎵</div>
        <h2 style="font-family:'Orbitron',monospace;font-size:1.8em;margin-bottom:15px;color:var(--primary);">
            DROP AUDIO HERE
        </h2>
        <p style="color:var(--text-secondary);margin-bottom:30px;">
            Supports MP3, WAV, FLAC, OGG, AAC, M4A and more
        </p>
    `;

    const uploadBtn = el('button', { className: 'upload-btn', id: 'uploadBtn' }, '📂 CHOOSE FILE');
    const fileInput = el('input', { type: 'file', id: 'fileInput', accept: 'audio/*' });

    const orText = el('p', { style: 'color:var(--text-secondary);margin:20px 0;' }, '— or drag & drop —');

    // API key box for upload panel
    const apiBox = buildApiKeyBox('Upload');

    const fileStatus = el('div', {
        id: 'fileStatus',
        style: 'margin:20px 0;font-size:0.9em;color:var(--text-secondary);min-height:22px;'
    });

    const goBtn = el('button', {
        className: 'upload-btn',
        id: 'goBtn',
        disabled: 'disabled',
        style: 'opacity:0.5;margin-top:10px;'
    }, '🚀 GO!');

    zone.append(uploadBtn, fileInput, orText, apiBox.box, fileStatus, goBtn);

    return { zone, uploadBtn, fileInput, fileStatus, goBtn, apiBox };
}

// ─── Visualisation panel (waterfall, neural, particles, stereo) ───────────────
function buildVizPanel({ id, title, modes, dataAttr }) {
    const panel = el('div', { className: 'viz-panel' });

    const titleRow = el('div', { className: 'viz-title' });
    titleRow.innerHTML = `<span>${title}</span>`;

    const controls = el('div', { className: 'controls-section' });
    modes.forEach((m, i) => {
        const btn = el('button', {
            className: `control-btn${i === 0 ? ' active' : ''}`,
            [`data-${dataAttr}`]: m.value
        }, m.label);
        controls.appendChild(btn);
    });
    titleRow.appendChild(controls);

    const canvas = el('canvas', { id, className: 'viz-canvas' });
    canvas.width = 800;
    canvas.height = 300;

    panel.append(titleRow, canvas);
    return { panel, canvas };
}

// ─── Analysis section (collapsible) ──────────────────────────────────────────
function buildAnalysisSection({ sectionClass, icon, title, cardsId, helpId, helpText }) {
    const section = el('div', { className: `analysis-section ${sectionClass}` });

    const header = el('div', { className: 'section-header' });
    const sectionTitle = el('div', { className: 'section-title' });
    sectionTitle.innerHTML = `<span class="section-icon">${icon}</span><span>${title}</span>`;

    const rightGroup = el('div', { style: 'display:flex;align-items:center;gap:10px;position:relative;' });
    const helpBtn = el('button', { className: 'help-btn', 'data-tooltip': helpId }, '?');
    const tooltip = el('div', { className: 'tooltip', id: helpId }, helpText);
    const expandBtn = el('button', { className: 'expand-btn' }, '▼');

    rightGroup.append(helpBtn, tooltip, expandBtn);
    header.append(sectionTitle, rightGroup);

    const content = el('div', { className: 'section-content' });
    const inner = el('div', { className: 'content-inner' });
    const cards = el('div', { className: 'analysis-cards', id: cardsId });
    cards.innerHTML = `
        <div class="analysis-card">
            <div class="card-header">
                <div class="card-title">Awaiting Analysis</div>
                <div class="card-score medium">--</div>
            </div>
            <div class="card-description">Load a file and configure AI to populate this section.</div>
        </div>
    `;
    inner.appendChild(cards);
    content.appendChild(inner);
    section.append(header, content);
    return section;
}

// ─── Power‑ups panel ──────────────────────────────────────────────────────────
function buildPowerupsSection() {
    const section = el('div', { className: 'powerups-section' });
    section.innerHTML = `
        <div class="panel-header">
            <div class="panel-title" style="color:var(--warning);">⚡ POWER‑UPS</div>
        </div>
    `;
    const grid = el('div', { className: 'powerups-grid' });
    const powerups = [
        { type: 'midi',    icon: '🎹', title: 'MIDI Export',      desc: 'Convert melody to MIDI data'        },
        { type: 'isolate', icon: '🎸', title: 'Isolate Elements',  desc: 'Separate stems and layers'          },
        { type: 'beat',    icon: '🥁', title: 'Beat Detective',    desc: 'Detect BPM, grid, and swing'        },
        { type: 'key',     icon: '🎵', title: 'Key & Chords',      desc: 'Identify key, chords, and harmony'  },
        { type: 'genre',   icon: '🌍', title: 'Genre Analysis',    desc: 'Deep genre and cultural mapping'    },
    ];
    powerups.forEach(p => {
        const card = el('div', { className: 'powerup-card', 'data-powerup': p.type });
        card.innerHTML = `
            <div class="powerup-icon">${p.icon}</div>
            <div class="powerup-title">${p.title}</div>
            <div class="powerup-desc">${p.desc}</div>
        `;
        grid.appendChild(card);
    });
    const results = el('div', { className: 'powerup-results', id: 'powerupResults' },
        'Select a power‑up above to run analysis…'
    );
    section.append(grid, results);
    return section;
}

// ─── Conversation panel (sidebar) ────────────────────────────────────────────
function buildConversationPanel() {
    const panel = el('div', { className: 'conversation-panel' });
    const header = el('div', { className: 'panel-header' });
    header.innerHTML = `<div class="panel-title" style="color:var(--info);">💬 AI CHAT</div>`;

    // API key box for chat panel
    const apiBox = buildApiKeyBox('Chat');

    const history = el('div', { className: 'conversation-history', id: 'conversationHistory' });
    history.innerHTML = `
        <div class="message ai">
            <div class="message-content">
                Hello! Load an audio file and I'll help you analyse it. Ask me anything about the track.
            </div>
        </div>
    `;

    const inputRow = el('div', { className: 'conversation-input' });
    const chatInput = el('input', {
        type: 'text',
        className: 'chat-input',
        id: 'chatInput',
        placeholder: 'Ask about the audio…'
    });
    const sendBtn = el('button', { className: 'send-btn', id: 'sendChatBtn' }, '➤');
    inputRow.append(chatInput, sendBtn);

    panel.append(header, apiBox.box, history, inputRow);
    return { panel, history, chatInput, sendBtn, apiBox };
}

// ─── Player section ───────────────────────────────────────────────────────────
function buildPlayerSection() {
    const section = el('div', { className: 'player-section' });
    section.innerHTML = `
        <div class="panel-header">
            <div class="panel-title" style="font-size:1em;">🎧 PLAYER</div>
        </div>
    `;
    const audioControls = el('div', { className: 'audio-controls' });
    const audio = el('audio', { id: 'audioElement', controls: '', preload: 'metadata' });
    audio.style.width = '100%';
    audioControls.appendChild(audio);

    const metaGrid = el('div', { className: 'metadata-grid', id: 'metadata' });
    metaGrid.innerHTML = `
        <div class="metadata-card"><div class="metadata-label">File</div><div class="metadata-value" style="font-size:0.8em;">—</div></div>
        <div class="metadata-card"><div class="metadata-label">Size</div><div class="metadata-value">—</div></div>
        <div class="metadata-card"><div class="metadata-label">Type</div><div class="metadata-value">—</div></div>
    `;

    const scoresGrid = el('div', { className: 'scores-grid' });
    const scoreCards = [
        { cls: 'flow',       id: 'flowScore',       label: 'Flow',       color: 'var(--primary)' },
        { cls: 'tension',    id: 'tensionScore',    label: 'Tension',    color: 'var(--accent)'  },
        { cls: 'complexity', id: 'complexityScore', label: 'Complexity', color: 'var(--warning)' },
    ];
    scoreCards.forEach(s => {
        const card = el('div', { className: `score-card ${s.cls}` });
        card.innerHTML = `
            <div class="score-number" id="${s.id}" style="color:${s.color};">0</div>
            <div class="score-label">${s.label}</div>
        `;
        scoresGrid.appendChild(card);
    });

    section.append(audioControls, metaGrid, scoresGrid);
    return { section, audio };
}

// ─── Main buildUI export ──────────────────────────────────────────────────────
export function buildUI() {
    const app = document.getElementById('app');
    if (!app) { console.error('ui-builder: #app element not found'); return; }
    app.innerHTML = '';

    const container = el('div', { className: 'container' });

    // ── Header ─────────────────────────────────────────────────────────────────
    const header = el('div', { className: 'header' });
    header.innerHTML = `
        <div class="header-content">
            <h1>🔬 AUDIO FORENSICS PRO</h1>
            <p class="subtitle">Advanced AI‑Powered Audio Analysis & Deconstruction Suite</p>
        </div>
    `;
    container.appendChild(header);

    // ── Upload zone ────────────────────────────────────────────────────────────
    const uploadResult = buildUploadZone();
    container.appendChild(uploadResult.zone);

    // Store upload‑panel refs
    ui.uploadZone          = uploadResult.zone;
    ui.uploadBtn           = uploadResult.uploadBtn;
    ui.fileInput           = uploadResult.fileInput;
    ui.fileStatus          = uploadResult.fileStatus;
    ui.goBtn               = uploadResult.goBtn;
    ui.keyInputUpload      = uploadResult.apiBox.input;
    ui.keySaveUpload       = uploadResult.apiBox.saveBtn;
    ui.keyClearUpload      = uploadResult.apiBox.clearBtn;
    ui.keyTestUpload       = uploadResult.apiBox.testBtn;
    ui.aiAudioSendModeUpload = uploadResult.apiBox.windowSelect;

    // ── Main layout (hidden until file loaded) ─────────────────────────────────
    const mainLayout = el('div', {
        className: 'main-layout',
        id: 'mainLayout',
        style: 'display:none;'
    });

    // Left: primary content
    const primaryContent = el('div', { className: 'primary-content' });

    // Player
    const playerResult = buildPlayerSection();
    primaryContent.appendChild(playerResult.section);
    ui.audioElement = playerResult.audio;

    // Visualisation grid
    const vizGrid = el('div', { className: 'viz-grid' });

    const waterfall = buildVizPanel({
        id: 'waterfallCanvas',
        title: '📊 Frequency Waterfall',
        dataAttr: 'waterfall',
        modes: [
            { value: 'spectrum',   label: 'Spectrum'   },
            { value: 'waterfall',  label: 'Waterfall'  },
            { value: 'bars',       label: 'Bars'       },
        ]
    });
    const neural = buildVizPanel({
        id: 'neuralCanvas',
        title: '🧠 Neural Network',
        dataAttr: 'neural',
        modes: [
            { value: 'network',    label: 'Network'    },
            { value: 'nodes',      label: 'Nodes'      },
            { value: 'flow',       label: 'Flow'       },
        ]
    });
    const particles = buildVizPanel({
        id: 'particleCanvas',
        title: '✨ Particle Field',
        dataAttr: 'particle',
        modes: [
            { value: 'cloud',      label: 'Cloud'      },
            { value: 'orbit',      label: 'Orbit'      },
            { value: 'explosion',  label: 'Explosion'  },
        ]
    });
    const stereo = buildVizPanel({
        id: 'stereoCanvas',
        title: '🔊 Stereo Field',
        dataAttr: 'stereo',
        modes: [
            { value: 'lissajous',  label: 'Lissajous'  },
            { value: 'phase',      label: 'Phase'      },
            { value: 'spread',     label: 'Spread'     },
        ]
    });

    vizGrid.append(waterfall.panel, neural.panel, particles.panel, stereo.panel);
    primaryContent.appendChild(vizGrid);

    ui.waterfallCanvas = waterfall.canvas;
    ui.neuralCanvas    = neural.canvas;
    ui.particleCanvas  = particles.canvas;
    ui.stereoCanvas    = stereo.canvas;

    // Power‑ups
    primaryContent.appendChild(buildPowerupsSection());

    // Analysis sections (expandable)
    const analysisSections = el('div', { className: 'analysis-sections' });
    const sections = [
        {
            sectionClass: 'psychological',
            icon: '🧠', title: 'PSYCHOLOGICAL ANALYSIS',
            cardsId: 'psychological-cards', helpId: 'tip-psych',
            helpText: 'Emotional tone, cognitive load, psychological patterns, and listener affect.'
        },
        {
            sectionClass: 'narrative',
            icon: '📖', title: 'NARRATIVE STRUCTURE',
            cardsId: 'narrative-cards', helpId: 'tip-narrative',
            helpText: 'Story arc, tension, resolution, and lyrical or sonic storytelling patterns.'
        },
        {
            sectionClass: 'technical',
            icon: '⚙️', title: 'TECHNICAL ANALYSIS',
            cardsId: 'technical-cards', helpId: 'tip-technical',
            helpText: 'Frequency composition, dynamics, mastering quality, and production techniques.'
        },
        {
            sectionClass: 'cultural',
            icon: '🌍', title: 'CULTURAL CONTEXT',
            cardsId: 'cultural-cards', helpId: 'tip-cultural',
            helpText: 'Genre genealogy, cultural references, regional influences, and zeitgeist mapping.'
        },
        {
            sectionClass: 'gaming',
            icon: '🎮', title: 'GAMING APPLICATIONS',
            cardsId: 'gaming-cards', helpId: 'tip-gaming',
            helpText: 'Suggested game genres, gameplay scenarios, mood usage, and sync opportunities.'
        },
        {
            sectionClass: 'genre',
            icon: '🎵', title: 'GENRE & MOOD',
            cardsId: 'genre-cards', helpId: 'tip-genre',
            helpText: 'Genre tags, mood descriptors, similar artists, and playlist placement suggestions.'
        },
    ];
    sections.forEach(s => analysisSections.appendChild(buildAnalysisSection(s)));
    primaryContent.appendChild(analysisSections);

    // Right: sidebar
    const sidebar = el('div', { className: 'sidebar' });
    const chatResult = buildConversationPanel();
    sidebar.appendChild(chatResult.panel);

    ui.conversationHistory  = chatResult.history;
    ui.chatInput            = chatResult.chatInput;
    ui.sendChatBtn          = chatResult.sendBtn;
    ui.keyInputChat         = chatResult.apiBox.input;
    ui.keySaveChat          = chatResult.apiBox.saveBtn;
    ui.keyClearChat         = chatResult.apiBox.clearBtn;
    ui.keyTestChat          = chatResult.apiBox.testBtn;
    ui.aiAudioSendModeChat  = chatResult.apiBox.windowSelect;

    mainLayout.append(primaryContent, sidebar);
    container.appendChild(mainLayout);

    ui.mainLayout   = mainLayout;
    ui.flowScore    = mainLayout.querySelector('#flowScore');
    ui.tensionScore = mainLayout.querySelector('#tensionScore');
    ui.complexityScore = mainLayout.querySelector('#complexityScore');

    app.appendChild(container);
}
