import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar, Alert, ActivityIndicator, Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Phone, Lock, Eye, EyeOff, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { KarmaCoin } from '../components/shared/KarmaCoin';

// TODO: replace with the real supervisor/support WhatsApp number (with country code, no + or spaces)
const SUPPORT_WHATSAPP_NUMBER = '910000000000';

export function LoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isPhoneValid = /^\d{10}$/.test(phone);
  const isPasswordValid = password.length >= 6;
  const isFormValid = isPhoneValid && isPasswordValid;

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Missing fields', 'Please enter your phone number and password.');
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      Alert.alert('Invalid phone', 'Please enter a valid 10-digit phone number.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Invalid password', 'Password must be at least 6 characters.');
      return;
    }
    setIsLoading(true);
    try {
      await login(phone, password);
    } catch (error: any) {
      const isNetworkError = !error?.response;
      Alert.alert(
        isNetworkError ? 'No Internet Connection' : 'Login Failed',
        isNetworkError
          ? 'Please check your network connection and try again.'
          : (error.message || 'Invalid credentials. Please try again.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactSupervisor = async () => {
    const url = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi, I need help with my KarmaVer$e Agent account.')}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('WhatsApp not available', 'Please install WhatsApp to contact your supervisor, or reach out through another channel.');
      }
    } catch {
      Alert.alert('Could not open WhatsApp', 'Please try again later.');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDeep} />
      <LinearGradient colors={[colors.primaryDeep, colors.primaryDark, colors.primary]} style={styles.topSection}>
        <View style={styles.logoArea}>
          <KarmaCoin size={72} glow />
          <Text style={styles.appName}>KarmaVer$e</Text>
          <Text style={styles.appTagline}>Agent partner app</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.formSheet} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.formInner} keyboardShouldPersistTaps="handled">
          <Text style={styles.formTitle}>Welcome back 👋</Text>
          <Text style={styles.formSub}>Login to start accepting pickups</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mobile number</Text>
            <View style={styles.inputRow}>
              <Phone size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={phone}
                onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, ''))}
                maxLength={10}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputRow}>
              <Lock size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={18} color={colors.textMuted} /> : <Eye size={18} color={colors.textMuted} />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, (isLoading || !isFormValid) && { opacity: 0.5 }]}
            onPress={handleLogin}
            disabled={isLoading || !isFormValid}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[colors.primaryDark, colors.primary]} style={styles.loginBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {isLoading
                ? <><ActivityIndicator color="white" /><Text style={styles.loginBtnText}>Connecting...</Text></>
                : <>
                    <Text style={styles.loginBtnText}>Login</Text>
                    <ChevronRight size={20} color="white" />
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>

          {isLoading && (
            <Text style={{ textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 8, fontWeight: '500' }}>
              Server may take up to 60 seconds on first load...
            </Text>
          )}

          <TouchableOpacity onPress={handleContactSupervisor} activeOpacity={0.7}>
            <Text style={styles.helpText}>Having trouble? Contact your supervisor.</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.card },
  topSection: { height: 280, justifyContent: 'flex-end', paddingBottom: 40 },
  logoArea: { alignItems: 'center', gap: 10 },
  appName: { fontSize: 28, fontWeight: '900', color: 'white', letterSpacing: 0.5 },
  appTagline: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '600', letterSpacing: 1 },
  formSheet: { flex: 1, backgroundColor: colors.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -24 },
  formInner: { padding: 28, paddingTop: 36 },
  formTitle: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, marginBottom: 4 },
  formSub: { fontSize: 14, color: colors.textSecondary, marginBottom: 32, fontWeight: '500' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1.5, borderColor: colors.border },
  input: { fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  loginBtn: { marginTop: 16, borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  loginBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 8 },
  loginBtnText: { fontSize: 16, fontWeight: '900', color: 'white' },
  helpText: { textAlign: 'center', color: colors.textMuted, marginTop: 24, fontWeight: '500', fontSize: 12 },
});
