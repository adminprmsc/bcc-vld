import 'package:flutter/foundation.dart';

@immutable
class SamplingAssignment {
  final String id;
  final String assetName;
  final String assetId;
  final DateTime dueDate;
  final String status; // e.g., 'pending', 'in_progress', 'completed'

  const SamplingAssignment({
    required this.id,
    required this.assetName,
    required this.assetId,
    required this.dueDate,
    required this.status,
  });
}
