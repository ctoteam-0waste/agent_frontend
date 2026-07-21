import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, SafeAreaView, Switch, Platform, Dimensions, Animated, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Flame, Package, ChevronRight, Truck, Star, Wifi, WifiOff, Lock, PlayCircle, BookOpen, Wallet, Award, X } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import { TrainingModal } from '../components/TrainingModal';
import { bookingService } from '../services/bookingService';
import { agentService } from '../services/agentService';
import { useNotifications } from '../context/NotificationContext';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

function StatCard({ label, value, sub, accent, locked = false, lockedLabel }: any) {
  return (
    <View style={[styles.statCard, { borderTopColor: locked ? '#d1d5db' : accent, borderTopWidth: 4, opacity: locked ? 0.7 : 1 }]}>
      {locked ? (
        <View style={styles.lockedHeader}>
          <Lock size={16} color="#9ca3af" />
          <Text style={styles.lockedText}>{lockedLabel}</Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Text style={styles.statValue}>{value}</Text>
          <View>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statSub}>{sub}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export function DashboardScreen({ navigation }: any) {
  const { agent, isOnline, toggleOnlineStatus, updateAgent } = useAuth();
  const { t } = useLanguage();
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const [queueCount, setQueueCount] = useState(0);
  const [realPickups, setRealPickups] = useState(agent?.totalPickups || 0);
  const [todayPickups, setTodayPickups] = useState<number | null>(null);
  const [thisMonthPickups, setThisMonthPickups] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    bookingService.getAvailableBookings()
      .then(res => {
        const data = res?.data || res || [];
        setQueueCount(Array.isArray(data) ? data.length : 0);
      })
      .catch(() => setQueueCount(0));

    bookingService.getAgentJobs()
      .then(res => {
        const jobs = res?.data || res || [];
        const completed = Array.isArray(jobs) ? jobs.filter((j: any) => j.status === 'COMPLETED') : [];
        setRealPickups(completed.length);
      })
      .catch(() => {});

    agentService.getProfile()
      .then(profile => { if (profile) updateAgent(profile); })
      .catch(() => {});

    agentService.getTodaySummary()
      .then(summary => {
        if (summary?.todayPickups !== undefined) setTodayPickups(summary.todayPickups);
        if (summary?.thisMonthPickups !== undefined) setThisMonthPickups(summary.thisMonthPickups);
        if (summary?.totalPickups !== undefined) setRealPickups(summary.totalPickups);
        if (summary?.avgRating !== undefined) updateAgent({ rating: summary.avgRating });
      })
      .catch(() => {});
  }, []));

  // isFirstTime from backend OR if agent has no completed pickups yet
  const isNewAgentView = (agent?.isFirstTime ?? true) && realPickups === 0;
  const firstName = agent?.name?.split(' ')[0] || 'Agent';

  const getGreetingKey = () => {
    const h = new Date().getHours();
    if (h < 12) return 'goodMorning';
    if (h < 17) return 'goodAfternoon';
    return 'goodEvening';
  };

  // Badge progress for premium banner
  const pickups = realPickups;
  const agentRating = agent?.rating || 0;
  const nextBadge = pickups < 50
    ? { name: t('bBronze'), target: 50, ratingReq: 4.5 }
    : pickups < 150
    ? { name: t('bSilver'), target: 150, ratingReq: 4.7 }
    : { name: t('bGold'), target: 300, ratingReq: 4.8 };
  const nextBadgeName = nextBadge.name;
  const remaining = Math.max(0, nextBadge.target - pickups);
  const ratingOk = agentRating >= nextBadge.ratingReq;
  const bannerDesc = `${remaining > 0 ? t('completeMorePickups', remaining) : t('pickupsCompleteExclaim')}${!ratingOk ? ` ${t('maintainRating', nextBadge.ratingReq)}` : ''} ${t('earnGiftHamper')}`;
  const [selectedModal, setSelectedModal] = useState<number | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const notifAnim = useRef(new Animated.Value(0)).current;

  const openNotifModal = () => {
    setNotifModalVisible(true);
    Animated.spring(notifAnim, { toValue: 1, useNativeDriver: true, bounciness: 4 }).start();
  };
  const closeNotifModal = () => {
    Animated.timing(notifAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setNotifModalVisible(false));
  };

  const handleToggle = () => {
    toggleOnlineStatus();
  };

  const TRAINING_SLIDES = [
    { id: 1, title: t('slider1Title'), desc: t('slider1Desc'), icon: <Truck size={32} color="white" />, colors: ['#0ea5e9', '#0284c7'] },
    { id: 2, title: t('slider2Title'), desc: t('slider2Desc'), icon: <PlayCircle size={32} color="white" />, colors: ['#8b5cf6', '#6d28d9'] },
    { id: 3, title: t('slider3Title'), desc: t('slider3Desc'), icon: <BookOpen size={32} color="white" />, colors: ['#10b981', '#059669'] },
    { id: 4, title: t('slider4Title'), desc: t('slider4Desc'), icon: <Wallet size={32} color="white" />, colors: ['#f59e0b', '#d97706'] },
    { id: 5, title: t('slider5Title'), desc: t('slider5Desc'), icon: <Star size={32} color="white" />, colors: ['#f43f5e', '#e11d48'] },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDeep} />

      <LinearGradient colors={[colors.primaryDeep, colors.primaryDark]} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <View style={styles.agentInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{agent?.name?.charAt(0) || 'A'}</Text>
                <View style={[styles.onlineDot, { backgroundColor: isOnline ? colors.online : colors.offline }]} />
              </View>
              <View>
                <Text style={styles.greet}>{isNewAgentView ? t('welcome') : t(getGreetingKey())}</Text>
                <Text style={styles.agentName}>{firstName} 👋</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={styles.bellBtn} onPress={() => { markAllRead(); openNotifModal(); }}>
                <Bell size={20} color="white" />
                {unreadCount > 0 && (
                  <View style={[styles.bellDot, { backgroundColor: colors.warning }]}>
                    <Text style={{ color: 'white', fontSize: 8, fontWeight: '900' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.statusCard, isOnline && styles.statusCardOnline]}>
            <View style={styles.statusLeft}>
              {isOnline ? <Wifi size={22} color={colors.online} /> : <WifiOff size={22} color={colors.offline} />}
              <View>
                <Text style={styles.statusTitle}>{isOnline ? t('onlineStatus') : t('offlineStatus')}</Text>
                <Text style={styles.statusSub}>{isOnline ? t('onlineSub') : t('offlineSub')}</Text>
              </View>
            </View>
            <Switch value={isOnline} onValueChange={handleToggle} thumbColor={isOnline ? colors.online : '#f4f3f4'} trackColor={{ false: '#d1d5db', true: colors.online + '50' }} />
          </View>

        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        

        {/* Animated Agent Training Slider */}
        {isNewAgentView && (
          <View style={[styles.section, { paddingHorizontal: 0 }]}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: 20 }]}>{t('trainingHub')}</Text>
            <Animated.ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={width * 0.85 + 16}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10, gap: 16 }}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
              scrollEventThrottle={16}
            >
              {TRAINING_SLIDES.map((slide, index) => (
                <TouchableOpacity key={slide.id} activeOpacity={0.9} onPress={() => setSelectedModal(slide.id)}>
                  <LinearGradient colors={slide.colors as any} style={[styles.sliderCard, { width: width * 0.85 }]} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                    <View style={styles.sliderIconBox}>{slide.icon}</View>
                    <Text style={styles.sliderTitle}>{slide.title}</Text>
                    <Text style={styles.sliderDesc}>{slide.desc}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </Animated.ScrollView>
            
            {/* Pagination Dots */}
            <View style={styles.paginationRow}>
              {TRAINING_SLIDES.map((_, i) => {
                const inputRange = [(i - 1) * (width * 0.85 + 16), i * (width * 0.85 + 16), (i + 1) * (width * 0.85 + 16)];
                const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: 'clamp' });
                const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
                return <Animated.View key={i} style={[styles.dot, { width: dotWidth, opacity }]} />;
              })}
            </View>
          </View>
        )}

        {!isNewAgentView && (
          <View style={styles.section}>
            <LinearGradient colors={['#fbbf24', '#f59e0b', '#d97706']} style={styles.premiumBanner} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
              <View style={{ flex: 1, paddingRight: 40 }}>
                <View style={styles.premiumBannerTitleRow}>
                  <Text style={styles.premiumBannerIcon}>🏆</Text>
                  <Text style={styles.premiumBannerTitle}>{nextBadgeName} {t('unlocksSoon')}</Text>
                </View>
                <Text style={styles.premiumBannerSub}>{bannerDesc}</Text>
              </View>
              <Award size={80} color="rgba(255,255,255,0.2)" style={{ position: 'absolute', right: -20, top: -20, transform: [{ rotate: '15deg' }] }} />
            </LinearGradient>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('todaySummary')}</Text>
            <View style={styles.statsGrid}>
              <StatCard label={t('pickupsDone')} value={String(todayPickups ?? 0)} sub={t('totalCompleted')} accent={colors.primary} />
              <StatCard label={t('inQueue')} value={String(queueCount)} sub={t('availableNow')} accent="#f59e0b" />
              <StatCard label={t('avgRating')} value={String(agent?.rating || 'NA')} sub={t('yourRating')} accent="#0891b2" />
            </View>
          </View>
        )}

        {!isNewAgentView && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('quickActions')}</Text>
            <TouchableOpacity style={styles.queueBtn} onPress={() => navigation.navigate('Queue')} activeOpacity={0.85}>
              <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.queueBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.queueBtnLeft}>
                  <Truck size={26} color="white" />
                  <View>
                    <Text style={styles.queueBtnTitle}>{t('viewPickupQueue')}</Text>
                    <Text style={styles.queueBtnSub}>{queueCount > 0 ? t('pickupsWaitingNearby', queueCount) : t('noPickupsRightNow')}</Text>
                  </View>
                </View>
                <ChevronRight size={22} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('performance')}</Text>
          <View style={styles.achievementRow}>
            <View style={[styles.achieveCard, { backgroundColor: isNewAgentView ? '#f3f4f6' : '#fff7ed' }]}>
              {isNewAgentView ? <Lock size={24} color="#9ca3af" /> : <Flame size={28} color="#f97316" fill="#f97316" />}
              <Text style={[styles.achieveVal, isNewAgentView && { color: '#9ca3af', fontSize: 14 }]}>{isNewAgentView ? t('locked') : `${agent?.currentStreak || 0} Days`}</Text>
              <Text style={styles.achieveLabel}>{t('activeStreak')}</Text>
            </View>
            <View style={[styles.achieveCard, { backgroundColor: isNewAgentView ? '#f3f4f6' : '#fefce8' }]}>
              {isNewAgentView ? <Lock size={24} color="#9ca3af" /> : <Star size={28} color="#eab308" fill="#eab308" />}
              <Text style={[styles.achieveVal, isNewAgentView && { color: '#9ca3af', fontSize: 14 }]}>{isNewAgentView ? t('locked') : (agent?.rating || 'NA')}</Text>
              <Text style={styles.achieveLabel}>{t('yourRating')}</Text>
            </View>
            <View style={[styles.achieveCard, { backgroundColor: isNewAgentView ? '#f3f4f6' : '#f0fdf4' }]}>
              {isNewAgentView ? <Lock size={24} color="#9ca3af" /> : <Package size={28} color={colors.primary} />}
              <Text style={[styles.achieveVal, isNewAgentView && { color: '#9ca3af', fontSize: 14 }]}>{isNewAgentView ? '0' : (thisMonthPickups ?? realPickups)}</Text>
              <Text style={styles.achieveLabel}>{t('totalPickups')}</Text>
            </View>
          </View>
          {isNewAgentView && <Text style={styles.lockedNote}>{t('lockedNote')}</Text>}
        </View>

      </ScrollView>

      {/* Notifications Modal */}
      <Modal visible={notifModalVisible} transparent={true} animationType="fade" onRequestClose={closeNotifModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdropCloseArea} onPress={closeNotifModal} activeOpacity={1} />
          <Animated.View style={[
            styles.notifModalContent,
            { transform: [{ translateY: notifAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }], height: '80%' }
          ]}>
            <View style={styles.notifModalHeader}>
              <View>
                <Text style={styles.notifModalTitle}>{t('activityHub')}</Text>
                <Text style={styles.notifModalSub}>{notifications.length > 0 ? t('notificationsCount', notifications.length) : t('latestUpdates')}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                {notifications.length > 0 && (
                  <TouchableOpacity onPress={() => { clearAll(); }} style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fee2e2', borderRadius: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>{t('clearAll')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={closeNotifModal} style={styles.closeBtn}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

              {/* Real notifications from context */}
              {notifications.length > 0 ? (
                notifications.map(n => {
                  const iconMap: any = {
                    NEW_BOOKING: { icon: <Truck size={22} color="#2563eb" />, bg: '#dbeafe' },
                    ACCEPTED:    { icon: <Package size={22} color="#16a34a" />, bg: '#dcfce7' },
                    DECLINED:    { icon: <X size={22} color="#ef4444" />, bg: '#fee2e2' },
                    COMPLETED:   { icon: <Award size={22} color="#d97706" />, bg: '#fef3c7' },
                    BOOKING_CANCELLED: { icon: <X size={22} color="#ef4444" />, bg: '#fee2e2' },
                    BOOKING_TAKEN: { icon: <Truck size={22} color="#64748b" />, bg: '#f1f5f9' },
                  };
                  const { icon, bg } = iconMap[n.type] || { icon: <Bell size={22} color="#64748b" />, bg: '#f1f5f9' };
                  const timeAgo = (() => {
                    const diff = Math.floor((Date.now() - new Date(n.timestamp).getTime()) / 60000);
                    if (diff < 1) return t('justNow');
                    if (diff < 60) return t('minAgo', diff);
                    if (diff < 1440) return t('hrAgo', Math.floor(diff / 60));
                    return t('dayAgo', Math.floor(diff / 1440));
                  })();
                  return (
                    <NotifRow
                      key={n.id}
                      icon={icon} bg={bg}
                      title={n.title}
                      desc={n.message}
                      time={timeAgo}
                      unread={!n.read}
                    />
                  );
                })
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Bell size={40} color="#cbd5e1" />
                  <Text style={{ color: '#94a3b8', marginTop: 12, fontWeight: '600' }}>{t('noNotificationsYet')}</Text>
                  <Text style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>{t('acceptPickupsActivity')}</Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <TrainingModal visible={selectedModal !== null} moduleId={selectedModal} onClose={() => setSelectedModal(null)} />
    </View>
  );
}

function NotifRow({ icon, bg, title, desc, time, unread }: any) {
  return (
    <View style={[styles.notifRow, unread && styles.notifRowUnread]}>
      <View style={[styles.notifIcon, { backgroundColor: bg }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.notifTitle}>{title}</Text>
        <Text style={styles.notifDesc}>{desc}</Text>
        <Text style={styles.notifTime}>{time}</Text>
      </View>
      {unread && <View style={styles.unreadDot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  header: { paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, elevation: 12, shadowColor: '#000', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.15, shadowRadius: 12, zIndex: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingTop: 10 },
  agentInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: 'white', fontWeight: '900', fontSize: 18 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.primaryDark },
  greet: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  agentName: { color: 'white', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
  bellBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning },
  statusCard: { borderRadius: 20, padding: 16, backgroundColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statusCardOnline: { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.4)' },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusTitle: { color: 'white', fontWeight: '900', fontSize: 15 },
  statusSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  testAlertBtn: { marginTop: 12, backgroundColor: '#fef08a', borderRadius: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fde68a' },
  testAlertBtnText: { color: '#854d0e', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  body: { flex: 1, backgroundColor: '#f4f4f5' },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: '#1e293b', marginBottom: 16, letterSpacing: -0.5 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 16, elevation: 4, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 8 },
  statValue: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  statLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },
  statSub: { fontSize: 10, color: colors.textMuted, marginTop: 4, fontWeight: '600' },
  lockedHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  lockedText: { fontSize: 13, fontWeight: '800', color: '#9ca3af' },
  achievementRow: { flexDirection: 'row', gap: 12 },
  achieveCard: { flex: 1, borderRadius: 20, padding: 16, alignItems: 'center', gap: 8, elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 6 },
  achieveVal: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
  achieveLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '700', textAlign: 'center' },
  queueBtn: { borderRadius: 24, overflow: 'hidden', elevation: 8, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 },
  queueBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 22 },
  queueBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  queueBtnTitle: { color: 'white', fontWeight: '900', fontSize: 17 },
  queueBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginTop: 4 },
  onboardingBanner: { margin: 20, marginBottom: 0, backgroundColor: 'white', borderRadius: 24, padding: 24, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12 },
  bannerTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 8, letterSpacing: -0.5 },
  bannerSub: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginBottom: 20, fontWeight: '500' },
  bigQueueBtn: { borderRadius: 18, overflow: 'hidden', elevation: 4, shadowColor: colors.primary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8 },
  bigQueueBtnText: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  sliderCard: { borderRadius: 24, padding: 24, justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10 },
  sliderIconBox: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  sliderTitle: { fontSize: 20, fontWeight: '900', color: 'white', marginBottom: 8, letterSpacing: -0.5 },
  sliderDesc: { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 22, fontWeight: '500' },
  paginationRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, gap: 6 },
  dot: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  lockedNote: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 16, fontWeight: '600' },
  premiumBanner: { padding: 24, borderRadius: 24, overflow: 'hidden', elevation: 8, shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, flexDirection: 'row', alignItems: 'center' },
  premiumBannerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  premiumBannerIcon: { fontSize: 22, lineHeight: 26 },
  premiumBannerTitle: { fontSize: 20, fontWeight: '900', color: 'white', letterSpacing: -0.5, flex: 1 },
  premiumBannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 20, fontWeight: '600' },

  // Notification Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.6)' },
  modalBackdropCloseArea: { flex: 1 },
  notifModalContent: { backgroundColor: '#f8fafc', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  notifModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  notifModalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  notifModalSub: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  notifRow: { flexDirection: 'row', padding: 16, backgroundColor: 'white', borderRadius: 20, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.04, shadowRadius: 4 },
  notifRowUnread: { backgroundColor: '#f0f9ff', borderColor: '#bae6fd', borderWidth: 1 },
  notifIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  notifTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  notifDesc: { fontSize: 13, color: colors.textSecondary, fontWeight: '500', lineHeight: 18 },
  notifTime: { fontSize: 11, color: '#94a3b8', fontWeight: '700', marginTop: 8 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },

  // Incoming Booking Modal Styles
  incomingOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  incomingCard: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 16 },
  incomingTopBar: { paddingHorizontal: 20, paddingVertical: 18 },
  incomingTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  incomingIconWrapper: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  incomingLabel: { fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.9)', letterSpacing: 1.5 },
  incomingSubLabel: { fontSize: 14, fontWeight: '700', color: 'white', marginTop: 2 },
  timerContainer: { position: 'relative', width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  timerTextContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  timerText: { color: '#fef08a', fontSize: 10, fontWeight: '900', letterSpacing: -0.2 },
  incomingBody: { padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  incomingMessage: { fontSize: 15, color: colors.textSecondary, fontWeight: '500', lineHeight: 22, marginBottom: 24 },
  incomingActions: { flexDirection: 'row', gap: 12 },
  incomingDeclineBtn: { flex: 1, height: 54, borderRadius: 16, backgroundColor: '#fee2e2', borderWidth: 1.5, borderColor: '#fecaca', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  incomingDeclineText: { fontSize: 15, fontWeight: '800', color: '#ef4444' },
  incomingAcceptBtn: { flex: 2, borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  incomingAcceptGrad: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  incomingAcceptText: { fontSize: 15, fontWeight: '900', color: 'white' },
});

