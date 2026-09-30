import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import '../errors/app_exceptions.dart';
import '../security/crypto_service.dart';

class ApiClient {
  final String baseUrl;
  final http.Client _client;

  ApiClient({required this.baseUrl, http.Client? client}) : _client = client ?? http.Client();

  Future<Map<String, dynamic>> submitAlertJson({
    required String alertId,
    required String deviceId,
    required DateTime timestamp,
    required String triggerType,
    required EncryptedEnvelope encryptedPayload,
  }) async {
    try {
      final url = Uri.parse('$baseUrl/alerts');
      final response = await _client.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'alertId': alertId,
          'deviceId': deviceId,
          'timestamp': timestamp.toIso8601String(),
          'triggerType': triggerType,
          'encryptedPayload': encryptedPayload.toJson(),
        }),
      );

      final body = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return body;
      }
      throw NetworkException(body['error'] as String? ?? 'HTTP ${response.statusCode}');
    } catch (e) {
      if (e is SheSecureException) rethrow;
      throw NetworkException('Network transmission failure: $e');
    }
  }

  Future<Map<String, dynamic>> submitAlertStegoImage({
    required String deviceId,
    required String triggerType,
    required Uint8List stegoImageBytes,
  }) async {
    try {
      final url = Uri.parse('$baseUrl/alerts');
      final request = http.MultipartRequest('POST', url)
        ..fields['deviceId'] = deviceId
        ..fields['triggerType'] = triggerType
        ..files.add(http.MultipartFile.fromBytes(
          'stegoImage',
          stegoImageBytes,
          filename: 'distress_stego.png',
        ));

      final streamedResponse = await _client.send(request);
      final response = await http.Response.fromStream(streamedResponse);
      final body = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return body;
      }
      throw NetworkException(body['error'] as String? ?? 'HTTP ${response.statusCode}');
    } catch (e) {
      if (e is SheSecureException) rethrow;
      throw NetworkException('Network transmission failure: $e');
    }
  }

  Future<bool> checkHealth() async {
    try {
      final url = Uri.parse('$baseUrl/health');
      final res = await _client.get(url).timeout(const Duration(seconds: 4));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
