import React, { useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ThemeContext } from '../core/theme/themes';
import { Ionicons } from '@expo/vector-icons';

// TextField Component
interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  error?: string;
  required?: boolean;
  editable?: boolean;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  error,
  required = false,
  editable = true,
}: TextFieldProps) {
  const theme = useContext(ThemeContext);

  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, { color: theme.colors.text }]}>
        {label}
        {required && <Text style={{ color: theme.colors.primary }}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? '#EF4444' : theme.colors.border,
            color: theme.colors.text,
          },
          multiline && { minHeight: numberOfLines * 24, textAlignVertical: 'top' },
          !editable && { opacity: 0.6 },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType}
        editable={editable}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// Select/Dropdown Component
interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export function SelectField({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select an option',
  error,
  required = false,
}: SelectFieldProps) {
  const theme = useContext(ThemeContext);
  const [isOpen, setIsOpen] = React.useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, { color: theme.colors.text }]}>
        {label}
        {required && <Text style={{ color: theme.colors.primary }}> *</Text>}
      </Text>
      <TouchableOpacity
        style={[
          styles.selectButton,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? '#EF4444' : theme.colors.border,
          },
        ]}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text
          style={[
            styles.selectText,
            { color: selectedOption ? theme.colors.text : theme.colors.textSecondary },
          ]}
        >
          {selectedOption?.label || placeholder}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>
      {isOpen && (
        <View
          style={[
            styles.optionsContainer,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          {options.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionItem,
                option.value === value && { backgroundColor: theme.colors.primary + '20' },
              ]}
              onPress={() => {
                onSelect(option.value);
                setIsOpen(false);
              }}
            >
              <Text style={[styles.optionText, { color: theme.colors.text }]}>
                {option.label}
              </Text>
              {option.value === value && (
                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// GPS Location Field
interface LocationFieldProps {
  label: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  onCapture: () => void;
  isCapturing?: boolean;
  error?: string;
  required?: boolean;
}

export function LocationField({
  label,
  latitude,
  longitude,
  accuracy,
  onCapture,
  isCapturing = false,
  error,
  required = false,
}: LocationFieldProps) {
  const theme = useContext(ThemeContext);
  const hasLocation = latitude !== null && longitude !== null;

  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, { color: theme.colors.text }]}>
        {label}
        {required && <Text style={{ color: theme.colors.primary }}> *</Text>}
      </Text>
      <View
        style={[
          styles.locationContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? '#EF4444' : theme.colors.border,
          },
        ]}
      >
        {hasLocation ? (
          <View style={styles.locationInfo}>
            <Ionicons name="location" size={24} color="#10B981" />
            <View style={styles.locationText}>
              <Text style={[styles.coordText, { color: theme.colors.text }]}>
                {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
              </Text>
              {accuracy && (
                <Text style={[styles.accuracyText, { color: theme.colors.textSecondary }]}>
                  Accuracy: ±{accuracy.toFixed(1)}m
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.locationInfo}>
            <Ionicons name="location-outline" size={24} color={theme.colors.textSecondary} />
            <Text style={[styles.noLocationText, { color: theme.colors.textSecondary }]}>
              No location captured
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.captureButton, { backgroundColor: theme.colors.primary }]}
          onPress={onCapture}
          disabled={isCapturing}
        >
          {isCapturing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="navigate" size={18} color="#FFFFFF" />
              <Text style={styles.captureButtonText}>
                {hasLocation ? 'Update' : 'Capture'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// Photo Capture Field
interface PhotoFieldProps {
  label: string;
  photos: string[];
  onAddPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  maxPhotos?: number;
  error?: string;
  required?: boolean;
}

export function PhotoField({
  label,
  photos,
  onAddPhoto,
  onRemovePhoto,
  maxPhotos = 5,
  error,
  required = false,
}: PhotoFieldProps) {
  const theme = useContext(ThemeContext);
  const canAddMore = photos.length < maxPhotos;

  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, { color: theme.colors.text }]}>
        {label} ({photos.length}/{maxPhotos})
        {required && <Text style={{ color: theme.colors.primary }}> *</Text>}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.photoContainer}>
          {photos.map((uri, index) => (
            <View key={index} style={styles.photoWrapper}>
              <View
                style={[
                  styles.photoPlaceholder,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <Ionicons name="image" size={32} color={theme.colors.primary} />
                <Text style={[styles.photoIndex, { color: theme.colors.textSecondary }]}>
                  Photo {index + 1}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={() => onRemovePhoto(index)}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
          {canAddMore && (
            <TouchableOpacity
              style={[
                styles.addPhotoButton,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
              onPress={onAddPhoto}
            >
              <Ionicons name="camera" size={32} color={theme.colors.primary} />
              <Text style={[styles.addPhotoText, { color: theme.colors.textSecondary }]}>
                Add Photo
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// Submit Button
interface SubmitButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function SubmitButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: SubmitButtonProps) {
  const theme = useContext(ThemeContext);

  const backgroundColor =
    variant === 'primary'
      ? theme.colors.primary
      : variant === 'danger'
      ? '#EF4444'
      : theme.colors.surface;

  const textColor = variant === 'secondary' ? theme.colors.text : '#FFFFFF';

  return (
    <TouchableOpacity
      style={[
        styles.submitButton,
        { backgroundColor },
        (disabled || loading) && { opacity: 0.6 },
        variant === 'secondary' && { borderWidth: 1, borderColor: theme.colors.border },
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.submitButtonText, { color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

// Form Container
interface FormContainerProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function FormContainer({ children, title, subtitle }: FormContainerProps) {
  const theme = useContext(ThemeContext);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formHeader}>
          <Text style={[styles.formTitle, { color: theme.colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.formSubtitle, { color: theme.colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Section Divider
interface SectionDividerProps {
  title: string;
}

export function SectionDivider({ title }: SectionDividerProps) {
  const theme = useContext(ThemeContext);

  return (
    <View style={styles.sectionDivider}>
      <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
      <Text style={[styles.sectionDividerText, { color: theme.colors.textSecondary }]}>
        {title}
      </Text>
      <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  selectButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 16,
  },
  optionsContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
  },
  optionItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
  },
  locationContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    marginLeft: 8,
  },
  coordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  accuracyText: {
    fontSize: 12,
  },
  noLocationText: {
    marginLeft: 8,
    fontSize: 14,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  photoContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  photoWrapper: {
    position: 'relative',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIndex: {
    fontSize: 12,
    marginTop: 4,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  formContent: {
    padding: 16,
    paddingBottom: 32,
  },
  formHeader: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  formSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  sectionDividerText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
