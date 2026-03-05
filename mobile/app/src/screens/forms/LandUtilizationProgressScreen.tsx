import React, { useState, useContext } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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

interface LandUtilizationFormData {
  requisitionId: string;
  progressStatus: string;
  progressPercentage: string;
  workType: string;
  description: string;
  challenges: string;
  nextSteps: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  photos: string[];
}

const PROGRESS_STATUS_OPTIONS = [
  { label: 'Not Started', value: 'not_started' },
  { label: 'Site Preparation', value: 'site_preparation' },
  { label: 'Foundation Work', value: 'foundation' },
  { label: 'Construction In Progress', value: 'construction' },
  { label: 'Finishing Work', value: 'finishing' },
  { label: 'Completed', value: 'completed' },
  { label: 'On Hold', value: 'on_hold' },
];

const WORK_TYPE_OPTIONS = [
  { label: 'Civil Works', value: 'civil' },
  { label: 'Electrical Works', value: 'electrical' },
  { label: 'Plumbing Works', value: 'plumbing' },
  { label: 'Road/Infrastructure', value: 'road' },
  { label: 'Landscaping', value: 'landscaping' },
  { label: 'Equipment Installation', value: 'equipment' },
  { label: 'Other', value: 'other' },
];

export default function LandUtilizationProgressScreen() {
  const theme = useContext(ThemeContext);
  const navigation = useNavigation();
  const { enqueue } = useSyncStore();

  const [formData, setFormData] = useState<LandUtilizationFormData>({
    requisitionId: '',
    progressStatus: '',
    progressPercentage: '',
    workType: '',
    description: '',
    challenges: '',
    nextSteps: '',
    latitude: null,
    longitude: null,
    accuracy: null,
    photos: [],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LandUtilizationFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  const updateField = <K extends keyof LandUtilizationFormData>(
    field: K,
    value: LandUtilizationFormData[K]
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
        Alert.alert('Permission Denied', 'Location permission is required to capture GPS coordinates.');
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
    // In a real implementation, this would open camera/gallery
    // For now, we'll simulate adding a photo
    const mockPhotoUri = `photo_${Date.now()}.jpg`;
    updateField('photos', [...formData.photos, mockPhotoUri]);
  };

  const removePhoto = (index: number) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    updateField('photos', newPhotos);
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof LandUtilizationFormData, string>> = {};

    if (!formData.requisitionId.trim()) {
      newErrors.requisitionId = 'Requisition ID is required';
    }
    if (!formData.progressStatus) {
      newErrors.progressStatus = 'Progress status is required';
    }
    if (!formData.progressPercentage.trim()) {
      newErrors.progressPercentage = 'Progress percentage is required';
    } else if (
      isNaN(Number(formData.progressPercentage)) ||
      Number(formData.progressPercentage) < 0 ||
      Number(formData.progressPercentage) > 100
    ) {
      newErrors.progressPercentage = 'Enter a valid percentage (0-100)';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
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
      requisitionId: formData.requisitionId,
      progressStatus: formData.progressStatus,
      progressPercentage: Number(formData.progressPercentage),
      workType: formData.workType,
      description: formData.description,
      challenges: formData.challenges,
      nextSteps: formData.nextSteps,
      location:
        formData.latitude && formData.longitude
          ? {
              latitude: formData.latitude,
              longitude: formData.longitude,
              accuracy: formData.accuracy,
            }
          : null,
      capturedAt: new Date().toISOString(),
      offlineId: `progress_${Date.now()}`,
    };

    try {
      // Try to submit online first
      await http.post('/mobile/forms/land-utilization-progress', payload);

      await scheduleLocalNotification(
        'Progress Update Submitted',
        `Land utilization progress for ${formData.requisitionId} has been recorded.`,
        { type: 'progress', requisitionId: formData.requisitionId }
      );

      Alert.alert('Success', 'Progress update submitted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      // Queue for offline sync
      enqueue({
        id: payload.offlineId,
        entity: 'requisition',
        referenceId: formData.requisitionId,
        description: `Land utilization progress: ${formData.progressPercentage}%`,
        status: 'pending',
        operation: {
          type: 'TASK_COMPLETE',
          taskId: payload.offlineId,
          payload,
        },
      });

      Alert.alert(
        'Saved Offline',
        'Progress update saved locally and will sync when connected.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormContainer
      title="Land Utilization Progress"
      subtitle="Update on-site construction and development progress"
    >
      <TextField
        label="Requisition ID"
        value={formData.requisitionId}
        onChangeText={v => updateField('requisitionId', v)}
        placeholder="Enter requisition ID (e.g., REQ-2024-001)"
        error={errors.requisitionId}
        required
      />

      <SelectField
        label="Progress Status"
        value={formData.progressStatus}
        options={PROGRESS_STATUS_OPTIONS}
        onSelect={v => updateField('progressStatus', v)}
        error={errors.progressStatus}
        required
      />

      <TextField
        label="Progress Percentage"
        value={formData.progressPercentage}
        onChangeText={v => updateField('progressPercentage', v)}
        placeholder="0-100"
        keyboardType="numeric"
        error={errors.progressPercentage}
        required
      />

      <SelectField
        label="Type of Work"
        value={formData.workType}
        options={WORK_TYPE_OPTIONS}
        onSelect={v => updateField('workType', v)}
      />

      <SectionDivider title="Progress Details" />

      <TextField
        label="Description"
        value={formData.description}
        onChangeText={v => updateField('description', v)}
        placeholder="Describe the current progress and work completed..."
        multiline
        numberOfLines={4}
        error={errors.description}
        required
      />

      <TextField
        label="Challenges/Issues"
        value={formData.challenges}
        onChangeText={v => updateField('challenges', v)}
        placeholder="Any challenges or issues faced..."
        multiline
        numberOfLines={3}
      />

      <TextField
        label="Next Steps"
        value={formData.nextSteps}
        onChangeText={v => updateField('nextSteps', v)}
        placeholder="Planned activities for next period..."
        multiline
        numberOfLines={3}
      />

      <SectionDivider title="Location & Evidence" />

      <LocationField
        label="GPS Location"
        latitude={formData.latitude}
        longitude={formData.longitude}
        accuracy={formData.accuracy}
        onCapture={captureLocation}
        isCapturing={isCapturingLocation}
      />

      <PhotoField
        label="Site Photos"
        photos={formData.photos}
        onAddPhoto={addPhoto}
        onRemovePhoto={removePhoto}
        maxPhotos={5}
      />

      <View style={styles.buttonContainer}>
        <SubmitButton
          title="Submit Progress Update"
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
});
