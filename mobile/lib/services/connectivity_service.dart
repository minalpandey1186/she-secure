import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';

class ConnectivityService {
  final Connectivity _connectivity;
  final StreamController<bool> _onlineStreamController = StreamController<bool>.broadcast();

  ConnectivityService([Connectivity? connectivity])
      : _connectivity = connectivity ?? Connectivity() {
    _connectivity.onConnectivityChanged.listen((result) {
      _onlineStreamController.add(_isResultOnline(result));
    });
  }

  Stream<bool> get onOnlineStatusChanged => _onlineStreamController.stream;

  bool _isResultOnline(ConnectivityResult result) {
    return result == ConnectivityResult.mobile ||
        result == ConnectivityResult.wifi ||
        result == ConnectivityResult.ethernet ||
        result == ConnectivityResult.vpn;
  }

  Future<bool> isConnected() async {
    final result = await _connectivity.checkConnectivity();
    return _isResultOnline(result);
  }

  void dispose() {
    _onlineStreamController.close();
  }
}
