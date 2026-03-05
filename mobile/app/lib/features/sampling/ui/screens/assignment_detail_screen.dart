import 'package:flutter/material.dart';
import 'package:mobile_app/features/sampling/domain/models/sampling_assignment.dart';
import 'package:mobile_app/features/sampling/ui/screens/sampling_wizard_screen.dart';

class AssignmentDetailScreen extends StatelessWidget {
  final SamplingAssignment assignment;

  const AssignmentDetailScreen({super.key, required this.assignment});

  void _startSampling(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => SamplingWizardScreen(assignment: assignment),
        fullscreenDialog: true, // Wizards are often presented as full-screen dialogs
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Assignment Details'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(assignment.assetName, style: Theme.of(context).textTheme.headlineSmall),
                    const SizedBox(height: 8),
                    _buildDetailRow('Asset ID', assignment.assetId),
                    _buildDetailRow('Due Date', assignment.dueDate.toLocal().toString().split(' ')[0]),
                    _buildDetailRow('Status', assignment.status.toUpperCase()),
                  ],
                ),
              ),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _startSampling(context),
                icon: const Icon(Icons.science_outlined),
                label: const Text('Start Sampling Process'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: Theme.of(context).colorScheme.primary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        children: [
          Text('$label: ', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
          Text(value),
        ],
      ),
    );
  }
}
