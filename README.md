# 🛡️ SHE SECURE — Smart Women Safety System

> **Native Android (Kotlin) Safety Platform & Live Mobile Simulator**
> Interdisciplinary Engineering Project (CSE • CSBS • ECE)
> **BMS Institute of Technology and Management, 2026**
> **Team:** Minal Pandey (1BY25CS183), Anushka Goyal (1BY25CS053), Vansh Rajput (1BY25EC170), Dhruv Bansal (1BY25CB015)

---

## 🌟 Core System Pillars

1. **"No hands, no time" Sensor Detection**:
   - **Motion Guard (`MotionSosService`)**: Real-time 3-axis accelerometer magnitude vector calculation ($\sqrt{x^2+y^2+z^2} - g$), debounced to detect **3 rapid jerks within a 1.5-second sliding window**.
   - **Audio Sentinel (`AudioSosService`)**: Real-time microphone RMS / decibel signal processing, debounced to detect **sustained screams / high-amplitude distress (~1.0s continuous peak)**.
2. **Single Shared Alert Pathway (`SosActionHandler`)**:
   - Manual SOS button, Motion sensor, and Audio sensor all enter the exact same handler.
   - Triggers a **5-second cancellable countdown window** with audio pulses.
   - If user taps **"I AM SAFE (CANCEL)"**: Aborts cleanly with zero false alerts.
3. **Fail-Visibly Emergency Alerting**:
   - **Offline SMS + GPS (`SmsManager` & `LocationManager`)**: Works completely without active mobile data or internet.
   - Formats GPS coordinates into Google Maps links with accuracy readings.
   - Step-by-step audit logging: GPS fix, SMS carrier ACK per contact, and high-decibel siren.
4. **Safe Route Finder (SDG 11)**:
   - Locates nearest police stations around live GPS position.
   - **Automatic Radius Widening**: Searches within 5 km; if 0 results found, automatically widens query radius to 15 km.
   - Renders walking directions with estimated pedestrian time (~80 m/min).
5. **Offline Room Database**:
   - Stores emergency contacts locally using SQLite Room DB.

---

## 🚀 Quick Start — Live Interactive Mobile Simulator

You can run and test the complete SheSecure experience right now on macOS in your web browser:

```bash
# 1. Navigate to simulator directory
cd /Users/panda11/.gemini/antigravity/scratch/she-secure/app_simulator

# 2. Start the zero-dependency Python 3 server
/usr/bin/python3 server.py
```

Open in your browser:
👉 **[http://localhost:5050](http://localhost:5050)**

### What you can test in the Simulator:
- **📳 Motion Jerk Sensor**: Tap "Simulate 1 Jerk" 3 times in 1.5s to watch the debounced trigger engage the SOS countdown.
- **🎙️ Live Microphone Scream Detector**: Click "Enable Mic Scream", speak or scream into your Mac microphone, and watch the real-time decibel VU meter trigger after 1.0s.
- **🚨 5s Cancellable Countdown**: Test both clean cancellation ("I AM SAFE") and countdown expiration to see the live siren synthesizer and Fail-Visibly SMS log.
- **🗺️ Safe Route Finder**: Interactive Leaflet map querying police stations around BMSIT / Bangalore / Delhi / Mumbai with automatic 5km $\to$ 15km fallback and walking route polylines.
- **👥 Emergency Contacts**: Add, edit, and delete contacts stored in local offline DB.
- **⚙️ Settings**: Adjust motion jerk thresholds and audio decibel sliders.

---

## 📱 Building the Native Android App in Android Studio

1. Open **Android Studio** (Hedgehog / Iguana / Jellyfish or newer).
2. Select **Open** and choose the directory: `/Users/panda11/.gemini/antigravity/scratch/she-secure/android/`.
3. Allow Gradle to sync dependencies (Room SQLite, Retrofit, Play Services Location, ViewBinding).
4. Run on an Android device or Emulator (Android 8.0 / API 26+).

---

## 📐 Architecture Mapping to Slides

| Slide | Architectural Component | Kotlin / Project Implementation |
|---|---|---|
| **Slide 5 & 8** | Technology Stack & Offline SMS | `SmsDispatcher.kt`, `LocationProvider.kt`, Room DB `ContactDao.kt` |
| **Slide 6** | ECE Applied Signal Processing | `MotionSosService.kt` (Magnitude jerks), `AudioSosService.kt` (RMS/dB) |
| **Slide 7 & 12** | Single Shared Alert Pathway | `SosActionHandler.kt` (5s countdown, Cancel abort, Alert dispatch) |
| **Slide 11** | System Architecture | Presentation Layer (`MainActivity`, `SosCountdownActivity`, `SafeRouteActivity`), Service Layer, Room DB |
| **Slide 13** | Safe Route Finder (5km ➔ 15km) | `SafeRouteRepository.kt` & `NominatimApiService.kt` |
| **Slide 14** | Alignment towards SDGs | SDG 11 (Safe Cities & Walking to Police) & SDG 16 (Violence Prevention) |
