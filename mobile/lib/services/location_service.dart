import 'package:geolocator/geolocator.dart';

class LocationResult {
  final double? latitude;
  final double? longitude;
  final double? accuracy;
  final double? altitude;
  final double? speed;
  final bool locationUnavailable;
  final String? errorReason;
  final DateTime capturedAt;

  LocationResult({
    this.latitude,
    this.longitude,
    this.accuracy,
    this.altitude,
    this.speed,
    required this.locationUnavailable,
    this.errorReason,
    DateTime? capturedAt,
  }) : capturedAt = capturedAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'latitude': latitude,
    'longitude': longitude,
    'accuracy': accuracy,
    'altitude': altitude,
    'speed': speed,
    'locationUnavailable': locationUnavailable,
    'errorReason': errorReason,
    'capturedAt': capturedAt.toIso8601String(),
  };
}

class LocationService {
  Future<LocationResult> getCurrentLocation({Duration timeout = const Duration(seconds: 8)}) async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return LocationResult(
          locationUnavailable: true,
          errorReason: 'Location services disabled on device',
        );
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          return LocationResult(
            locationUnavailable: true,
            errorReason: 'Location permission denied by user',
          );
        }
      }

      if (permission == LocationPermission.deniedForever) {
        return LocationResult(
          locationUnavailable: true,
          errorReason: 'Location permission permanently denied',
        );
      }

      // Obtain high-accuracy position with strict timeout
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: timeout,
      );

      return LocationResult(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        altitude: position.altitude,
        speed: position.speed,
        locationUnavailable: false,
        capturedAt: position.timestamp,
      );
    } catch (e) {
      // Fallback to last known position if current GPS lookup timed out
      try {
        final lastKnown = await Geolocator.getLastKnownPosition();
        if (lastKnown != null) {
          return LocationResult(
            latitude: lastKnown.latitude,
            longitude: lastKnown.longitude,
            accuracy: lastKnown.accuracy,
            altitude: lastKnown.altitude,
            speed: lastKnown.speed,
            locationUnavailable: false,
            errorReason: 'Fallback to last known position: $e',
            capturedAt: lastKnown.timestamp,
          );
        }
      } catch (_) {}

      return LocationResult(
        locationUnavailable: true,
        errorReason: 'GPS acquisition error: $e',
      );
    }
  }
}
