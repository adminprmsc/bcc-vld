import 'package:flutter/material.dart';
import 'package:mobile_app/features/auth/ui/screens/login_screen.dart';
import 'package:mobile_app/features/home/ui/screens/home_screen.dart';

void main() {
  runApp(const MainApp());
}

class MainApp extends StatefulWidget {
  const MainApp({super.key});

  @override
  State<MainApp> createState() => _MainAppState();
}

class _MainAppState extends State<MainApp> {
  bool _isLoggedIn = false;

  void _onLoginSuccess() {
    setState(() {
      _isLoggedIn = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: ThemeData(
        primarySwatch: Colors.indigo,
        visualDensity: VisualDensity.adaptivePlatformDensity,
        colorScheme: ColorScheme.fromSwatch(primarySwatch: Colors.indigo).copyWith(secondary: Colors.amber),
      ),
      home: _isLoggedIn ? const HomeScreen() : LoginScreen(onLoginSuccess: _onLoginSuccess),
      debugShowCheckedModeBanner: false,
    );
  }
}
