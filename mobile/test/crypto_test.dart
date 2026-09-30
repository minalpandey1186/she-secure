import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import '../lib/core/security/crypto_service.dart';

void main() {
  late CryptoService cryptoService;
  const keyId = 'key-v1';
  const keyHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  setUp(() {
    cryptoService = CryptoService();
  });

  group('Mobile CryptoService (AES-256-GCM)', () {
    test('should encrypt and decrypt a structured emergency payload', () async {
      final payload = {
        'alertId': 'test-mobile-001',
        'deviceId': 'android-device-1',
        'timestamp': DateTime.now().toIso8601String(),
        'triggerType': 'STEALTH_GESTURE',
        'location': {'latitude': 37.7749, 'longitude': -122.4194, 'accuracy': 4.2},
      };

      final envelope = await cryptoService.encrypt(
        payload: payload,
        keyId: keyId,
        keyHex: keyHex,
      );

      expect(envelope.version, equals(1));
      expect(envelope.keyId, equals(keyId));
      expect(base64Decode(envelope.nonce).length, equals(12));
      expect(base64Decode(envelope.tag).length, equals(16));

      final decrypted = await cryptoService.decrypt(
        envelope: envelope,
        keyHex: keyHex,
      );

      expect(decrypted['alertId'], equals('test-mobile-001'));
      expect(decrypted['location']['latitude'], equals(37.7749));
    });

    test('should fail decryption when authentication tag is tampered', () async {
      final payload = {'secret': 'emergency-data'};
      final envelope = await cryptoService.encrypt(
        payload: payload,
        keyId: keyId,
        keyHex: keyHex,
      );

      final tagBytes = base64Decode(envelope.tag);
      tagBytes[0] ^= 0xFF; // Flip bits

      final tamperedEnvelope = EncryptedEnvelope(
        version: envelope.version,
        keyId: envelope.keyId,
        nonce: envelope.nonce,
        ciphertext: envelope.ciphertext,
        tag: base64Encode(tagBytes),
      );

      expect(
        () async => await cryptoService.decrypt(envelope: tamperedEnvelope, keyHex: keyHex),
        throwsA(isA<Exception>()),
      );
    });
  });
}
