import 'package:flutter_test/flutter_test.dart';
import '../lib/core/security/crypto_service.dart';
import '../lib/services/ble_mesh_service.dart';
import '../lib/core/networking/api_client.dart';
import '../lib/services/connectivity_service.dart';

void main() {
  group('BleMeshRelayService (P2P Mesh Protocol)', () {
    test('should construct, serialize, and deserialize a BLE mesh packet', () {
      final envelope = EncryptedEnvelope(
        version: 1,
        keyId: 'key-v1',
        nonce: 'MTIzNDU2Nzg5MDEy',
        ciphertext: 'ZW1lcmdlbmN5IGNpcGhlcnRleHQ=',
        tag: 'MTIzNDU2Nzg5MDEyMzQ1Ng==',
      );

      final packet = BleMeshPacket(
        alertId: 'alert-mesh-test-01',
        originDeviceId: 'device-victim',
        hopCount: 5,
        encryptedEnvelope: envelope,
      );

      final serialized = packet.serialize();
      final deserialized = BleMeshPacket.deserialize(serialized);

      expect(deserialized.alertId, equals('alert-mesh-test-01'));
      expect(deserialized.originDeviceId, equals('device-victim'));
      expect(deserialized.hopCount, equals(5));
      expect(deserialized.encryptedEnvelope.ciphertext, equals(envelope.ciphertext));
    });

    test('should prevent loops and deduplicate identical mesh packets', () async {
      final service = BleMeshRelayService(
        currentDeviceId: 'relay-peer-01',
        apiClient: ApiClient(baseUrl: 'http://localhost:4000/api/v1'),
        connectivityService: ConnectivityService(),
      );

      final envelope = EncryptedEnvelope(
        version: 1,
        keyId: 'key-v1',
        nonce: 'MTIzNDU2Nzg5MDEy',
        ciphertext: 'test-ciphertext',
        tag: 'test-tag',
      );

      final packet = BleMeshPacket(
        alertId: 'alert-unique-01',
        originDeviceId: 'device-victim',
        hopCount: 3,
        encryptedEnvelope: envelope,
      );

      // First receipt of packet
      final firstProcessed = await service.handleIncomingMeshPacket(packet);
      expect(firstProcessed, isTrue);

      // Second receipt of identical packet -> must be dropped
      final secondProcessed = await service.handleIncomingMeshPacket(packet);
      expect(secondProcessed, isFalse);

      service.dispose();
    });
  });
}
