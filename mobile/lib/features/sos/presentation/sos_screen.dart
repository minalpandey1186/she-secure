import 'package:flutter/material.dart';
import '../../../services/alert_transport_service.dart';
import '../../../services/stealth_trigger_service.dart';
import 'demo_console_screen.dart';
import '../../offline_queue/presentation/queue_screen.dart';
import '../../settings/presentation/settings_screen.dart';

class SosScreen extends StatefulWidget {
  final AlertTransportService alertTransport;
  final StealthTriggerService stealthTrigger;

  const SosScreen({
    super.key,
    required this.alertTransport,
    required this.stealthTrigger,
  });

  @override
  State<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends State<SosScreen> {
  int _tapCount = 0;
  bool _showCovertFeedback = false;

  final List<Map<String, String>> _covertNotes = [
    {
      'title': 'Grocery List',
      'date': 'Today, 2:15 PM',
      'content': 'Almond milk, olive oil, Greek yogurt, spinach, dark chocolate'
    },
    {
      'title': 'Project Ideas',
      'date': 'Yesterday',
      'content': 'Check out new UI design patterns, update monorepo dependencies'
    },
    {
      'title': 'Books to Read',
      'date': 'Aug 12',
      'content': 'The Design of Everyday Things, Clean Code, Cryptography Engineering'
    },
  ];

  void _onCovertTap() {
    widget.stealthTrigger.recordCovertTap(triggerType: 'STEALTH_GESTURE');
    setState(() {
      _tapCount++;
      _showCovertFeedback = true;
    });

    Future.delayed(const Duration(milliseconds: 300), () {
      if (mounted) {
        setState(() => _showCovertFeedback = false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDemo = widget.alertTransport.isDemoMode;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: GestureDetector(
          onTap: _onCovertTap,
          behavior: HitTestBehavior.opaque,
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: _showCovertFeedback
                      ? const Color(0xFFE11D48).withOpacity(0.3)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.note_alt_outlined, color: Colors.white70, size: 22),
              ),
              const SizedBox(width: 8),
              const Text(
                'Personal Notes',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              if (isDemo) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.amber.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: Colors.amber.withOpacity(0.5)),
                  ),
                  child: const Text(
                    'DEMO MODE',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.amber),
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync, color: Colors.white70),
            tooltip: 'Offline Queue',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => QueueScreen(alertTransport: widget.alertTransport),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.bug_report, color: Colors.amberAccent),
            tooltip: 'Demo Console',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => DemoConsoleScreen(
                    alertTransport: widget.alertTransport,
                    stealthTrigger: widget.stealthTrigger,
                  ),
                ),
              ).then((_) => setState(() {}));
            },
          ),
          IconButton(
            icon: const Icon(Icons.settings, color: Colors.white70),
            tooltip: 'Settings',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => SettingsScreen(alertTransport: widget.alertTransport),
                ),
              ).then((_) => setState(() {}));
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          // Decoy Notes List
          ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _covertNotes.length,
            itemBuilder: (context, index) {
              final note = _covertNotes[index];
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.between,
                      children: [
                        Text(
                          note['title']!,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          note['date']!,
                          style: const TextStyle(fontSize: 12, color: Colors.white54),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      note['content']!,
                      style: const TextStyle(fontSize: 13, color: Colors.white70),
                    ),
                  ],
                ),
              );
            },
          ),

          // Stealth Countdown Overlay (Appears silently during trigger sequence)
          StreamBuilder<TriggerState>(
            stream: widget.stealthTrigger.stateStream,
            initialData: widget.stealthTrigger.state,
            builder: (context, stateSnap) {
              final state = stateSnap.data;
              if (state == TriggerState.countdown) {
                return Positioned(
                  bottom: 20,
                  left: 20,
                  right: 20,
                  child: StreamBuilder<int>(
                    stream: widget.stealthTrigger.countdownStream,
                    initialData: widget.stealthTrigger.remainingSeconds,
                    builder: (context, countSnap) {
                      final seconds = countSnap.data ?? 0;
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.roseAccent.withOpacity(0.6)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.4),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.roseAccent),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Emergency transmission in ${seconds}s...',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            TextButton(
                              onPressed: () {
                                widget.stealthTrigger.cancelTrigger();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Emergency activation cancelled'),
                                    duration: Duration(seconds: 2),
                                    backgroundColor: Color(0xFF334155),
                                  ),
                                );
                              },
                              style: TextButton.styleFrom(
                                backgroundColor: const Color(0xFF334155),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              ),
                              child: const Text(
                                'Cancel',
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ],
      ),
    );
  }
}
