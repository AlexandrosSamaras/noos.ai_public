(() => {
    if (window.__noosai_live_hud_loaded) return;
    window.__noosai_live_hud_loaded = true;

    const WS_LIVE_URL = 'wss://sentiment-analyzer-service-872183226779.us-central1.run.app/live-chat';
    const STUDIO_REPORT_URL = 'https://noosai.co.uk/app/cockpit.html?hud_report=1';

    // ─── 1. Bidirectional License & HUD Report Sync with Web Studio ──────────
    function syncWithWebStudio() {
        const host = window.location.hostname;
        if (!host.includes('noosai.co.uk') && host !== 'localhost' && host !== '127.0.0.1') return;

        try {
            // Handoff any pending HUD session report to cockpit.html?hud_report=1
            const params = new URLSearchParams(window.location.search);
            if (params.get('hud_report') === '1' && chrome?.storage?.local) {
                chrome.storage.local.get(['pendingHudSessionReport'], (res) => {
                    if (res && res.pendingHudSessionReport) {
                        localStorage.setItem('noos_hud_session_report', JSON.stringify(res.pendingHudSessionReport));
                        chrome.storage.local.remove('pendingHudSessionReport');
                    }
                });
            }

            if (chrome?.storage?.sync) {
                chrome.storage.sync.get(['licenseKey', 'isPremium'], (extData) => {
                    const webKey = localStorage.getItem('noos_license_key');
                    if (extData?.licenseKey && !webKey) {
                        localStorage.setItem('noos_license_key', extData.licenseKey);
                        localStorage.setItem('noos_is_premium', 'true');
                        if (window.NoosLicensing && typeof window.NoosLicensing.refreshQuota === 'function') {
                            window.NoosLicensing.refreshQuota();
                        }
                    } else if (webKey && !extData?.licenseKey) {
                        chrome.storage.sync.set({ licenseKey: webKey, isPremium: true });
                    }
                });
            }
        } catch (err) {
            console.warn('NoosAI Studio sync warning:', err);
        }
    }

    syncWithWebStudio();

    // ─── 2. Meeting Page Detection ───────────────────────────────────────────
    function isActiveMeetingUrl() {
        const host = window.location.hostname;
        const path = window.location.pathname;
        if (host === 'meet.google.com') {
            return /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(path) || path.length > 5;
        }
        if (host === 'teams.microsoft.com' || host === 'teams.live.com') {
            return true;
        }
        if (host.endsWith('zoom.us') && (path.includes('/wc/') || path.includes('/j/'))) {
            return true;
        }
        return false;
    }

    let hudHost = null;
    let shadow = null;
    let launcherHost = null;
    let launcherDismissed = false;

    // Live session state
    let ws = null;
    let audioContext = null;
    let mediaStream = null;
    let timerInterval = null;
    let pingInterval = null;
    let startTimeMs = null;

    const hudSession = {
        persona: 'sales',
        callContext: '',
        transcripts: [],
        coachingTips: [],
        scores: [],
        emotions: [],
        signals: [],
        inflections: [],
        arcPoints: [],
        talkYou: 50,
        talkThem: 50,
        startTime: null,
        endTime: null
    };

    function getCredentials() {
        return new Promise((resolve) => {
            if (!chrome?.storage?.sync) {
                resolve({ licenseKey: '', userId: 'ext_anon_user' });
                return;
            }
            chrome.storage.sync.get(['licenseKey', 'userId'], (data) => {
                let uid = data?.userId;
                if (!uid) {
                    uid = 'ext_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
                    chrome.storage.sync.set({ userId: uid });
                }
                resolve({
                    licenseKey: data?.licenseKey || '',
                    userId: uid
                });
            });
        });
    }

    // ─── 3. Unobtrusive Meeting Launcher Pill ────────────────────────────────
    function showMeetingLauncherPill() {
        if (launcherDismissed || launcherHost || hudHost) return;

        launcherHost = document.createElement('div');
        launcherHost.id = 'noosai-meeting-launcher-host';
        const lShadow = launcherHost.attachShadow({ mode: 'open' });

        lShadow.innerHTML = `
            <style>
                .launcher-pill {
                    position: fixed;
                    top: 16px;
                    right: 18px;
                    z-index: 2147483645;
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 14px;
                    border-radius: 999px;
                    background: rgba(6, 14, 29, 0.9);
                    backdrop-filter: blur(14px);
                    border: 1px solid rgba(0, 229, 255, 0.45);
                    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.5), 0 0 16px rgba(0, 200, 255, 0.2);
                    font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    color: #f8fafc;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s ease, border-color 0.2s ease;
                }
                .launcher-pill:hover {
                    transform: translateY(-1px);
                    border-color: #00ff88;
                }
                .pulse-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #00ff88;
                    box-shadow: 0 0 8px #00ff88;
                }
                .close-x {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    font-size: 15px;
                    cursor: pointer;
                    padding: 0 2px;
                    line-height: 1;
                }
                .close-x:hover { color: #fff; }
            </style>
            <div class="launcher-pill" id="openHudBtn" title="Launch Noos.AI Webcam Teleprompter">
                <span class="pulse-dot"></span>
                <span>Noos.AI Live Teleprompter</span>
                <button class="close-x" id="dismissLauncherBtn" title="Dismiss">&times;</button>
            </div>
        `;

        (document.body || document.documentElement).appendChild(launcherHost);

        lShadow.getElementById('openHudBtn').addEventListener('click', (e) => {
            if (e.target.id === 'dismissLauncherBtn') return;
            removeLauncherPill();
            openLiveHud();
        });

        lShadow.getElementById('dismissLauncherBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            launcherDismissed = true;
            removeLauncherPill();
        });
    }

    function removeLauncherPill() {
        if (launcherHost) {
            launcherHost.remove();
            launcherHost = null;
        }
    }

    // ─── 4. Webcam-Aligned Floating In-Call HUD ──────────────────────────────
    function openLiveHud() {
        if (hudHost) {
            hudHost.style.display = 'block';
            return;
        }
        removeLauncherPill();

        hudHost = document.createElement('div');
        hudHost.id = 'noosai-live-call-hud';
        shadow = hudHost.attachShadow({ mode: 'open' });

        shadow.innerHTML = `
            <style>
                :host { all: initial; }
                .hud-wrap {
                    position: fixed;
                    top: 12px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 520px;
                    max-width: calc(100vw - 24px);
                    z-index: 2147483646;
                    background: rgba(7, 15, 30, 0.88);
                    backdrop-filter: blur(18px);
                    -webkit-backdrop-filter: blur(18px);
                    border: 1px solid rgba(0, 212, 255, 0.38);
                    border-radius: 16px;
                    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.65), 0 0 24px rgba(0, 200, 255, 0.15);
                    font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    color: #f8fafc;
                    overflow: hidden;
                    user-select: none;
                }
                .hud-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 9px 14px;
                    background: rgba(255, 255, 255, 0.03);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    cursor: move;
                }
                .hud-brand {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 12.5px;
                    font-weight: 700;
                    letter-spacing: 0.4px;
                }
                .brand-cyan { color: #00e5ff; }
                .status-pill {
                    font-size: 10.5px;
                    padding: 2px 8px;
                    border-radius: 999px;
                    background: rgba(255, 255, 255, 0.08);
                    color: #cbd5e1;
                    font-weight: 600;
                }
                .status-pill.live {
                    background: rgba(0, 255, 136, 0.18);
                    color: #00ff88;
                    border: 1px solid rgba(0, 255, 136, 0.4);
                }
                .hud-metrics {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 11px;
                }
                .vibe-pill {
                    padding: 2px 8px;
                    border-radius: 999px;
                    background: rgba(0, 200, 255, 0.14);
                    color: #7dd3fc;
                    font-weight: 600;
                }
                .signal-pill {
                    padding: 2px 8px;
                    border-radius: 999px;
                    background: rgba(16, 185, 129, 0.18);
                    color: #34d399;
                    font-weight: 600;
                    display: none;
                }
                .hud-controls {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .icon-btn {
                    background: rgba(255, 255, 255, 0.06);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    color: #cbd5e1;
                    border-radius: 6px;
                    padding: 3px 8px;
                    font-size: 11px;
                    cursor: pointer;
                    font-family: inherit;
                }
                .icon-btn:hover { background: rgba(255, 255, 255, 0.15); color: #fff; }
                .end-btn {
                    background: rgba(255, 51, 102, 0.2);
                    border-color: rgba(255, 51, 102, 0.5);
                    color: #fda4af;
                    font-weight: 600;
                }
                .end-btn:hover { background: rgba(255, 51, 102, 0.38); color: #fff; }
                .hud-body {
                    padding: 12px 14px;
                }
                .setup-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 9px;
                }
                .setup-row {
                    display: flex;
                    gap: 8px;
                }
                select, input[type="text"] {
                    background: rgba(15, 23, 42, 0.85);
                    border: 1px solid rgba(0, 200, 255, 0.28);
                    border-radius: 8px;
                    color: #f8fafc;
                    padding: 7px 10px;
                    font-size: 12.5px;
                    font-family: inherit;
                    outline: none;
                }
                select { width: 170px; }
                input[type="text"] { flex: 1; user-select: text; }
                .btn-row {
                    display: flex;
                    gap: 8px;
                    margin-top: 2px;
                }
                .primary-btn, .secondary-btn {
                    flex: 1;
                    padding: 8px 12px;
                    border-radius: 9px;
                    font-size: 12.5px;
                    font-weight: 700;
                    cursor: pointer;
                    font-family: inherit;
                    border: none;
                    transition: opacity 0.15s ease;
                }
                .primary-btn {
                    background: linear-gradient(135deg, #00e5ff, #0066ff);
                    color: #04101f;
                }
                .secondary-btn {
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(0, 229, 255, 0.3);
                    color: #e2e8f0;
                }
                .primary-btn:hover, .secondary-btn:hover { opacity: 0.92; }
                .live-view { display: none; }
                .teleprompter-box {
                    background: rgba(15, 23, 42, 0.72);
                    border-left: 3px solid #00ff88;
                    border-radius: 10px;
                    padding: 10px 12px;
                    user-select: text;
                }
                .say-label {
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: #00ff88;
                    font-weight: 700;
                    margin-bottom: 4px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .say-script {
                    font-size: 15px;
                    line-height: 1.42;
                    font-weight: 500;
                    color: #ffffff;
                }
                .tactic-sub {
                    margin-top: 6px;
                    font-size: 11.5px;
                    color: #7dd3fc;
                }
                .transcript-ticker {
                    margin-top: 8px;
                    font-size: 11.5px;
                    color: #94a3b8;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .error-banner {
                    color: #fda4af;
                    font-size: 12px;
                    margin-top: 6px;
                    display: none;
                }
            </style>
            <div class="hud-wrap" id="hudWrap">
                <div class="hud-header" id="hudDragHandle">
                    <div class="hud-brand">
                        <span class="brand-cyan">Noos.AI</span>
                        <span class="status-pill" id="hudStatusPill">Ready</span>
                    </div>
                    <div class="hud-metrics">
                        <span class="vibe-pill" id="hudVibePill" style="display:none;">Vibe —</span>
                        <span class="signal-pill" id="hudSignalPill"></span>
                    </div>
                    <div class="hud-controls">
                        <button class="icon-btn end-btn" id="hudEndBtn" style="display:none;">End &amp; Brief ↗</button>
                        <button class="icon-btn" id="hudMinBtn" title="Minimize">—</button>
                        <button class="icon-btn" id="hudCloseBtn" title="Close">&times;</button>
                    </div>
                </div>
                <div class="hud-body" id="hudBody">
                    <div class="setup-grid" id="hudSetupView">
                        <div class="setup-row">
                            <select id="hudPersona">
                                <option value="sales">Sales Closer</option>
                                <option value="support">Support / De-escalate</option>
                                <option value="negotiation">Negotiator</option>
                                <option value="coach">Executive Coach</option>
                            </select>
                            <input type="text" id="hudContextInput" placeholder="Optional: Deal goal, pricing rules, or prospect notes…" />
                        </div>
                        <div class="btn-row">
                            <button class="primary-btn" id="startTabMicBtn" title="Captures both Tab Audio and your Microphone">▶ Start (Call + Mic Audio)</button>
                            <button class="secondary-btn" id="startMicOnlyBtn" title="Instant start with Microphone only — no share popup">🎙️ Mic Only (Instant)</button>
                        </div>
                        <div class="error-banner" id="hudErrorBanner"></div>
                    </div>

                    <div class="live-view" id="hudLiveView">
                        <div class="teleprompter-box">
                            <div class="say-label">
                                <span id="hudSayHeader">🗣️ TELEPROMPTER • LISTENING FOR SPEECH…</span>
                                <button class="icon-btn" id="hudCopyScriptBtn" style="padding:1px 6px;font-size:10px;">Copy</button>
                            </div>
                            <div class="say-script" id="hudSayScript">Listening to the conversation… speak naturally and your exact response script will stream here in real time.</div>
                            <div class="tactic-sub" id="hudTacticSub"></div>
                        </div>
                        <div class="transcript-ticker" id="hudTranscriptTicker">Waiting for speech…</div>
                    </div>
                </div>
            </div>
        `;

        (document.body || document.documentElement).appendChild(hudHost);

        // Dragging behavior
        const wrap = shadow.getElementById('hudWrap');
        const dragHandle = shadow.getElementById('hudDragHandle');
        let isDragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;

        dragHandle.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            const rect = wrap.getBoundingClientRect();
            wrap.style.transform = 'none';
            wrap.style.left = rect.left + 'px';
            wrap.style.top = rect.top + 'px';
            startX = e.clientX;
            startY = e.clientY;
            origLeft = rect.left;
            origTop = rect.top;
        });
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            wrap.style.left = Math.max(0, origLeft + (e.clientX - startX)) + 'px';
            wrap.style.top = Math.max(0, origTop + (e.clientY - startY)) + 'px';
        });
        window.addEventListener('mouseup', () => { isDragging = false; });

        // Minimize / Close / Copy / Start / End handlers
        const hudBody = shadow.getElementById('hudBody');
        shadow.getElementById('hudMinBtn').addEventListener('click', () => {
            hudBody.style.display = hudBody.style.display === 'none' ? 'block' : 'none';
        });

        shadow.getElementById('hudCloseBtn').addEventListener('click', () => {
            stopLiveHudSession(false);
            hudHost.remove();
            hudHost = null;
            shadow = null;
        });

        shadow.getElementById('hudCopyScriptBtn').addEventListener('click', () => {
            const txt = shadow.getElementById('hudSayScript').textContent.replace(/^[“"]+|[”"]+$/g, '');
            navigator.clipboard.writeText(txt);
            const btn = shadow.getElementById('hudCopyScriptBtn');
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = 'Copy'; }, 1200);
        });

        shadow.getElementById('startTabMicBtn').addEventListener('click', () => startHudCapture(false));
        shadow.getElementById('startMicOnlyBtn').addEventListener('click', () => startHudCapture(true));
        shadow.getElementById('hudEndBtn').addEventListener('click', () => stopLiveHudSession(true));
    }

    async function startHudCapture(micOnly) {
        if (!shadow) return;
        const errBanner = shadow.getElementById('hudErrorBanner');
        errBanner.style.display = 'none';

        try {
            let micStream = null;
            try {
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (e) {
                console.warn('NoosAI HUD: Mic unavailable', e);
            }

            let sysStream = null;
            if (!micOnly) {
                try {
                    sysStream = await navigator.mediaDevices.getDisplayMedia({
                        video: true,
                        audio: { echoCancellation: true, noiseSuppression: true },
                        preferCurrentTab: true,
                        systemAudio: 'include'
                    });
                } catch (e) {
                    if (micStream) micStream.getTracks().forEach(t => t.stop());
                    errBanner.textContent = 'Tab audio share cancelled — click "Mic Only (Instant)" if you only want microphone capture.';
                    errBanner.style.display = 'block';
                    return;
                }
                if (!sysStream.getAudioTracks().length) {
                    if (micStream) micStream.getTracks().forEach(t => t.stop());
                    sysStream.getTracks().forEach(t => t.stop());
                    errBanner.textContent = 'Please check "Also share tab audio" in the popup, or use "Mic Only (Instant)".';
                    errBanner.style.display = 'block';
                    return;
                }
            } else if (!micStream || !micStream.getAudioTracks().length) {
                errBanner.textContent = 'Microphone permission is required for Mic-Only mode.';
                errBanner.style.display = 'block';
                return;
            }

            // Reset session data
            hudSession.persona = shadow.getElementById('hudPersona').value;
            hudSession.callContext = shadow.getElementById('hudContextInput').value.trim();
            hudSession.transcripts = [];
            hudSession.coachingTips = [];
            hudSession.scores = [];
            hudSession.emotions = [];
            hudSession.signals = [];
            hudSession.inflections = [];
            hudSession.arcPoints = [];
            hudSession.talkYou = 50;
            hudSession.talkThem = 50;
            hudSession.startTime = new Date().toISOString();
            hudSession.endTime = null;

            audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            if (audioContext.state === 'suspended') await audioContext.resume();

            const mainGain = audioContext.createGain();
            const sysAnalyser = audioContext.createAnalyser();
            const micAnalyser = audioContext.createAnalyser();

            if (sysStream && sysStream.getAudioTracks().length > 0) {
                const sysSource = audioContext.createMediaStreamSource(sysStream);
                sysSource.connect(mainGain);
                sysSource.connect(sysAnalyser);
            }
            if (micStream && micStream.getAudioTracks().length > 0) {
                const micSource = audioContext.createMediaStreamSource(micStream);
                micSource.connect(mainGain);
                micSource.connect(micAnalyser);
            }

            // Use ScriptProcessor(2048) inside content scripts to guarantee strict host-page CSP compatibility (e.g. Google Meet)
            const processor = audioContext.createScriptProcessor(2048, 1, 1);
            mainGain.connect(processor);
            processor.connect(audioContext.destination);

            mediaStream = new MediaStream([
                ...(micStream ? micStream.getTracks() : []),
                ...(sysStream ? sysStream.getTracks() : [])
            ]);

            const creds = await getCredentials();
            ws = new WebSocket(WS_LIVE_URL);

            ws.onopen = () => {
                shadow.getElementById('hudSetupView').style.display = 'none';
                shadow.getElementById('hudLiveView').style.display = 'block';
                shadow.getElementById('hudEndBtn').style.display = 'inline-block';
                shadow.getElementById('hudVibePill').style.display = 'inline-block';

                const statusPill = shadow.getElementById('hudStatusPill');
                statusPill.classList.add('live');
                startTimeMs = Date.now();
                timerInterval = setInterval(() => {
                    const diff = Date.now() - startTimeMs;
                    const m = Math.floor(diff / 60000).toString().padStart(2, '0');
                    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
                    statusPill.textContent = `● ${m}:${s}`;
                }, 1000);

                ws.send(JSON.stringify({
                    type: 'setup',
                    persona: hudSession.persona,
                    callContext: hudSession.callContext,
                    licenseKey: creds.licenseKey,
                    userId: creds.userId
                }));

                pingInterval = setInterval(() => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'ping' }));
                    }
                }, 15000);
            };

            ws.onmessage = (ev) => {
                try {
                    handleHudMessage(JSON.parse(ev.data));
                } catch (e) {}
            };

            ws.onclose = (ev) => {
                if (ev.code === 1008 && shadow) {
                    stopLiveHudSession(false);
                    const eb = shadow.getElementById('hudErrorBanner');
                    eb.innerHTML = `${ev.reason || 'Live preview limit reached.'} <a href="https://noosai.co.uk/#pricing" target="_blank" style="color:#00e5ff;">Upgrade Plan ↗</a>`;
                    eb.style.display = 'block';
                }
            };

            let hangover = 0;
            let wasSpeaking = false;
            const vadThreshold = 0.0045;

            processor.onaudioprocess = (e) => {
                if (!ws || ws.readyState !== WebSocket.OPEN) return;
                const input = e.inputBuffer.getChannelData(0);
                const pcm = new Int16Array(input.length);
                let sum = 0;
                for (let i = 0; i < input.length; i++) {
                    const v = input[i];
                    sum += v * v;
                    pcm[i] = Math.max(-1, Math.min(1, v)) * 0x7FFF;
                }
                const rms = Math.sqrt(sum / input.length);

                if (rms > vadThreshold) {
                    wasSpeaking = true;
                    hangover = 10;

                    const sysBuf = new Float32Array(sysAnalyser.fftSize);
                    sysAnalyser.getFloatTimeDomainData(sysBuf);
                    let sSum = 0;
                    for (let i = 0; i < sysBuf.length; i++) sSum += sysBuf[i] * sysBuf[i];

                    const micBuf = new Float32Array(micAnalyser.fftSize);
                    micAnalyser.getFloatTimeDomainData(micBuf);
                    let mSum = 0;
                    for (let i = 0; i < micBuf.length; i++) mSum += micBuf[i] * micBuf[i];

                    const speaker = Math.sqrt(mSum / micBuf.length) >= Math.sqrt(sSum / sysBuf.length) ? 'You' : 'Prospect';
                    ws.send(JSON.stringify({ type: 'speaker_state', state: speaker }));
                    ws.send(pcm.buffer);
                } else if (hangover > 0) {
                    hangover--;
                    ws.send(pcm.buffer);
                    if (hangover === 5 && wasSpeaking) {
                        ws.send(JSON.stringify({ type: 'vad_silence' }));
                        wasSpeaking = false;
                    }
                }
            };

        } catch (err) {
            errBanner.textContent = 'Audio error: ' + err.message;
            errBanner.style.display = 'block';
        }
    }

    function handleHudMessage(data) {
        if (!shadow) return;
        switch (data.type) {
            case 'coaching_stream': {
                shadow.getElementById('hudSayHeader').textContent = '⚡ STREAMING LIVE SCRIPT…';
                shadow.getElementById('hudSayScript').textContent = `“${data.previewText}…”`;
                break;
            }
            case 'coaching': {
                const say = data.sayThis || data.text || '';
                const tactic = data.tactic || 'Recommended Move';
                shadow.getElementById('hudSayHeader').textContent = '🗣️ SAY THIS NOW';
                shadow.getElementById('hudSayScript').textContent = `“${say}”`;
                shadow.getElementById('hudTacticSub').textContent = `🎯 ${tactic}`;
                hudSession.coachingTips.push({
                    tip: say,
                    tactic,
                    transcript: data.transcript,
                    turn: data.turn,
                    time: Date.now() - startTimeMs
                });
                break;
            }
            case 'sentiment': {
                const vibeEl = shadow.getElementById('hudVibePill');
                vibeEl.textContent = `Vibe ${Number(data.score).toFixed(1)} • ${data.emotion || ''}`;
                vibeEl.style.color = data.score >= 7 ? '#00ff88' : data.score <= 4 ? '#ff4d6d' : '#facc15';
                hudSession.scores.push({ score: data.score, turn: data.turn, time: Date.now() - startTimeMs });
                if (data.emotion) hudSession.emotions.push(data.emotion);
                break;
            }
            case 'signal': {
                const sigEl = shadow.getElementById('hudSignalPill');
                sigEl.textContent = data.label;
                sigEl.style.display = 'inline-block';
                hudSession.signals.push({ label: data.label, text: data.text, turn: data.turn, time: Date.now() - startTimeMs });
                break;
            }
            case 'inflection': {
                hudSession.inflections.push({ text: data.text, score: data.score, delta: data.delta, turn: data.turn, time: Date.now() - startTimeMs });
                break;
            }
            case 'transcript': {
                shadow.getElementById('hudTranscriptTicker').textContent = data.text;
                hudSession.transcripts.push({ text: data.text, time: Date.now() - startTimeMs });
                break;
            }
            case 'talkRatio': {
                hudSession.talkYou = data.you;
                hudSession.talkThem = data.them;
                break;
            }
            case 'session_limit_reached': {
                stopLiveHudSession(true);
                break;
            }
        }
    }

    function stopLiveHudSession(openReportAfter) {
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
        if (ws) { try { ws.close(); } catch (e) {} ws = null; }
        if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
        if (audioContext) { try { audioContext.close(); } catch (e) {} audioContext = null; }

        hudSession.endTime = new Date().toISOString();

        if (shadow) {
            shadow.getElementById('hudSetupView').style.display = 'flex';
            shadow.getElementById('hudLiveView').style.display = 'none';
            shadow.getElementById('hudEndBtn').style.display = 'none';
            const statusPill = shadow.getElementById('hudStatusPill');
            statusPill.classList.remove('live');
            statusPill.textContent = 'Ready';
        }

        if (openReportAfter && (hudSession.transcripts.length > 0 || hudSession.coachingTips.length > 0)) {
            if (chrome?.storage?.local) {
                chrome.storage.local.set({ pendingHudSessionReport: hudSession }, () => {
                    window.open(STUDIO_REPORT_URL, '_blank');
                });
            } else {
                window.open(STUDIO_REPORT_URL, '_blank');
            }
        }
    }

    // Listen for Popup "Launch In-Call Live HUD" button
    if (chrome?.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
            if (req && req.action === 'toggleLiveCallHud') {
                openLiveHud();
                sendResponse({ success: true });
            }
        });
    }

    // Poll URL on SPA meeting apps (Google Meet / Teams / Zoom) so joining a room surfaces the launcher pill
    let lastCheckedHref = '';
    setInterval(() => {
        if (window.location.href !== lastCheckedHref) {
            lastCheckedHref = window.location.href;
            if (isActiveMeetingUrl()) {
                showMeetingLauncherPill();
            }
        }
    }, 2000);
})();
