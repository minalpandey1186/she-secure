import 'package:flutter/material.dart';
import 'core/constants/api_constants.dart';
import 'core/database/database_service.dart';
import 'core/networking/api_client.dart';
import 'core/security/crypto_service.dart';
import 'core/security/stego_codec.dart';
import 'services/alert_transport_service.dart';
import 'services/connectivity_service.dart';
import 'services/location_service.dart';
import 'services/stealth_trigger_service.dart';
import 'features/sos/presentation/sos_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final apiClient = ApiClient(baseUrl: ApiConstants.defaultBaseUrl);
  final cryptoService = CryptoService();
  final stegoCodec = StegoCodec();
  final databaseService = DatabaseService();
  final locationService = LocationService();
  final connectivityService = ConnectivityService();

  final alertTransport = AlertTransportService(
    apiClient: apiClient,
    cryptoService: cryptoService,
    stegoCodec: stegoCodec,
    databaseService: databaseService,
    locationService: locationService,
    connectivityService: connectivityService,
    deviceId: 'device-mobile-alpha-01',
    keyId: ApiConstants.defaultKeyId,
    keyHex: ApiConstants.defaultMasterKeyHex,
    isDemoMode: true, // Defaults to safe Demo Mode on first run
  );

  final stealthTrigger = StealthTriggerService(
    config: const StealthTriggerConfig(
      requiredTapCount: 3,
      countdownSeconds: 5,
    ),
    onEmergencyTriggered: (triggerType) {
      alertTransport.triggerEmergencyAlert(triggerType: triggerType);
    },
  );

  runApp(SheSecureMobileApp(
    alertTransport: alertTransport,
    stealthTrigger: stealthTrigger,
  ));
}

class SheSecureMobileApp extends StatelessWidget {
  final AlertTransportService alertTransport;
  final StealthTriggerService stealthTrigger;

  const SheSecureMobileApp({
    super.key,
    required this.alertTransport,
    required this.stealthTrigger,
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Personal Notes', // Decoy title
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: const Color(0xFFE11D48),
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFE11D48),
          secondary: Color(0xFF10B981),
          surface: Color(0xFF1E293B),
        ),
      ),
      home: SosScreen(
        alertTransport: alertTransport,
        stealthTrigger: stealthTrigger,
      ),
    );
  }
}
