import 'dart:convert';
import 'dart:typed_data';
import 'package:cryptography/cryptography.dart';
import '../errors/app_exceptions.dart';

class EncryptedEnvelope {
  final int version;
  final String keyId;
  final String nonce; // Base64
  final String ciphertext; // Base64
  final String tag; // Base64

  EncryptedEnvelope({
    required this.version,
    required this.keyId,
    required this.nonce,
    required this.ciphertext,
    required this.tag,
  });

  Map<String, dynamic> toJson() => {
    'version': version,
    'keyId': keyId,
    'nonce': nonce,
    'ciphertext': ciphertext,
    'tag': tag,
  };

  factory EncryptedEnvelope.fromJson(Map<String, dynamic> json) {
    return EncryptedEnvelope(
      version: json['version'] as int? ?? 1,
      keyId: json['keyId'] as String? ?? 'key-v1',
      nonce: json['nonce'] as String,
      ciphertext: json['ciphertext'] as String,
      tag: json['tag'] as String,
    );
  }

  String serialize() => jsonEncode(toJson());

  factory EncryptedEnvelope.deserialize(String str) {
    return EncryptedEnvelope.fromJson(jsonDecode(str) as Map<String, dynamic>);
  }
}

class CryptoService {
  final AesGcm _algorithm = AesGcm.with256Bits();
  final Map<String, SecretKey> _keyCache = {};

  Uint8List _hexToBytes(String hex) {
    final cleanHex = hex.replaceAll(RegExp(r'\s+'), '');
    if (cleanHex.length % 2 != 0) {
      throw CryptoException('Invalid hex string length');
    }
    final result = Uint8List(cleanHex.length ~/ 2);
    for (var i = 0; i < cleanHex.length; i += 2) {
      result[i ~/ 2] = int.parse(cleanHex.substring(i, i + 2), radix: 16);
    }
    return result;
  }

  Future<SecretKey> _getSecretKey(String keyId, String keyHex) async {
    if (_keyCache.containsKey(keyId)) {
      return _keyCache[keyId]!;
    }
    final bytes = _hexToBytes(keyHex);
    if (bytes.length != 32) {
      throw CryptoException('AES-256 requires exactly 32 key bytes (64 hex characters), got ${bytes.length}');
    }
    final secretKey = SecretKey(bytes);
    _keyCache[keyId] = secretKey;
    return secretKey;
  }

  Future<EncryptedEnvelope> encrypt({
    required Map<String, dynamic> payload,
    required String keyId,
    required String keyHex,
  }) async {
    try {
      final secretKey = await _getSecretKey(keyId, keyHex);
      final jsonString = jsonEncode(payload);
      final plaintextBytes = utf8.encode(jsonString);

      // Generate 12-byte random nonce
      final nonce = _algorithm.newNonce();

      // Encrypt with AES-256-GCM
      final secretBox = await _algorithm.encrypt(
        plaintextBytes,
        secretKey: secretKey,
        nonce: nonce,
      );

      return EncryptedEnvelope(
        version: 1,
        keyId: keyId,
        nonce: base64Encode(secretBox.nonce),
        ciphertext: base64Encode(secretBox.cipherText),
        tag: base64Encode(secretBox.mac.bytes),
      );
    } catch (e) {
      if (e is SheSecureException) rethrow;
      throw CryptoException('Failed to encrypt payload: $e');
    }
  }

  Future<Map<String, dynamic>> decrypt({
    required EncryptedEnvelope envelope,
    required String keyHex,
  }) async {
    try {
      final secretKey = await _getSecretKey(envelope.keyId, keyHex);
      final nonceBytes = base64Decode(envelope.nonce);
      final cipherTextBytes = base64Decode(envelope.ciphertext);
      final tagBytes = base64Decode(envelope.tag);

      final secretBox = SecretBox(
        cipherTextBytes,
        nonce: nonceBytes,
        mac: Mac(tagBytes),
      );

      final decryptedBytes = await _algorithm.decrypt(
        secretBox,
        secretKey: secretKey,
      );

      final decryptedJson = utf8.decode(decryptedBytes);
      return jsonDecode(decryptedJson) as Map<String, dynamic>;
    } catch (e) {
      if (e is SheSecureException) rethrow;
      throw CryptoException('Failed to decrypt payload: MAC authentication failed or payload corrupted');
    }
  }
}
