import 'package:flutter_test/flutter_test.dart';
import '../lib/services/stealth_trigger_service.dart';

void main() {
  group('StealthTriggerService', () {
    test('should initiate countdown only after required tap count is met', () {
      bool triggered = false;
      final service = StealthTriggerService(
        config: const StealthTriggerConfig(requiredTapCount: 3, countdownSeconds: 2),
        onEmergencyTriggered: (_) => triggered = true,
      );

      service.recordCovertTap();
      expect(service.state, equals(TriggerState.idle));

      service.recordCovertTap();
      expect(service.state, equals(TriggerState.idle));

      service.recordCovertTap();
      expect(service.state, equals(TriggerState.countdown));
      expect(service.remainingSeconds, equals(2));
      expect(triggered, isFalse);

      service.dispose();
    });

    test('should allow cancellation during countdown window', () {
      bool triggered = false;
      final service = StealthTriggerService(
        config: const StealthTriggerConfig(requiredTapCount: 2, countdownSeconds: 5),
        onEmergencyTriggered: (_) => triggered = true,
      );

      service.recordCovertTap();
      service.recordCovertTap();
      expect(service.state, equals(TriggerState.countdown));

      // Cancel before countdown completes
      service.cancelTrigger();
      expect(service.state, equals(TriggerState.cancelled));
      expect(triggered, isFalse);

      service.dispose();
    });
  });
}
