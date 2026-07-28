import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, User, CreditCard, Landmark, Coins, History } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { redeemService } from '../services/redeemService';
import { colors } from '../theme/colors';

const MIN_COINS = 10;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;

export function RedeemScreen() {
  const navigation = useNavigation<any>();
  const { agent, updateAgent } = useAuth();
  const coinBalance = agent?.coins || 0;

  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [coinsToRedeem, setCoinsToRedeem] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const coinsNum = parseInt(coinsToRedeem, 10) || 0;
  const rupeeValue = coinsNum / 10;

  const isNameValid = accountHolderName.trim().length >= 2;
  const isAccountValid = ACCOUNT_NUMBER_REGEX.test(accountNumber.trim());
  const isIfscValid = IFSC_REGEX.test(ifscCode.trim().toUpperCase());
  const isBranchValid = branchName.trim().length >= 2;
  const isMultipleOfTen = coinsNum > 0 && coinsNum % 10 === 0;
  const isCoinsValid = coinsNum >= MIN_COINS && isMultipleOfTen && coinsNum <= coinBalance;
  const isFormValid = isNameValid && isAccountValid && isIfscValid && isBranchValid && isCoinsValid;

  const nameError = accountHolderName && !isNameValid ? 'Name must be at least 2 characters' : '';
  const accountError = accountNumber && !isAccountValid ? 'Enter a valid 9-18 digit account number' : '';
  const ifscError = ifscCode && !isIfscValid ? 'Enter a valid IFSC code (e.g. SBIN0001234)' : '';
  const branchError = branchName && !isBranchValid ? 'Branch name must be at least 2 characters' : '';

  const coinsErrorText = () => {
    if (!coinsToRedeem) return '';
    if (coinsNum < MIN_COINS) return `Minimum redemption is ${MIN_COINS} coins`;
    if (!isMultipleOfTen) return 'Coins must be a multiple of 10';
    if (coinsNum > coinBalance) return 'Insufficient coin balance';
    return '';
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setIsLoading(true);
    try {
      await redeemService.submitRedeem({
        accountHolderName: accountHolderName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        branchName: branchName.trim(),
        coinsToRedeem: coinsNum,
      });
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert('Could not submit request', error.message || 'Something went wrong. Please try again.');
      return;
    }

    // Request already succeeded server-side at this point — any failure below
    // (e.g. local storage write) must not be reported to the user as a failed submission.
    try {
      await updateAgent({ coins: coinBalance - coinsNum });
    } catch {
      // best-effort local balance update; ProfileScreen will reconcile from the server on next focus
    }

    setIsLoading(false);
    Alert.alert(
      'Request submitted',
      'Your redeem request has been submitted and is pending approval.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
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
            <Text style={styles.headerTitle}>Redeem coins</Text>
            <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate('RedeemHistory')} activeOpacity={0.7}>
              <History size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available balance</Text>
            <Text style={styles.balanceValue}>{coinBalance} coins</Text>
            <Text style={styles.balanceSub}>≈ ₹{(coinBalance / 10).toFixed(2)}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.formInner} keyboardShouldPersistTaps="handled">
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Account holder name</Text>
            <View style={styles.inputRow}>
              <User size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="Full name as per bank account"
                placeholderTextColor={colors.textMuted}
                value={accountHolderName}
                onChangeText={setAccountHolderName}
              />
            </View>
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bank account number</Text>
            <View style={styles.inputRow}>
              <CreditCard size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="9-18 digit account number"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={accountNumber}
                onChangeText={(v) => setAccountNumber(v.replace(/[^0-9]/g, ''))}
                maxLength={18}
              />
            </View>
            {accountError ? <Text style={styles.errorText}>{accountError}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>IFSC code</Text>
            <View style={styles.inputRow}>
              <Landmark size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="e.g. SBIN0001234"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                value={ifscCode}
                onChangeText={(v) => setIfscCode(v.toUpperCase())}
                maxLength={11}
              />
            </View>
            {ifscError ? <Text style={styles.errorText}>{ifscError}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Branch name</Text>
            <View style={styles.inputRow}>
              <Landmark size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="e.g. MG Road Branch"
                placeholderTextColor={colors.textMuted}
                value={branchName}
                onChangeText={setBranchName}
              />
            </View>
            {branchError ? <Text style={styles.errorText}>{branchError}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Coins to redeem</Text>
            <View style={styles.inputRow}>
              <Coins size={18} color={colors.coin} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder={`Multiples of 10, min ${MIN_COINS}`}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={coinsToRedeem}
                onChangeText={(v) => setCoinsToRedeem(v.replace(/[^0-9]/g, ''))}
              />
            </View>
            {coinsErrorText() ? (
              <Text style={styles.errorText}>{coinsErrorText()}</Text>
            ) : coinsNum > 0 ? (
              <Text style={styles.conversionText}>= ₹{rupeeValue.toFixed(2)}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (isLoading || !isFormValid) && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={isLoading || !isFormValid}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.submitBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {isLoading
                ? <ActivityIndicator color="white" />
                : <Text style={styles.submitBtnText}>Submit request</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.helpText}>
            Requests are reviewed manually. Once approved, the amount is bank-transferred and the request is marked Paid.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  header: { paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden', elevation: 10, shadowColor: '#052e16', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  historyBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: 'white' },
  balanceCard: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  balanceLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  balanceValue: { fontSize: 28, fontWeight: '900', color: 'white', marginTop: 4 },
  balanceSub: { fontSize: 13, color: '#86efac', fontWeight: '700', marginTop: 2 },
  formInner: { padding: 24, paddingBottom: 48 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1.5, borderColor: colors.border },
  input: { flex: 1, fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  errorText: { fontSize: 12, color: colors.error, fontWeight: '600', marginTop: 6 },
  conversionText: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 6 },
  submitBtn: { marginTop: 8, borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  submitBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 8 },
  submitBtnText: { fontSize: 16, fontWeight: '900', color: 'white' },
  helpText: { textAlign: 'center', color: colors.textMuted, marginTop: 16, fontWeight: '500', fontSize: 12, lineHeight: 18 },
});
