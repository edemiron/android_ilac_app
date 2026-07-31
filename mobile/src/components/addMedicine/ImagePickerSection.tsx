import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { ThemeColors } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { createScopedLogger } from '../../utils/logger';

const log = createScopedLogger('ImagePickerSection');

interface ImagePickerSectionProps {
    imageUri?: string;
    onImageChange: (uri?: string) => void;
    label: string;
    colors: ThemeColors;
    language: 'tr' | 'en';
}

export const ImagePickerSection: React.FC<ImagePickerSectionProps> = ({
    imageUri,
    onImageChange,
    label,
    colors,
    language,
}) => {
    const { showError } = useAlert();

    const handlePickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                showError(
                    language === 'tr' ? 'İzin Gerekli' : 'Permission Required',
                    language === 'tr' ? 'Galeriye erişim izni vermelisiniz.' : 'You need to grant camera roll permissions.'
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                onImageChange(result.assets[0].uri);
            }
        } catch (error) {
            log.error('Error picking image', error);
        }
    };

    const handleTakePhoto = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

            if (permissionResult.granted === false) {
                showError(
                    language === 'tr' ? 'İzin Gerekli' : 'Permission Required',
                    language === 'tr' ? 'Kameraya erişim izni vermelisiniz.' : 'You need to grant camera permissions.'
                );
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                onImageChange(result.assets[0].uri);
            }
        } catch (error) {
            log.error('Error taking photo', error);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
                {imageUri ? (
                    <View style={styles.imageWrapper}>
                        <Image source={{ uri: imageUri }} style={styles.image} />
                        <TouchableOpacity
                            style={[styles.removeButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
                            onPress={() => onImageChange(undefined)}
                        >
                            <Ionicons name="close" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.buttonsRow}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
                            onPress={handleTakePhoto}
                        >
                            <Ionicons name="camera-outline" size={24} color={colors.primary} />
                            <Text style={[styles.actionText, { color: colors.primary }]}>
                                {language === 'tr' ? 'Fotoğraf Çek' : 'Take Photo'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
                            onPress={handlePickImage}
                        >
                            <Ionicons name="images-outline" size={24} color={colors.primary} />
                            <Text style={[styles.actionText, { color: colors.primary }]}>
                                {language === 'tr' ? 'Galeriden Seç' : 'Choose File'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    pickerContainer: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageWrapper: {
        position: 'relative',
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    image: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    removeButton: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    actionButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'column',
        width: '45%',
    },
    actionText: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
});
