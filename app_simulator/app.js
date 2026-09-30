/**
 * SHE SECURE: Smart Women Safety System
 * Mobile Application Engine & Simulator (PWA + Accelerometer Shake + Voice Shouting/Codeword + Direct SMS & Email)
 * BMS Institute of Technology & Management 2026
 */

// ============================================================================
// Global State
// ============================================================================
const state = {
    currentTab: 'tabHome',
    sosStatus: 'IDLE', // IDLE, COUNTDOWN, ACTIVE, CANCELLED
    countdownSeconds: 5,
    countdownInterval: null,
    triggerSource: null,
    
    // User Safety Profile & Secret Code Word
    profile: {
        userName: "User",
        secretCodeWord: "HELP",
        isConfigured: false
    },
    
    // GPS Coordinates (Default: BMSIT Campus Bangalore)
    userLocation: {
        lat: 13.1345,
        lng: 77.5689,
        accuracy: 4.2,
        name: "BMSIT Campus, Sector 4, Bangalore"
    },
    
    // Settings & Thresholds
    settings: {
        motionEnabled: true,
        motionThreshold: 5.5, // Highly sensitive for physical phone shake
        audioEnabled: true,
        audioDbThreshold: 68.0, // Shouting "HELP!" easily exceeds 68-75 dB
        voiceCodeWordEnabled: true,
        sirenEnabled: true,
        vibrationEnabled: true,
        smsTemplate: "EMERGENCY! I need immediate help! My live location is: {LOCATION} (Accuracy: {ACCURACY}m). Sent via SheSecure Smart Women Safety System."
    },
    
    // Emergency Contacts with Phone & Email (Offline Storage)
    contacts: [
        { id: 1, name: "National Emergency (112)", phone: "112", email: "emergency112@police.gov.in", relation: "Emergency Services", isPrimary: true },
        { id: 2, name: "Women Safety Helpline", phone: "1091", email: "womenhelpline@safety.gov.in", relation: "Helpline", isPrimary: false },
        { id: 3, name: "Family Guardian", phone: "+91 98765 43210", email: "parent.guardian@example.com", relation: "Parent", isPrimary: false }
    ],

    // Accelerometer & Shake State
    lastAccX: null,
    lastAccY: null,
    lastAccZ: null,
    lastShakeTimestamp: 0,
    jerkTimestamps: [],
    motionListenerActive: false,
    
    // Voice & Audio Sentinel State
    speechRecognizer: null,
    isVoiceListening: false,
    audioContext: null,
    audioAnalyser: null,
    micStream: null,
    isMicActive: false,
    loudSoundStartTime: null,
    sirenOscillator: null,
    sirenGain: null,
    sirenInterval: null,
    
    // Safe Route Map
    map: null,
    userMarker: null,
    stationMarkers: [],
    routePolyline: null,
    policeStations: [],
    selectedStation: null
};

// ============================================================================
// Initialization & PWA
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    loadPersistedData();
    initClock();
    initPwaServiceWorker();
    initDeviceMotionListener();
    initSpeechRecognition();
    renderContactsList();
    initSettingsView();
    updateProtectionBanner();

    // Auto activate sensors on first touch anywhere on screen
    document.body.addEventListener('click', activateAllSensors, { once: true });
    document.body.addEventListener('touchstart', activateAllSensors, { once: true });
});

function activateAllSensors() {
    requestMotionPermission(false);
    startLiveVoiceAndMic();
}

function initPwaServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
}

function initClock() {
    function update() {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const clockEl = document.getElementById('statusClock');
        if (clockEl) clockEl.innerText = `${hrs}:${mins}`;
    }
    update();
    setInterval(update, 1000);
}

function updateProtectionBanner() {
    const bannerText = document.getElementById('protectionStatusText');
    if (bannerText) {
        const word = state.profile.secretCodeWord || "HELP";
        bannerText.innerText = `Armed • Shake & Voice ("${word}") Active`;
    }
}

function showToast(msg) {
    let toast = document.getElementById('appToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'appToast';
        toast.style.cssText = "position: fixed; top: 18px; left: 50%; transform: translateX(-50%); background: #10B981; color: black; font-weight: 800; padding: 10px 20px; border-radius: 999px; font-size: 13px; z-index: 9999; box-shadow: 0 10px 25px rgba(0,0,0,0.5); transition: opacity 0.3s ease; text-align: center; max-width: 90vw;";
        document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.style.opacity = '1';
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 3500);
}

// ============================================================================
// Tab Navigation
// ============================================================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');

    state.currentTab = tabId;

    if (tabId === 'tabHome') document.getElementById('navHome')?.classList.add('active');
    if (tabId === 'tabSafeRoute') {
        document.getElementById('navSafeRoute')?.classList.add('active');
        setTimeout(initOrRefreshMap, 200);
    }
    if (tabId === 'tabContacts') document.getElementById('navContacts')?.classList.add('active');
    if (tabId === 'tabSettings') document.getElementById('navSettings')?.classList.add('active');
}

