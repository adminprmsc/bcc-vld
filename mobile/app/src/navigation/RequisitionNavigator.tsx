import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RequisitionListScreen from '../screens/requisitions/RequisitionListScreen';
import RequisitionDetailScreen from '../screens/requisitions/RequisitionDetailScreen';

export type RequisitionStackParamList = {
  RequisitionList: undefined;
  RequisitionDetail: { requisitionId: string };
};

const Stack = createNativeStackNavigator<RequisitionStackParamList>();

export default function RequisitionNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="RequisitionList"
        component={RequisitionListScreen}
        options={{ title: 'Requisitions' }}
      />
      <Stack.Screen
        name="RequisitionDetail"
        component={RequisitionDetailScreen}
        options={{ title: 'Requisition Detail' }}
      />
    </Stack.Navigator>
  );
}
