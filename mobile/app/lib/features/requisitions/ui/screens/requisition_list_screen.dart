import 'package:flutter/material.dart';
import 'package:mobile_app/features/requisitions/domain/models/requisition.dart';

class RequisitionListScreen extends StatefulWidget {
  const RequisitionListScreen({super.key});

  @override
  State<RequisitionListScreen> createState() => _RequisitionListScreenState();
}

class _RequisitionListScreenState extends State<RequisitionListScreen> {
  // Mock data representing local requisitions
  final List<Requisition> _requisitions = [
    Requisition(
      localId: 'uuid-1', assetId: 'PMP-001', priority: 'high',
      requiredBy: DateTime.now().add(const Duration(days: 3)),
      items: const [RequisitionItem(name: 'Filter Gasket', quantity: 5)],
      createdAt: DateTime.now().subtract(const Duration(hours: 1)),
      syncStatus: 'pending',
    ),
    Requisition(
      localId: 'uuid-2', assetId: 'VLV-042', priority: 'medium',
      requiredBy: DateTime.now().add(const Duration(days: 10)),
      items: const [RequisitionItem(name: 'Pressure Gauge', quantity: 1)],
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      syncStatus: 'synced',
    ),
    Requisition(
      localId: 'uuid-3', assetId: 'TNK-003', priority: 'low',
      requiredBy: DateTime.now().add(const Duration(days: 30)),
      items: const [RequisitionItem(name: 'Corrosion Inhibitor', quantity: 2)],
      createdAt: DateTime.now().subtract(const Duration(minutes: 20)),
      syncStatus: 'failed',
    ),
  ];

  Icon _getSyncIcon(String status) {
    switch (status) {
      case 'synced':
        return const Icon(Icons.check_circle, color: Colors.green);
      case 'failed':
        return const Icon(Icons.error, color: Colors.red);
      case 'pending':
      default:
        return const Icon(Icons.sync, color: Colors.grey);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: _requisitions.length,
      itemBuilder: (context, index) {
        final requisition = _requisitions[index];
        return ListTile(
          leading: _getSyncIcon(requisition.syncStatus),
          title: Text('For Asset: ${requisition.assetId}'),
          subtitle: Text('${requisition.items.length} item(s) | Priority: ${requisition.priority}'),
          trailing: Text(requisition.syncStatus.toUpperCase()),
          onTap: () {
            // In the future, this could show details or retry options
          },
        );
      },
    );
  }
}
