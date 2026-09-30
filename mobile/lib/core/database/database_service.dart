import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

enum AlertQueueStatus {
  created,
  encrypted,
  queued,
  sending,
  delivered,
  failed,
  retrying,
}

class QueuedAlertModel {
  final String alertId;
  final String deviceId;
  final DateTime timestamp;
  final double? latitude;
  final double? longitude;
  final double? accuracy;
  final String triggerType;
  final Map<String, dynamic> encryptedEnvelope;
  AlertQueueStatus status;
  int retryCount;
  String? lastError;
  final DateTime createdAt;
  DateTime updatedAt;

  QueuedAlertModel({
    required this.alertId,
    required this.deviceId,
    required this.timestamp,
    this.latitude,
    this.longitude,
    this.accuracy,
    required this.triggerType,
    required this.encryptedEnvelope,
    this.status = AlertQueueStatus.queued,
    this.retryCount = 0,
    this.lastError,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'alertId': alertId,
    'deviceId': deviceId,
    'timestamp': timestamp.toIso8601String(),
    'latitude': latitude,
    'longitude': longitude,
    'accuracy': accuracy,
    'triggerType': triggerType,
    'encryptedEnvelope': encryptedEnvelope,
    'status': status.name,
    'retryCount': retryCount,
    'lastError': lastError,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };

  factory QueuedAlertModel.fromJson(Map<String, dynamic> json) {
    return QueuedAlertModel(
      alertId: json['alertId'] as String,
      deviceId: json['deviceId'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      accuracy: (json['accuracy'] as num?)?.toDouble(),
      triggerType: json['triggerType'] as String? ?? 'STEALTH_GESTURE',
      encryptedEnvelope: json['encryptedEnvelope'] as Map<String, dynamic>,
      status: AlertQueueStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => AlertQueueStatus.queued,
      ),
      retryCount: json['retryCount'] as int? ?? 0,
      lastError: json['lastError'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }
}

class DatabaseService {
  static const String _storageKey = 'shesecure_offline_alert_queue';
  final SharedPreferences? _prefs;

  DatabaseService([this._prefs]);

  Future<SharedPreferences> _getPrefs() async {
    if (_prefs != null) return _prefs!;
    return await SharedPreferences.getInstance();
  }

  Future<List<QueuedAlertModel>> getAllAlerts() async {
    final prefs = await _getPrefs();
    final raw = prefs.getStringList(_storageKey) ?? [];
    return raw.map((item) => QueuedAlertModel.fromJson(jsonDecode(item))).toList();
  }

  Future<List<QueuedAlertModel>> getPendingAlerts() async {
    final all = await getAllAlerts();
    return all.where((a) =>
      a.status == AlertQueueStatus.queued ||
      a.status == AlertQueueStatus.retrying ||
      a.status == AlertQueueStatus.failed
    ).toList();
  }

  Future<void> saveAlert(QueuedAlertModel alert) async {
    final prefs = await _getPrefs();
    final all = await getAllAlerts();
    final index = all.indexWhere((a) => a.alertId == alert.alertId);
    if (index >= 0) {
      all[index] = alert;
    } else {
      all.add(alert);
    }
    final raw = all.map((a) => jsonEncode(a.toJson())).toList();
    await prefs.setStringList(_storageKey, raw);
  }

  Future<void> updateAlertStatus(String alertId, AlertQueueStatus status, {int? retryCount, String? lastError}) async {
    final prefs = await _getPrefs();
    final all = await getAllAlerts();
    final index = all.indexWhere((a) => a.alertId == alertId);
    if (index >= 0) {
      all[index].status = status;
      if (retryCount != null) all[index].retryCount = retryCount;
      if (lastError != null) all[index].lastError = lastError;
      all[index].updatedAt = DateTime.now();
      final raw = all.map((a) => jsonEncode(a.toJson())).toList();
      await prefs.setStringList(_storageKey, raw);
    }
  }

  Future<void> removeAlert(String alertId) async {
    final prefs = await _getPrefs();
    final all = await getAllAlerts();
    all.removeWhere((a) => a.alertId == alertId);
    final raw = all.map((a) => jsonEncode(a.toJson())).toList();
    await prefs.setStringList(_storageKey, raw);
  }

  Future<void> clearAll() async {
    final prefs = await _getPrefs();
    await prefs.remove(_storageKey);
  }
}