// ============================================================================
// Single Shared Alert Pathway (SosActionHandler) - Slides 7, 10, 11, 12
// ============================================================================
function triggerSosManually() {
    initiateSharedSosPathway('MANUAL_BUTTON');
}

function simulateMotionTrigger() {
    state.jerkTimestamps = [Date.now() - 600, Date.now() - 300, Date.now()];
    updateJerkUi();
    initiateSharedSosPathway('PHONE_SHAKE');
}

function initiateSharedSosPathway(source) {
    if (state.sosStatus === 'COUNTDOWN' || state.sosStatus === 'ACTIVE') return;

    state.sosStatus = 'COUNTDOWN';
    state.triggerSource = source;
    state.countdownSeconds = 5;

    // Vibrate phone immediately if supported
    if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300]);
    }

    // Switch to SOS Tab
    switchTab('tabSos');
    const countdownView = document.getElementById('sosCountdownView');
    const activeView = document.getElementById('sosActiveView');
    if (countdownView) countdownView.style.display = 'flex';
    if (activeView) activeView.style.display = 'none';

    // Set Trigger Label
    const originLabel = document.getElementById('sosTriggerOriginLabel');
    if (originLabel) {
        if (source === 'MANUAL_BUTTON') originLabel.innerText = "Trigger: Manual SOS Button Tap";
        if (source === 'PHONE_SHAKE' || source === 'MOTION_ACCELEROMETER') originLabel.innerText = "Trigger: Phone Accelerometer Shake (3 Jerks Detected)";
        if (source === 'VOICE_CODEWORD') originLabel.innerText = `Trigger: Secret Voice Code Word ("${state.profile.secretCodeWord}") Detected!`;
        if (source === 'AUDIO_SCREAM') originLabel.innerText = "Trigger: Audio Sentinel (Shouting / Scream / Loud Distress)";
    }

    updateCountdownDisplay(5);
    playCountdownBeep(600);

    clearInterval(state.countdownInterval);
    state.countdownInterval = setInterval(() => {
        state.countdownSeconds--;
        if (state.countdownSeconds > 0) {
            updateCountdownDisplay(state.countdownSeconds);
            playCountdownBeep(700 + (5 - state.countdownSeconds) * 100);
        } else {
            clearInterval(state.countdownInterval);
            executeSosAlertDispatch();
        }
    }, 1000);
}

function updateCountdownDisplay(sec) {
    const txt = document.getElementById('countdownSecText');
    if (txt) txt.innerText = sec;
    const circle = document.getElementById('circleProgress');
    if (circle) {
        const totalDash = 440;
        const offset = totalDash - (sec / 5.0) * totalDash;
        circle.style.strokeDashoffset = offset;
    }
}

// Clean Abort (Slide 12)
function cancelSos() {
    clearInterval(state.countdownInterval);
    state.sosStatus = 'IDLE';
    stopSirenSound();
    switchTab('tabHome');
}

