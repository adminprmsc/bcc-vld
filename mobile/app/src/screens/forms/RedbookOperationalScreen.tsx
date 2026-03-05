import React, { useState, useContext } from 'react';
import { View, Text, Alert, StyleSheet, TouchableOpacity } from 'react-native';
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
import { Ionicons } from '@expo/vector-icons';

interface RedbookFormData {
  assetId: string;
  assetType: string;
  operationalStatus: string;
  capacityUtilization: string;
  lastMaintenanceDate: string;
  nextMaintenanceDue: string;
  condition: string;
  operatorName: string;
  operatorContact: string;
  remarks: string;
  issues: RedbookIssue[];
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  photos: string[];
}

interface RedbookIssue {
  id: string;
  type: string;
  severity: string;
  description: string;
}

const ASSET_TYPE_OPTIONS = [
  { label: 'Water Supply Scheme', value: 'water_supply' },
  { label: 'Sewerage System', value: 'sewerage' },
  { label: 'Drainage System', value: 'drainage' },
  { label: 'Road/Street', value: 'road' },
  { label: 'Community Building', value: 'building' },
  { label: 'Park/Playground', value: 'park' },
  { label: 'Street Light', value: 'street_light' },
  { label: 'Other Infrastructure', value: 'other' },
];

const OPERATIONAL_STATUS_OPTIONS = [
  { label: 'Fully Operational', value: 'operational' },
  { label: 'Partially Operational', value: 'partial' },
  { label: 'Under Maintenance', value: 'maintenance' },
  { label: 'Non-Operational', value: 'non_operational' },
  { label: 'Decommissioned', value: 'decommissioned' },
];

const CONDITION_OPTIONS = [
  { label: 'Excellent', value: 'excellent' },
  { label: 'Good', value: 'good' },
  { label: 'Fair', value: 'fair' },
  { label: 'Poor', value: 'poor' },
  { label: 'Critical', value: 'critical' },
];

const ISSUE_TYPE_OPTIONS = [
  { label: 'Mechanical Failure', value: 'mechanical' },
  { label: 'Electrical Issue', value: 'electrical' },
  { label: 'Structural Damage', value: 'structural' },
  { label: 'Vandalism', value: 'vandalism' },
  { label: 'Wear and Tear', value: 'wear' },
  { label: 'Operational Issue', value: 'operational' },
  { label: 'Safety Hazard', value: 'safety' },
  { label: 'Other', value: 'other' },
];

const SEVERITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
];

