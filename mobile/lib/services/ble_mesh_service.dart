import 'dart:async';
import 'dart:convert';
import 'package:uuid/uuid.dart';
import '../core/networking/api_client.dart';
import '../core/security/crypto_service.dart';
import 'connectivity_service.dart';

class BleMeshPacket {
  final String packetId;
  final String alertId;
  final String originDeviceId;
  int hopCount;
  final EncryptedEnvelope encryptedEnvelope;
  final DateTime timestamp;
  final String triggerType;

  BleMeshPacket({
    String? packetId,
    required this.alertId,
    required this.originDeviceId,
    this.hopCount = 5,
    required this.encryptedEnvelope,
    DateTime? timestamp,
    this.triggerType = 'STEALTH_GESTURE',
  })  : packetId = packetId ?? const Uuid().v4(),
        timestamp = timestamp ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'packetId': packetId,
    'alertId': alertId,
    'originDeviceId': originDeviceId,
    'hopCount': hopCount,
    'triggerType': triggerType,
    'encryptedEnvelope': encryptedEnvelope.toJson(),
    'timestamp': timestamp.toIso8601String(),
  };

  factory BleMeshPacket.fromJson(Map<String, dynamic> json) {
    return BleMeshPacket(
      packetId: json['packetId'] as String,
      alertId: json['alertId'] as String,
      originDeviceId: json['originDeviceId'] as String,
      hopCount: json['hopCount'] as int? ?? 5,
      triggerType: json['triggerType'] as String? ?? 'STEALTH_GESTURE',
      encryptedEnvelope: EncryptedEnvelope.fromJson(json['encryptedEnvelope'] as Map<String, dynamic>),
      timestamp: DateTime.parse(json['timestamp'] as String),
    );
  }

  String serialize() => jsonEncode(toJson());

  factory BleMeshPacket.deserialize(String str) {
    return BleMeshPacket.fromJson(jsonDecode(str) as Map<String, dynamic>);
  }
}

class BleMeshRelayService {
  final String currentDeviceId;
  final ApiClient apiClient;
  final ConnectivityService connectivityService;

  final Set<String> _seenPacketIds = {};
  final Set<String> _seenAlertIds = {};
  final StreamController<BleMeshPacket> _incomingMeshPacketsController = StreamController<BleMeshPacket>.broadcast();

  bool isAdvertising = false;
  bool isScanning = false;

  BleMeshRelayService({
    required this.currentDeviceId,
    required this.apiClient,
    required this.connectivityService,
  });

  Stream<BleMeshPacket> get onPacketReceived => _incomingMeshPacketsController.stream;

  /// Broadcasts an encrypted alert over the BLE mesh network
  Future<BleMeshPacket> broadcastAlertOverMesh({
    required String alertId,
    required EncryptedEnvelope encryptedEnvelope,
    String triggerType = 'STEALTH_GESTURE',
    int initialHopCount = 5,
  }) async {
    final packet = BleMeshPacket(
      alertId: alertId,
      originDeviceId: currentDeviceId,
      hopCount: initialHopCount,
      encryptedEnvelope: encryptedEnvelope,
      triggerType: triggerType,
    );

    _seenPacketIds.add(packet.packetId);
    _seenAlertIds.add(packet.alertId);
    isAdvertising = true;

    // In a physical deployment, writes packet bytes to BLE advertisement / characteristic
    return packet;
  }

  /// Processes an incoming BLE mesh packet received from a nearby peer
  Future<bool> handleIncomingMeshPacket(BleMeshPacket packet) async {
    // 1. Deduplication & Loop Prevention
    if (_seenPacketIds.contains(packet.packetId) || _seenAlertIds.contains(packet.alertId)) {
      return false; // Packet already processed
    }

    _seenPacketIds.add(packet.packetId);
    _seenAlertIds.add(packet.alertId);
    _incomingMeshPacketsController.add(packet);

    // 2. Check if this device has active internet connectivity
    final isOnline = await connectivityService.isConnected();
    if (isOnline) {
      // Act as an Internet Gateway and Relay to Backend!
      try {
        await apiClient.submitAlertJson(
          alertId: packet.alertId,
          deviceId: packet.originDeviceId,
          timestamp: packet.timestamp,
          triggerType: packet.triggerType,
          encryptedPayload: packet.encryptedEnvelope,
        );
        return true;
      } catch (_) {
        // Fallthrough to rebroadcast if relay attempt fails
      }
    }

    // 3. If offline and hop count allows, rebroadcast to extend mesh radius
    if (packet.hopCount > 1) {
      packet.hopCount -= 1;
      // Rebroadcast updated packet over BLE
      return true;
    }

    return false;
  }

  void dispose() {
    _incomingMeshPacketsController.close();
  }
}
