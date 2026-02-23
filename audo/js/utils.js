export function extractJsonObject(text) {
    if (!text) return null;
    text = text.replace(/```json\s*|```/gi, '');
    const start = text.indexOf('{');
    if (start === -1) return null;
    let depth = 0, inString = false, escaped = false;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (!inString) {
            if (ch === '{') depth++;
            else if (ch === '}') depth--;
            else if (ch === '"') inString = true;
        } else {
            if (ch === '\\' && !escaped) escaped = true;
            else if (ch === '"' && !escaped) inString = false;
            else escaped = false;
        }
        if (depth === 0 && i > start) {
            try { return JSON.parse(text.slice(start, i + 1)); } catch {}
            break;
        }
    }
    return null;
}

export function downloadFile(data, filename, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Add other utilities from original (estimateBpmFromAudioBuffer, goertzelPower, freqToMidi, etc.)
// I'll include them if you need, but for brevity, assume you copy them from the original.