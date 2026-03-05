import 'package:flutter/material.dart';
import 'package:mobile_app/features/bcc/domain/models/land_requirement.dart';
import 'package:mobile_app/features/bcc/ui/screens/land_requirement_form_screen.dart';

class LandRequirementListScreen extends StatefulWidget {
  const LandRequirementListScreen({super.key});

  @override
  State<LandRequirementListScreen> createState() => _LandRequirementListScreenState();
}

class _LandRequirementListScreenState extends State<LandRequirementListScreen> {
  // Mock data
  final List<LandRequirement> _requirements = [
    LandRequirement(
      localId: 'uuid-lr-1', parcelId: '45-A-12', landownerName: 'John Doe',
      purpose: 'New Pipeline Access', status: 'Submitted',
      createdAt: DateTime.now().subtract(const Duration(days: 5)),
    ),
    LandRequirement(
      localId: 'uuid-lr-2', parcelId: 'B7-223', landownerName: 'Jane Smith',
      purpose: 'Staging Area', status: 'Draft',
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
    LandRequirement(
      localId: 'uuid-lr-3', parcelId: 'C1-004', landownerName: 'ACME Corp',
      purpose: 'Easement for Maintenance', status: 'Approved',
      createdAt: DateTime.now().subtract(const Duration(days: 20)),
    ),
  ];

  void _createNewForm(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const LandRequirementFormScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListView.builder(
        itemCount: _requirements.length,
        itemBuilder: (context, index) {
          final requirement = _requirements[index];
          return ListTile(
            title: Text('Parcel: ${requirement.parcelId}'),
            subtitle: Text(requirement.landownerName),
            trailing: Chip(label: Text(requirement.status)),
            onTap: () { /* In a real app, this would navigate to a detail/edit view */ },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _createNewForm(context),
        tooltip: 'New Land Requirement',
        child: const Icon(Icons.add),
      ),
    );
  }
}
