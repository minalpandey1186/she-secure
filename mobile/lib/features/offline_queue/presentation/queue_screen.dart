import 'package:flutter/material.dart';
import '../../../core/database/database_service.dart';
import '../../../services/alert_transport_service.dart';

class QueueScreen extends StatefulWidget {
  final AlertTransportService alertTransport;

  const QueueScreen({super.key, required this.alertTransport});

  @override
  State<QueueScreen> createState() => _QueueScreenState();
}

class _QueueScreenState extends State<QueueScreen> {
  List<QueuedAlertModel> _alerts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadQueue();
  }

  Future<void> _loadQueue() async {
    setState(() => _isLoading = true);
    final alerts = await widget.alertTransport.databaseService.getAllAlerts();
    setState(() {
      _alerts = alerts.reversed.toList();
      _isLoading = false;
    });
  }

  Future<void> _retryQueue() async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Retrying pending alerts queue...')),
    );
    await widget.alertTransport.processPendingQueue();
    await _loadQueue();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Offline Alert Queue'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _retryQueue,
            tooltip: 'Retry Pending Alerts',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _alerts.isEmpty
              ? const Center(
                  child: Text(
                    'No queued or persisted alerts.',
                    style: TextStyle(color: Colors.white54, fontSize: 14),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _alerts.length,
                  itemBuilder: (context, index) {
                    final alert = _alerts[index];
                    final isDelivered = alert.status == AlertQueueStatus.delivered;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isDelivered ? const Color(0xFF10B981).withOpacity(0.4) : const Color(0xFFE11D48).withOpacity(0.4),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.between,
                            children: [
                              Expanded(
                                child: Text(
                                  alert.alertId,
                                  style: const TextStyle(
                                    fontFamily: 'monospace',
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                    color: Colors.white,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: isDelivered
                                      ? const Color(0xFF10B981).withOpacity(0.2)
                                      : const Color(0xFFE11D48).withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  alert.status.name.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: isDelivered ? const Color(0xFF10B981) : const Color(0xFFE11D48),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Trigger: ${alert.triggerType} | Retries: ${alert.retryCount}',
                            style: const TextStyle(fontSize: 12, color: Colors.white70),
                          ),
                          if (alert.latitude != null && alert.longitude != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              'Coords: ${alert.latitude!.toStringAsFixed(4)}, ${alert.longitude!.toStringAsFixed(4)} (±${alert.accuracy?.toStringAsFixed(0)}m)',
                              style: const TextStyle(fontSize: 11, color: Colors.white54),
                            ),
                          ],
                          if (alert.lastError != null) ...[
                            const SizedBox(height: 6),
                            Text(
                              'Last error: ${alert.lastError}',
                              style: const TextStyle(fontSize: 11, color: Colors.roseAccent),
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
