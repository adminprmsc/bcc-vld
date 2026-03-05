import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';
import { Alert, Platform } from 'react-native';

export interface CapturedImage {
  uri: string;
  width: number;
  height: number;
  type: 'image';
  fileName: string;
  fileSize?: number;
}

/**
 * Request camera permissions
 */
export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await Camera.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Camera permission is required to take photos. Please enable it in your device settings.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
}

/**
 * Request media library permissions
 */
export async function requestMediaLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Photo library permission is required to select photos. Please enable it in your device settings.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
}

/**
 * Take a photo using the camera
 */
export async function takePhoto(): Promise<CapturedImage | null> {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    return null;
  }

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      exif: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const fileName = asset.uri.split('/').pop() || `photo_${Date.now()}.jpg`;

    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      type: 'image',
      fileName,
      fileSize: asset.fileSize,
    };
  } catch (error) {
    console.error('Error taking photo:', error);
    Alert.alert('Error', 'Failed to take photo. Please try again.');
    return null;
  }
}

/**
 * Pick an image from the gallery
 */
export async function pickImage(): Promise<CapturedImage | null> {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) {
    return null;
  }

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const fileName = asset.uri.split('/').pop() || `image_${Date.now()}.jpg`;

    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      type: 'image',
      fileName,
      fileSize: asset.fileSize,
    };
  } catch (error) {
    console.error('Error picking image:', error);
    Alert.alert('Error', 'Failed to pick image. Please try again.');
    return null;
  }
}

/**
 * Pick multiple images from the gallery
 */
export async function pickMultipleImages(maxCount: number = 5): Promise<CapturedImage[]> {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) {
    return [];
  }

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: maxCount,
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return [];
    }

    return result.assets.map(asset => ({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      type: 'image' as const,
      fileName: asset.uri.split('/').pop() || `image_${Date.now()}.jpg`,
      fileSize: asset.fileSize,
    }));
  } catch (error) {
    console.error('Error picking images:', error);
    Alert.alert('Error', 'Failed to pick images. Please try again.');
    return [];
  }
}

/**
 * Show action sheet to choose between camera and gallery
 */
export async function showImagePickerOptions(): Promise<CapturedImage | null> {
  return new Promise(resolve => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const image = await takePhoto();
            resolve(image);
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const image = await pickImage();
            resolve(image);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true }
    );
  });
}

/**
 * Create FormData for uploading images
 */
export function createImageFormData(
  images: CapturedImage[],
  fieldName: string = 'attachments'
): FormData {
  const formData = new FormData();

  images.forEach((image, index) => {
    formData.append(fieldName, {
      uri: Platform.OS === 'ios' ? image.uri.replace('file://', '') : image.uri,
      type: 'image/jpeg',
      name: image.fileName,
    } as any);
  });

  return formData;
}
