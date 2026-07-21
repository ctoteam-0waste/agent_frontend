import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, Modal, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, Star, Package, Award, Phone, ChevronRight, Globe, Check, X } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useFocusEffect } from '@react-navigation/native';
import { bookingService } from '../services/bookingService';
import { agentService } from '../services/agentService';
import { colors } from '../theme/colors';

const LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'hi', name: 'हिंदी (Hindi)' },
  { id: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
  { id: 'mr', name: 'मराठी (Marathi)' },
  { id: 'te', name: 'తెలుగు (Telugu)' }
];

export function ProfileScreen() {
  const { agent, logout, isOnline, updateAgent } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [totalPickups, setTotalPickups] = useState(agent?.totalPickups || 0);

  useFocusEffect(useCallback(() => {
    // Fetch fresh agent profile (rating, etc.) from backend
    agentService.getProfile()
      .then(profile => { if (profile) updateAgent(profile); })
      .catch(() => {});

    bookingService.getAgentJobs()
      .then(res => {
        const jobs = res?.data || res || [];
        const completed = Array.isArray(jobs) ? jobs.filter((j: any) => j.status === 'COMPLETED') : [];
        setTotalPickups(completed.length);
      })
      .catch(() => {});
  }, []));

  const [langModalVisible, setLangModalVisible] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const badgeAnim = React.useRef(new Animated.Value(0)).current;

  const handleLogout = () => {
    Alert.alert(t('logout'), t('logoutConfirm'), [
      { text: t('cancelLabel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: logout },
    ]);
  };

  const openLangModal = () => {
    setLangModalVisible(true);
    Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, bounciness: 4 }).start();
  };

  const closeLangModal = () => {
    Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setLangModalVisible(false));
  };

  const openBadgeModal = () => {
    setBadgeModalVisible(true);
    Animated.spring(badgeAnim, { toValue: 1, useNativeDriver: true, bounciness: 4 }).start();
  };

  const closeBadgeModal = () => {
    Animated.timing(badgeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setBadgeModalVisible(false));
  };

  const handleSelectLanguage = (langId: any) => {
    setLanguage(langId);
    closeLangModal();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDeep} />

      {/* Header */}
      <LinearGradient colors={['#052e16', '#14532d', '#166534']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Decorative circles */}
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />

        <SafeAreaView edges={['top']}>
          <View style={styles.profileTop}>
            {/* Avatar */}
            <View style={styles.avatarRing}>
              <LinearGradient colors={['#4ade80', '#16a34a']} style={styles.avatarGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.avatarLgText}>{agent?.name?.charAt(0)?.toUpperCase() || 'A'}</Text>
              </LinearGradient>
            </View>

            <Text style={styles.agentName}>{agent?.name || 'Agent'}</Text>
            <Text style={styles.agentId}>{t('idLabel')}: {agent?.agentId || 'AGT-001'}</Text>

            {/* Rating + Online pill */}
            <View style={styles.headerPills}>
              <View style={styles.ratingPill}>
                <Star size={12} color="#fbbf24" fill="#fbbf24" />
                <Text style={styles.ratingPillText}>{agent?.rating || 'NA'}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: isOnline ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.1)' }]}>
                <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4ade80' : '#9ca3af' }]} />
                <Text style={styles.statusPillText}>{isOnline ? t('onlineLabel') : t('offlineLabel')}</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#f4f4f5' }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Agent details */}
        <Text style={styles.sectionHeading}>{t('agentDetails')}</Text>
        <View style={styles.section}>
          <InfoRow icon={<Phone size={18} color={colors.primary} />} iconBg="#f0fdf4" label={t('mobileLabel')} value={agent?.phone || t('notSet')} />
          <TouchableOpacity style={styles.infoRow} onPress={openBadgeModal} activeOpacity={0.7}>
            <View style={[styles.infoIcon, { backgroundColor: '#fffbeb' }]}><Award size={18} color={colors.coin} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{t('badgeJourney')}</Text>
              <Text style={[styles.infoValue, { color: colors.coin }]}>{t('bBronze')}</Text>
            </View>
            <View style={styles.chevronBox}><ChevronRight size={16} color={colors.textMuted} /></View>
          </TouchableOpacity>
          <InfoRow icon={<Package size={18} color="#0891b2" />} iconBg="#eff6ff" label={t('zoneLabel')} value={agent?.zone || t('notAssigned')} />
        </View>

        {/* App settings + Logout grouped */}
        <Text style={styles.sectionHeading}>{t('appSettings')}</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.infoRow} onPress={openLangModal}>
            <View style={[styles.infoIcon, { backgroundColor: '#faf5ff' }]}><Globe size={18} color="#8b5cf6" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{t('language')}</Text>
              <Text style={styles.infoValue}>{LANGUAGES.find(l => l.id === language)?.name}</Text>
            </View>
            <View style={styles.chevronBox}><ChevronRight size={16} color={colors.textMuted} /></View>
          </TouchableOpacity>

          {/* Logout inside settings card */}
          <TouchableOpacity style={[styles.infoRow, { borderBottomWidth: 0 }]} onPress={handleLogout} activeOpacity={0.85}>
            <View style={[styles.infoIcon, { backgroundColor: '#fff1f2' }]}>
              <LogOut size={18} color={colors.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: '#fca5a5' }]}>{t('accountLabel')}</Text>
              <Text style={[styles.infoValue, { color: colors.error }]}>{t('logout')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App version */}
        <Text style={styles.versionText}>KarmaVer$e — Agent v1.0.0</Text>

      </ScrollView>

      {/* Badge Progress Modal */}
      <Modal visible={badgeModalVisible} transparent={true} animationType="fade" onRequestClose={closeBadgeModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdropCloseArea} onPress={closeBadgeModal} activeOpacity={1} />
          <Animated.View style={[
            styles.modalContent,
            { transform: [{ translateY: badgeAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }], height: '85%' }
          ]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('badgeJourneyTitle')}</Text>
              <TouchableOpacity onPress={closeBadgeModal} style={styles.closeBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
              {/* Progress Section */}
              <View style={styles.badgeProgressCard}>
                <View style={styles.badgeProgressHeader}>
                  <View style={styles.currentBadgeIconBg}>
                    <Award size={36} color="#d97706" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={styles.currentBadgeTitle}>{t('bBronze')}</Text>
                    <Text style={styles.currentBadgeSub}>{t('currentLevel')}</Text>
                  </View>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: '90%' }]} />
                </View>
                <Text style={styles.progressText}>{t('pickupsToUnlock', agent?.totalPickups || 0)} {t('bSilver')}</Text>
              </View>

              <Text style={styles.roadmapTitle}>{t('badgeRoadmap')}</Text>

              {/* Badges List */}
              <BadgeCriteriaRow icon={<Award size={24} color="#b45309" />} title={t('bBronze')} req={`50 ${t('pickupsWord')} • 4.5+ ${t('ratingWord')}`} status={t('unlockedStatus')} unlocked={true} active={false} />
              <BadgeCriteriaRow icon={<Award size={24} color="#64748b" />} title={t('bSilver')} req={`150 ${t('pickupsWord')} • 4.7+ ${t('ratingWord')}`} status={t('leftToUnlock', 8)} unlocked={false} active={true} />
              <BadgeCriteriaRow icon={<Award size={24} color="#15803d" />} title={t('bGold')} req={`300 ${t('pickupsWord')} • 4.8+ ${t('ratingWord')}`} status={t('locked')} unlocked={false} active={false} />
              <BadgeCriteriaRow icon={<Award size={24} color="#6d28d9" />} title={t('bPlat')} req={`500+ ${t('pickupsWord')} • 4.9+ ${t('ratingWord')}`} status={t('locked')} unlocked={false} active={false} />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal visible={langModalVisible} transparent={true} animationType="fade" onRequestClose={closeLangModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdropCloseArea} onPress={closeLangModal} activeOpacity={1} />
          <Animated.View style={[
            styles.modalContent,
            { transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }]}
          ]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('chooseLanguage')}</Text>
              <TouchableOpacity onPress={closeLangModal} style={styles.closeBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={{ paddingBottom: 20 }}>
              {LANGUAGES.map((lang) => {
                const isSelected = language === lang.id;
                return (
                  <TouchableOpacity
                    key={lang.id}
                    style={[styles.langOption, isSelected && styles.langOptionSelected]}
                    onPress={() => handleSelectLanguage(lang.id)}
                  >
                    <Text style={[styles.langText, isSelected && styles.langTextSelected]}>{lang.name}</Text>
                    {isSelected && <Check size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

function InfoRow({ icon, iconBg, label, value }: any) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, iconBg && { backgroundColor: iconBg }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function BadgeCriteriaRow({ icon, title, req, status, unlocked, active }: any) {
  return (
    <View style={[styles.badgeCritRow, active && styles.badgeCritRowActive]}>
      <View style={[styles.badgeCritIcon, unlocked ? { backgroundColor: '#fef3c7' } : { backgroundColor: '#f1f5f9' }]}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.badgeCritTitle, unlocked ? { color: colors.textPrimary } : { color: colors.textSecondary }]}>{title}</Text>
        <Text style={styles.badgeCritReq}>{req}</Text>
      </View>
      <View style={[styles.badgeStatusPill, unlocked ? { backgroundColor: '#dcfce7' } : active ? { backgroundColor: '#e0f2fe' } : { backgroundColor: '#f1f5f9' }]}>
        <Text style={[styles.badgeStatusText, unlocked ? { color: '#166534' } : active ? { color: '#0369a1' } : { color: '#64748b' }]}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  header: { paddingHorizontal: 20, paddingBottom: 32, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden', elevation: 12, shadowColor: '#052e16', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16 },
  decCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)', top: -60, right: -60 },
  decCircle2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.04)', bottom: -20, left: -30 },
  profileTop: { alignItems: 'center', paddingTop: 12, gap: 10 },
  avatarRing: { padding: 3, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 4 },
  avatarGrad: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  avatarLgText: { fontSize: 38, fontWeight: '900', color: 'white' },
  agentName: { fontSize: 26, fontWeight: '900', color: 'white', letterSpacing: -0.5 },
  agentId: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '600', letterSpacing: 0.5 },
  headerPills: { flexDirection: 'row', gap: 8, marginTop: 4 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  ratingPillText: { color: 'white', fontWeight: '800', fontSize: 13 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { color: 'white', fontWeight: '700', fontSize: 12 },
  body: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f4f5' },
  versionText: { textAlign: 'center', fontSize: 11, color: colors.textMuted, fontWeight: '500', marginTop: 8, marginBottom: 32 },
  sectionHeading: { fontSize: 11, fontWeight: '800', color: colors.textMuted, marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 },
  section: { backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, marginBottom: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  infoIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  chevronBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginBottom: 3 },
  infoValue: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  logoutText: { color: colors.error, fontWeight: '700', fontSize: 14 },
  
  // Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.6)' },
  modalBackdropCloseArea: { flex: 1 },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  langOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  langOptionSelected: { backgroundColor: '#f0fdf4' },
  langText: { fontSize: 16, fontWeight: '600', color: '#334155' },
  langTextSelected: { color: colors.primary, fontWeight: '800' },

  // Badge Modal Styles
  badgeProgressCard: { backgroundColor: '#fffbeb', borderRadius: 24, padding: 20, marginBottom: 32, borderWidth: 1, borderColor: '#fde68a' },
  badgeProgressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  currentBadgeIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  currentBadgeTitle: { fontSize: 20, fontWeight: '900', color: '#92400e' },
  currentBadgeSub: { fontSize: 13, color: '#b45309', fontWeight: '600' },
  progressBarBg: { height: 8, backgroundColor: '#fde68a', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 4 },
  progressText: { fontSize: 13, fontWeight: '700', color: '#b45309', marginTop: 12, textAlign: 'center' },
  roadmapTitle: { fontSize: 18, fontWeight: '900', color: colors.textPrimary, marginBottom: 16 },
  badgeCritRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  badgeCritRowActive: { backgroundColor: '#f8fafc', paddingHorizontal: 16, borderRadius: 16, marginHorizontal: -16 },
  badgeCritIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  badgeCritTitle: { fontSize: 16, fontWeight: '800' },
  badgeCritReq: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 4 },
  badgeStatusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeStatusText: { fontSize: 10, fontWeight: '800' }
});
