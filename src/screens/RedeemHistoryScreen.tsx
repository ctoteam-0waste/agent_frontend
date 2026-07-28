import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Wallet, Clock, CheckCircle2, XCircle } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { redeemService, RedeemHistoryItem } from '../services/redeemService';
import { colors } from '../theme/colors';

const STATUS_META: Record<string, { label: string; bg: string; fg: string; icon: any }> = {
  PENDING: { label: 'Processing', bg: '#fef3c7', fg: '#b45309', icon: Clock },
  PAID: { label: 'Paid', bg: '#dcfce7', fg: '#16a34a', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', bg: '#fee2e2', fg: '#dc2626', icon: XCircle },
};

export function RedeemHistoryScreen() {
  const navigation = useNavigation<any>();
  const [requests, setRequests] = useState<RedeemHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await redeemService.getMyHistory();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchHistory(); }, [fetchHistory]));

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDeep} />
      <LinearGradient colors={['#052e16', '#14532d', '#166534']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <ArrowLeft size={20} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Redeem history</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#f4f4f5' }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.empty}>
            <LinearGradient colors={['#f0fdf4', '#dcfce7']} style={styles.emptyIconBox}>
              <Wallet size={40} color="#16a34a" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No redeem requests yet</Text>
            <Text style={styles.emptySub}>Requests you submit will show up here</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {requests.map((req) => {
              const meta = STATUS_META[req.status] || STATUS_META.PENDING;
              const StatusIcon = meta.icon;
              return (
                <View key={req._id} style={styles.card}>
                  <View style={[styles.cardAccent, { backgroundColor: meta.fg }]} />
                  <View style={styles.cardContent}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.coinsText}>{req.coinsRedeemed} coins</Text>
                      <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                        <StatusIcon size={11} color={meta.fg} />
                        <Text style={[styles.statusBadgeText, { color: meta.fg }]}>{meta.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.amountText}>₹{req.amountInRupees}</Text>

                    <View style={styles.cardDivider} />

                    <View style={styles.cardBottomRow}>
                      <Text style={styles.dateText}>Requested {formatDate(req.createdAt)}</Text>
                      {req.status !== 'PENDING' && req.processedAt && (
                        <Text style={styles.dateText}>Processed {formatDate(req.processedAt)}</Text>
                      )}
                    </View>

                    {req.status === 'REJECTED' && req.rejectionReason && (
                      <View style={styles.rejectionBox}>
                        <Text style={styles.rejectionText}>{req.rejectionReason} — coins were refunded to your wallet.</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden', elevation: 10, shadowColor: '#052e16', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: 'white' },

  body: { padding: 16 },

  loadingBox: { alignItems: 'center', marginTop: 48, gap: 12 },
  loadingText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },

  empty: { alignItems: 'center', marginTop: 48, gap: 14 },
  emptyIconBox: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  emptySub: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },

  list: { gap: 12 },
  card: { backgroundColor: 'white', borderRadius: 18, overflow: 'hidden', flexDirection: 'row', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  cardAccent: { width: 4 },
  cardContent: { flex: 1, padding: 16 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  coinsText: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  amountText: { fontSize: 22, fontWeight: '900', color: colors.primary, marginBottom: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  cardDivider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 10 },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  dateText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  rejectionBox: { marginTop: 10, backgroundColor: '#fef2f2', borderRadius: 12, padding: 10 },
  rejectionText: { fontSize: 12, color: '#b91c1c', fontWeight: '600', lineHeight: 17 },
});
