import React, { useState, useContext, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import {
  FormContainer,
  TextField,
  SelectField,
  LocationField,
  PhotoField,
  SubmitButton,
  SectionDivider,
} from '../../components/FormComponents';
import { ThemeContext } from '../../core/theme/themes';
import { useSyncStore } from '../../core/state/syncStore';
import { scheduleLocalNotification } from '../../core/notifications/notificationService';
import { http } from '../../core/api/httpClient';
import { Ionicons } from '@expo/vector-icons';

interface SampleCollectionFormData {
  sampleId: string;
  assetName: string;
  sourceType: string;
  collectionPoint: string;
  temperature: string;
  turbidity: string;
  odor: string;
  color: string;
  weatherConditions: string;
  samplingMethod: string;
  containerType: string;
  numberOfSamples: string;
  preservationMethod: string;
  fieldNotes: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  photos: string[];
  collectionTime: string;
}

const SOURCE_TYPE_OPTIONS = [
  { label: 'Tube Well', value: 'tube_well' },
  { label: 'Hand Pump', value: 'hand_pump' },
  { label: 'Open Well', value: 'open_well' },
  { label: 'Water Supply Scheme', value: 'water_supply' },
  { label: 'Storage Tank', value: 'storage_tank' },
  { label: 'Stream/River', value: 'stream' },
  { label: 'Canal', value: 'canal' },
  { label: 'Other', value: 'other' },
];

const COLLECTION_POINT_OPTIONS = [
  { label: 'Source Point', value: 'source' },
  { label: 'Distribution Point', value: 'distribution' },
  { label: 'Consumer End', value: 'consumer' },
  { label: 'Storage Point', value: 'storage' },
];

const ODOR_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Chlorine', value: 'chlorine' },
  { label: 'Rotten Egg (H2S)', value: 'hydrogen_sulfide' },
  { label: 'Musty/Earthy', value: 'musty' },
  { label: 'Chemical', value: 'chemical' },
  { label: 'Other', value: 'other' },
];

const COLOR_OPTIONS = [
  { label: 'Colorless/Clear', value: 'clear' },
  { label: 'Slightly Turbid', value: 'slightly_turbid' },
  { label: 'Turbid', value: 'turbid' },
  { label: 'Yellow/Brown', value: 'yellow_brown' },
  { label: 'Green', value: 'green' },
  { label: 'Other', value: 'other' },
];

const WEATHER_OPTIONS = [
  { label: 'Sunny', value: 'sunny' },
  { label: 'Cloudy', value: 'cloudy' },
  { label: 'Rainy', value: 'rainy' },
  { label: 'Hot', value: 'hot' },
  { label: 'Cold', value: 'cold' },
];

const SAMPLING_METHOD_OPTIONS = [
  { label: 'Grab Sample', value: 'grab' },
  { label: 'Composite Sample', value: 'composite' },
  { label: 'Depth Sample', value: 'depth' },
];

const CONTAINER_OPTIONS = [
  { label: 'Plastic Bottle (500ml)', value: 'plastic_500' },
  { label: 'Plastic Bottle (1L)', value: 'plastic_1000' },
  { label: 'Glass Bottle', value: 'glass' },
  { label: 'Sterile Container', value: 'sterile' },
];

const PRESERVATION_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Ice/Refrigeration', value: 'refrigeration' },
  { label: 'Chemical Preservative', value: 'chemical' },
  { label: 'Acidification', value: 'acidification' },
];

