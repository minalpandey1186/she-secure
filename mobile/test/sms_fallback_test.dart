import 'package:flutter_test/flutter_test.dart';
import '../lib/core/security/crypto_service.dart';
import '../lib/services/sms_fallback_service.dart';

void main() {
  group('SmsFallbackService (Cellular SMS Gateway)', () {
    late SmsFallbackService smsService;

    setUp(() {
      smsService = SmsFallbackService();
    });

    test('should encode and decode an encrypted envelope into compact SMS format', () {
      final envelope = EncryptedEnvelope(
        version: 1,
        keyId: 'key-v1',
        nonce: 'MTIzNDU2Nzg5MDEy',
        ciphertext: 'ZXhhbXBsZSBjaXBoZXJ0ZXh0',
        tag: 'MTIzNDU2Nzg5MDEyMzQ1Ng==',
      );

      final smsString = smsService.encodeToSmsString(envelope);
      expect(smsString.startsWith('SHES:1:key-v1:'), isTrue);

      final parsedEnvelope = smsService.parseFromSmsString(smsString);
      expect(parsedEnvelope.version, equals(1));
      expect(parsedEnvelope.keyId, equals('key-v1'));
      expect(parsedEnvelope.nonce, equals(envelope.nonce));
      expect(parsedEnvelope.ciphertext, equals(envelope.ciphertext));
      expect(parsedEnvelope.tag, equals(envelope.tag));
    });

    test('should reject malformed SMS text strings', () {
      expect(
        () => smsService.parseFromSmsString('CORRUPTED_NON_SHES_PAYLOAD'),
        throwsA(isA<Exception>()),
      );
    });
  });
}
