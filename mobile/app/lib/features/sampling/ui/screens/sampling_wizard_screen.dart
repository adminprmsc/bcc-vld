import 'package:flutter/material.dart';
import 'package:mobile_app/features/sampling/domain/models/sampling_assignment.dart';

class SamplingWizardScreen extends StatefulWidget {
  final SamplingAssignment assignment;

  const SamplingWizardScreen({super.key, required this.assignment});

  @override
  State<SamplingWizardScreen> createState() => _SamplingWizardScreenState();
}

class _SamplingWizardScreenState extends State<SamplingWizardScreen> {
  final _pageController = PageController();
  int _currentPage = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentPage < 2) {
      _pageController.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeIn);
    }
  }

  void _previousPage() {
    if (_currentPage > 0) {
      _pageController.previousPage(duration: const Duration(milliseconds: 300), curve: Curves.easeIn);
    }
  }

  void _onPageChanged(int page) {
    setState(() {
      _currentPage = page;
    });
  }

  void _submit() {
      // Mock submission logic
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sample data saved for offline sync.'), backgroundColor: Colors.green),
      );
      Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Sampling for ${widget.assignment.assetName}'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: PageView(
        controller: _pageController,
        onPageChanged: _onPageChanged,
        physics: const NeverScrollableScrollPhysics(), // Disable swiping
        children: const [
          _BarcodeStep(),
          _MeasurementsStep(),
          _ReviewStep(),
        ],
      ),
      bottomNavigationBar: BottomAppBar(
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            if (_currentPage > 0)
              TextButton.icon(onPressed: _previousPage, icon: const Icon(Icons.chevron_left), label: const Text('Back'))
            else
              const SizedBox(), // Keep spacing consistent

            if (_currentPage == 2) // Last page
              ElevatedButton.icon(onPressed: _submit, icon: const Icon(Icons.check), label: const Text('Submit'))
            else
              ElevatedButton.icon(onPressed: _nextPage, icon: const Icon(Icons.chevron_right), label: const Text('Next'),)
          ],
        ),
      ),
    );
  }
}

// --- Placeholder Step Widgets ---

class _BarcodeStep extends StatelessWidget {
  const _BarcodeStep();
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        Text('Step 1: Scan Barcode', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 24),
        TextFormField(
          decoration: const InputDecoration(
            labelText: 'Sample Barcode',
            border: OutlineInputBorder(),
            helperText: 'Use the device camera to scan the barcode sticker.',
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: ElevatedButton.icon(
            onPressed: () {}, // Mock scan action
            icon: const Icon(Icons.qr_code_scanner),
            label: const Text('Scan Code'),
          ),
        ),
      ],
    );
  }
}

class _MeasurementsStep extends StatelessWidget {
  const _MeasurementsStep();
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        Text('Step 2: Record Measurements', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 24),
        TextFormField(decoration: const InputDecoration(labelText: 'pH', border: OutlineInputBorder())),
        const SizedBox(height: 16),
        TextFormField(decoration: const InputDecoration(labelText: 'Turbidity (NTU)', border: OutlineInputBorder())),
        const SizedBox(height: 16),
        TextFormField(decoration: const InputDecoration(labelText: 'Temperature (°C)', border: OutlineInputBorder())),
      ],
    );
  }
}

class _ReviewStep extends StatelessWidget {
  const _ReviewStep();
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        Text('Step 3: Review & Submit', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 24),
        const Card(
          child: ListTile(
            leading: Icon(Icons.qr_code),
            title: Text('Barcode'),
            subtitle: Text('S-2024-A8723'),
          ),
        ),
        const Card(
          child: ListTile(
            leading: Icon(Icons.thermostat),
            title: Text('Measurements'),
            subtitle: Text('pH: 7.2, Turbidity: 1.4, Temp: 23.5°C'),
          ),
        ),
        const SizedBox(height: 24),
        const Text('Press submit to save the data for offline synchronization.'),
      ],
    );
  }
}
