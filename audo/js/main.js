import { ui, buildUI } from './ui-builder.js';
import { state } from './state.js';
import { initAudioContext, setupAudioElement, setWaterfallMode, setNeuralMode, setParticleMode, setStereoMode, setIsolationMix, applyIsolationMode } from './audio-context.js';
import { AIConfig, initializeBytez, setBytezApiKey, clearBytezApiKey, testBytezKey, setAiAudioWindowSetting, getAiAudioWindowSetting, analyzeWithAI } from './ai-service.js';
import { showError, showSuccess, updateMetadata, updatePowerupResults, fillCardsFromAI, updateApiKeyUi, setupTooltips, setupSections } from './ui.js';

window.applyIsolationMode = applyIsolationMode;
window.setIsolationMix = setIsolationMix;

document.addEventListener('DOMContentLoaded', async () => {
    buildUI();
    await initAudioContext();

    // File selection
    ui.uploadBtn.addEventListener('click', () => ui.fileInput.click());
    ui.fileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) handleFileSelect(file);
    });

    ui.uploadZone.addEventListener('dragover', e => { e.preventDefault(); ui.uploadZone.classList.add('dragover'); });
    ui.uploadZone.addEventListener('dragleave', () => ui.uploadZone.classList.remove('dragover'));
    ui.uploadZone.addEventListener('drop', e => {
        e.preventDefault();
        ui.uploadZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    });

    function handleFileSelect(file) {
        state.pendingFile = file;
        ui.fileStatus.textContent = AIConfig.enabled ? `✓ File ready: ${file.name}` : `✓ File selected: ${file.name} — AI not configured`;
        ui.fileStatus.style.color = AIConfig.enabled ? 'var(--success)' : 'var(--warning)';
        ui.goBtn.disabled = !AIConfig.enabled;
        ui.goBtn.style.opacity = ui.goBtn.disabled ? '0.5' : '1';
    }

    ui.goBtn.addEventListener('click', async () => {
        if (!state.pendingFile) { showError('Select a file'); return; }
        if (!AIConfig.enabled) { showError('Configure AI key first'); return; }
        ui.goBtn.disabled = true;
        ui.goBtn.textContent = 'LOADING...';
        ui.fileStatus.textContent = `🔄 Analyzing: ${state.pendingFile.name}`;
        ui.uploadZone.classList.add('analyzing');

        try {
            state.currentAudioFile = state.pendingFile;
            state.currentAudioDataUrl = null;
            state.uploadedFileUrl = null;

            updatePowerupResults('🎵 Loading audio...');
            setupAudioElement(state.pendingFile);
            updateMetadata(state.pendingFile);

            ui.mainLayout.style.display = 'grid';
            ui.uploadZone.style.display = 'none';

            setTimeout(async () => {
                await fillAllSectionsWithAI();
                showSuccess(`File loaded and analyzed!`);
            }, 500);
        } catch (err) {
            showError(err.message);
            ui.goBtn.disabled = false;
            ui.goBtn.textContent = 'GO!';
        }
    });

    async function fillAllSectionsWithAI() {
        const sections = ['psychological','narrative','technical','cultural','gaming','genre'];
        await Promise.allSettled(sections.map(type => fillCardsFromAI(type+'-cards', type)));
    }

    // AI Key UI
    ui.keySaveUpload.addEventListener('click', () => {
        if (ui.keyInputUpload.value.trim()) setBytezApiKey(ui.keyInputUpload.value.trim());
        updateApiKeyUi();
    });
    ui.keyClearUpload.addEventListener('click', () => {
        clearBytezApiKey();
        ui.keyInputUpload.value = '';
        updateApiKeyUi();
    });
    ui.keyTestUpload.addEventListener('click', () => testBytezKey(ui.keyInputUpload.value));

    ui.keySaveChat.addEventListener('click', () => {
        if (ui.keyInputChat.value.trim()) setBytezApiKey(ui.keyInputChat.value.trim());
        updateApiKeyUi();
    });
    ui.keyClearChat.addEventListener('click', () => {
        clearBytezApiKey();
        ui.keyInputChat.value = '';
        updateApiKeyUi();
    });
    ui.keyTestChat.addEventListener('click', () => testBytezKey(ui.keyInputChat.value));

    // Audio window selector
    const setting = getAiAudioWindowSetting();
    const initVal = setting.mode === 'full' ? 'full' : String(setting.seconds);
    ui.aiAudioSendModeUpload.value = initVal;
    ui.aiAudioSendModeChat.value = initVal;
    ui.aiAudioSendModeUpload.addEventListener('change', () => {
        setAiAudioWindowSetting(ui.aiAudioSendModeUpload.value);
        ui.aiAudioSendModeChat.value = ui.aiAudioSendModeUpload.value;
    });
    ui.aiAudioSendModeChat.addEventListener('change', () => {
        setAiAudioWindowSetting(ui.aiAudioSendModeChat.value);
        ui.aiAudioSendModeUpload.value = ui.aiAudioSendModeChat.value;
    });

    // Chat
    ui.sendChatBtn.addEventListener('click', sendMessage);
    ui.chatInput.addEventListener('keypress', e => e.key === 'Enter' && sendMessage());

    async function sendMessage() {
        const msg = ui.chatInput.value.trim();
        if (!msg) return;
        addMessage('user', msg);
        ui.chatInput.value = '';
        if (!AIConfig.enabled) {
            addMessage('ai', 'Configure AI first.');
            return;
        }
        addMessage('ai', 'Thinking...');
        try {
            const result = await analyzeWithAI('general', msg);
            const history = ui.conversationHistory;
            if (history.lastElementChild?.classList.contains('ai')) {
                history.lastElementChild.innerHTML = `<div class="message-content">${result?.analysis || 'No response'}</div>`;
            } else {
                addMessage('ai', result?.analysis || 'No response');
            }
        } catch (err) {
            addMessage('ai', `Error: ${err.message}`);
        }
    }

    function addMessage(role, text) {
        const div = document.createElement('div');
        div.className = `message ${role}`;
        div.innerHTML = `<div class="message-content">${text}</div>`;
        ui.conversationHistory.appendChild(div);
        ui.conversationHistory.scrollTop = ui.conversationHistory.scrollHeight;
    }

    // Visualisation mode buttons
    document.querySelectorAll('[data-waterfall]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-waterfall]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setWaterfallMode(btn.dataset.waterfall);
        });
    });
    document.querySelectorAll('[data-neural]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-neural]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setNeuralMode(btn.dataset.neural);
        });
    });
    document.querySelectorAll('[data-particle]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-particle]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setParticleMode(btn.dataset.particle);
        });
    });
    document.querySelectorAll('[data-stereo]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-stereo]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setStereoMode(btn.dataset.stereo);
        });
    });

    // Refresh buttons for analysis cards
    document.addEventListener('click', e => {
        if (e.target.matches('[data-refresh]')) {
            const containerId = e.target.dataset.refresh;
            const typeMap = {
                'psychological-cards':'psychological','narrative-cards':'narrative','technical-cards':'technical',
                'cultural-cards':'cultural','gaming-cards':'gaming','genre-cards':'genre'
            };
            const type = typeMap[containerId];
            if (type && AIConfig.enabled) fillCardsFromAI(containerId, type);
            else showError('Configure AI first');
        }
    });

    // Power‑ups
    document.querySelectorAll('[data-powerup]').forEach(card => {
        card.addEventListener('click', async () => {
            const type = card.dataset.powerup;
            card.classList.add('active');
            try {
                if (type === 'midi') await generateMIDI();
                else if (type === 'isolate') await isolateElements();
                else if (type === 'beat') await detectBeatTempo();
                else if (type === 'key') await detectKeyChords();
                else if (type === 'genre') await analyzeGenrePowerup();
            } finally {
                card.classList.remove('active');
            }
        });
    });

    // Stub power‑up functions – you need to implement them or copy from original
    async function generateMIDI() { updatePowerupResults('MIDI generation not implemented yet.'); }
    async function isolateElements() { updatePowerupResults('Source separation not implemented yet.'); }
    async function detectBeatTempo() { updatePowerupResults('Beat detection not implemented yet.'); }
    async function detectKeyChords() { updatePowerupResults('Key analysis not implemented yet.'); }
    async function analyzeGenrePowerup() { updatePowerupResults('Genre analysis not implemented yet.'); }

    initializeBytez();
    updateApiKeyUi();
    setupTooltips();
    setupSections();
});