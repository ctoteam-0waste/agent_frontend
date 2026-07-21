import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Package, Star, CheckCircle2, MapPin, Flame, Calendar, TrendingUp, X, Clock, User, Tag, Hash } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useFocusEffect } from '@react-navigation/native';
import { bookingService } from '../services/bookingService';
import { colors } from '../theme/colors';

export function EarningsScreen() {
  const { agent } = useAuth();
  const { t } = useLanguage();
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  const openDetail = (job: any) => setSelectedJob(job);
  const closeDetail = () => setSelectedJob(null);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await bookingService.getAgentJobs();
      const jobs = res?.data || res || [];
      const completed = Array.isArray(jobs) ? jobs.filter((j: any) => j.status === 'COMPLETED') : [];
      setCompletedJobs(completed);
    } catch {
      setCompletedJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchJobs(); }, [fetchJobs]));

  const totalPickups = completedJobs.length;
  const now = new Date();
  const thisMonthJobs = completedJobs.filter(j => {
    const d = new Date(j.updatedAt || j.pickupDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString())
      return `${t('today')}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    if (d.toDateString() === yesterday.toDateString())
      return `${t('yesterday')}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDeep} />

      {/* Header */}
      <LinearGradient colors={['#052e16', '#14532d', '#166534']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerSub}>{t('performance').toUpperCase()}</Text>
              <Text style={styles.headerTitle}>{t('myJobsTitle')}</Text>
            </View>
            <View style={styles.headerIconBg}>
              <TrendingUp size={24} color="#4ade80" />
            </View>
          </View>

          {/* 3 stat pills */}
          <View style={styles.statPillsRow}>
            <View style={styles.statPill}>
              <View style={[styles.statPillIcon, { backgroundColor: 'rgba(74,222,128,0.2)' }]}>
                <Package size={14} color="#4ade80" />
              </View>
              <View>
                <Text style={styles.statPillVal}>{totalPickups}</Text>
                <Text style={styles.statPillLabel}>{t('total')}</Text>
              </View>
            </View>

            <View style={[styles.statPill, styles.statPillCenter]}>
              <View style={[styles.statPillIcon, { backgroundColor: 'rgba(251,191,36,0.2)' }]}>
                <Flame size={14} color="#fbbf24" />
              </View>
              <View>
                <Text style={styles.statPillVal}>{thisMonthJobs}</Text>
                <Text style={styles.statPillLabel}>{t('thisMonth')}</Text>
              </View>
            </View>

            <View style={styles.statPill}>
              <View style={[styles.statPillIcon, { backgroundColor: 'rgba(96,165,250,0.2)' }]}>
                <Star size={14} color="#60a5fa" />
              </View>
              <View>
                <Text style={styles.statPillVal}>{agent?.rating || 'NA'}</Text>
                <Text style={styles.statPillLabel}>{t('ratingLabel')}</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Body */}
      <ScrollView
        style={{ flex: 1, backgroundColor: '#f4f4f5' }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>{t('completedPickups')}</Text>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t('loadingJobs')}</Text>
          </View>
        ) : completedJobs.length === 0 ? (
          <View style={styles.empty}>
            <LinearGradient colors={['#f0fdf4', '#dcfce7']} style={styles.emptyIconBox}>
              <Package size={40} color="#16a34a" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>{t('noCompletedPickups')}</Text>
            <Text style={styles.emptySub}>{t('finishedJobsAppearHere')}</Text>
          </View>
        ) : (
          <View style={styles.jobList}>
            {completedJobs.map((job, idx) => {
              const rawId = job._id || job.id || '';
              const shortId = rawId.length > 8 ? `#${rawId.substring(0, 8).toUpperCase()}` : rawId;
              const mainCat = job.categories?.[0]?.subCategory || job.categories?.[0]?.category || t('mixedWaste');
              const extraCount = (job.categories?.length || 1) - 1;
              const typeLabel = extraCount > 0 ? `${mainCat} +${extraCount}` : mainCat;
              const addressText = typeof job.address === 'object'
                ? (job.address?.fullAddress || job.address?.streetAddress || t('addressNotAvailable'))
                : (job.address || t('addressNotAvailable'));

              return (
                <TouchableOpacity key={rawId || idx} style={styles.jobCard} onPress={() => openDetail(job)} activeOpacity={0.85}>
                  {/* Green left accent */}
                  <View style={styles.jobAccent} />

                  <View style={styles.jobContent}>
                    {/* Top row */}
                    <View style={styles.jobTopRow}>
                      <View style={styles.jobIconBg}>
                        <CheckCircle2 size={20} color="#16a34a" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.jobTitleRow}>
                          <Text style={styles.jobId}>{shortId}</Text>
                          <View style={styles.completedBadge}>
                            <Text style={styles.completedBadgeText}>✓ {t('doneLabel')}</Text>
                          </View>
                        </View>
                        <Text style={styles.jobType}>{typeLabel}</Text>
                      </View>
                    </View>

                    {/* Divider */}
                    <View style={styles.jobDivider} />

                    {/* Bottom row */}
                    <View style={styles.jobBottomRow}>
                      <View style={styles.jobMetaItem}>
                        <MapPin size={12} color={colors.textMuted} />
                        <Text style={styles.jobMetaText} numberOfLines={1}>{addressText}</Text>
                      </View>
                      <View style={styles.jobMetaItem}>
                        <Calendar size={12} color={colors.textMuted} />
                        <Text style={styles.jobDateText}>{formatDate(job.updatedAt || job.pickupDate)}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Detail Bottom Sheet */}
      {selectedJob && (
        <Modal visible transparent animationType="fade" onRequestClose={closeDetail}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDetail} />
            <View style={styles.detailSheet}>
              <DetailContent job={selectedJob} onClose={closeDetail} formatDate={formatDate} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailRowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailRowLabel}>{label}</Text>
        <Text style={styles.detailRowValue}>{value}</Text>
      </View>
    </View>
  );
}

function DetailContent({ job, onClose, formatDate }: { job: any; onClose: () => void; formatDate: (d: string) => string }) {
  const { t } = useLanguage();
  const rawId = job._id || job.id || '';
  const shortId = rawId.length > 8 ? `#${rawId.substring(0, 8).toUpperCase()}` : rawId;
  const addressText = typeof job.address === 'object'
    ? (job.address?.fullAddress || job.address?.streetAddress || t('notAvailable'))
    : (job.address || t('notAvailable'));
  const customerName = job.user?.name || job.userName || t('karmaUser');
  const timeSlot = job.timeSlot || '—';
  const categories: any[] = job.categories || [];

  return (
    <View style={{ flex: 1 }}>
      {/* Handle */}
      <View style={styles.sheetHandle} />

      {/* Header */}
      <View style={styles.detailHeader}>
        <View>
          <Text style={styles.detailId}>{shortId}</Text>
          <View style={styles.detailCompletedBadge}>
            <CheckCircle2 size={12} color="#16a34a" />
            <Text style={styles.detailCompletedText}>{t('completedStatus')}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.detailCloseBtn} onPress={onClose}>
          <X size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 8, paddingBottom: 32 }}>

        {/* Info rows */}
        <DetailRow icon={<User size={16} color={colors.primary} />} label={t('customerLabel')} value={customerName} />
        <DetailRow icon={<MapPin size={16} color="#0369a1" />} label={t('pickupAddressLabel')} value={addressText} />
        <DetailRow icon={<Calendar size={16} color="#7c3aed" />} label={t('dateLabel')} value={formatDate(job.updatedAt || job.pickupDate)} />
        <DetailRow icon={<Clock size={16} color="#b45309" />} label={t('timeSlotLabel')} value={timeSlot} />
        <DetailRow icon={<Hash size={16} color="#475569" />} label={t('bookingIdLabel')} value={rawId} />

        {/* Categories */}
        {categories.length > 0 && (
          <View style={styles.catSection}>
            <View style={styles.catSectionHeader}>
              <Tag size={15} color={colors.primary} />
              <Text style={styles.catSectionTitle}>{t('itemsCollected')}</Text>
            </View>
            {categories.map((cat: any, i: number) => (
              <View key={i} style={styles.catRow}>
                <View style={styles.catDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.catName}>{cat.subCategory || cat.category || t('unknownLabel')}</Text>
                  {cat.category && cat.subCategory && (
                    <Text style={styles.catParent}>{cat.category}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 10,
    shadowColor: '#052e16',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerSub: { color: '#86efac', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  headerTitle: { fontSize: 30, fontWeight: '900', color: 'white' },
  headerIconBg: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },

  statPillsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 18,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingVertical: 10, paddingHorizontal: 10,
  },
  statPillCenter: {
    borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statPillIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  statPillVal: { fontSize: 18, fontWeight: '900', color: 'white' },
  statPillLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },

  body: { padding: 16, gap: 12 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  countBadge: {
    backgroundColor: colors.primary, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  countBadgeText: { fontSize: 11, fontWeight: '800', color: 'white' },

  loadingBox: { alignItems: 'center', marginTop: 48, gap: 12 },
  loadingText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },

  empty: { alignItems: 'center', marginTop: 48, gap: 14 },
  emptyIconBox: {
    width: 88, height: 88, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  emptySub: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },

  jobList: { gap: 10 },

  jobCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  jobAccent: { width: 4, backgroundColor: '#16a34a' },
  jobContent: { flex: 1, padding: 14 },

  jobTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  jobIconBg: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  jobTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  jobId: { fontSize: 14, fontWeight: '900', color: colors.textPrimary },
  completedBadge: {
    backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  completedBadgeText: { fontSize: 10, fontWeight: '800', color: '#16a34a' },
  jobType: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },

  jobDivider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 10 },

  jobBottomRow: { gap: 5 },
  jobMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  jobMetaText: { fontSize: 12, color: colors.textMuted, fontWeight: '500', flex: 1 },
  jobDateText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  detailSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '88%',
    minHeight: 300,
    elevation: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e2e8f0', alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  detailHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  detailId: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, marginBottom: 6 },
  detailCompletedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  detailCompletedText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  detailCloseBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },

  detailRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#f8fafc', borderRadius: 14, padding: 14,
  },
  detailRowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', flexShrink: 0, elevation: 1 },
  detailRowLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginBottom: 3 },
  detailRowValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },

  catSection: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, gap: 10 },
  catSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  catSectionTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  catRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  catDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 5, flexShrink: 0 },
  catName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  catParent: { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginTop: 2 },
});
