import 'package:flutter/material.dart';
import 'package:mobile_app/features/asset_explorer/domain/models/asset.dart';
import 'package:mobile_app/features/asset_explorer/ui/screens/asset_detail_screen.dart';

class AssetExplorerScreen extends StatefulWidget {
  const AssetExplorerScreen({super.key});

  @override
  State<AssetExplorerScreen> createState() => _AssetExplorerScreenState();
}

class _AssetExplorerScreenState extends State<AssetExplorerScreen> {
  final List<Asset> _allAssets = const [
    Asset(id: 'PMP-001', name: 'Main Pump Station', type: 'Pump', latitude: 18.22, longitude: -66.59),
    Asset(id: 'VLV-042', name: 'Sector 4 Isolation Valve', type: 'Valve', latitude: 18.23, longitude: -66.60, isCritical: true),
    Asset(id: 'TNK-003', name: 'Hilltop Reserve Tank', type: 'Tank', latitude: 18.21, longitude: -66.58),
    Asset(id: 'GEN-002', name: 'Backup Generator B', type: 'Generator', latitude: 18.225, longitude: -66.595),
  ];

  late List<Asset> _filteredAssets;

  @override
  void initState() {
    super.initState();
    _filteredAssets = _allAssets;
  }

  void _filterAssets(String query) {
    if (query.isEmpty) {
      setState(() => _filteredAssets = _allAssets);
    } else {
      setState(() {
        _filteredAssets = _allAssets
            .where((asset) =>
                asset.name.toLowerCase().contains(query.toLowerCase()) ||
                asset.id.toLowerCase().contains(query.toLowerCase()))
            .toList();
      });
    }
  }

  void _navigateToDetail(Asset asset) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AssetDetailScreen(asset: asset),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: TextField(
            onChanged: _filterAssets,
            decoration: const InputDecoration(
              labelText: 'Search Assets by Name or ID',
              prefixIcon: Icon(Icons.search),
              border: OutlineInputBorder(),
            ),
          ),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: _filteredAssets.length,
            itemBuilder: (context, index) {
              final asset = _filteredAssets[index];
              return ListTile(
                leading: Icon(asset.isCritical ? Icons.warning : Icons.location_on, color: asset.isCritical ? Colors.red.shade700 : Colors.grey.shade600),
                title: Text(asset.name),
                subtitle: Text('ID: ${asset.id} | Type: ${asset.type}'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => _navigateToDetail(asset),
              );
            },
          ),
        ),
      ],
    );
  }
}
