import 'package:flutter/material.dart';
import '../../../services/alert_transport_service.dart';
import '../../../services/stealth_trigger_service.dart';

class DemoConsoleScreen extends StatefulWidget {
  final AlertTransportService alertTransport;
  final StealthTriggerService stealthTrigger;

  const DemoConsoleScreen({
    super.key,
    required this.alertTransport,
    required this.stealthTrigger,
  });

  @override
  State<DemoConsoleScreen> createState() => _DemoConsoleScreenState();
}

class _DemoConsoleScreenState extends State<DemoConsoleScreen> {
  bool _isTransmitting = false;
  String? _lastAlertId;
  String? _statusLog;

  Future<void> _triggerTestAlert() async {
    setState(() {
      _isTransmitting = true;
      _statusLog = 'Acquiring GPS fix and constructing payload...';
    });

    try {
      final alert = await widget.alertTransport.triggerEmergencyAlert(
        triggerType: widget.alertTransport.isDemoMode ? 'DEMO' : 'MANUAL',
        customNotes: 'Triggered from Mobile Demo Console',
      );

      setState(() {
        _lastAlertId = alert.alertId;
        _statusLog = 'Alert ${alert.alertId} processed. Status: ${alert.status.name.toUpperCase()}';
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Test Alert Generated: ${alert.alertId}'),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _statusLog = 'Error: $e';
      });
    } finally {
      setState(() => _isTransmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('SheSecure Demo Console'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Demo Mode Toggle Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: widget.alertTransport.isDemoMode ? Colors.amber : const Color(0xFF334155),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    const Text(
                      'Demo Mode',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    Switch(
                      value: widget.alertTransport.isDemoMode,
                      activeColor: Colors.amber,
                      onChanged: (val) {
                        setState(() {
                          widget.alertTransport.isDemoMode = val;
                        });
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  widget.alertTransport.isDemoMode
                      ? 'SAFE: Alerts sent will be marked triggerType="DEMO". Real emergency responders will not be dispatched.'
                      : 'WARNING: Live mode active. Alerts will generate real emergency incidents.',
                  style: TextStyle(
                    fontSize: 12,
                    color: widget.alertTransport.isDemoMode ? Colors.amber : Colors.white60,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Steganography Carrier Toggle
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.between,
              children: [
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'LSB Steganography Carrier',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Embeds AES envelope inside PNG image pixels',
                      style: TextStyle(fontSize: 12, color: Colors.white60),
                    ),
                  ],
                ),
                Switch(
                  value: widget.alertTransport.useSteganography,
                  activeColor: const Color(0xFFE11D48),
                  onChanged: (val) {
                    setState(() {
                      widget.alertTransport.useSteganography = val;
                    });
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Trigger Action Button
          SizedBox(
            height: 50,
            child: ElevatedButton.icon(
              onPressed: _isTransmitting ? null : _triggerTestAlert,
              icon: _isTransmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.warning_amber_rounded),
              label: Text(
                _isTransmitting
                    ? 'Transmitting Emergency Alert...'
                    : (widget.alertTransport.isDemoMode ? 'Trigger Test SOS (Demo)' : 'Trigger Manual SOS'),
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: widget.alertTransport.isDemoMode
                    ? Colors.amber.shade700
                    : const Color(0xFFE11D48),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Telemetry and Status Console Log
          if (_statusLog != null) ...[
            const Text(
              'Telemetry Log',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white70),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF090D16),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Text(
                _statusLog!,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 12, color: Color(0xFF10B981)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
