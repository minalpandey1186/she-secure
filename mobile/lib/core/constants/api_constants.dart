class ApiConstants {
  // Default base URL (Use 10.0.2.2 for Android Emulator, or localhost for iOS/web)
  static const String defaultBaseUrl = 'http://10.0.2.2:4000/api/v1';
  static const String alertsEndpoint = '/alerts';
  static const String healthEndpoint = '/health';

  static const String defaultKeyId = 'key-v1';
  // Default development key (32 bytes hex)
  static const String defaultMasterKeyHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  static const int defaultCancellationSeconds = 5;
  static const int maxRetryAttempts = 5;
  static const int baseRetryDelaySeconds = 3;
}
