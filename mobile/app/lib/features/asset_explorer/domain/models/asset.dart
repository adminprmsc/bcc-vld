import 'package:flutter/foundation.dart';

@immutable
class Asset {
  final String id;
  final String name;
  final String type;
  final double latitude;
  final double longitude;
  final bool isCritical;

  const Asset({
    required this.id,
    required this.name,
    required this.type,
    required this.latitude,
    required this.longitude,
    this.isCritical = false,
  });
}
