import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';

class LandRequirementFormScreen extends StatefulWidget {
  const LandRequirementFormScreen({super.key});

  @override
  State<LandRequirementFormScreen> createState() => _LandRequirementFormScreenState();
}

class _LandRequirementFormScreenState extends State<LandRequirementFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _parcelIdController = TextEditingController();
  final _landownerNameController = TextEditingController();
  final _purposeController = TextEditingController();
  final _notesController = TextEditingController();

  void _submitForm() {
    if (_formKey.currentState!.validate()) {
      _formKey.currentState!.save();

      // In a real app, this would be saved to the local database and sync queue.
      final newRequirement = {
        'localId': const Uuid().v4(),
        'parcelId': _parcelIdController.text,
        'landownerName': _landownerNameController.text,
        'purpose': _purposeController.text,
        'notes': _notesController.text,
        'status': 'Draft',
        'createdAt': DateTime.now().toIso8601String(),
      };

      print('Submitting Land Requirement: $newRequirement');

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Land requirement form saved as draft.'),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('New Land Requirement'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            TextFormField(
              controller: _parcelIdController,
              decoration: const InputDecoration(labelText: 'Parcel ID', border: OutlineInputBorder()),
              validator: (value) => (value == null || value.isEmpty) ? 'This field is required' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _landownerNameController,
              decoration: const InputDecoration(labelText: 'Landowner Name', border: OutlineInputBorder()),
              validator: (value) => (value == null || value.isEmpty) ? 'This field is required' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _purposeController,
              decoration: const InputDecoration(labelText: 'Purpose', border: OutlineInputBorder()),
              validator: (value) => (value == null || value.isEmpty) ? 'This field is required' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _notesController,
              decoration: const InputDecoration(labelText: 'Notes (optional)', border: OutlineInputBorder()),
              maxLines: 4,
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _submitForm,
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              child: const Text('Save as Draft'),
            ),
          ],
        ),
      ),
    );
  }
}
