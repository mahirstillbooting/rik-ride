import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { spacing, borderRadius } from '../theme/spacing';
import { savedLocationApiService, SavedLocationItem } from '../services/savedLocationApiService';

export interface SavedPlace {
  id: string;
  name: string;
  address: string;
  type: 'HOME' | 'WORK' | 'FAVORITE';
  latitude: number;
  longitude: number;
}

export const PassengerSavedPlacesView: React.FC = () => {
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');
  const [placeType, setPlaceType] = useState<'HOME' | 'WORK' | 'FAVORITE'>('FAVORITE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSavedLocations = async () => {
    setLoading(true);
    const res = await savedLocationApiService.getSavedLocations();
    if (res.success && Array.isArray(res.data)) {
      const mapped: SavedPlace[] = res.data.map((item: SavedLocationItem) => ({
        id: item._id || item.id || `p-${Date.now()}`,
        name: item.name,
        address: item.address,
        type: item.type,
        latitude: item.latitude,
        longitude: item.longitude,
      }));
      setPlaces(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSavedLocations();
  }, []);

  const handleAddPlace = async () => {
    if (!placeName.trim() || !placeAddress.trim()) {
      showToast('Please enter place name and address', 'warning');
      return;
    }

    setIsSubmitting(true);
    const res = await savedLocationApiService.addSavedLocation({
      name: placeName.trim(),
      address: placeAddress.trim(),
      type: placeType,
      latitude: 23.8103,
      longitude: 90.4125,
    });
    setIsSubmitting(false);

    if (res.success) {
      setShowAddModal(false);
      setPlaceName('');
      setPlaceAddress('');
      showToast(`Saved place "${placeName.trim()}" added successfully`, 'success');
      loadSavedLocations();
    } else {
      showToast(res.error || 'Failed to save location', 'error');
    }
  };

  const handleDeletePlace = async (id: string) => {
    const res = await savedLocationApiService.deleteSavedLocation(id);
    if (res.success) {
      setPlaces((prev) => prev.filter((p) => p.id !== id));
      showToast('Saved location removed', 'info');
    } else {
      showToast(res.error || 'Failed to remove location', 'error');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Card variant="hero" style={styles.card}>
        <CardHeader
          title="Saved Places & Destinations"
          subtitle="Quick pickup & drop-off locations for instant rickshaw requests"
          icon={<Icon name="heart" size={18} color={colors.primary} />}
          action={
            <Button
              title="Add New Place"
              size="sm"
              variant="primary"
              icon={<Icon name="plus" size={14} color="#FFFFFF" />}
              onPress={() => setShowAddModal(true)}
            />
          }
        />
        <CardBody style={{ gap: spacing.md }}>
          {loading ? (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : places.length === 0 ? (
            <View style={{ padding: spacing.lg, alignItems: 'center', gap: spacing.sm }}>
              <Icon name="map-pin" size={32} color={colors.textMuted} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>
                No Saved Places Yet
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>
                Save your home, workplace, or frequent rickshaw pickup spots for fast booking.
              </Text>
            </View>
          ) : (
            places.map((place) => (
              <View
                key={place.id}
                style={[styles.placeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.placeHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <Icon
                      name={place.type === 'HOME' ? 'home' : place.type === 'WORK' ? 'briefcase' : 'heart'}
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={[styles.placeTitle, { color: colors.textPrimary }]}>{place.name}</Text>
                    <Badge label={place.type} variant="info" />
                  </View>

                  <TouchableOpacity onPress={() => handleDeletePlace(place.id)} style={{ padding: 4 }}>
                    <Icon name="trash-2" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.placeAddress, { color: colors.textSecondary }]}>{place.address}</Text>

                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <Text style={{ fontSize: 11, color: colors.primary, fontFamily: 'monospace' }}>
                    GPS: [{place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}]
                  </Text>
                </View>
              </View>
            ))
          )}
        </CardBody>
      </Card>

      {/* Add Place Modal */}
      <Modal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Saved Location"
      >
        <View style={{ gap: spacing.md }}>
          <Input
            label="Location Label"
            placeholder="e.g. Home, Gym, Office, Market..."
            value={placeName}
            onChangeText={setPlaceName}
          />

          <Input
            label="Full Address / Landmark"
            placeholder="e.g. Sector 7, Uttara, Dhaka..."
            value={placeAddress}
            onChangeText={setPlaceAddress}
            multiline
            numberOfLines={2}
          />

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>Category</Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              {(['HOME', 'WORK', 'FAVORITE'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: placeType === cat ? colors.primary : colors.surfaceElevated,
                      borderColor: placeType === cat ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setPlaceType(cat)}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: placeType === cat ? '#FFFFFF' : colors.textPrimary }}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs }}>
            <Button title="Cancel" variant="outline" size="md" onPress={() => setShowAddModal(false)} />
            <Button title="Save Location" variant="primary" size="md" onPress={handleAddPlace} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    width: '100%',
  },
  placeCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  placeAddress: {
    fontSize: 13,
    lineHeight: 18,
  },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
});
