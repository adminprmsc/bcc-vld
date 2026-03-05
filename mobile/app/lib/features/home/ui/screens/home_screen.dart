import 'package:flutter/material.dart';
import 'package:mobile_app/features/asset_explorer/ui/screens/asset_explorer_screen.dart';
import 'package:mobile_app/features/bcc/ui/screens/land_requirement_list_screen.dart';
import 'package:mobile_app/features/map/ui/screens/map_screen.dart';
import 'package:mobile_app/features/requisitions/ui/screens/requisition_list_screen.dart';
import 'package:mobile_app/features/sampling/ui/screens/sampling_assignments_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Widget _currentScreen = const MapScreen();
  String _currentTitle = 'Map';

  void _selectScreen(Widget screen, String title) {
    setState(() {
      _currentScreen = screen;
      _currentTitle = title;
    });
    Navigator.pop(context); // Close the drawer
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_currentTitle),
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: <Widget>[
            DrawerHeader(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
              ),
              child: const Text(
                'Field Operations Menu',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                ),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.map_outlined),
              title: const Text('Map'),
              onTap: () => _selectScreen(const MapScreen(), 'Map'),
            ),
            const Divider(),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Text('Field Officer (RA)', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            ListTile(
              leading: const Icon(Icons.business_center_outlined),
              title: const Text('Asset Explorer'),
              onTap: () => _selectScreen(const AssetExplorerScreen(), 'Asset Explorer'),
            ),
            ListTile(
              leading: const Icon(Icons.shopping_cart_outlined),
              title: const Text('My Requisitions'),
              onTap: () => _selectScreen(const RequisitionListScreen(), 'My Requisitions'),
            ),
            const Divider(),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Text('Sampler', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
             ListTile(
              leading: const Icon(Icons.science_outlined),
              title: const Text('Sampling Assignments'),
              onTap: () => _selectScreen(const SamplingAssignmentsScreen(), 'Sampling Assignments'),
            ),
            const Divider(),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Text('Community Coordinator (BCC)', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
             ListTile(
              leading: const Icon(Icons.landscape_outlined),
              title: const Text('Land Requirements'),
              onTap: () => _selectScreen(const LandRequirementListScreen(), 'Land Requirements'),
            ),
          ],
        ),
      ),
      body: _currentScreen,
    );
  }
}
