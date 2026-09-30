import 'dart:async';

enum TriggerState {
  idle,
  countdown,
  triggered,
  cancelled,
}

class StealthTriggerConfig {
  final int requiredTapCount;
  final Duration tapInterval;
  final int countdownSeconds;

  const StealthTriggerConfig({
    this.requiredTapCount = 3,
    this.tapInterval = const Duration(milliseconds: 1200),
    this.countdownSeconds = 5,
  });
}

class StealthTriggerService {
  final StealthTriggerConfig config;
  final List<DateTime> _tapTimestamps = [];
  Timer? _countdownTimer;
  int _remainingSeconds = 0;
  TriggerState _state = TriggerState.idle;

  final StreamController<int> _countdownStream = StreamController<int>.broadcast();
  final StreamController<TriggerState> _stateStream = StreamController<TriggerState>.broadcast();
  final Function(String triggerType) _onEmergencyTriggered;

  StealthTriggerService({
    StealthTriggerConfig? config,
    required Function(String triggerType) onEmergencyTriggered,
  })  : config = config ?? const StealthTriggerConfig(),
        _onEmergencyTriggered = onEmergencyTriggered;

  TriggerState get state => _state;
  int get remainingSeconds => _remainingSeconds;
  Stream<int> get countdownStream => _countdownStream.stream;
  Stream<TriggerState> get stateStream => _stateStream.stream;

  void recordCovertTap({String triggerType = 'STEALTH_GESTURE'}) {
    if (_state == TriggerState.countdown) {
      // If already in countdown, additional taps can either cancel or be ignored
      return;
    }

    final now = DateTime.now();
    _tapTimestamps.add(now);

    // Keep only taps within the configured time window
    _tapTimestamps.removeWhere((t) => now.difference(t) > config.tapInterval);

    if (_tapTimestamps.length >= config.requiredTapCount) {
      _tapTimestamps.clear();
      _startCountdown(triggerType);
    }
  }

  void _startCountdown(String triggerType) {
    _state = TriggerState.countdown;
    _remainingSeconds = config.countdownSeconds;
    _stateStream.add(_state);
    _countdownStream.add(_remainingSeconds);

    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _remainingSeconds--;
      _countdownStream.add(_remainingSeconds);

      if (_remainingSeconds <= 0) {
        timer.cancel();
        _state = TriggerState.triggered;
        _stateStream.add(_state);
        _onEmergencyTriggered(triggerType);
      }
    });
  }

  void cancelTrigger() {
    if (_state == TriggerState.countdown) {
      _countdownTimer?.cancel();
      _countdownTimer = null;
      _state = TriggerState.cancelled;
      _stateStream.add(_state);

      // Reset back to idle shortly after cancellation
      Future.delayed(const Duration(milliseconds: 500), () {
        _state = TriggerState.idle;
        _stateStream.add(_state);
      });
    }
  }

  void forceTriggerNow({String triggerType = 'MANUAL'}) {
    _countdownTimer?.cancel();
    _state = TriggerState.triggered;
    _stateStream.add(_state);
    _onEmergencyTriggered(triggerType);
  }

  void dispose() {
    _countdownTimer?.cancel();
    _countdownStream.close();
    _stateStream.close();
  }
}
