import '../core/errors/app_exceptions.dart';
import '../core/security/crypto_service.dart';

class SmsFallbackService {
  static const String smsPrefix = 'SHES';
  static const int protocolVersion = 1;

  final String defaultEmergencySmsNumber;

  SmsFallbackService({this.defaultEmergencySmsNumber = '+18005550199'});

  /// Compactly serializes an EncryptedEnvelope into an SMS text payload
  /// Format: SHES:1:<keyId>:<nonce_b64>:<ciphertext_b64>:<tag_b64>
  String encodeToSmsString(EncryptedEnvelope envelope) {
    return '$smsPrefix:$protocolVersion:${envelope.keyId}:${envelope.nonce}:${envelope.ciphertext}:${envelope.tag}';
  }

  /// Parses a compact SMS text payload back into an EncryptedEnvelope
  EncryptedEnvelope parseFromSmsString(String smsText) {
    final cleanText = smsText.trim();
    final parts = cleanText.split(':');
    if (parts.length < 6 || parts[0] != smsPrefix) {
      throw CryptoException('Invalid SMS fallback format: missing SHES header or fields');
    }

    final version = int.tryParse(parts[1]);
    if (version != protocolVersion) {
      throw CryptoException('Unsupported SMS fallback protocol version: $version');
    }

    final keyId = parts[2];
    final nonce = parts[3];
    final ciphertext = parts[4];
    final tag = parts[5];

    return EncryptedEnvelope(
      version: version!,
      keyId: keyId,
      nonce: nonce,
      ciphertext: ciphertext,
      tag: tag,
    );
  }

  /// Simulates / Dispatches emergency SMS transmission
  Future<bool> sendEmergencySms({
    required EncryptedEnvelope envelope,
    String? destinationNumber,
  }) async {
    final targetNumber = destinationNumber ?? defaultEmergencySmsNumber;
    final smsPayload = encodeToSmsString(envelope);

    // In a physical Android deployment, invokes platform telephony TelephonyManager/SmsManager
    // For MVP, verifies string validity and records successful transmission
    return smsPayload.isNotEmpty && targetNumber.isNotEmpty;
  }
}