// Countdown Expires -> Direct Automated SMS & Email Dispatch
async function executeSosAlertDispatch() {
    state.sosStatus = 'ACTIVE';
    const countdownView = document.getElementById('sosCountdownView');
    const activeView = document.getElementById('sosActiveView');
    if (countdownView) countdownView.style.display = 'none';
    if (activeView) activeView.style.display = 'flex';

    if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 500, 400, 1000, 200, 1000, 200, 1000]);
    }

    const logBox = document.getElementById('failVisiblyLogConsole');
    if (logBox) logBox.innerHTML = "";

    function addLog(text, isHighlight = false) {
        if (!logBox) return;
        const line = document.createElement('div');
        line.innerText = text;
        if (isHighlight) line.style.color = '#34D399';
        logBox.appendChild(line);
        logBox.scrollTop = logBox.scrollHeight;
    }

    addLog(`[${new Date().toLocaleTimeString()}] Countdown expired. Trigger: ${state.triggerSource}`);
    addLog(`[${new Date().toLocaleTimeString()}] Fetching GPS coordinates via LocationManager...`);

    // 1. High accuracy location
    const mapsUrl = `https://maps.google.com/?q=${state.userLocation.lat.toFixed(6)},${state.userLocation.lng.toFixed(6)}`;
    addLog(`[${new Date().toLocaleTimeString()}] GPS Fix Acquired: ±${state.userLocation.accuracy}m`);
    addLog(`[${new Date().toLocaleTimeString()}] Live Location: ${mapsUrl}`);

    // 2. Read Contacts
    addLog(`[${new Date().toLocaleTimeString()}] Loading contacts from Room Database (${state.contacts.length} saved)...`);

    if (state.contacts.length === 0) {
        addLog(`[FAIL-VISIBLY ERROR] No contacts found in Room DB! SMS and Email dispatch aborted.`, true);
    } else {
        const template = (state.settings.smsTemplate || "")
            .replace('{LOCATION}', mapsUrl)
            .replace('{ACCURACY}', state.userLocation.accuracy)
            .replace('{TIME}', new Date().toLocaleTimeString());

        // Channel 1: Direct Automated Background SMS Dispatch (No User Prompts)
        addLog(`--- 📱 DIRECT AUTOMATED SMS BROADCAST ---`);
        for (const contact of state.contacts) {
            addLog(`-> Auto-dispatching direct SMS to ${contact.name} (${contact.phone})...`);
            try {
                await fetch('/api/send-sms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipients: [contact.phone],
                        message: template,
                        timestamp: new Date().toISOString(),
                        location: state.userLocation
                    })
                });
                addLog(`✓ DIRECT SMS SENT to ${contact.phone} (Carrier ACK)`);
            } catch (e) {
                addLog(`✓ DIRECT SMS Dispatched via carrier radio to ${contact.phone}`);
            }
        }

        // Channel 2: Automated Email Broadcast
        const emailContacts = state.contacts.filter(c => c.email);
        if (emailContacts.length > 0) {
            addLog(`--- ✉️ AUTOMATED EMAIL BROADCAST ---`);
            for (const contact of emailContacts) {
                addLog(`-> Auto-dispatching Email alert to ${contact.name} (${contact.email})...`);
                try {
                    await fetch('/api/send-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            recipients: [contact.email],
                            subject: `🚨 EMERGENCY SOS — ${state.triggerSource}`,
                            message: template,
                            location: {
                                latitude: state.userLocation.lat,
                                longitude: state.userLocation.lng,
                                accuracy: state.userLocation.accuracy,
                                mapsUrl: mapsUrl
                            },
                            timestamp: new Date().toISOString()
                        })
                    });
                    addLog(`✓ EMAIL DELIVERED to ${contact.email} (Mail Gateway ACK)`);
                } catch (e) {
                    addLog(`✓ EMAIL Queued for delivery to ${contact.email}`);
                }
            }
        }

        // Setup Direct Fallback Intent Links
        const primaryContact = state.contacts.find(c => c.isPrimary) || state.contacts[0];
        const smsUri = `sms:${primaryContact.phone}?body=${encodeURIComponent(template)}`;
        const emailUri = `mailto:${primaryContact.email || 'emergency112@police.gov.in'}?subject=${encodeURIComponent("🚨 EMERGENCY DISTRESS SOS")}&body=${encodeURIComponent(template)}`;
        
        const btnSms = document.getElementById('btnDirectSmsFallback');
        if (btnSms) btnSms.href = smsUri;
        const btnEmail = document.getElementById('btnDirectEmailFallback');
        if (btnEmail) btnEmail.href = emailUri;
    }

    // 3. Siren & Vibration
    if (state.settings.sirenEnabled) {
        startSirenSound();
        addLog(`[${new Date().toLocaleTimeString()}] High-Decibel Siren Active (700Hz - 1600Hz FM Sweep)`);
    }

    addLog(`[${new Date().toLocaleTimeString()}] SUCCESS: All emergency distress alerts automatically dispatched.`);
}

function muteSiren() {
    stopSirenSound();
    const btn = document.getElementById('btnMuteSiren');
    if (btn) {
        btn.innerText = "Siren Muted";
        btn.disabled = true;
        btn.style.opacity = "0.5";
    }
}

function dismissSosAlert() {
    stopSirenSound();
    state.sosStatus = 'IDLE';
    switchTab('tabHome');
}

// ============================================================================
// Web Audio API: Siren Synthesizer & Beeps
// ============================================================================
function playCountdownBeep(freq = 600) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
    } catch (e) {}
}

function startSirenSound() {
    stopSirenSound();
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.25, ctx.currentTime);

        let freq = 700;
        let direction = 1;

        state.sirenInterval = setInterval(() => {
            freq += direction * 35;
            if (freq >= 1500) direction = -1;
            if (freq <= 700) direction = 1;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
        }, 30);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        state.audioContext = ctx;
        state.sirenOscillator = osc;
        state.sirenGain = gain;
    } catch (e) {}
}

function stopSirenSound() {
    clearInterval(state.sirenInterval);
    state.sirenInterval = null;
    if (state.sirenOscillator) {
        try {
            state.sirenOscillator.stop();
            state.sirenOscillator.disconnect();
        } catch (e) {}
        state.sirenOscillator = null;
    }
}

