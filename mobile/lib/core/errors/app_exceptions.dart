class SheSecureException implements Exception {
  final String message;
  final String? code;

  SheSecureException(this.message, [this.code]);

  @override
  String toString() => 'SheSecureException: $message ${code != null ? '($code)' : ''}';
}

class CryptoException extends SheSecureException {
  CryptoException(super.message, [super.code]);
}

class StegoException extends SheSecureException {
  StegoException(super.message, [super.code]);
}

class LocationException extends SheSecureException {
  LocationException(super.message, [super.code]);
}

class NetworkException extends SheSecureException {
  NetworkException(super.message, [super.code]);
}
