import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { X, BellRing, MapPin, CheckCircle, Smartphone, Truck, Package, DollarSign, Award, Star, Flame, Gift } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';

interface TrainingModalProps {
  visible: boolean;
  moduleId: number | null;
  onClose: () => void;
}

export function TrainingModal({ visible, moduleId, onClose }: TrainingModalProps) {
  const { t } = useLanguage();

  const renderContent = () => {
    switch (moduleId) {
      case 1: return <QueueFlow t={t} />;
      case 2: return <JobFlow t={t} />;
      case 3: return <WasteCategories t={t} />;
      case 4: return <EarningsFlow t={t} />;
      case 5: return <BadgesFlow t={t} />;
      default: return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          {renderContent()}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// Flow Components
function QueueFlow({ t }: any) {
  return (
    <View style={styles.content}>
      <Text style={styles.title}>{t('queueTitle')}</Text>
      <View style={styles.timeline}>
        <TimelineItem icon={<BellRing size={20} color="white" />} bg="#0ea5e9" title={t('qStep1')} desc="You get a ping with location." />
        <View style={styles.line} />
        <TimelineItem icon={<CheckCircle size={20} color="white" />} bg="#10b981" title={t('qStep2')} desc="Tap accept quickly to secure it." />
        <View style={styles.line} />
        <TimelineItem icon={<MapPin size={20} color="white" />} bg="#f59e0b" title={t('qStep3')} desc="Use the built-in map to reach." />
      </View>
    </View>
  );
}

function JobFlow({ t }: any) {
  return (
    <View style={styles.content}>
      <Text style={styles.title}>{t('jobFlowTitle')}</Text>
      <View style={styles.timeline}>
        <TimelineItem icon={<Truck size={20} color="white" />} bg="#8b5cf6" title={t('jStep1')} />
        <View style={styles.line} />
        <TimelineItem icon={<Package size={20} color="white" />} bg="#3b82f6" title={t('jStep2')} />
        <View style={styles.line} />
        <TimelineItem icon={<Smartphone size={20} color="white" />} bg="#f59e0b" title={t('jStep3')} />
        <View style={styles.line} />
        <TimelineItem icon={<CheckCircle size={20} color="white" />} bg="#10b981" title={t('jStep4')} />
      </View>
    </View>
  );
}

function WasteCategories({ t }: any) {
  return (
    <View style={styles.content}>
      <Text style={styles.title}>{t('wasteTitle')}</Text>
      <View style={{ gap: 16, marginTop: 20 }}>
        <CategoryCard color="#3b82f6" title={t('plastic')} items={['Water Bottles', 'Containers']} />
        <CategoryCard color="#10b981" title={t('ewaste')} items={['Old Phones', 'Cables']} />
        <CategoryCard color="#64748b" title={t('metal')} items={['Iron Scraps', 'Cans']} />
      </View>
    </View>
  );
}

function EarningsFlow({ t }: any) {
  return (
    <View style={styles.content}>
      <Text style={styles.title}>Earnings & Payouts</Text>
      <View style={{ alignItems: 'center', marginTop: 30 }}>
        <View style={styles.circleLg}><Package size={32} color="white" /></View>
        <Text style={styles.descCenter}>Complete Pickup</Text>
        <View style={styles.vertLine} />
        <View style={[styles.circleLg, { backgroundColor: '#f59e0b' }]}><DollarSign size={32} color="white" /></View>
        <Text style={styles.descCenter}>Money added to Wallet</Text>
        <View style={styles.vertLine} />
        <View style={[styles.circleLg, { backgroundColor: '#10b981' }]}><CheckCircle size={32} color="white" /></View>
        <Text style={styles.descCenter}>Weekly Bank Transfer</Text>
      </View>
    </View>
  );
}

function BadgesFlow({ t }: any) {
  return (
    <View style={styles.content}>
      <Text style={styles.title}>{t('badgeTitle')}</Text>
      <Text style={styles.subText}>Unlock perks and Company Gift Hampers by leveling up!</Text>
      
      <View style={{ gap: 16, marginTop: 20 }}>
        <BadgeCard icon={<Award size={24} color="#b45309" />} title={t('bBronze')} req="50 Pickups • 4.5+ Rating" perk="Priority Queue Ping" bg="#fef3c7" />
        <BadgeCard icon={<Award size={24} color="#64748b" />} title={t('bSilver')} req="150 Pickups • 4.7+ Rating" perk="+5% Earnings Bonus" bg="#f1f5f9" />
        <BadgeCard icon={<Award size={24} color="#15803d" />} title={t('bGold')} req="300 Pickups • 4.8+ Rating" perk={t('giftHamper') + " + Priority"} bg="#f0fdf4" />
        <BadgeCard icon={<Award size={24} color="#6d28d9" />} title={t('bPlat')} req="500+ Pickups • 4.9+ Rating" perk="Mega Hamper + 10% Bonus" bg="#f5f3ff" />
      </View>
    </View>
  );
}

// Helpers
function TimelineItem({ icon, bg, title, desc }: any) {
  return (
    <View style={styles.tRow}>
      <View style={[styles.tIcon, { backgroundColor: bg }]}>{icon}</View>
      <View style={{ flex: 1, paddingTop: 4 }}>
        <Text style={styles.tTitle}>{title}</Text>
        {desc && <Text style={styles.tDesc}>{desc}</Text>}
      </View>
    </View>
  );
}

function CategoryCard({ color, title, items }: any) {
  return (
    <View style={[styles.catCard, { borderLeftColor: color }]}>
      <Text style={styles.catTitle}>{title}</Text>
      <Text style={styles.catItems}>{items.join(', ')}</Text>
    </View>
  );
}

function BadgeCard({ icon, title, req, perk, bg }: any) {
  return (
    <View style={[styles.badgeCard, { backgroundColor: bg }]}>
      <View style={styles.badgeIconBox}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.badgeTitle}>{title}</Text>
        <Text style={styles.badgeReq}>{req}</Text>
        <View style={styles.perkRow}>
          {perk.includes('Hamper') ? <Gift size={12} color={colors.primary} /> : <Star size={12} color={colors.primary} />}
          <Text style={styles.badgePerk}>{perk}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'white' },
  header: { padding: 20, alignItems: 'flex-end' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 24, paddingBottom: 60 },
  content: { flex: 1 },
  title: { fontSize: 28, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 },
  subText: { fontSize: 15, color: colors.textSecondary, marginTop: 8, fontWeight: '500', lineHeight: 22 },
  timeline: { marginTop: 32 },
  tRow: { flexDirection: 'row', gap: 16 },
  tIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  tTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  tDesc: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  line: { width: 2, height: 40, backgroundColor: '#e2e8f0', marginLeft: 23, marginVertical: -4, zIndex: 1 },
  catCard: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 16, borderLeftWidth: 6 },
  catTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  catItems: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  circleLg: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  descCenter: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginTop: 12 },
  vertLine: { width: 2, height: 30, backgroundColor: '#e2e8f0', marginVertical: 8 },
  badgeCard: { flexDirection: 'row', padding: 16, borderRadius: 20, alignItems: 'center', gap: 16 },
  badgeIconBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  badgeTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  badgeReq: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginTop: 2, marginBottom: 8 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'white', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgePerk: { fontSize: 11, fontWeight: '800', color: colors.primary },
});