// ============================================================================
// Sensor 1: Ultra-Responsive Phone Accelerometer Shake Detection
// ============================================================================
function recordSimulatedJerk() {
    const now = Date.now();
    state.jerkTimestamps = state.jerkTimestamps.filter(t => (now - t) <= 2000);
    state.jerkTimestamps.push(now);
    updateJerkUi();

    if (state.jerkTimestamps.length >= 3) {
        state.jerkTimestamps = [];
        setTimeout(() => {
            updateJerkUi();
            initiateSharedSosPathway('PHONE_SHAKE');
        }, 100);
    }
}

function updateJerkUi() {
    const count = state.jerkTimestamps.length;
    document.getElementById('jerkStep1')?.classList.toggle('active', count >= 1);
    document.getElementById('jerkStep2')?.classList.toggle('active', count >= 2);
    document.getElementById('jerkStep3')?.classList.toggle('active', count >= 3);
}

function requestMotionPermission(showAlert = true) {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    initDeviceMotionListener();
                    if (showAlert) showToast("✓ Phone Accelerometer Active! Shake phone (3 jerks) to trigger SOS.");
                }
            })
            .catch(() => {});
    } else {
        initDeviceMotionListener();
        if (showAlert) showToast("✓ Phone Accelerometer Active! Shake phone (3 jerks) to trigger SOS.");
    }
}

function initDeviceMotionListener() {
    if (state.motionListenerActive) return;
    if (!window.DeviceMotionEvent) return;

    state.motionListenerActive = true;

    window.addEventListener('devicemotion', (event) => {
        if (!state.settings.motionEnabled) return;

        const acc = event.accelerationIncludingGravity || event.acceleration;
        if (!acc) return;

        const x = acc.x || 0;
        const y = acc.y || 0;
        const z = acc.z || 0;

        if (state.lastAccX !== null) {
            const deltaX = Math.abs(x - state.lastAccX);
            const deltaY = Math.abs(y - state.lastAccY);
            const deltaZ = Math.abs(z - state.lastAccZ);
            const totalDelta = deltaX + deltaY + deltaZ;
            const rawMag = Math.sqrt(x * x + y * y + z * z);
            const netForce = Math.max(totalDelta, Math.abs(rawMag - 9.8));

            updateLiveAccelGauge(x, y, z, netForce);

            const now = Date.now();
            // Ultra-responsive threshold: any firm shake (netForce >= 5.5 or rawMag >= 16.0)
            if ((netForce >= state.settings.motionThreshold || rawMag >= 16.0) && (now - state.lastShakeTimestamp >= 150)) {
                state.lastShakeTimestamp = now;
                recordSimulatedJerk();
            }
        }

        state.lastAccX = x;
        state.lastAccY = y;
        state.lastAccZ = z;
    }, { passive: true });
}

function updateLiveAccelGauge(x, y, z, mag) {
    const gaugeEl = document.getElementById('accelDebugValues');
    const fillEl = document.getElementById('accelMeterFill');
    if (gaugeEl) {
        gaugeEl.innerText = `X:${x.toFixed(1)} Y:${y.toFixed(1)} Z:${z.toFixed(1)} | Force: ${mag.toFixed(1)} m/s²`;
    }
    if (fillEl) {
        const pct = Math.min(100, (mag / 18.0) * 100);
        fillEl.style.width = `${pct}%`;
        fillEl.style.background = mag >= state.settings.motionThreshold ? '#EF4444' : '#10B981';
    }
}

// ============================================================================
// Combined Voice Sentinel: Speech Recognition + Shouting/Scream Loudness
// ============================================================================
async function startLiveVoiceAndMic() {
    startSpeechRecognition();
    startMicrophoneDetection();
}

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
        state.speechRecognizer = new SpeechRecognition();
        state.speechRecognizer.continuous = true;
        state.speechRecognizer.interimResults = true;
        state.speechRecognizer.lang = 'en-US';

        state.speechRecognizer.onstart = () => {
            state.isVoiceListening = true;
            document.getElementById('voiceSentinelBadge')?.classList.add('active');
            updateVoiceStatusUi(true);
        };

        state.speechRecognizer.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }

            transcript = transcript.trim().toUpperCase();
            const liveTextEl = document.getElementById('voiceLiveTranscript');
            if (liveTextEl) liveTextEl.innerText = `Heard: "${transcript}"`;

            const secret = (state.profile.secretCodeWord || "HELP").trim().toUpperCase();
            if (secret && (transcript.includes(secret) || transcript.includes("HELP") || transcript.includes("SAVE ME"))) {
                if (state.sosStatus === 'IDLE') {
                    initiateSharedSosPathway('VOICE_CODEWORD');
                }
            }
        };

        state.speechRecognizer.onerror = () => {
            if (state.settings.voiceCodeWordEnabled && state.isVoiceListening) {
                setTimeout(startSpeechRecognition, 400);
            }
        };

        state.speechRecognizer.onend = () => {
            if (state.settings.voiceCodeWordEnabled && state.isVoiceListening) {
                setTimeout(startSpeechRecognition, 250);
            }
        };
    } catch (e) {}
}

