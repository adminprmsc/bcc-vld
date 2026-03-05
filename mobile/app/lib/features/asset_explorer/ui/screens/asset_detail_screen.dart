import 'package:flutter/material.dart';
import 'package:mobile_app/features/asset_explorer/domain/models/asset.dart';
import 'package:mobile_app/features/requisitions/ui/screens/create_requisition_screen.dart';

class AssetDetailScreen extends StatelessWidget {
  final Asset asset;

  const AssetDetailScreen({super.key, required this.asset});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(asset.name),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: <Widget>[
          _buildDetailCard(context),
          const SizedBox(height: 24),
          _buildActions(context),
        ],
      ),
    );
  }

  Widget _buildDetailCard(BuildContext context) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            if (asset.isCritical)
              Padding(
                padding: const EdgeInsets.only(bottom: 12.0),
                child: Chip(
                  label: const Text('Critical'),
                  backgroundColor: Colors.red.shade700,
                  labelStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  avatar: const Icon(Icons.warning, color: Colors.white),
                ),
              ),
            _buildDetailRow('Asset ID', asset.id),
            _buildDetailRow('Asset Type', asset.type),
            _buildDetailRow('Coordinates', '${asset.latitude}, ${asset.longitude}'),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: <Widget>[
          Text(label, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
          Text(value, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }

  void _navigateToCreateRequisition(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CreateRequisitionScreen(assetId: asset.id),
      ),
    );
  }

  Widget _buildActions(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ElevatedButton.icon(
          onPressed: () => _navigateToCreateRequisition(context),
          icon: const Icon(Icons.add_shopping_cart),
          label: const Text('Initiate Requisition'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Theme.of(context).colorScheme.primary,
            padding: const EdgeInsets.symmetric(vertical: 16),
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Asset flagged as critical (mock action).'),
                backgroundColor: Colors.orange,
              ),
            );
          },
          icon: const Icon(Icons.flag_outlined),
          label: const Text('Flag as Critical'),
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.orange.shade700,
            side: BorderSide(color: Colors.orange.shade700),
            padding: const EdgeInsets.symmetric(vertical: 16),
          ),
        ),
      ],
    );
  }
}
