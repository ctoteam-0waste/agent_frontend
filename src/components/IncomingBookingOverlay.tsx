import React, { useState, useRef, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Package, CheckCircle2, X } from 'lucide-react-native';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { bookingService } from '../services/bookingService';
import { colors } from '../theme/colors';

export function IncomingBookingOverlay() {
  const { incomingBooking, dismissIncomingBooking } = useSocket();
  const { isOnline } = useAuth();
  const { addNotification } = useNotifications();
  const navigation = useNavigation<any>();
  const [isAcceptingJob, setIsAcceptingJob] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let soundInstance: Audio.Sound | null = null;

    const playAlertSound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          playThroughEarpieceAndroid: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/alert.mp3'),
          { shouldPlay: true, isLooping: true }
        );
        soundInstance = sound;
        soundRef.current = sound;
      } catch (err) {
        console.log('[Audio] Alert sound error:', err);
      }
    };

    if (!incomingBooking) {
      setTimeLeft(120);
      return;
    }

    setTimeLeft(120);
    playAlertSound();

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleDeclineIncoming();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      if (soundInstance) {
        soundInstance.stopAsync().then(() => soundInstance?.unloadAsync()).catch(() => {});
      }
      soundRef.current = null;
    };
  }, [incomingBooking]);

  const handleAcceptIncoming = async () => {
    if (!incomingBooking) return;
    setIsAcceptingJob(true);
    try {
      if (incomingBooking.bookingId === 'test-123') {
        dismissIncomingBooking();
        navigation.navigate('JobFlow', {
          booking: {
            _id: 'test-123',
            user: { name: 'Priya Sharma' },
            address: '42, green park colony, sector 14, gurugram',
            categories: [{ category: 'plastic', subCategory: 'PET Bottle' }],
            status: 'ACCEPTED',
          },
        });
        return;
      }
      const response = await bookingService.acceptBooking(incomingBooking.bookingId);
      dismissIncomingBooking();
      const bookingData = response?.data || { _id: incomingBooking.bookingId };
      addNotification({
        type: 'ACCEPTED',
        title: 'Pickup Accepted ✅',
        message: `You accepted a pickup job.`,
        bookingId: incomingBooking.bookingId,
      });
      navigation.navigate('JobFlow', { booking: bookingData });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not accept booking. Try again.');
    } finally {
      setIsAcceptingJob(false);
    }
  };

  const handleDeclineIncoming = async () => {
    if (!incomingBooking) return;
    try {
      if (incomingBooking.bookingId !== 'test-123') {
        await bookingService.declineBooking(incomingBooking.bookingId);
      }
    } catch (_) {}
    addNotification({
      type: 'DECLINED',
      title: 'Pickup declined',
      message: 'You declined a pickup request.',
      bookingId: incomingBooking.bookingId,
    });
    dismissIncomingBooking();
  };

  return (
    <Modal
      transparent
      visible={!!incomingBooking}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleDeclineIncoming}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient
            colors={[colors.primaryDark, colors.primary]}
            style={styles.topBar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.topRow}>
              <View style={styles.iconWrapper}>
                <Package size={22} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>NEW PICKUP REQUEST</Text>
                <Text style={styles.subLabel}>A booking is available near you</Text>
              </View>
              <View style={styles.timerContainer}>
                <Svg width={46} height={46} viewBox="0 0 46 46">
                  <Circle cx="23" cy="23" r={18} stroke="rgba(255,255,255,0.22)" strokeWidth={3} fill="transparent" />
                  <Circle
                    cx="23" cy="23" r={18}
                    stroke="#fef08a" strokeWidth={3} fill="transparent"
                    strokeDasharray={2 * Math.PI * 18}
                    strokeDashoffset={2 * Math.PI * 18 - (timeLeft / 120) * (2 * Math.PI * 18)}
                    strokeLinecap="round"
                    transform="rotate(-90 23 23)"
                  />
                </Svg>
                <View style={styles.timerTextContainer}>
                  <Text style={styles.timerText}>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.body}>
            <Text style={styles.message}>
              {incomingBooking?.message || 'A new pickup request is available in your area.'}
            </Text>
            {!isOnline && (
              <View style={{ backgroundColor: '#fef3c7', borderRadius: 10, padding: 10, marginBottom: 12 }}>
                <Text style={{ color: '#92400e', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                  ⚡ You are offline — Go online to accept this pickup
                </Text>
              </View>
            )}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.declineBtn} onPress={handleDeclineIncoming} activeOpacity={0.8}>
                <X size={18} color="#ef4444" />
                <Text style={styles.declineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.acceptBtn, !isOnline && { opacity: 0.5 }]}
                onPress={isOnline ? handleAcceptIncoming : undefined}
                disabled={isAcceptingJob || !isOnline}
                activeOpacity={0.8}
              >
                <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.acceptGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <CheckCircle2 size={18} color="white" />
                  <Text style={styles.acceptText}>
                    {isAcceptingJob ? 'Accepting...' : !isOnline ? 'Go online first' : 'Accept pickup'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  card: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden', elevation: 20 },
  topBar: { paddingHorizontal: 20, paddingVertical: 18 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrapper: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.9)', letterSpacing: 1.5 },
  subLabel: { fontSize: 14, fontWeight: '700', color: 'white', marginTop: 2 },
  timerContainer: { position: 'relative', width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  timerTextContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  timerText: { color: '#fef08a', fontSize: 10, fontWeight: '900' },
  body: { padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  message: { fontSize: 15, color: colors.textSecondary, fontWeight: '500', lineHeight: 22, marginBottom: 24 },
  actions: { flexDirection: 'row', gap: 12 },
  declineBtn: { flex: 1, height: 54, borderRadius: 16, backgroundColor: '#fee2e2', borderWidth: 1.5, borderColor: '#fecaca', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  declineText: { fontSize: 15, fontWeight: '800', color: '#ef4444' },
  acceptBtn: { flex: 2, borderRadius: 16, overflow: 'hidden' },
  acceptGrad: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  acceptText: { fontSize: 15, fontWeight: '900', color: 'white' },
});