export default function SampleCollectionScreen() {
  const theme = useContext(ThemeContext);
  const navigation = useNavigation();
  const route = useRoute();
  const { enqueue } = useSyncStore();

  // Pre-filled sample ID from task (if available)
  const prefilledSampleId = (route.params as any)?.sampleId || '';
  const prefilledAssetName = (route.params as any)?.assetName || '';

  const [formData, setFormData] = useState<SampleCollectionFormData>({
    sampleId: prefilledSampleId,
    assetName: prefilledAssetName,
    sourceType: '',
    collectionPoint: '',
    temperature: '',
    turbidity: '',
    odor: '',
    color: '',
    weatherConditions: '',
    samplingMethod: '',
    containerType: '',
    numberOfSamples: '1',
    preservationMethod: '',
    fieldNotes: '',
    latitude: null,
    longitude: null,
    accuracy: null,
    photos: [],
    collectionTime: new Date().toISOString(),
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SampleCollectionFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  // Auto-capture location on mount
  useEffect(() => {
    captureLocation();
  }, []);

  const updateField = <K extends keyof SampleCollectionFormData>(
    field: K,
    value: SampleCollectionFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const captureLocation = async () => {
    setIsCapturingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for sample collection.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      updateField('latitude', location.coords.latitude);
      updateField('longitude', location.coords.longitude);
      updateField('accuracy', location.coords.accuracy);
    } catch (error) {
      Alert.alert('Error', 'Failed to capture location. Please try again.');
      console.error('Location capture error:', error);
    } finally {
      setIsCapturingLocation(false);
    }
  };

  const addPhoto = () => {
    const mockPhotoUri = `sample_photo_${Date.now()}.jpg`;
    updateField('photos', [...formData.photos, mockPhotoUri]);
  };

  const removePhoto = (index: number) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    updateField('photos', newPhotos);
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof SampleCollectionFormData, string>> = {};

    if (!formData.sampleId.trim()) {
      newErrors.sampleId = 'Sample ID is required';
    }
    if (!formData.sourceType) {
      newErrors.sourceType = 'Source type is required';
    }
    if (!formData.collectionPoint) {
      newErrors.collectionPoint = 'Collection point is required';
    }
    if (!formData.samplingMethod) {
      newErrors.samplingMethod = 'Sampling method is required';
    }
    if (!formData.containerType) {
      newErrors.containerType = 'Container type is required';
    }
    if (formData.latitude === null || formData.longitude === null) {
      newErrors.latitude = 'GPS location is required';
    }
    if (formData.temperature) {
      const temp = Number(formData.temperature);
      if (isNaN(temp) || temp < -10 || temp > 60) {
        newErrors.temperature = 'Enter valid temperature (-10 to 60°C)';
      }
    }
    if (formData.turbidity) {
      const turb = Number(formData.turbidity);
      if (isNaN(turb) || turb < 0) {
        newErrors.turbidity = 'Enter valid turbidity (NTU)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    const payload = {
      sampleId: formData.sampleId,
      assetName: formData.assetName,
      collectedAt: formData.collectionTime,
      sourceType: formData.sourceType,
      collectionPoint: formData.collectionPoint,
      fieldMeasurements: {
        temperature: formData.temperature ? Number(formData.temperature) : null,
        turbidity: formData.turbidity ? Number(formData.turbidity) : null,
        odor: formData.odor,
        color: formData.color,
      },
      weatherConditions: formData.weatherConditions,
      samplingDetails: {
        method: formData.samplingMethod,
        containerType: formData.containerType,
        numberOfSamples: Number(formData.numberOfSamples) || 1,
        preservationMethod: formData.preservationMethod,
      },
      fieldNotes: formData.fieldNotes,
      location: {
        latitude: formData.latitude,
        longitude: formData.longitude,
        accuracy: formData.accuracy,
      },
      offlineId: `sample_${Date.now()}`,
    };

    try {
      await http.post('/mobile/forms/water-sample-collection', payload);

      await scheduleLocalNotification(
        'Sample Collection Complete',
        `Sample ${formData.sampleId} has been collected and recorded.`,
        { type: 'sample', sampleId: formData.sampleId }
      );

      Alert.alert('Success', 'Sample collection data submitted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      enqueue({
        id: payload.offlineId,
        entity: 'sampling',
        referenceId: formData.sampleId,
        description: `Sample collection: ${formData.sampleId}`,
        status: 'pending',
        operation: {
          type: 'TASK_COMPLETE',
          taskId: payload.offlineId,
          payload,
        },
      });

      Alert.alert(
        'Saved Offline',
        'Sample data saved locally and will sync when connected.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormContainer
      title="Water Sample Collection"
      subtitle="Record field sampling data and chain of custody"
    >
      <View
        style={[
          styles.infoCard,
          { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary },
        ]}
      >
        <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
        <Text style={[styles.infoText, { color: theme.colors.text }]}>
          Ensure proper sampling procedures are followed. GPS location will be automatically captured.
        </Text>
      </View>

      <TextField
        label="Sample ID"
        value={formData.sampleId}
        onChangeText={v => updateField('sampleId', v)}
        placeholder="Enter or scan sample ID"
        error={errors.sampleId}
        required
        editable={!prefilledSampleId}
      />

      <TextField
        label="Asset/Source Name"
        value={formData.assetName}
        onChangeText={v => updateField('assetName', v)}
        placeholder="Name of water source"
      />

      <SelectField
        label="Source Type"
        value={formData.sourceType}
        options={SOURCE_TYPE_OPTIONS}
        onSelect={v => updateField('sourceType', v)}
        error={errors.sourceType}
        required
      />

      <SelectField
        label="Collection Point"
        value={formData.collectionPoint}
        options={COLLECTION_POINT_OPTIONS}
        onSelect={v => updateField('collectionPoint', v)}
        error={errors.collectionPoint}
        required
      />

      <SectionDivider title="Field Measurements" />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <TextField
            label="Temperature (°C)"
            value={formData.temperature}
            onChangeText={v => updateField('temperature', v)}
            placeholder="e.g., 25"
            keyboardType="numeric"
            error={errors.temperature}
          />
        </View>
        <View style={styles.halfField}>
          <TextField
            label="Turbidity (NTU)"
            value={formData.turbidity}
            onChangeText={v => updateField('turbidity', v)}
            placeholder="e.g., 5"
            keyboardType="numeric"
            error={errors.turbidity}
          />
        </View>
      </View>

      <SelectField
        label="Odor"
        value={formData.odor}
        options={ODOR_OPTIONS}
        onSelect={v => updateField('odor', v)}
      />

      <SelectField
        label="Color/Appearance"
        value={formData.color}
        options={COLOR_OPTIONS}
        onSelect={v => updateField('color', v)}
      />

      <SelectField
        label="Weather Conditions"
        value={formData.weatherConditions}
        options={WEATHER_OPTIONS}
        onSelect={v => updateField('weatherConditions', v)}
      />

      <SectionDivider title="Sampling Details" />

      <SelectField
        label="Sampling Method"
        value={formData.samplingMethod}
        options={SAMPLING_METHOD_OPTIONS}
        onSelect={v => updateField('samplingMethod', v)}
        error={errors.samplingMethod}
        required
      />

      <SelectField
        label="Container Type"
        value={formData.containerType}
        options={CONTAINER_OPTIONS}
        onSelect={v => updateField('containerType', v)}
        error={errors.containerType}
        required
      />

      <TextField
        label="Number of Samples"
        value={formData.numberOfSamples}
        onChangeText={v => updateField('numberOfSamples', v)}
        keyboardType="numeric"
      />

      <SelectField
        label="Preservation Method"
        value={formData.preservationMethod}
        options={PRESERVATION_OPTIONS}
        onSelect={v => updateField('preservationMethod', v)}
      />

      <SectionDivider title="Location & Documentation" />

      <LocationField
        label="GPS Location"
        latitude={formData.latitude}
        longitude={formData.longitude}
        accuracy={formData.accuracy}
        onCapture={captureLocation}
        isCapturing={isCapturingLocation}
        error={errors.latitude}
        required
      />

      <PhotoField
        label="Sample Photos"
        photos={formData.photos}
        onAddPhoto={addPhoto}
        onRemovePhoto={removePhoto}
        maxPhotos={5}
      />

      <TextField
        label="Field Notes"
        value={formData.fieldNotes}
        onChangeText={v => updateField('fieldNotes', v)}
        placeholder="Additional observations, conditions, or notes..."
        multiline
        numberOfLines={4}
      />

      <View style={styles.buttonContainer}>
        <SubmitButton
          title="Submit Sample Data"
          onPress={handleSubmit}
          loading={isSubmitting}
        />
        <SubmitButton
          title="Cancel"
          onPress={() => navigation.goBack()}
          variant="secondary"
        />
      </View>
    </FormContainer>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    marginTop: 16,
    gap: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
});
