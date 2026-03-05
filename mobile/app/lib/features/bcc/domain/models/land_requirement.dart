import 'package:flutter/foundation.dart';

@immutable
class LandRequirement {
  final String localId;
  final String parcelId;
  final String landownerName;
  final String purpose; // e.g., 'New Pipeline Access', 'Staging Area'
  final String status; // e.g., 'Draft', 'Submitted', 'Approved'
  final DateTime createdAt;
  final String? notes;
  final String syncStatus;

  const LandRequirement({
    required this.localId,
    required this.parcelId,
    required this.landownerName,
    required this.purpose,
    required this.status,
    required this.createdAt,
    this.notes,
    this.syncStatus = 'pending',
  });
}
