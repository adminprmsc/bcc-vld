import 'package:flutter/material.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  static const String styleUrl = 'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL';

  MaplibreMapController? _mapController;
  final TextEditingController _searchController = TextEditingController();
  bool _isDownloading = false;
  double _downloadProgress = 0.0;

  void _onMapCreated(MaplibreMapController controller) {
    _mapController = controller;
  }

  void _searchAndFlyTo() {
    if (_mapController == null) return;
    final text = _searchController.text.trim();
    final parts = text.split(',');
    if (parts.length != 2) {
      _showErrorSnackBar('Invalid format. Use "latitude, longitude"');
      return;
    }

    final lat = double.tryParse(parts[0].trim());
    final lon = double.tryParse(parts[1].trim());

    if (lat == null || lon == null) {
      _showErrorSnackBar('Invalid coordinates.');
      return;
    }

    _mapController!.clearSymbols();
    _mapController!.addSymbol(
      SymbolOptions(
        geometry: LatLng(lat, lon),
        iconImage: 'marker-15',
        iconSize: 1.5,
      ),
    );
    _mapController!.animateCamera(CameraUpdate.newLatLngZoom(LatLng(lat, lon), 14));
  }

  Future<void> _downloadOfflineRegion() async {
    if (_mapController == null || _isDownloading) return;

    setState(() {
      _isDownloading = true;
      _downloadProgress = 0.0;
    });

    final bounds = await _mapController!.getVisibleRegion();
    final definition = OfflineRegionDefinition(
      styleURL: styleUrl,
      bounds: bounds,
      minZoom: 9,
      maxZoom: 14,
    );

    try {
      final region = await _mapController!.downloadOfflineRegion(
        definition,
        onProgress: (progress) {
          if (!mounted) return;
          setState(() {
            _downloadProgress = (progress.completedResourceCount / progress.requiredResourceCount).clamp(0.0, 1.0);
          });
        },
      );
      if (!mounted) return;
      _showSuccessSnackBar('Offline region "${region.id}" downloaded!');
    } catch (e) {
      if (!mounted) return;
      _showErrorSnackBar('Error downloading: $e');
    } finally {
      if (mounted) {
        setState(() { _isDownloading = false; });
      }
    }
  }

  void _showErrorSnackBar(String message) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), backgroundColor: Colors.red),
      );
  }

  void _showSuccessSnackBar(String message) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), backgroundColor: Colors.green),
      );
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Map Proof-of-Concept'),
      ),
      body: Stack(
        children: [
          MaplibreMap(
            onMapCreated: _onMapCreated,
            styleString: styleUrl,
            initialCameraPosition: const CameraPosition(
              target: LatLng(18.2208, -66.5901),
              zoom: 9,
            ),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Card(
              margin: const EdgeInsets.all(8.0),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8.0),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search lat, lon...',
                    border: InputBorder.none,
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.search),
                      onPressed: _searchAndFlyTo,
                    ),
                  ),
                  onSubmitted: (_) => _searchAndFlyTo(),
                ),
              ),
            ),
          ),
          if (_isDownloading)
            Positioned(
              bottom: 80,
              left: 16,
              right: 16,
              child: LinearProgressIndicator(value: _downloadProgress),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _isDownloading ? null : _downloadOfflineRegion,
        label: const Text('Download Visible Area'),
        icon: _isDownloading ? const CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(Colors.white)) : const Icon(Icons.download),
        backgroundColor: _isDownloading ? Colors.grey : Theme.of(context).colorScheme.primary,
      ),
    );
  }
}
