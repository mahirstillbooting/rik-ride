import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from './Icon';
import { useToast } from './Toast';
import { spacing, borderRadius } from '../../theme/spacing';

export interface ProfilePictureUploaderProps {
  currentImage?: string;
  onImageSelected: (imageUriOrBase64: string) => void;
  onImageRemoved?: () => void;
  size?: number;
  editable?: boolean;
}

export const ProfilePictureUploader: React.FC<ProfilePictureUploaderProps> = ({
  currentImage,
  onImageSelected,
  onImageRemoved,
  size = 80,
  editable = true,
}) => {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFileChangeWeb = (event: any) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      showToast('Invalid format. Please select a JPEG, PNG, or WebP image.', 'danger');
      return;
    }

    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE_BYTES) {
      showToast(`Image size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`, 'danger');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Str = e.target?.result as string;
      setUploading(false);
      if (base64Str) {
        onImageSelected(base64Str);
        showToast('Profile photo updated', 'success');
      }
    };
    reader.onerror = () => {
      setUploading(false);
      showToast('Failed to read image file', 'danger');
    };
    reader.readAsDataURL(file);
  };

  const triggerSelect = () => {
    if (!editable) return;
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      input.onchange = handleFileChangeWeb;
      input.click();
    } else {
      showToast('Select photo from gallery or camera', 'info');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={editable ? 0.8 : 1}
        onPress={triggerSelect}
        style={[
          styles.avatarWrapper,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.primarySurface,
            borderColor: colors.primaryBorder,
          },
        ]}
      >
        {currentImage ? (
          <Image source={{ uri: currentImage }} style={[styles.avatarImage, { borderRadius: size / 2 }]} />
        ) : (
          <Icon name="user" size={size * 0.45} color={colors.primary} />
        )}

        {uploading && (
          <View style={[styles.overlay, { borderRadius: size / 2 }]}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        )}

        {editable && !uploading && (
          <View style={[styles.badgeContainer, { backgroundColor: colors.primary }]}>
            <Icon name="camera" size={12} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>

      {editable && currentImage && onImageRemoved && (
        <TouchableOpacity
          onPress={onImageRemoved}
          style={[styles.removeButton, { borderColor: colors.border }]}
        >
          <Icon name="trash-2" size={12} color={colors.danger} />
          <Text style={[styles.removeText, { color: colors.danger }]}>Remove Photo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatarWrapper: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginTop: 4,
  },
  removeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
