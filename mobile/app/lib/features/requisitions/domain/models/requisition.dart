import 'package:flutter/foundation.dart';

@immutable
class RequisitionItem {
  final String name;
  final int quantity;

  const RequisitionItem({
    required this.name,
    required this.quantity,
  });
}

@immutable
class Requisition {
  final String localId; // Client-generated UUID
  final String assetId;
  final String priority; // 'low', 'medium', 'high'
  final DateTime requiredBy;
  final List<RequisitionItem> items;
  final String? notes;
  final DateTime createdAt;
  final String syncStatus; // 'pending', 'synced', 'failed'

  const Requisition({
    required this.localId,
    required this.assetId,
    required this.priority,
    required this.requiredBy,
    required this.items,
    this.notes,
    required this.createdAt,
    this.syncStatus = 'pending',
  });
}
