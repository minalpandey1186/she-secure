import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../lib/core/database/database_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late DatabaseService databaseService;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    databaseService = DatabaseService();
  });

  group('DatabaseService (Offline Emergency Alert Queue)', () {
    test('should persist queued alert and retrieve pending items', () async {
      final alert = QueuedAlertModel(
        alertId: 'queue-test-01',
        deviceId: 'device-01',
        timestamp: DateTime.now(),
        triggerType: 'STEALTH_GESTURE',
        encryptedEnvelope: {'version': 1, 'ciphertext': 'test'},
        status: AlertQueueStatus.queued,
      );

      await databaseService.saveAlert(alert);

      final pending = await databaseService.getPendingAlerts();
      expect(pending.length, equals(1));
      expect(pending.first.alertId, equals('queue-test-01'));
      expect(pending.first.status, equals(AlertQueueStatus.queued));
    });

    test('should update alert status to delivered upon server acknowledgement', () async {
      final alert = QueuedAlertModel(
        alertId: 'queue-test-02',
        deviceId: 'device-01',
        timestamp: DateTime.now(),
        triggerType: 'STEALTH_GESTURE',
        encryptedEnvelope: {'version': 1, 'ciphertext': 'test'},
        status: AlertQueueStatus.queued,
      );

      await databaseService.saveAlert(alert);
      await databaseService.updateAlertStatus('queue-test-02', AlertQueueStatus.delivered);

      final pending = await databaseService.getPendingAlerts();
      expect(pending.isEmpty, isTrue);

      final all = await databaseService.getAllAlerts();
      expect(all.first.status, equals(AlertQueueStatus.delivered));
    });
  });
}