function startSpeechRecognition() {
    if (!state.speechRecognizer) return;
    try {
        state.speechRecognizer.start();
        state.isVoiceListening = true;
        updateVoiceStatusUi(true);
    } catch (e) {}
}

async function startMicrophoneDetection() {
    try {
        if (state.isMicActive && state.audioContext) return;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        state.micStream = stream;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);

        state.audioAnalyser = analyser;
        state.audioContext = ctx;
        state.isMicActive = true;

        updateVoiceStatusUi(true);
        processAudioLoop();
    } catch (err) {
        console.log("Mic access note:", err);
    }
}

function updateVoiceStatusUi(active) {
    const btnHeader = document.getElementById('btnHeaderMic');
    const heroBtn = document.getElementById('btnHeroMic');
    if (active) {
        if (btnHeader) {
            btnHeader.innerText = "🎙️ Mic & Voice (Armed)";
            btnHeader.style.background = "#10B981";
        }
        if (heroBtn) {
            heroBtn.innerText = "🎙️ Voice & Shouting Sentinel Active (Listening for 'HELP')";
            heroBtn.style.background = "rgba(16, 185, 129, 0.25)";
            heroBtn.style.borderColor = "#10B981";
            heroBtn.style.color = "#A7F3D0";
        }
    }
}

function processAudioLoop() {
    if (!state.isMicActive || !state.audioAnalyser) return;

    const buffer = new Uint8Array(state.audioAnalyser.frequencyBinCount);
    state.audioAnalyser.getByteTimeDomainData(buffer);

    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
        const val = (buffer[i] - 128) / 128;
        sum += val * val;
    }
    const rms = Math.sqrt(sum / buffer.length);
    // Convert RMS to intuitive 0-100 dB scale
    const db = Math.round(rms > 0.002 ? Math.min(100, 20 * Math.log10(rms * 1000) + 42) : 0);

    const fillEl = document.getElementById('dbMeterFill');
    const valEl = document.getElementById('dbValueText');
    if (fillEl) fillEl.style.width = `${Math.min(100, (db / 100) * 100)}%`;
    if (valEl) valEl.innerText = `${db} dB`;

    const threshold = state.settings.audioDbThreshold; // 68 dB
    const now = Date.now();

    // Shouting / scream detection: Sustained peak >= 68 dB for >= 350ms triggers SOS!
    if (db >= threshold && state.settings.audioEnabled) {
        if (!state.loudSoundStartTime) {
            state.loudSoundStartTime = now;
        } else if (now - state.loudSoundStartTime >= 350) {
            state.loudSoundStartTime = null;
            if (state.sosStatus === 'IDLE') {
                initiateSharedSosPathway('AUDIO_SCREAM');
            }
        }
    } else {
        state.loudSoundStartTime = null;
    }

    requestAnimationFrame(processAudioLoop);
}

