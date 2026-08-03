import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, SafeAreaView, RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Package, MapPin, Clock, ChevronRight, X, PlayCircle } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { bookingService } from '../services/bookingService';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';
import { useFocusEffect } from '@react-navigation/native';
import { queuePendingAccept, clearPendingAccept, retryPendingAccept, resumeAllPendingAccepts } from '../utils/pendingAccepts';

// Backend booking statuses (booking.model.js) that mean "an agent already
// owns this and it isn't finished yet". There is no ACCEPTED/IN_TRANSIT
// status on the backend — accepting a booking moves it to ASSIGNED.
const ACTIVE_JOB_STATUSES = ['ASSIGNED', 'REACHED', 'VERIFIED', 'PICKED_UP', 'WAREHOUSE_REACHED'];

const CATEGORY_COLORS: any = {
  plastic: '#3b82f6', metal: '#6366f1', 'e-waste': '#8b5cf6',
  paper: '#0ea5e9', glass: '#0284c7', textile: '#4f46e5',
  organic: '#2563eb', hazardous: '#ef4444',
};

// ── Active Job Card ──────────────────────────────────────────────────────────
function ActiveJobCard({ item, onResume }: any) {
  const { t } = useLanguage();
  const userName = item.user?.name || item.userName || t('karmaUser');
  const addressText = typeof item.address === 'object'
    ? (item.address?.fullAddress || item.address?.streetAddress || t('addressNotAvailable'))
    : (item.address || t('addressNotAvailable'));
  const timeSlot = item.timeSlot || '';

  return (
    <TouchableOpacity onPress={() => onResume(item)} activeOpacity={0.85} style={styles.activeWrapper}>
      <LinearGradient colors={[colors.primaryDeep, colors.primary]} style={styles.activeCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.activeBadgeRow}>
          <View style={styles.activePulse} />
          <Text style={styles.activeBadgeText}>{t('activeJobBadge')}</Text>
        </View>
        <Text style={styles.activeUserName}>{userName}</Text>
        <View style={styles.activeInfoRow}>
          <MapPin size={13} color="rgba(255,255,255,0.75)" />
          <Text style={styles.activeInfoText} numberOfLines={1}>{addressText}</Text>
        </View>
        {timeSlot ? (
          <View style={styles.activeInfoRow}>
            <Clock size={13} color="rgba(255,255,255,0.75)" />
            <Text style={styles.activeInfoText}>{timeSlot}</Text>
          </View>
        ) : null}
        {typeof item.estimatedKarmaCoins === 'number' && (
          <View style={styles.activeInfoRow}>
            <Text style={[styles.activeInfoText, { fontWeight: '800' }]}>Est. value: {item.estimatedKarmaCoins} KC</Text>
          </View>
        )}
        <View style={styles.resumeBtn}>
          <PlayCircle size={16} color={colors.primary} />
          <Text style={styles.resumeBtnText}>{t('resumePickup')}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Available Queue Card ─────────────────────────────────────────────────────
function QueueCard({ item, onAccept, onDecline }: any) {
  const { t } = useLanguage();
  const mainCat = item.categories?.[0]?.category || 'other';
  const catColor = CATEGORY_COLORS[mainCat] || colors.primary;
  const extraCount = item.categories ? Math.max(0, item.categories.length - 1) : 0;

  const userName = item.user?.name || item.userName || t('karmaUser');
  const bookingId = item._id || item.id || 'BKG-001';
  const distanceText = item.distance || '1.5 km';
  const addressText = typeof item.address === 'object'
    ? (item.address?.fullAddress || item.address?.streetAddress || item.address?.flatNo || 'Gurugram')
    : (item.address || 'Gurugram');
  const pickupDateText = item.pickupDate || 'Today';
  const timeSlotText = item.timeSlot || '09:00 AM - 12:00 PM';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <View style={[styles.categoryDot, { backgroundColor: catColor + '20' }]}>
            <Package size={18} color={catColor} />
          </View>
          <View>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.orderId}>{t('idLabel')}: {bookingId}</Text>
          </View>
        </View>
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>{distanceText}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardAddress}>
        <MapPin size={14} color={colors.textMuted} />
        <Text style={styles.addressText} numberOfLines={2}>{addressText}</Text>
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Clock size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{pickupDateText} • {timeSlotText}</Text>
        </View>
        {typeof item.estimatedKarmaCoins === 'number' && (
          <View style={styles.metaItem}>
            <Text style={styles.estValueText}>Est. value: {item.estimatedKarmaCoins} KC</Text>
          </View>
        )}
      </View>

      <View style={styles.tagsRow}>
        {item.categories && item.categories.slice(0, 2).map((c: any, i: number) => (
          <View key={i} style={[styles.catTag, { backgroundColor: (CATEGORY_COLORS[c.category] || colors.primary) + '15' }]}>
            <Text style={[styles.catTagText, { color: CATEGORY_COLORS[c.category] || colors.primary }]}>
              {c.subCategory || c.category}
            </Text>
          </View>
        ))}
        {extraCount > 0 && (
          <View style={[styles.catTag, { backgroundColor: '#f1f5f9' }]}>
            <Text style={[styles.catTagText, { color: colors.textMuted }]}>{t('moreItems', extraCount)}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionBtnsRow}>
        <TouchableOpacity style={[styles.declineBtn, { flex: 1 }]} activeOpacity={0.8} onPress={() => onDecline(item)}>
          <X size={15} color="#ef4444" />
          <Text style={styles.declineBtnText}>{t('cancelLabel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 2 }} activeOpacity={0.8} onPress={() => onAccept(item)}>
          <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.acceptBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.acceptBtnText}>{t('viewAndAccept')}</Text>
            <ChevronRight size={15} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export function QueueScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [queue, setQueue] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const { t } = useLanguage();
  const { takenBookingId, clearTakenBooking } = useSocket();

  const fetchData = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const [availableRes, agentJobsRes] = await Promise.all([
        bookingService.getAvailableBookings().catch(() => null),
        bookingService.getAgentJobs('active').catch(() => null),
      ]);

      // Available bookings
      if (availableRes?.success && Array.isArray(availableRes.data)) {
        setQueue(availableRes.data);
      } else if (Array.isArray(availableRes)) {
        setQueue(availableRes);
      } else {
        setQueue([]);
      }

      // Every booking the server has already assigned to this agent. The
      // backend's ?view=active filter already restricts this, but we re-filter
      // defensively so a slightly different status set can't leak in.
      const jobs = agentJobsRes?.data || agentJobsRes || [];
      const actives = Array.isArray(jobs)
        ? jobs.filter((j: any) => ACTIVE_JOB_STATUSES.includes(j.status))
        : [];
      setActiveJobs(actives);

      // Only ever treat a booking as "ours" once the server confirms it —
      // a booking still pending sync stays unconfirmed until then, never shown
      // as an active/resumable job.
      actives.forEach((a: any) => clearPendingAccept(a._id || a.id));

    } catch (error: any) {
      console.warn('Queue fetch error:', error.message);
      setQueue([]);
      setActiveJobs([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh every time screen comes into focus
  useFocusEffect(useCallback(() => {
    fetchData(true);
  }, [fetchData]));

  // Resume syncing any accepts that failed to reach the server before the
  // app was last closed. Runs once per mount — retryPendingAccept manages
  // its own backoff loop, so re-kicking it on every focus would stack retries.
  useEffect(() => {
    resumeAllPendingAccepts();
  }, []);

  // Every agent in the service area now sees the same available jobs, so a
  // booking someone else just accepted needs to disappear from this list
  // immediately, not just wait for the next focus-triggered refetch.
  useEffect(() => {
    if (!takenBookingId) return;
    setQueue(prev => prev.filter(q => (q._id || q.id) !== takenBookingId));
    clearTakenBooking();
  }, [takenBookingId, clearTakenBooking]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  const handleResumeJob = (item: any) => {
    navigation.navigate('JobFlow', { booking: item });
  };

  const handleAcceptJob = async (item: any) => {
    const bookingId = item._id || item.id;
    setIsLoading(true);
    try {
      const response = await bookingService.acceptBooking(bookingId);
      Alert.alert(`${t('pickupAcceptedTitle')} 🎉`, t('pickupAcceptedMsg'));
      const bookingData = response.success && response.data ? response.data : item;
      navigation.navigate('JobFlow', { booking: bookingData });
    } catch (error: any) {
      if (error?.response?.status === 400) {
        // Booking is genuinely gone (already accepted, or now outside the
        // service area) — this isn't a connectivity issue, so don't offer
        // "start job offline" for a booking this agent doesn't own.
        Alert.alert(
          'Job no longer available',
          error.response.data?.message || 'Sorry, another agent already accepted this job.'
        );
        setQueue(prev => prev.filter(q => (q._id || q.id) !== bookingId));
        return;
      }

      // Network/timeout error (common on a cold Render instance: the accept
      // can actually go through server-side before the response reaches us).
      // Check the agent's own jobs before assuming it failed — never let the
      // agent proceed into JobFlow on a booking that was never confirmed
      // assigned to them, since only one agent can ever hold a given booking.
      try {
        const jobsRes = await bookingService.getAgentJobs();
        const jobs = jobsRes?.data || jobsRes || [];
        const nowMine = Array.isArray(jobs) ? jobs.find((j: any) => (j._id || j.id) === bookingId) : null;
        if (nowMine) {
          navigation.navigate('JobFlow', { booking: nowMine });
          return;
        }
      } catch (_) {
        // Confirmation check itself failed too — fall through to the retry prompt.
      }

      // Keep quietly retrying the accept in the background — and remember it
      // across an app restart — so the agent doesn't have to babysit this
      // screen for the accept to eventually land once the server wakes up.
      queuePendingAccept(bookingId, item);
      retryPendingAccept(bookingId);

      Alert.alert(
        t('serverUnreachableTitle'),
        'Could not confirm whether this pickup was accepted. We\'ll keep trying in the background — you can also retry now.',
        [
          { text: t('cancelLabel'), style: 'cancel' },
          { text: 'Retry', onPress: () => handleAcceptJob(item) }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineJob = async (item: any) => {
    const bookingId = item._id || item.id;
    try {
      await bookingService.declineBooking(bookingId);
    } catch (error: any) {
      console.warn('Decline API error (ignored):', error.message);
    } finally {
      setQueue(prev => prev.filter(q => (q._id || q.id) !== bookingId));
    }
  };

  const totalCount = queue.length + activeJobs.length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDeep} />
      <LinearGradient colors={[colors.primaryDeep, colors.primaryDark]} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerSub}>{t('nearbyPickups')}</Text>
              <Text style={styles.headerTitle}>{t('pickupQueue')}</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{totalCount}</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {isLoading && !refreshing ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={queue}
          keyExtractor={item => item._id || item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <QueueCard item={item} onAccept={handleAcceptJob} onDecline={handleDeclineJob} />
          )}
          contentContainerStyle={styles.list}
          style={{ backgroundColor: '#f4f4f5' }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            activeJobs.length > 0 ? (
              <View>
                <Text style={styles.sectionLabel}>{t('yourActiveJob')}</Text>
                {activeJobs.map((job) => (
                  <View key={job._id || job.id} style={{ marginBottom: 14 }}>
                    <ActiveJobCard item={job} onResume={handleResumeJob} />
                  </View>
                ))}
                {queue.length > 0 && <Text style={styles.sectionLabel}>{t('availablePickups')}</Text>}
              </View>
            ) : null
          }
          ListEmptyComponent={
            activeJobs.length === 0 ? (
              <View style={styles.empty}>
                <Package size={60} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>{t('noPickups')}</Text>
                <Text style={styles.emptySub}>{t('goOnlineWait')}</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, elevation: 8, zIndex: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerSub: { color: colors.primaryLight, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: 'white' },
  countBadge: { backgroundColor: colors.warning, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  countText: { color: 'white', fontWeight: '900', fontSize: 16 },
  list: { padding: 20, paddingBottom: 100, gap: 14, backgroundColor: '#f4f4f5' },
  sectionLabel: { fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.5, marginBottom: 10, marginTop: 4 },

  // Active Job Card
  activeWrapper: { borderRadius: 20, overflow: 'hidden', elevation: 6, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  activeCard: { padding: 18, borderRadius: 20 },
  activeBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  activePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  activeBadgeText: { fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.85)', letterSpacing: 1.5 },
  activeUserName: { fontSize: 18, fontWeight: '900', color: 'white', marginBottom: 8 },
  activeInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  activeInfoText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500', flex: 1 },
  resumeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, backgroundColor: 'white', paddingVertical: 12, borderRadius: 14 },
  resumeBtnText: { fontSize: 14, fontWeight: '900', color: colors.primary },

  // Queue Card
  card: { backgroundColor: 'white', borderRadius: 20, padding: 18, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryDot: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  orderId: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  distanceBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#c7d2fe' },
  distanceText: { fontSize: 12, color: '#4338ca', fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 12 },
  cardAddress: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  addressText: { flex: 1, fontSize: 13, color: colors.textSecondary, fontWeight: '500', lineHeight: 18 },
  cardMeta: { marginBottom: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  estValueText: { fontSize: 12, color: colors.primary, fontWeight: '800' },
  tagsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 14 },
  catTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  catTagText: { fontSize: 11, fontWeight: '700' },
  actionBtnsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  declineBtn: { height: 46, paddingHorizontal: 22, borderRadius: 14, backgroundColor: '#fee2e2', borderWidth: 1.5, borderColor: '#fecaca', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  declineBtnText: { fontSize: 13, fontWeight: '800', color: '#ef4444' },
  acceptBtn: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingHorizontal: 18, gap: 6 },
  acceptBtnText: { color: 'white', fontWeight: '800', fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', fontWeight: '500', lineHeight: 20 },
});
