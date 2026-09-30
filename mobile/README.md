# SheSecure Mobile Application

Flutter (Android-first) covert emergency distress client.

## Features
- **Clean Decoy UI**: Presents as Personal Notes utility to avoid suspicion.
- **Stealth Trigger**: Rapid triple-tap sequence with a 5-second silent cancellation safety window.
- **AES-256-GCM Encryption**: Zero-knowledge on-device payload encryption.
- **LSB Steganography**: Optional PNG pixel embedding (`[MAGIC][VERSION][LEN][PAYLOAD][CRC32]`).
- **Offline Resiliency**: Automatic local queuing and background retry with exponential backoff on network reconnection.
- **Demo Mode**: Safe presentation testing without real dispatch alarms.

## Local Setup
```bash
flutter pub get
flutter run
```

## Running Tests
```bash
flutter test
```
