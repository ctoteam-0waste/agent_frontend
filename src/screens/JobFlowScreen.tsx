import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft, MapPin, Clock, Phone,
  CheckCircle2, ChevronRight, Navigation, FileText
} from 'lucide-react-native';
import MapplsGL from 'mappls-map-react-native';
import polyline from '@mapbox/polyline';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { bookingService } from '../services/bookingService';
import { mapService } from '../services/mapService';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

function StepIndicator({ currentStep }: { currentStep: number }) {
  const { t } = useLanguage();
  const STEPS = [t('stepAccepted'), t('stepReached'), t('stepAddItems'), t('stepPickupDone')];
  return (
    <View style={styles.stepperContainer}>
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isActive = idx === currentStep;
        return (
          <View key={step} style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              isCompleted && styles.stepCircleDone,
              isActive && styles.stepCircleActive,
            ]}>
              {isCompleted
                ? <CheckCircle2 size={16} color="white" />
                : <Text style={[styles.stepNum, (isActive || isCompleted) && { color: 'white' }]}>{idx + 1}</Text>
              }
            </View>
            <Text style={[styles.stepLabel, isActive && styles.stepLabelActive, isCompleted && styles.stepLabelDone]}>
              {step}
            </Text>
            {idx < STEPS.length - 1 && (
              <View style={[styles.stepLine, isCompleted && styles.stepLineDone]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

// Whole-number sub-categories (piece). Everything else — including Battery and
// all Textile Waste items — is measured in kg. These strings must match the
// backend catalogue exactly (booking.service.js).
const PIECE_ITEMS = new Set([
  // Phones & Computers
  'Laptop', 'Desktop', 'Monitor (LCD/LED)', 'Printer', 'Tablet',
  'Branded Smartphone', 'Non-Branded Smartphone', 'Keyboard', 'Mouse', 'Touchpad Phone',
  // Home Appliances & Electronics
  'TV (Below 40")', 'TV (40" & Above)',
  'Refrigerator (Above 300L)', 'Refrigerator (Below 300L)',
  'Automatic Washing Machine', 'Semi-Automatic Washing Machine',
  'Branded Air Conditioner', 'Geyser', 'Ceiling Fan', 'Other Large Appliances',
  // Footwear
  'Branded', 'Non-Branded',
]);

// Minimum accepted quantity per sub-category, in that item's unit.
const MIN_QUANTITY: Record<string, number> = { Battery: 1 };

function getUnit(subCategory: string): 'piece' | 'kg' {
  return PIECE_ITEMS.has(subCategory) ? 'piece' : 'kg';
}

function WasteItem({ item, onUpdate }: any) {
  const { t } = useLanguage();
  const unit = getUnit(item.subCategory || '');
  const isWhole = unit !== 'kg'; // piece + pickup are whole numbers

  const handleTextChange = (text: string) => {
    if (isWhole) {
      // Natural numbers only — strip everything except digits
      const cleaned = text.replace(/[^0-9]/g, '');
      onUpdate(cleaned);
    } else {
      // Decimal allowed for kg
      const cleaned = text.replace(/[^0-9.]/g, '');
      const parts = cleaned.split('.');
      let finalStr = parts[0];
      if (parts.length > 1) {
        finalStr += '.' + parts.slice(1).join('');
      }
      onUpdate(finalStr);
    }
  };

  return (
    <View style={styles.wasteRow}>
      <View style={styles.wasteInfo}>
        <Text style={styles.wasteName}>{item.subCategory || item.category}</Text>
        <Text style={styles.wasteCat}>{item.category}</Text>
        {item.condition ? <Text style={styles.wasteCondition}>{item.condition}</Text> : null}
      </View>
      <View style={styles.qtyInputContainer}>
        <TextInput
          style={styles.qtyInput}
          value={String(item.qty)}
          onChangeText={handleTextChange}
          keyboardType={isWhole ? 'number-pad' : 'decimal-pad'}
          placeholder={isWhole ? '0' : '0.0'}
          placeholderTextColor={colors.textMuted}
        />
      </View>
      <Text style={styles.wasteUnit}>{unit === 'kg' ? t('unitKg') : t('unitPiece')}</Text>
    </View>
  );
}

export function JobFlowScreen({ navigation, route }: any) {
  const { booking } = route.params;
  const bookingId = booking._id || booking.id;

  const { cancelledBookingId, clearCancelledBooking, emitLocationUpdate } = useSocket();
  const { addNotification } = useNotifications();
  const { updateAgent } = useAuth();
  const { t } = useLanguage();

  // Map state
  const [mapReady, setMapReady] = useState(false);
  const [agentCoords, setAgentCoords] = useState<[number, number] | null>(null); // [lng, lat]
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [eta, setEta] = useState<{ mins: number; km: string } | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const emitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userCoords = booking.address?.location?.coordinates as [number, number] | undefined; // [lng, lat]

  // Map backend status → frontend step so resume works correctly
  const getInitialStep = (status: string) => {
    if (status === 'REACHED') return 1;
    if (status === 'VERIFICATION' || status === 'PICKED_UP' || status === 'VERIFIED') return 2;
    return 0; // ASSIGNED or unknown → navigating to user
  };

  const [currentStep, setCurrentStep] = useState(getInitialStep(booking.status));
  const [isLoading, setIsLoading] = useState(false);
  const [wasteItems, setWasteItems] = useState(
    (booking.categories || []).map((c: any) => ({ ...c, qty: '' }))
  );
  const [notes, setNotes] = useState('');

  // Mappls native SDK v2 is licensed via the bundled OLF file (copied into
  // android/app by the config plugin) — there is no runtime key API. The old
  // setMapSDKKey/setRestAPIKey calls don't exist on the module and would throw,
  // leaving the map stuck on "Initializing" forever.
  useEffect(() => {
    setMapReady(true);
  }, []);

  // GPS tracking + route fetch + location emit — only during step 0 (navigating to user)
  useEffect(() => {
    if (currentStep !== 0 || !userCoords) return;

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationWatchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 30 },
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setAgentCoords([lng, lat]);
        }
      );
    };
    startTracking();

    return () => {
      locationWatchRef.current?.remove();
      locationWatchRef.current = null;
    };
  }, [currentStep]);

  // Fetch route whenever agent coords update (throttled — only if moved meaningfully)
  useEffect(() => {
    if (!agentCoords || !userCoords || currentStep !== 0) return;
    mapService.getBookingRoute(bookingId, agentCoords[1], agentCoords[0])
      .then(result => {
        const decoded = polyline.decode(result.polyline).map(([lat, lng]) => [lng, lat] as [number, number]);
        setRouteCoords(decoded);
        setEta({ mins: Math.ceil(result.duration / 60), km: (result.distance / 1000).toFixed(1) });
      })
      .catch(() => {});
  }, [agentCoords]);

  // Emit agent location to backend every 8 seconds during step 0
  useEffect(() => {
    if (currentStep !== 0) {
      if (emitIntervalRef.current) { clearInterval(emitIntervalRef.current); emitIntervalRef.current = null; }
      return;
    }
    emitIntervalRef.current = setInterval(() => {
      if (agentCoords) emitLocationUpdate(bookingId, agentCoords[1], agentCoords[0]);
    }, 8000);
    return () => {
      if (emitIntervalRef.current) { clearInterval(emitIntervalRef.current); emitIntervalRef.current = null; }
    };
  }, [currentStep, agentCoords]);

  // Listen for user cancellation
  useEffect(() => {
    if (!cancelledBookingId || cancelledBookingId !== bookingId) return;
    clearCancelledBooking();
    Alert.alert(
      t('bookingCancelledTitle'),
      t('bookingCancelledMsg'),
      [{ text: t('goToQueue'), onPress: () => navigation.goBack() }]
    );
  }, [cancelledBookingId]);

  // Normalize user names, addresses, slot strings for varying database formats
  const userName = booking.user?.name || booking.userName || t('karmaUser');
  const addressText = typeof booking.address === 'object'
    ? (booking.address?.fullAddress || booking.address?.streetAddress || booking.address?.flatNo || 'Gurugram')
    : (booking.address || 'Gurugram');
  const distanceText = booking.distance || '1.5 km';
  const pickupDateText = booking.pickupDate || t('today');
  const timeSlotText = booking.timeSlot || '09:00 AM - 12:00 PM';

  const handleStepAction = async () => {
    setIsLoading(true);
    try {
      if (currentStep === 0) {
        // Step 0 -> Step 1: Reach Location
        try {
          await bookingService.markReached(bookingId);
          setCurrentStep(1);
        } catch (err) {
          Alert.alert(
            t('serverUnreachableTitle'),
            t('reachedOfflineMsg'),
            [
              { text: t('cancelLabel'), style: 'cancel' },
              { text: t('offlineStepLabel'), onPress: () => setCurrentStep(1) }
            ]
          );
        }
      } else if (currentStep === 1) {
        // Step 1 -> Step 2: Go to Add Waste page (weights filled here)
        setCurrentStep(2);
      } else if (currentStep === 2) {
        // Step 2 -> Step 3: Validate, Verify weights & transition to Pickup Done
        const itemsToVerify = wasteItems
          .map((item: any) => {
            const entry: any = {
              category: item.category,
              subCategory: item.subCategory || item.category,
              quantity: parseFloat(item.qty) || 0,
            };
            // Backend requires condition for Working / Not Working items — pass it through
            if (item.condition) entry.condition = item.condition;
            return entry;
          })
          .filter((item: any) => item.quantity > 0);

        if (itemsToVerify.length === 0) {
          Alert.alert(t('weightsRequiredTitle'), t('weightsRequiredMsg'));
          setIsLoading(false);
          return;
        }

        // Some items have a minimum accepted quantity (backend also enforces this)
        const belowMin = itemsToVerify.find((item: any) => {
          const min = MIN_QUANTITY[item.subCategory];
          return min !== undefined && item.quantity < min;
        });
        if (belowMin) {
          const min = MIN_QUANTITY[belowMin.subCategory];
          Alert.alert(
            t('weightsRequiredTitle'),
            `${belowMin.subCategory} requires a minimum of ${min} ${getUnit(belowMin.subCategory)}.`
          );
          setIsLoading(false);
          return;
        }

        try {
          await bookingService.verifyBooking(bookingId, itemsToVerify);
          setCurrentStep(3);
        } catch (err: any) {
          Alert.alert(
            t('verificationFailedTitle'),
            err.message || t('verificationFailedMsg'),
            [
              { text: t('cancelLabel'), style: 'cancel' },
              { text: t('offlineStepLabel'), onPress: () => setCurrentStep(3) }
            ]
          );
        }
      } else if (currentStep === 3) {
        // Step 3 -> Closure: Complete at warehouse
        try {
          await bookingService.completeBooking(bookingId);
          await updateAgent({ isFirstTime: false });
          addNotification({
            type: 'COMPLETED',
            title: t('pickupCompleteNotifTitle'),
            message: t('pickupCompleteNotifMsg'),
            bookingId,
          });
          Alert.alert(t('pickupCompleteNotifTitle'), t('pickupCompleteAlertMsg'), [
            { text: t('goToQueue'), onPress: () => navigation.goBack() }
          ]);
        } catch (err: any) {
          Alert.alert(
            t('completionFailedTitle'),
            err.message || t('completionFailedMsg'),
            [
              { text: t('cancelLabel'), style: 'cancel' },
              { text: t('closeLocally'), onPress: () => navigation.goBack() }
            ]
          );
        }
      }
    } catch (error: any) {
      Alert.alert(t('stepUpdateErrorTitle'), error.message || t('stepUpdateErrorMsg'));
    } finally {
      setIsLoading(false);
    }
  };

  const updateQty = (idx: number, qty: string) => {
    setWasteItems((prev: any[]) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], qty };
      return updated;
    });
  };

  const stepActions = [t('reachedAction'), t('confirmAddItemsAction'), t('markPickupDoneAction'), t('completePickupAction')];
  const stepColors = [colors.primary, colors.warning, '#0891b2', '#7c3aed'];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDeep} />

      {/* Header */}
      <LinearGradient colors={[colors.primaryDeep, colors.primaryDark]} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <ChevronLeft size={22} color="white" />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.headerTitle}>{t('activePickupTitle')}</Text>
              <Text style={styles.headerSub}>{t('idLabel')}: {bookingId}</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f4f5' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, fontWeight: '700', color: colors.textMuted }}>{t('communicatingServer')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

          {/* Step Indicator */}
          <View style={styles.stepperCard}>
            <StepIndicator currentStep={currentStep} />
          </View>

          {/* Live Map — navigating to the user (step 0) */}
          {currentStep === 0 && userCoords && (
            <View style={styles.mapCard}>
              {mapReady ? (
                <>
                  <MapplsGL.MapView style={{ flex: 1 }} logoEnabled={false} compassEnabled={false}>
                    <MapplsGL.Camera
                      centerCoordinate={agentCoords || userCoords}
                      zoomLevel={14}
                      animationMode="flyTo"
                      animationDuration={400}
                    />
                    {/* User pickup pin */}
                    <MapplsGL.PointAnnotation id="user-pin" coordinate={userCoords} title="Pickup">
                      <View style={styles.pinWrap}>
                        <View style={styles.userPin}><Text style={{ fontSize: 19 }}>🏠</Text></View>
                        <View style={styles.userPinStem} />
                      </View>
                    </MapplsGL.PointAnnotation>
                    {/* Agent live pin */}
                    {agentCoords && (
                      <MapplsGL.PointAnnotation id="agent-pin" coordinate={agentCoords} title="You">
                        <View style={styles.pinWrap}>
                          <View style={styles.agentPin}><Text style={{ fontSize: 19 }}>🛵</Text></View>
                          <View style={styles.agentPinStem} />
                        </View>
                      </MapplsGL.PointAnnotation>
                    )}
                    {/* Route polyline */}
                    {routeCoords.length > 0 && (
                      <MapplsGL.ShapeSource
                        id="route-src"
                        shape={{ type: 'Feature', geometry: { type: 'LineString', coordinates: routeCoords }, properties: {} }}
                      >
                        <MapplsGL.LineLayer id="route-line" style={{ lineColor: '#16a34a', lineWidth: 4, lineJoin: 'round', lineCap: 'round' }} />
                      </MapplsGL.ShapeSource>
                    )}
                  </MapplsGL.MapView>
                  {eta && (
                    <View style={styles.etaBar}>
                      <Text style={styles.etaText}>🛵 {eta.mins} min away • {eta.km} km</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.mapLoading}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.mapPlaceholderText}>{t('mapLoading')}</Text>
                  <Text style={styles.mapPlaceholderSub}>{t('mapLoadingSub')}</Text>
                </View>
              )}
            </View>
          )}

          {/* User Info Card */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{userName.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{userName}</Text>
                <View style={styles.infoRow}>
                  <MapPin size={13} color={colors.textMuted} />
                  <Text style={styles.infoText} numberOfLines={2}>{addressText}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Clock size={13} color={colors.textMuted} />
                  <Text style={styles.infoText}>{pickupDateText} • {timeSlotText}</Text>
                </View>
              </View>
            </View>
            {booking.specialInstruction ? (
              <View style={styles.specialInstructionBox}>
                <FileText size={14} color="#ca8a04" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.specialInstructionLabel}>Special instructions</Text>
                  <Text style={styles.specialInstructionText}>{booking.specialInstruction}</Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Items to Collect (Hidden on final step) */}
          {currentStep < 3 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('itemsToCollect')}</Text>
              {wasteItems.map((item: any, idx: number) => (
                currentStep === 2
                  ? <WasteItem key={idx} item={item} onUpdate={(q: string) => updateQty(idx, q)} />
                  : (
                    <View key={idx} style={styles.itemRow}>
                      <View style={styles.itemDot} />
                      <Text style={styles.itemText}>{item.subCategory || item.category} <Text style={styles.itemCat}>({item.category}{item.condition ? ` · ${item.condition}` : ''})</Text></Text>
                    </View>
                  )
              ))}

              {currentStep === 2 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.notesLabel}>{t('notesOptional')}</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder={t('wasteObservationsPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                  />
                </>
              )}
            </View>
          )}

          {/* Summary (last step) */}
          {currentStep === 3 && (
            <View style={[styles.card, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: 1 }]}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                 <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                   <CheckCircle2 size={32} color={colors.success} />
                 </View>
                 <Text style={{ fontSize: 20, fontWeight: '900', color: colors.textPrimary }}>{t('itemsVerified')}</Text>
                 <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>{t('reviewFinalItems')}</Text>
              </View>

              <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' }}>
                <Text style={[styles.sectionTitle, { fontSize: 14, marginBottom: 10 }]}>{t('finalSummary')}</Text>
                {wasteItems.map((item: any, idx: number) => (
                  <View key={idx} style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{item.subCategory || item.category}{item.condition ? ` · ${item.condition}` : ''} ({item.category})</Text>
                    <Text style={styles.summaryVal}>{item.qty || '0'} {getUnit(item.subCategory || '') === 'kg' ? t('unitKg') : t('unitPiece')}</Text>
                  </View>
                ))}

                {notes.trim() ? (
                  <>
                    <View style={[styles.divider, { marginVertical: 8 }]} />
                    <View style={{ flexDirection: 'column', gap: 4 }}>
                      <Text style={[styles.summaryLabel, { fontSize: 12 }]}>{t('agentNotesLabel')}</Text>
                      <Text style={{ fontSize: 13, color: colors.textPrimary, fontStyle: 'italic' }}>"{notes.trim()}"</Text>
                    </View>
                  </>
                ) : null}

                <View style={[styles.divider, { backgroundColor: '#e2e8f0', height: 2 }]} />
                {(() => {
                  // Piece items and kg items are different units — never sum them together
                  const totalPieces = wasteItems.reduce((acc: number, curr: any) =>
                    getUnit(curr.subCategory || '') === 'kg' ? acc : acc + (parseFloat(curr.qty) || 0), 0);
                  const totalKg = wasteItems.reduce((acc: number, curr: any) =>
                    getUnit(curr.subCategory || '') === 'kg' ? acc + (parseFloat(curr.qty) || 0) : acc, 0);
                  return (
                    <>
                      {totalPieces > 0 && (
                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { fontWeight: '800', color: colors.textPrimary }]}>{t('totalItems')}</Text>
                          <Text style={[styles.summaryVal, { fontSize: 16 }]}>{totalPieces} {t('unitPiece')}</Text>
                        </View>
                      )}
                      {totalKg > 0 && (
                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { fontWeight: '800', color: colors.textPrimary }]}>{t('totalWeight')}</Text>
                          <Text style={[styles.summaryVal, { fontSize: 16 }]}>{totalKg.toFixed(2)} {t('unitKg')}</Text>
                        </View>
                      )}
                    </>
                  );
                })()}
              </View>
            </View>
          )}

        </ScrollView>
      )}

      {/* Bottom Action Button */}
      {!isLoading && (
        <View style={styles.bottomAction}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: stepColors[currentStep] }]}
            onPress={handleStepAction}
            activeOpacity={0.85}
          >
            {currentStep === 3 ? <CheckCircle2 size={20} color="white" /> : <ChevronRight size={20} color="white" />}
            <Text style={styles.actionBtnText}>{stepActions[currentStep]}</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  header: { paddingHorizontal: 20, paddingBottom: 20, elevation: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: 'white' },
  headerSub: { fontSize: 12, color: colors.primaryLight, fontWeight: '600' },
  body: { padding: 20, paddingBottom: 120, gap: 16 },
  stepperCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 2 },
  mapCard: { height: 220, borderRadius: 20, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  pinWrap: { alignItems: 'center' },
  userPin: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#16a34a', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  userPinStem: { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 11, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff', marginTop: -3 },
  agentPin: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', borderWidth: 3, borderColor: '#0284c7', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  agentPinStem: { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 11, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#0284c7', marginTop: -3 },
  etaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.95)', paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  etaText: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  stepperContainer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  stepItem: { alignItems: 'center', flex: 1, position: 'relative' },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 6, zIndex: 1 },
  stepCircleActive: { backgroundColor: colors.primary },
  stepCircleDone: { backgroundColor: colors.success },
  stepNum: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
  stepLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },
  stepLabelActive: { color: colors.primary, fontWeight: '800' },
  stepLabelDone: { color: colors.success },
  stepLine: { position: 'absolute', top: 16, left: '60%', right: '-40%', height: 2, backgroundColor: '#f1f5f9' },
  stepLineDone: { backgroundColor: colors.success },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 18, elevation: 2 },
  cardRow: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  userAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primaryLight },
  userAvatarText: { fontSize: 20, fontWeight: '900', color: colors.primary },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
  infoRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginBottom: 4 },
  infoText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', flex: 1, lineHeight: 16 },
  specialInstructionBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#fefce8', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#fde68a' },
  specialInstructionLabel: { fontSize: 11, color: '#92400e', fontWeight: '700', marginBottom: 2 },
  specialInstructionText: { fontSize: 13, color: '#78350f', fontWeight: '600', lineHeight: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  itemDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  itemText: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
  itemCat: { color: colors.textMuted, fontWeight: '500' },
  wasteRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 12 },
  wasteInfo: { flex: 1 },
  wasteName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  wasteCat: { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginTop: 2 },
  wasteCondition: { fontSize: 11, color: colors.primary, fontWeight: '700', marginTop: 2 },
  qtyInputContainer: { width: 64, height: 38, backgroundColor: 'white', borderRadius: 8, elevation: 1, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center' },
  qtyInput: { textAlign: 'center', fontSize: 15, fontWeight: '800', color: colors.primary, padding: 0 },
  wasteUnit: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginLeft: 6 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },
  notesLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  notesInput: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, height: 80, textAlignVertical: 'top', fontSize: 13, color: colors.textPrimary },
  mapLoading: { flex: 1, backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mapPlaceholderText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  mapPlaceholderSub: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  summaryLabel: { flex: 1, fontSize: 13, color: colors.textSecondary, fontWeight: '600', lineHeight: 19 },
  summaryVal: { fontSize: 13, color: colors.primary, fontWeight: '800', textAlign: 'right', flexShrink: 0 },
  bottomAction: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f1f5f9', elevation: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 18 },
  actionBtnText: { color: 'white', fontSize: 16, fontWeight: '900' },
});
