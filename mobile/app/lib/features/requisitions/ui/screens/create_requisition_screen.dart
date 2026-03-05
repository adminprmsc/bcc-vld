import 'package:flutter/material.dart';
import 'package:mobile_app/features/requisitions/domain/models/requisition.dart';
import 'package:uuid/uuid.dart';

class CreateRequisitionScreen extends StatefulWidget {
  final String assetId;

  const CreateRequisitionScreen({super.key, required this.assetId});

  @override
  State<CreateRequisitionScreen> createState() => _CreateRequisitionScreenState();
}

class _CreateRequisitionScreenState extends State<CreateRequisitionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _notesController = TextEditingController();
  final String _priority = 'medium';
  DateTime _requiredBy = DateTime.now().add(const Duration(days: 7));
  final List<RequisitionItem> _items = [const RequisitionItem(name: '', quantity: 1)];

  void _addItem() {
    setState(() {
      _items.add(const RequisitionItem(name: '', quantity: 1));
    });
  }

  void _removeItem(int index) {
    setState(() {
      _items.removeAt(index);
    });
  }

  void _updateItem(int index, String name, int quantity) {
    _items[index] = RequisitionItem(name: name, quantity: quantity);
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _requiredBy,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null && picked != _requiredBy) {
      setState(() {
        _requiredBy = picked;
      });
    }
  }

  void _submitRequisition() {
    if (_formKey.currentState!.validate()) {
      _formKey.currentState!.save();

      final newRequisition = Requisition(
        localId: const Uuid().v4(),
        assetId: widget.assetId,
        priority: _priority,
        requiredBy: _requiredBy,
        items: _items.where((item) => item.name.isNotEmpty && item.quantity > 0).toList(),
        notes: _notesController.text,
        createdAt: DateTime.now(),
      );

      // Mock submission
      print('Submitting: ${newRequisition.localId}');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Requisition submitted for offline syncing.'),
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
        title: const Text('Create Requisition'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            Text('For Asset: ${widget.assetId}', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 24),
            _buildPrioritySelector(),
            const SizedBox(height: 16),
            _buildRequiredByPicker(),
            const SizedBox(height: 24),
            Text('Items', style: Theme.of(context).textTheme.titleMedium),
            ..._buildItemFields(),
            TextButton.icon(onPressed: _addItem, icon: const Icon(Icons.add), label: const Text('Add Item')),
            const SizedBox(height: 24),
            TextFormField(
              controller: _notesController,
              decoration: const InputDecoration(labelText: 'Notes (optional)', border: OutlineInputBorder()),
              maxLines: 3,
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _submitRequisition,
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              child: const Text('Submit Requisition'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPrioritySelector() { ... }
  Widget _buildRequiredByPicker() { ... }
  List<Widget> _buildItemFields() { ... }
}