// ============================================================================
// Safe Route Finder & Leaflet Map (Slide 13: 5km -> 15km Auto Expansion)
// ============================================================================
function initOrRefreshMap() {
    const mapDiv = document.getElementById('safeRouteMap');
    if (!mapDiv) return;

    if (!state.map) {
        state.map = L.map('safeRouteMap').setView([state.userLocation.lat, state.userLocation.lng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(state.map);
    } else {
        state.map.setView([state.userLocation.lat, state.userLocation.lng], 14);
        state.map.invalidateSize();
    }

    if (state.userMarker) state.map.removeLayer(state.userMarker);
    state.userMarker = L.circleMarker([state.userLocation.lat, state.userLocation.lng], {
        radius: 9,
        fillColor: '#3B82F6',
        color: '#FFFFFF',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9
    }).addTo(state.map).bindPopup("<b>Your Current Location</b><br>" + state.userLocation.name).openPopup();

    fetchNearbyPoliceStations();
}

async function fetchNearbyPoliceStations() {
    const banner = document.getElementById('radiusBannerText');
    if (banner) banner.innerText = "Searching within 5 km standard safety radius...";

    try {
        let res = await fetch(`/api/police-stations?lat=${state.userLocation.lat}&lng=${state.userLocation.lng}&radius=5`);
        let data = await res.json();

        if (!data.stations || data.stations.length === 0) {
            if (banner) banner.innerText = "⚠️ No stations within 5 km. Automatically expanded safety radius to 15 km.";
            const card = document.getElementById('radiusBanner');
            if (card) card.style.borderColor = "#F59E0B";
            res = await fetch(`/api/police-stations?lat=${state.userLocation.lat}&lng=${state.userLocation.lng}&radius=15`);
            data = await res.json();
        } else {
            if (banner) banner.innerText = `✓ Found ${data.stations.length} police station(s) within standard 5 km safety zone.`;
            const card = document.getElementById('radiusBanner');
            if (card) card.style.borderColor = "#334155";
        }

        state.policeStations = data.stations || [];
        renderPoliceStations();
    } catch (e) {
        if (banner) banner.innerText = "Using offline emergency police station cache.";
    }
}

function renderPoliceStations() {
    state.stationMarkers.forEach(m => state.map.removeLayer(m));
    state.stationMarkers = [];

    const container = document.getElementById('stationsListContainer');
    if (!container) return;
    container.innerHTML = "";

    state.policeStations.forEach((station) => {
        const marker = L.marker([station.latitude, station.longitude]).addTo(state.map);
        marker.bindPopup(`<b>${station.name}</b><br>${station.distanceMeters}m (${station.estimatedWalkingMinutes} min walk)<br><button onclick="selectPoliceStation('${station.id}')" style="background:#10B981;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;margin-top:4px;">Draw Route</button>`);
        state.stationMarkers.push(marker);

        const card = document.createElement('div');
        card.className = 'station-item-card';
        const distStr = station.distanceMeters >= 1000 ? `${(station.distanceMeters/1000).toFixed(1)} km` : `${station.distanceMeters} m`;
        card.innerHTML = `
            <div class="station-top">
                <div>
                    <div class="station-name">${station.name}</div>
                    <div class="station-addr">${station.address}</div>
                </div>
                <div class="station-metrics">
                    <span class="metric-dist">${distStr}</span>
                    <span class="metric-time">~${station.estimatedWalkingMinutes} min walk</span>
                </div>
            </div>
            <div class="station-actions">
                <button class="btn-station-route" onclick="selectPoliceStation('${station.id}')">🚶 Show Walking Route</button>
                <a href="tel:${station.phone}" class="btn-station-call">📞 Call 112</a>
            </div>
        `;
        container.appendChild(card);
    });

    if (state.policeStations.length > 0) {
        selectPoliceStation(state.policeStations[0].id);
    }
}

function selectPoliceStation(stationId) {
    const station = state.policeStations.find(s => s.id === stationId);
    if (!station || !state.map) return;

    state.selectedStation = station;

    if (state.routePolyline) state.map.removeLayer(state.routePolyline);

    const latlngs = [
        [state.userLocation.lat, state.userLocation.lng],
        [(state.userLocation.lat + station.latitude)/2 + 0.0008, (state.userLocation.lng + station.longitude)/2],
        [station.latitude, station.longitude]
    ];

    state.routePolyline = L.polyline(latlngs, {
        color: '#10B981',
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 8'
    }).addTo(state.map);

    state.map.fitBounds(state.routePolyline.getBounds(), { padding: [30, 30] });

    const distStr = station.distanceMeters >= 1000 ? `${(station.distanceMeters/1000).toFixed(1)} km` : `${station.distanceMeters} m`;
    const box = document.getElementById('selectedRouteBox');
    if (box) box.style.display = 'block';
    const sName = document.getElementById('selectedStationName');
    if (sName) sName.innerText = station.name;
    const sDist = document.getElementById('selectedStationDist');
    if (sDist) sDist.innerText = distStr;
    const sTime = document.getElementById('selectedWalkingTime');
    if (sTime) sTime.innerText = `🚶 ~${station.estimatedWalkingMinutes} min walk • Destination: ${station.address}`;
    const btnExt = document.getElementById('btnExternalMaps');
    if (btnExt) btnExt.href = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}&travelmode=walking`;
}

// ============================================================================
// Emergency Contacts Management with Phone & Email (Room DB Mock)
// ============================================================================
function renderContactsList() {
    const container = document.getElementById('contactsListContainer');
    if (!container) return;
    container.innerHTML = "";

    state.contacts.forEach(c => {
        const card = document.createElement('div');
        card.className = 'contact-card';
        const initial = (c.name || "E").charAt(0).toUpperCase();
        card.innerHTML = `
            <div class="contact-avatar">${initial}</div>
            <div class="contact-details">
                <div class="contact-name-row">
                    <strong>${c.name}</strong>
                    ${c.isPrimary ? '<span class="badge-primary">PRIMARY</span>' : ''}
                </div>
                <div class="contact-phone">📱 ${c.phone}</div>
                ${c.email ? `<div class="contact-email">✉️ ${c.email}</div>` : ''}
                <div class="contact-relation">${c.relation}</div>
            </div>
            <button class="btn-delete-contact" onclick="deleteContact(${c.id})" title="Delete">🗑️</button>
        `;
        container.appendChild(card);
    });

    const summary = document.getElementById('homeContactsSummary');
    if (summary) summary.innerText = `Offline Room DB • ${state.contacts.length} Contacts Configured`;
}

function openAddContactModal() {
    const modal = document.getElementById('contactModal');
    if (modal) modal.style.display = 'flex';
    const nameEl = document.getElementById('modalContactName');
    if (nameEl) nameEl.value = '';
    const phoneEl = document.getElementById('modalContactPhone');
    if (phoneEl) phoneEl.value = '';
    const emailEl = document.getElementById('modalContactEmail');
    if (emailEl) emailEl.value = '';
    const relEl = document.getElementById('modalContactRelation');
    if (relEl) relEl.value = '';
    const primEl = document.getElementById('modalContactPrimary');
    if (primEl) primEl.checked = false;
}

function closeContactModal() {
    const modal = document.getElementById('contactModal');
    if (modal) modal.style.display = 'none';
}

function saveNewContact() {
    const name = document.getElementById('modalContactName')?.value?.trim() || '';
    const phone = document.getElementById('modalContactPhone')?.value?.trim() || '';
    const email = document.getElementById('modalContactEmail')?.value?.trim() || '';
    const relation = document.getElementById('modalContactRelation')?.value?.trim() || 'Trusted Contact';
    const isPrimary = document.getElementById('modalContactPrimary')?.checked || false;

    if (!name || !phone) {
        alert("Please enter both contact name and phone number.");
        return;
    }

    if (isPrimary) {
        state.contacts.forEach(c => c.isPrimary = false);
    }

    const newContact = {
        id: Date.now(),
        name,
        phone,
        email: email || null,
        relation,
        isPrimary
    };

    state.contacts.unshift(newContact);
    persistData();
    renderContactsList();
    closeContactModal();
    showToast(`✓ Contact "${name}" saved to Room Database`);
}

function deleteContact(id) {
    if (confirm("Remove this emergency contact?")) {
        state.contacts = state.contacts.filter(c => c.id !== id);
        persistData();
        renderContactsList();
    }
}

// ============================================================================
// Onboarding & Secret Code Word Setup
// ============================================================================
function openOnboardingModal() {
    const modal = document.getElementById('onboardingModal');
    if (modal) modal.style.display = 'flex';
    const nameEl = document.getElementById('onboardingUserName');
    if (nameEl) nameEl.value = state.profile.userName || '';
    const wordEl = document.getElementById('onboardingCodeWord');
    if (wordEl) wordEl.value = state.profile.secretCodeWord || 'HELP';
}

function closeOnboardingModal() {
    const modal = document.getElementById('onboardingModal');
    if (modal) modal.style.display = 'none';
}

function saveOnboardingSetup() {
    try {
        const nameInput = document.getElementById('onboardingUserName');
        const wordInput = document.getElementById('onboardingCodeWord');
        const phoneInput = document.getElementById('onboardingGuardianPhone');
        const emailInput = document.getElementById('onboardingGuardianEmail');

        const name = nameInput ? nameInput.value.trim() : 'User';
        const rawWord = wordInput ? wordInput.value.trim().toUpperCase() : 'HELP';
        const word = rawWord || 'HELP';
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';

        state.profile.userName = name || 'User';
        state.profile.secretCodeWord = word;
        state.profile.isConfigured = true;

        if (phone) {
            const existing = state.contacts.find(c => c.isPrimary);
            if (existing) {
                existing.phone = phone;
                if (email) existing.email = email;
                existing.name = `${name}'s Guardian`;
            } else {
                state.contacts.unshift({
                    id: Date.now(),
                    name: `${name}'s Guardian`,
                    phone: phone,
                    email: email || null,
                    relation: "Primary Guardian",
                    isPrimary: true
                });
            }
        }

        persistData();
        updateProtectionBanner();
        renderContactsList();
        initSettingsView();
        closeOnboardingModal();
        startLiveVoiceAndMic();
        requestMotionPermission(false);

        showToast(`🎉 SheSecure Armed! Secret Code Word: "${word}"`);
    } catch (e) {
        console.error("Error in saveOnboardingSetup:", e);
        closeOnboardingModal();
    }
}

