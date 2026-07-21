import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Keyboard,
} from 'react-native';
import { MapPin, Search, X, Navigation2 } from 'lucide-react-native';
import * as Location from 'expo-location';
import { mapService, MapSuggestion } from '../../services/mapService';

interface AddressSearchProps {
  initialValue?: string;
  // coords: [lng, lat] (GeoJSON order)
  onSelect: (address: string, coords: [number, number]) => void;
  onCancel: () => void;
  userCoords?: [number, number] | null;
}

export function AddressSearch({ initialValue = '', onSelect, onCancel, userCoords }: AddressSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<MapSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const lat = userCoords ? userCoords[1] : undefined;
        const lng = userCoords ? userCoords[0] : undefined;
        const results = await mapService.autosuggest(trimmed, lat, lng);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const result = await mapService.reverseGeocode(loc.coords.latitude, loc.coords.longitude);
      const address = result.formattedAddress || [result.locality, result.city, result.state].filter(Boolean).join(', ');
      onSelect(address, [loc.coords.longitude, loc.coords.latitude]);
    } catch {
      // fail silently
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelect = (item: MapSuggestion) => {
    Keyboard.dismiss();
    const address = item.address || item.placeName;
    onSelect(address, [item.lng, item.lat]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <Search size={18} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search colony, street, landmark..."
          placeholderTextColor="#9ca3af"
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {isSearching
          ? <ActivityIndicator size="small" color="#16a34a" style={styles.rightIcon} />
          : query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSuggestions([]); }} style={styles.rightIcon}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )
        }
      </View>

      <TouchableOpacity style={styles.currentLocRow} onPress={handleUseCurrentLocation} disabled={isLocating} activeOpacity={0.7}>
        <Navigation2 size={16} color="#16a34a" />
        <Text style={styles.currentLocText}>
          {isLocating ? 'Getting your location...' : 'Use my current location'}
        </Text>
        {isLocating && <ActivityIndicator size="small" color="#16a34a" />}
      </TouchableOpacity>

      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.eLoc || `${item.lat}-${item.lng}`}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[styles.suggestionRow, index === suggestions.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
            >
              <MapPin size={16} color="#16a34a" style={styles.pinIcon} />
              <View style={styles.textBlock}>
                <Text style={styles.placeName} numberOfLines={1}>{item.placeName}</Text>
                <Text style={styles.placeAddr} numberOfLines={2}>{item.address}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
    paddingVertical: 4,
  },
  rightIcon: { marginLeft: 6 },
  currentLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f0fdf4',
  },
  currentLocText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
  },
  list: {
    maxHeight: 240,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    gap: 10,
  },
  pinIcon: { marginTop: 2 },
  textBlock: { flex: 1 },
  placeName: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  placeAddr: { fontSize: 12, color: '#64748b', fontWeight: '400', lineHeight: 16 },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
});
