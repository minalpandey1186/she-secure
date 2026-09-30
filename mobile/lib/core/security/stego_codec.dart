import 'dart:typed_data';
import 'dart:convert';
import 'package:image/image.dart' as img;
import '../errors/app_exceptions.dart';
import 'crypto_service.dart';

class StegoCodec {
  static const List<int> magicBytes = [0x53, 0x48, 0x45, 0x53]; // "SHES"
  static const int version = 1;
  static const int headerSize = 9; // MAGIC (4) + VERSION (1) + LEN (4)
  static const int footerSize = 4; // CRC32 (4)

  // Standard CRC-32 Calculation
  static int calculateCrc32(Uint8List bytes) {
    int crc = 0xFFFFFFFF;
    for (var byte in bytes) {
      crc ^= byte;
      for (var j = 0; j < 8; j++) {
        if ((crc & 1) != 0) {
          crc = (0xEDB88320 ^ (crc >>> 1)) >>> 0;
        } else {
          crc = (crc >>> 1) >>> 0;
        }
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  /// Embeds an encrypted envelope into a PNG image using LSB encoding.
  Uint8List encode({
    required EncryptedEnvelope envelope,
    Uint8List? carrierImageBytes,
    int defaultWidth = 100,
    int defaultHeight = 100,
  }) {
    try {
      final payloadString = envelope.serialize();
      final payloadBytes = Uint8List.fromList(utf8.encode(payloadString));
      final payloadLen = payloadBytes.length;

      final crc32Value = calculateCrc32(payloadBytes);

      // Frame: [MAGIC 4B][VERSION 1B][LEN 4B][PAYLOAD NB][CRC32 4B]
      final totalFrameSize = headerSize + payloadLen + footerSize;
      final frame = Uint8List(totalFrameSize);
      final byteData = ByteData.sublistView(frame);

      // 1. Magic
      frame.setRange(0, 4, magicBytes);
      // 2. Version
      frame[4] = version;
      // 3. Payload Length
      byteData.setUint32(5, payloadLen, Endian.big);
      // 4. Payload
      frame.setRange(headerSize, headerSize + payloadLen, payloadBytes);
      // 5. CRC32
      byteData.setUint32(headerSize + payloadLen, crc32Value, Endian.big);

      final totalBits = totalFrameSize * 8;

      img.Image image;
      if (carrierImageBytes != null && carrierImageBytes.isNotEmpty) {
        final decoded = img.decodeImage(carrierImageBytes);
        if (decoded == null) {
          throw StegoException('Failed to decode carrier image format');
        }
        image = decoded;
      } else {
        // Create synthetic texture image
        final minPixels = (totalBits / 3).ceil();
        final side = [100, (minPixels / 1.5).ceil()].reduce((a, b) => a > b ? a : b);
        image = img.Image(width: side, height: side);
        for (var y = 0; y < side; y++) {
          for (var x = 0; x < side; x++) {
            image.setPixelRgba(x, y, (x * 3 + y * 5) % 200 + 40, (x * 7 + y * 2) % 200 + 40, (x * 4 + y * 9) % 200 + 40, 255);
          }
        }
      }

      final availableBits = image.width * image.height * 3;
      if (totalBits > availableBits) {
        throw StegoException('Carrier image capacity exceeded: need $totalBits bits, have $availableBits');
      }

      int bitIdx = 0;
      for (var y = 0; y < image.height && bitIdx < totalBits; y++) {
        for (var x = 0; x < image.width && bitIdx < totalBits; x++) {
          var pixel = image.getPixel(x, y);
          var r = pixel.r.toInt();
          var g = pixel.g.toInt();
          var b = pixel.b.toInt();
          var a = pixel.a.toInt();

          final channels = [r, g, b];
          for (var c = 0; c < 3 && bitIdx < totalBits; c++) {
            final bytePos = bitIdx ~/ 8;
            final bitPos = 7 - (bitIdx % 8);
            final bit = (frame[bytePos] >> bitPos) & 1;

            channels[c] = (channels[c] & ~1) | bit;
            bitIdx++;
          }

          image.setPixelRgba(x, y, channels[0], channels[1], channels[2], a);
        }
      }

      return Uint8List.fromList(img.encodePng(image));
    } catch (e) {
      if (e is SheSecureException) rethrow;
      throw StegoException('Failed to encode steganography payload: $e');
    }
  }

  /// Extracts and validates an encrypted envelope from an LSB encoded PNG image.
  EncryptedEnvelope decode(Uint8List imageBytes) {
    try {
      final image = img.decodeImage(imageBytes);
      if (image == null) {
        throw StegoException('Invalid image buffer: failed to decode PNG');
      }

      final availableBits = image.width * image.height * 3;
      if (availableBits < headerSize * 8) {
        throw StegoException('Image too small to contain SheSecure stego header');
      }

      // Extract Header
      final headerBytes = _extractBytes(image, 0, headerSize);
      for (var i = 0; i < 4; i++) {
        if (headerBytes[i] != magicBytes[i]) {
          throw StegoException('Steganography magic header mismatch: not a SheSecure carrier');
        }
      }

      final extractedVersion = headerBytes[4];
      if (extractedVersion != version) {
        throw StegoException('Unsupported steganography version: $extractedVersion');
      }

      final byteData = ByteData.sublistView(headerBytes);
      final payloadLen = byteData.getUint32(5, Endian.big);

      final totalRequiredBytes = headerSize + payloadLen + footerSize;
      if (totalRequiredBytes * 8 > availableBits) {
        throw StegoException('Corrupted steganography header: length exceeds image capacity');
      }

      // Extract Payload
      final payloadBytes = _extractBytes(image, headerSize, payloadLen);

      // Extract Footer (CRC32)
      final footerBytes = _extractBytes(image, headerSize + payloadLen, footerSize);
      final footerByteData = ByteData.sublistView(footerBytes);
      final expectedCrc32 = footerByteData.getUint32(0, Endian.big);

      // Verify CRC32
      final actualCrc32 = calculateCrc32(payloadBytes);
      if (expectedCrc32 != actualCrc32) {
        throw StegoException('Steganography payload corrupted: CRC32 checksum mismatch');
      }

      final payloadString = utf8.decode(payloadBytes);
      return EncryptedEnvelope.deserialize(payloadString);
    } catch (e) {
      if (e is SheSecureException) rethrow;
      throw StegoException('Failed to decode steganographic image: $e');
    }
  }

  Uint8List _extractBytes(img.Image image, int startByteOffset, int byteCount) {
    final buffer = Uint8List(byteCount);
    final startBit = startByteOffset * 8;
    final endBit = startBit + (byteCount * 8);

    var currentBitIdx = 0;
    var targetBitIdx = 0;

    for (var y = 0; y < image.height && targetBitIdx < byteCount * 8; y++) {
      for (var x = 0; x < image.width && targetBitIdx < byteCount * 8; x++) {
        final pixel = image.getPixel(x, y);
        final channels = [pixel.r.toInt(), pixel.g.toInt(), pixel.b.toInt()];

        for (var c = 0; c < 3 && targetBitIdx < byteCount * 8; c++) {
          if (currentBitIdx >= startBit && currentBitIdx < endBit) {
            final bit = channels[c] & 1;
            final destByte = targetBitIdx ~/ 8;
            final destBitPos = 7 - (targetBitIdx % 8);

            if (bit == 1) {
              buffer[destByte] |= (1 << destBitPos);
            }
            targetBitIdx++;
          }
          currentBitIdx++;
        }
      }
    }

    return buffer;
  }
}