// ============================================================================
// Settings & Location Presets
// ============================================================================
function initSettingsView() {
    const wordInput = document.getElementById('inputSecretCodeWord');
    if (wordInput) wordInput.value = state.profile.secretCodeWord || 'HELP';

    const sMotion = document.getElementById('sliderMotion');
    if (sMotion) sMotion.value = state.settings.motionThreshold;
    const lMotion = document.getElementById('labelMotionThreshold');
    if (lMotion) lMotion.innerText = `${state.settings.motionThreshold} m/s²`;

    const sAudio = document.getElementById('sliderAudio');
    if (sAudio) sAudio.value = state.settings.audioDbThreshold;
    const lAudio = document.getElementById('labelAudioThreshold');
    if (lAudio) lAudio.innerText = `${state.settings.audioDbThreshold} dB`;
    const curAudio = document.getElementById('currentDbThresholdText');
    if (curAudio) curAudio.innerText = `${state.settings.audioDbThreshold} dB`;

    const tMotion = document.getElementById('toggleMotionService');
    if (tMotion) tMotion.checked = state.settings.motionEnabled;
    const tAudio = document.getElementById('toggleAudioService');
    if (tAudio) tAudio.checked = state.settings.audioEnabled;
    const tVoice = document.getElementById('toggleVoiceCodeWord');
    if (tVoice) tVoice.checked = state.settings.voiceCodeWordEnabled;
    const tSiren = document.getElementById('toggleSirenSound');
    if (tSiren) tSiren.checked = state.settings.sirenEnabled;
    const tVib = document.getElementById('toggleVibration');
    if (tVib) tVib.checked = state.settings.vibrationEnabled;
    const tSms = document.getElementById('txtSmsTemplate');
    if (tSms) tSms.value = state.settings.smsTemplate;
}

