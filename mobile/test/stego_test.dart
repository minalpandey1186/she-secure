import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import '../lib/core/security/stego_codec.dart';
import '../lib/core/security/crypto_service.dart';

void main() {
  late StegoCodec stegoCodec;

  setUp(() {
    stegoCodec = StegoCodec();
  });

  group('Mobile StegoCodec (LSB Framing with CRC32 & Magic Verification)', () {
    test('should encode and decode an encrypted envelope in carrier PNG', () {
      final envelope = EncryptedEnvelope(
        version: 1,
        keyId: 'key-v1',
        nonce: 'MTIzNDU2Nzg5MDEy',
        ciphertext: 'ZW1lcmdlbmN5IGNpcGhlcnRleHQ=',
        tag: 'MTIzNDU2Nzg5MDEyMzQ1Ng==',
      );

      final encodedPngBytes = stegoCodec.encode(envelope: envelope);
      expect(encodedPngBytes.isNotEmpty, isTrue);

      final extractedEnvelope = stegoCodec.decode(encodedPngBytes);
      expect(extractedEnvelope.version, equals(envelope.version));
      expect(extractedEnvelope.keyId, equals(envelope.keyId));
      expect(extractedEnvelope.ciphertext, equals(envelope.ciphertext));
      expect(extractedEnvelope.nonce, equals(envelope.nonce));
      expect(extractedEnvelope.tag, equals(envelope.tag));
    });

    test('should reject non-SheSecure images (magic header mismatch)', () {
      // Plain synthetic image without stego
      final plainImage = img.Image(width: 50, height: 50);
      for (var y = 0; y < 50; y++) {
        for (var x = 0; x < 50; x++) {
          plainImage.setPixelRgba(x, y, 100, 100, 100, 255);
        }
      }
      final plainBytes = img.encodePng(plainImage);

      expect(
        () => stegoCodec.decode(plainBytes),
        throwsA(isA<Exception>()),
      );
    });
  });
}
