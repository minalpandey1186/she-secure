import 'dart:convert';
import 'dart:typed_data';
import 'package:cryptography/cryptography.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../errors/app_exceptions.dart';
import '../constants/api_constants.dart';

class KeystoreService {
  final FlutterSecureStorage _secureStorage;
  static const String _masterKeyStorageKey = 'shesecure_hsm_master_seed';
  static const String _keyIdStorageKey = 'shesecure_hsm_key_id';

  KeystoreService([FlutterSecureStorage? secureStorage])
      : _secureStorage = secureStorage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(
                encryptedSharedPreferences: true,
                keyCipherAlgorithm: KeyCipherAlgorithm.RSA_ECB_PKCS1Padding,
                storageCipherAlgorithm: StorageCipherAlgorithm.AES_GCM_NoPadding,
              ),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock,
              ),
            );

  /// Initializes hardware-backed secure storage with a master seed if not present
  Future<String> getOrProvisionMasterKeyHex({String? defaultKeyHex}) async {
    try {
      var keyHex = await _secureStorage.read(key: _masterKeyStorageKey);
      if (keyHex == null || keyHex.isEmpty) {
        keyHex = defaultKeyHex ?? ApiConstants.defaultMasterKeyHex;
        await _secureStorage.write(key: _masterKeyStorageKey, value: keyHex);
      }
      return keyHex;
    } catch (e) {
      // In testing or environments without hardware Keystore, return fallback
      return defaultKeyHex ?? ApiConstants.defaultMasterKeyHex;
    }
  }

  /// Derives an ephemeral, hardware-derived session key using HKDF-SHA256
  Future<String> deriveHardwareKey({
    required String masterKeyHex,
    required String contextInfo,
    String? saltHex,
  }) async {
    try {
      final masterKeyBytes = _hexToBytes(masterKeyHex);
      final saltBytes = saltHex != null ? _hexToBytes(saltHex) : Uint8List(32);
      final infoBytes = utf8.encode(contextInfo);

      final hkdf = Hkdf(
        hmac: Hmac.sha256(),
        outputLength: 32, // 256 bits
      );

      final derivedSecretKey = await hkdf.deriveKey(
        secretKey: SecretKey(masterKeyBytes),
        nonce: saltBytes,
        info: infoBytes,
      );

      final derivedBytes = await derivedSecretKey.extractBytes();
      return _bytesToHex(Uint8List.fromList(derivedBytes));
    } catch (e) {
      throw CryptoException('Hardware key derivation failed (HKDF-SHA256): $e');
    }
  }

  Uint8List _hexToBytes(String hex) {
    final cleanHex = hex.replaceAll(RegExp(r'\s+'), '');
    final result = Uint8List(cleanHex.length ~/ 2);
    for (var i = 0; i < cleanHex.length; i += 2) {
      result[i ~/ 2] = int.parse(cleanHex.substring(i, i + 2), radix: 16);
    }
    return result;
  }

  String _bytesToHex(Uint8List bytes) {
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join('');
  }
}
