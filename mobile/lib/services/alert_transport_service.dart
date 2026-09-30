import 'dart:math';
import 'package:uuid/uuid.dart';
import '../core/constants/api_constants.dart';
import '../core/database/database_service.dart';
import '../core/networking/api_client.dart';
import '../core/security/crypto_service.dart';
import '../core/security/keystore_service.dart';
import '../core/security/stego_codec.dart';
import 'ble_mesh_service.dart';
import 'connectivity_service.dart';
import 'location_service.dart';
import 'sms_fallback_service.dart';

class AlertTransportService {
  final ApiClient apiClient;
  final CryptoService cryptoService;
  final StegoCodec stegoCodec;
  final DatabaseService databaseService;
  final LocationService locationService;
  final ConnectivityService connectivityService;
  final KeystoreService keystoreService;
  final BleMeshRelayService bleMeshService;
  final SmsFallbackService smsFallbackService;

  final String deviceId;
  final String keyId;
  String keyHex;
  bool isDemoMode = false;
  bool useSteganography = false;
  bool enableBleMesh = true;
  bool enableSmsFallback = true;

  bool _isProcessingQueue = false;

  AlertTransportService({
    required this.apiClient,
    required this.cryptoService,
    required this.stegoCodec,
    required this.databaseService,
    required this.locationService,
    required this.connectivityService,
    KeystoreService? keystoreService,
    BleMeshRelayService? bleMeshService,
    SmsFallbackService? smsFallbackService,
    required this.deviceId,
    this.keyId = ApiConstants.defaultKeyId,
    this.keyHex = ApiConstants.defaultMasterKeyHex,
    this.isDemoMode = false,
    this.useSteganography = false,
    this.enableBleMesh = true,
    this.enableSmsFallback = true,
  })  : keystoreService = keystoreService ?? KeystoreService(),
        bleMeshService = bleMeshService ??
            BleMeshRelayService(
              currentDeviceId: deviceId,
              apiClient: apiClient,
              connectivityService: connectivityService,
            ),
        smsFallbackService = smsFallbackService ?? SmsFallbackService() {
    // Listen for reconnection and process queued alerts automatically
    connectivityService.onOnlineStatusChanged.listen((isOnline) {
      if (isOnline) {
        processPendingQueue();
      }
    });

    // Listen for incoming BLE mesh packets from peers
    this.bleMeshService.onPacketReceived.listen((packet) {
      // Peer packets automatically processed by BleMeshRelayService
    });
  }

  Future<QueuedAlertModel> triggerEmergencyAlert({
    String triggerType = 'STEALTH_GESTURE',
    String? customNotes,
  }) async {
    final alertId = const Uuid().v4();
    final now = DateTime.now();
    final effectiveTriggerType = isDemoMode ? 'DEMO' : triggerType;

    // 1. Capture Location
    final location = await locationService.getCurrentLocation();

    // 2. Hardware Keystore / HKDF Key Derivation for this Alert Session
    final sessionKeyHex = await keystoreService.deriveHardwareKey(
      masterKeyHex: keyHex,
      contextInfo: 'shesecure:alert:$alertId:$deviceId',
    );

    // 3. Build Unencrypted Payload Structure
    final rawPayload = {
      'alertId': alertId,
      'deviceId': deviceId,
      'timestamp': now.toIso8601String(),
      'triggerType': effectiveTriggerType,
      'location': location.toJson(),
      'batteryLevel': 85,
      'isDemo': isDemoMode,
      'notes': customNotes ?? (isDemoMode ? 'Test SOS triggered in Demo Mode' : 'Covert SOS triggered'),
    };

    // 4. Encrypt Payload using AES-256-GCM (Hardware Derived Key)
    final envelope = await cryptoService.encrypt(
      payload: rawPayload,
      keyId: keyId,
      keyHex: sessionKeyHex,
    );

    // 5. Create Local Queued Alert Record
    final alertModel = QueuedAlertModel(
      alertId: alertId,
      deviceId: deviceId,
      timestamp: now,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      triggerType: effectiveTriggerType,
      encryptedEnvelope: envelope.toJson(),
      status: AlertQueueStatus.queued,
    );

    await databaseService.saveAlert(alertModel);

    // 6. Multi-Path Resilient Transport Strategy
    final isOnline = await connectivityService.isConnected();
    if (isOnline) {
      // Path A: Direct Internet Transmission
      await _attemptDelivery(alertModel, envelope);
    } else {
      // Path B: Zero-Connectivity Bluetooth Low Energy (BLE) Mesh Relay
      if (enableBleMesh) {
        await bleMeshService.broadcastAlertOverMesh(
          alertId: alertId,
          encryptedEnvelope: envelope,
          triggerType: effectiveTriggerType,
        );
      }

      // Path C: Cellular SMS Fallback
      if (enableSmsFallback) {
        await smsFallbackService.sendEmergencySms(envelope: envelope);
      }

      // Keep status marked as queued locally for auto-sync when IP restored
      await databaseService.updateAlertStatus(alertId, AlertQueueStatus.queued);
    }

    return alertModel;
  }

  Future<bool> _attemptDelivery(QueuedAlertModel alert, EncryptedEnvelope envelope) async {
    try {
      await databaseService.updateAlertStatus(alert.alertId, AlertQueueStatus.sending);

      if (useSteganography) {
        // Embed in LSB Carrier Image
        final stegoImageBytes = stegoCodec.encode(envelope: envelope);
        await apiClient.submitAlertStegoImage(
          deviceId: alert.deviceId,
          triggerType: alert.triggerType,
          stegoImageBytes: stegoImageBytes,
        );
      } else {
        // Direct Encrypted JSON Submission
        await apiClient.submitAlertJson(
          alertId: alert.alertId,
          deviceId: alert.deviceId,
          timestamp: alert.timestamp,
          triggerType: alert.triggerType,
          encryptedPayload: envelope,
        );
      }

      // Mark Delivered on server acknowledgement
      alert.status = AlertQueueStatus.delivered;
      await databaseService.updateAlertStatus(alert.alertId, AlertQueueStatus.delivered);
      return true;
    } catch (e) {
      final nextRetry = alert.retryCount + 1;
      alert.retryCount = nextRetry;
      alert.lastError = e.toString();
      alert.status = nextRetry >= ApiConstants.maxRetryAttempts 
        ? AlertQueueStatus.failed 
        : AlertQueueStatus.retrying;

      await databaseService.updateAlertStatus(
        alert.alertId,
        alert.status,
        retryCount: nextRetry,
        lastError: e.toString(),
      );
      return false;
    }
  }

  /// Drains and retries any pending or retrying alerts from SQLite/SharedPreferences with exponential backoff
  Future<void> processPendingQueue() async {
    if (_isProcessingQueue) return;
    _isProcessingQueue = true;

    try {
      final isOnline = await connectivityService.isConnected();
      if (!isOnline) return;

      final pending = await databaseService.getPendingAlerts();
      for (final alert in pending) {
        if (alert.retryCount >= ApiConstants.maxRetryAttempts) {
          continue;
        }

        final backoffSeconds = ApiConstants.baseRetryDelaySeconds * pow(2, alert.retryCount).toInt();
        final elapsedSinceLastAttempt = DateTime.now().difference(alert.updatedAt).inSeconds;

        if (alert.retryCount > 0 && elapsedSinceLastAttempt < backoffSeconds) {
          continue;
        }

        final envelope = EncryptedEnvelope.fromJson(alert.encryptedEnvelope);
        await _attemptDelivery(alert, envelope);
      }
    } finally {
      _isProcessingQueue = false;
    }
  }
}
