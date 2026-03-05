import 'package:flutter/material.dart';
import 'package:mobile_app/features/sampling/domain/models/sampling_assignment.dart';
import 'package:mobile_app/features/sampling/ui/screens/assignment_detail_screen.dart';

class SamplingAssignmentsScreen extends StatefulWidget {
  const SamplingAssignmentsScreen({super.key});

  @override
  State<SamplingAssignmentsScreen> createState() => _SamplingAssignmentsScreenState();
}

class _SamplingAssignmentsScreenState extends State<SamplingAssignmentsScreen> {
  final List<SamplingAssignment> _assignments = [
    SamplingAssignment(
      id: 'ASGN-001', assetName: 'Main Pump Station', assetId: 'PMP-001',
      dueDate: DateTime.parse('2024-08-15'), status: 'completed',
    ),
    SamplingAssignment(
      id: 'ASGN-002', assetName: 'Sector 4 Isolation Valve', assetId: 'VLV-042',
      dueDate: DateTime.parse('2024-08-20'), status: 'in_progress',
    ),
    SamplingAssignment(
      id: 'ASGN-003', assetName: 'Hilltop Reserve Tank', assetId: 'TNK-003',
      dueDate: DateTime.parse('2024-08-22'), status: 'pending',
    ),
     SamplingAssignment(
      id: 'ASGN-004', assetName: 'Coastal Monitoring Point C', assetId: 'CMP-003',
      dueDate: DateTime.parse('2024-08-18'), status: 'pending',
    ),
  ];

  Icon _getStatusIcon(String status) {
    switch (status) {
      case 'completed':
        return const Icon(Icons.check_circle, color: Colors.green);
      case 'in_progress':
        return const Icon(Icons.hourglass_bottom, color: Colors.blue);
      case 'pending':
      default:
        return const Icon(Icons.radio_button_unchecked, color: Colors.grey);
    }
  }

  void _navigateToDetail(SamplingAssignment assignment) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => AssignmentDetailScreen(assignment: assignment),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    _assignments.sort((a, b) => a.dueDate.compareTo(b.dueDate)); // Sort by due date

    return ListView.builder(
      itemCount: _assignments.length,
      itemBuilder: (context, index) {
        final assignment = _assignments[index];
        return ListTile(
          leading: _getStatusIcon(assignment.status),
          title: Text(assignment.assetName),
          subtitle: Text('Due: ${assignment.dueDate.toLocal().toString().split(' ')[0]}'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _navigateToDetail(assignment),
        );
      },
    );
  }
}
