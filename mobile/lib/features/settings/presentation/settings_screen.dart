import 'package:flutter/material.dart';
import '../../../services/alert_transport_service.dart';

class SettingsScreen extends StatefulWidget {
  final AlertTransportService alertTransport;

  const SettingsScreen({super.key, required this.alertTransport});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late TextEditingController _baseUrlController;
  late TextEditingController _keyIdController;

  @override
  void initState() {
    super.initState();
    _baseUrlController = TextEditingController(text: widget.alertTransport.apiClient.baseUrl);
    _keyIdController = TextEditingController(text: widget.alertTransport.keyId);
  }

  @override
  void dispose() {
    _baseUrlController.dispose();
    _keyIdController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('SheSecure Configuration'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Device Info
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Device Registration',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                Text(
                  'Device ID: ${widget.alertTransport.deviceId}',
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 12, color: Colors.white70),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Backend Endpoint
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Backend API Base URL',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _baseUrlController,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: const InputDecoration(
                    hintText: 'http://10.0.2.2:4000/api/v1',
                    hintStyle: TextStyle(color: Colors.white30),
                    border: OutlineInputBorder(),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Cryptographic Parameters
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Cryptographic Key Management',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Cipher: AES-256-GCM (Authenticated)',
                  style: TextStyle(fontSize: 12, color: Color(0xFF10B981), fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 4),
                Text(
                  'Key ID: ${widget.alertTransport.keyId}',
                  style: const TextStyle(fontSize: 12, color: Colors.white70),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