export default function RedbookOperationalScreen() {
  const theme = useContext(ThemeContext);
  const navigation = useNavigation();
  const { enqueue } = useSyncStore();

  const [formData, setFormData] = useState<RedbookFormData>({
    assetId: '',
    assetType: '',
    operationalStatus: '',
    capacityUtilization: '',
    lastMaintenanceDate: '',
    nextMaintenanceDue: '',
    condition: '',
    operatorName: '',
    operatorContact: '',
    remarks: '',
    issues: [],
    latitude: null,
    longitude: null,
    accuracy: null,
    photos: [],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RedbookFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [currentIssue, setCurrentIssue] = useState<Partial<RedbookIssue>>({});

  const updateField = <K extends keyof RedbookFormData>(
    field: K,
    value: RedbookFormData[K]
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
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      updateField('latitude', location.coords.latitude);
      updateField('longitude', location.coords.longitude);
      updateField('accuracy', location.coords.accuracy);
    } catch (error) {
      Alert.alert('Error', 'Failed to capture location.');
      console.error('Location error:', error);
    } finally {
      setIsCapturingLocation(false);
    }
  };

  const addPhoto = () => {
    const mockPhotoUri = `redbook_photo_${Date.now()}.jpg`;
    updateField('photos', [...formData.photos, mockPhotoUri]);
  };

  const removePhoto = (index: number) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    updateField('photos', newPhotos);
  };

  const addIssue = () => {
    if (!currentIssue.type || !currentIssue.severity || !currentIssue.description) {
      Alert.alert('Error', 'Please fill all issue fields');
      return;
    }

    const newIssue: RedbookIssue = {
      id: `issue_${Date.now()}`,
      type: currentIssue.type,
      severity: currentIssue.severity,
      description: currentIssue.description,
    };

    updateField('issues', [...formData.issues, newIssue]);
    setCurrentIssue({});
    setShowIssueForm(false);
  };

  const removeIssue = (id: string) => {
    updateField('issues', formData.issues.filter(i => i.id !== id));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof RedbookFormData, string>> = {};

    if (!formData.assetId.trim()) {
      newErrors.assetId = 'Asset ID is required';
    }
    if (!formData.assetType) {
      newErrors.assetType = 'Asset type is required';
    }
    if (!formData.operationalStatus) {
      newErrors.operationalStatus = 'Operational status is required';
    }
    if (!formData.condition) {
      newErrors.condition = 'Condition assessment is required';
    }
    if (formData.capacityUtilization) {
      const capacity = Number(formData.capacityUtilization);
      if (isNaN(capacity) || capacity < 0 || capacity > 100) {
        newErrors.capacityUtilization = 'Enter valid percentage (0-100)';
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
      assetId: formData.assetId,
      assetType: formData.assetType,
      operationalStatus: formData.operationalStatus,
      capacityUtilization: formData.capacityUtilization
        ? Number(formData.capacityUtilization)
        : null,
      lastMaintenanceDate: formData.lastMaintenanceDate || null,
      nextMaintenanceDue: formData.nextMaintenanceDue || null,
      condition: formData.condition,
      operator: {
        name: formData.operatorName,
        contact: formData.operatorContact,
      },
      remarks: formData.remarks,
      issues: formData.issues,
      location:
        formData.latitude && formData.longitude
          ? {
              latitude: formData.latitude,
              longitude: formData.longitude,
              accuracy: formData.accuracy,
            }
          : null,
      capturedAt: new Date().toISOString(),
      offlineId: `redbook_${Date.now()}`,
    };

    try {
      await http.post('/mobile/forms/redbook-operational', payload);

      await scheduleLocalNotification(
        'Redbook Data Submitted',
        `Operational data for asset ${formData.assetId} has been recorded.`,
        { type: 'progress', assetId: formData.assetId }
      );

      Alert.alert('Success', 'Redbook operational data submitted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      enqueue({
        id: payload.offlineId,
        entity: 'asset',
        referenceId: formData.assetId,
        description: `Redbook: ${formData.assetType} - ${formData.operationalStatus}`,
        status: 'pending',
        operation: {
          type: 'TASK_COMPLETE',
          taskId: payload.offlineId,
          payload,
        },
      });

      Alert.alert(
        'Saved Offline',
        'Redbook data saved locally and will sync when connected.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#EF4444';
      case 'high':
        return '#F97316';
      case 'medium':
        return '#F59E0B';
      default:
        return '#10B981';
    }
  };

  return (
    <FormContainer
      title="Redbook Operational Data"
      subtitle="Record asset operational status and maintenance information"
    >
      <TextField
        label="Asset ID"
        value={formData.assetId}
        onChangeText={v => updateField('assetId', v)}
        placeholder="Enter asset ID (e.g., ASSET-WSS-001)"
        error={errors.assetId}
        required
      />

      <SelectField
        label="Asset Type"
        value={formData.assetType}
        options={ASSET_TYPE_OPTIONS}
        onSelect={v => updateField('assetType', v)}
        error={errors.assetType}
        required
      />

      <SelectField
        label="Operational Status"
        value={formData.operationalStatus}
        options={OPERATIONAL_STATUS_OPTIONS}
        onSelect={v => updateField('operationalStatus', v)}
        error={errors.operationalStatus}
        required
      />

      <SelectField
        label="Physical Condition"
        value={formData.condition}
        options={CONDITION_OPTIONS}
        onSelect={v => updateField('condition', v)}
        error={errors.condition}
        required
      />

      <TextField
        label="Capacity Utilization (%)"
        value={formData.capacityUtilization}
        onChangeText={v => updateField('capacityUtilization', v)}
        placeholder="0-100"
        keyboardType="numeric"
        error={errors.capacityUtilization}
      />

      <SectionDivider title="Maintenance Information" />

      <TextField
        label="Last Maintenance Date"
        value={formData.lastMaintenanceDate}
        onChangeText={v => updateField('lastMaintenanceDate', v)}
        placeholder="YYYY-MM-DD"
      />

      <TextField
        label="Next Maintenance Due"
        value={formData.nextMaintenanceDue}
        onChangeText={v => updateField('nextMaintenanceDue', v)}
        placeholder="YYYY-MM-DD"
      />

      <SectionDivider title="Operator Information" />

      <TextField
        label="Operator Name"
        value={formData.operatorName}
        onChangeText={v => updateField('operatorName', v)}
        placeholder="Name of asset operator"
      />

      <TextField
        label="Operator Contact"
        value={formData.operatorContact}
        onChangeText={v => updateField('operatorContact', v)}
        placeholder="Phone number"
        keyboardType="phone-pad"
      />

      <SectionDivider title="Issues & Problems" />

      <View style={styles.issuesContainer}>
        {formData.issues.map(issue => (
          <View
            key={issue.id}
            style={[
              styles.issueCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.issueHeader}>
              <View
                style={[
                  styles.severityBadge,
                  { backgroundColor: getSeverityColor(issue.severity) },
                ]}
              >
                <Text style={styles.severityText}>{issue.severity.toUpperCase()}</Text>
              </View>
              <TouchableOpacity onPress={() => removeIssue(issue.id)}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.issueType, { color: theme.colors.text }]}>
              {ISSUE_TYPE_OPTIONS.find(o => o.value === issue.type)?.label || issue.type}
            </Text>
            <Text style={[styles.issueDescription, { color: theme.colors.textSecondary }]}>
              {issue.description}
            </Text>
          </View>
        ))}

        {showIssueForm ? (
          <View
            style={[
              styles.issueForm,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <SelectField
              label="Issue Type"
              value={currentIssue.type || ''}
              options={ISSUE_TYPE_OPTIONS}
              onSelect={v => setCurrentIssue(prev => ({ ...prev, type: v }))}
              required
            />
            <SelectField
              label="Severity"
              value={currentIssue.severity || ''}
              options={SEVERITY_OPTIONS}
              onSelect={v => setCurrentIssue(prev => ({ ...prev, severity: v }))}
              required
            />
            <TextField
              label="Description"
              value={currentIssue.description || ''}
              onChangeText={v => setCurrentIssue(prev => ({ ...prev, description: v }))}
              placeholder="Describe the issue..."
              multiline
              numberOfLines={2}
              required
            />
            <View style={styles.issueFormButtons}>
              <TouchableOpacity
                style={[styles.issueButton, { backgroundColor: theme.colors.primary }]}
                onPress={addIssue}
              >
                <Text style={styles.issueButtonText}>Add Issue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.issueButton, { backgroundColor: theme.colors.border }]}
                onPress={() => {
                  setShowIssueForm(false);
                  setCurrentIssue({});
                }}
              >
                <Text style={[styles.issueButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.addIssueButton,
              { borderColor: theme.colors.primary },
            ]}
            onPress={() => setShowIssueForm(true)}
          >
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.addIssueText, { color: theme.colors.primary }]}>
              Add Issue
            </Text>
          </TouchableOpacity>
        )}
      </View>

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
        label="Asset Photos"
        photos={formData.photos}
        onAddPhoto={addPhoto}
        onRemovePhoto={removePhoto}
        maxPhotos={5}
      />

      <TextField
        label="Additional Remarks"
        value={formData.remarks}
        onChangeText={v => updateField('remarks', v)}
        placeholder="Any additional observations..."
        multiline
        numberOfLines={3}
      />

      <View style={styles.buttonContainer}>
        <SubmitButton
          title="Submit Redbook Data"
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
  issuesContainer: {
    gap: 12,
  },
  issueCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  issueType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  issueDescription: {
    fontSize: 12,
  },
  issueForm: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  issueFormButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  issueButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  issueButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  addIssueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  addIssueText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