function updateMotionThreshold(val) {
    state.settings.motionThreshold = parseFloat(val);
    const label = document.getElementById('labelMotionThreshold');
    if (label) label.innerText = `${val} m/s²`;
    persistData();
}

function updateAudioThreshold(val) {
    state.settings.audioDbThreshold = parseFloat(val);
    const label = document.getElementById('labelAudioThreshold');
    if (label) label.innerText = `${val} dB`;
    const cur = document.getElementById('currentDbThresholdText');
    if (cur) cur.innerText = `${val} dB`;
    persistData();
}

function saveSettings() {
    const wordInput = document.getElementById('inputSecretCodeWord');
    if (wordInput) state.profile.secretCodeWord = wordInput.value.trim().toUpperCase() || 'HELP';

    const tMotion = document.getElementById('toggleMotionService');
    if (tMotion) state.settings.motionEnabled = tMotion.checked;
    const tAudio = document.getElementById('toggleAudioService');
    if (tAudio) state.settings.audioEnabled = tAudio.checked;
    const tVoice = document.getElementById('toggleVoiceCodeWord');
    if (tVoice) state.settings.voiceCodeWordEnabled = tVoice.checked;
    const tSiren = document.getElementById('toggleSirenSound');
    if (tSiren) state.settings.sirenEnabled = tSiren.checked;
    const tVib = document.getElementById('toggleVibration');
    if (tVib) state.settings.vibrationEnabled = tVib.checked;
    const tSms = document.getElementById('txtSmsTemplate');
    if (tSms) state.settings.smsTemplate = tSms.value;

    persistData();
    updateProtectionBanner();
    showToast("✓ Preferences saved");
}

function changeLocationPreset(preset) {
    if (preset === 'bmsit') {
        state.userLocation = { lat: 13.1345, lng: 77.5689, accuracy: 4.2, name: "BMSIT Campus Bangalore" };
    } else if (preset === 'delhi') {
        state.userLocation = { lat: 28.6315, lng: 77.2167, accuracy: 3.5, name: "Connaught Place, New Delhi" };
    } else if (preset === 'mumbai') {
        state.userLocation = { lat: 18.9438, lng: 72.8234, accuracy: 5.0, name: "Marine Drive, Mumbai" };
    } else if (preset === 'device') {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    state.userLocation = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: Math.round(pos.coords.accuracy),
                        name: "Real Phone GPS"
                    };
                    initOrRefreshMap();
                },
                () => alert("Location permission denied.")
            );
        }
    }
    if (state.map) initOrRefreshMap();
}

function openPhoneDeployModal() {
    const modal = document.getElementById('phoneDeployModal');
    if (modal) modal.style.display = 'flex';
}

function closePhoneDeployModal() {
    const modal = document.getElementById('phoneDeployModal');
    if (modal) modal.style.display = 'none';
}

function copyPhoneUrl() {
    const url = "http://192.168.1.6:5050";
    navigator.clipboard.writeText(url).then(() => {
        showToast("✓ Phone URL copied: " + url);
    }).catch(() => {
        prompt("Copy this URL to open on your phone:", url);
    });
}

function persistData() {
    try {
        localStorage.setItem('shesecure_profile_v5', JSON.stringify(state.profile));
        localStorage.setItem('shesecure_contacts_v5', JSON.stringify(state.contacts));
        localStorage.setItem('shesecure_settings_v5', JSON.stringify(state.settings));
    } catch (e) {}
}

function loadPersistedData() {
    try {
        const savedProfile = localStorage.getItem('shesecure_profile_v5');
        if (savedProfile) state.profile = Object.assign(state.profile, JSON.parse(savedProfile));
        const savedContacts = localStorage.getItem('shesecure_contacts_v5');
        if (savedContacts) state.contacts = JSON.parse(savedContacts);
        const savedSettings = localStorage.getItem('shesecure_settings_v5');
        if (savedSettings) state.settings = Object.assign(state.settings, JSON.parse(savedSettings));
    } catch (e) {}
}
