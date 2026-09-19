import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { OtpInput } from '../components/ui/OtpInput';
import { authApiService } from '../services/authApiService';
import { useAuth } from '../context/AuthContext';
import { spacing, borderRadius } from '../theme/spacing';

export interface RegisterModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccessReturnLogin: (notice?: string) => void;
}

export type SignupRoleType =
  | 'PASSENGER'
  | 'SELF_DRIVER'
  | 'GARAGE_DRIVER'
  | 'GARAGE_OWNER';

type RegisterStep = 'FORM' | 'VERIFY_OTP' | 'COMPLETED';

export const RegisterModal: React.FC<RegisterModalProps> = ({
  visible,
  onClose,
  onSuccessReturnLogin,
}) => {
  const { colors } = useTheme();
  const { login } = useAuth();

  const [selectedRole, setSelectedRole] = useState<SignupRoleType>('PASSENGER');
  const [step, setStep] = useState<RegisterStep>('FORM');

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nidNumber, setNidNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nidFrontDocumentRef, setNidFrontDocumentRef] = useState('');
  const [nidBackDocumentRef, setNidBackDocumentRef] = useState('');
  const [city, setCity] = useState('Dhaka');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');

  // Garage Owner specific fields
  const [garageName, setGarageName] = useState('');
  const [garageAddress, setGarageAddress] = useState('');
  const [garageCapacity, setGarageCapacity] = useState('10');

  // Identity Confirmation Pre-submission Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);

  // OTP State
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(60);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [completedStatus, setCompletedStatus] = useState<'ACTIVE' | 'PENDING'>('ACTIVE');

  const handleResetForm = () => {
    setStep('FORM');
    setSelectedRole('PASSENGER');
    setName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setNidNumber('');
    setDateOfBirth('');
    setNidFrontDocumentRef('');
    setNidBackDocumentRef('');
    setCity('Dhaka');
    setArea('');
    setAddress('');
    setGarageName('');
    setGarageAddress('');
    setGarageCapacity('10');
    setOtp('');
    setShowConfirmModal(false);
    setConfirmCheckbox(false);
    setErrorMsg(null);
    setNoticeMsg(null);
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  // Helper for document file selection (Web)
  const handleSelectDoc = (type: 'FRONT' | 'BACK') => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const res = ev.target?.result as string;
          if (type === 'FRONT') setNidFrontDocumentRef(res);
          else setNidBackDocumentRef(res);
        };
        reader.readAsDataURL(file);
      };
      input.click();
    }
  };

  // Validate form before opening identity confirmation or submitting
  const validateForm = (): boolean => {
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter your full legal name.');
      return false;
    }

    if (!phone.trim() || phone.trim().length < 10) {
      setErrorMsg('Please enter a valid mobile phone number.');
      return false;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return false;
    }

    if (!password || password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return false;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Password and confirm password do not match.');
      return false;
    }

    // NID & DOB Validation for Drivers & Garage Owners
    if (selectedRole !== 'PASSENGER') {
      if (!nidNumber.trim()) {
        setErrorMsg('NID number is mandatory for Driver and Garage Owner registration.');
        return false;
      }
      if (!dateOfBirth.trim()) {
        setErrorMsg('Date of birth is mandatory for Driver and Garage Owner registration.');
        return false;
      }
    }

    // Garage details validation for Garage Owner
    if (selectedRole === 'GARAGE_OWNER' && !garageName.trim()) {
      setErrorMsg('Please enter your Rickshaw Garage Name.');
      return false;
    }

    return true;
  };

  // Clicked "Send Email Verification OTP"
  const handleInitiateOtpRequest = () => {
    if (!validateForm()) return;

    if (selectedRole !== 'PASSENGER') {
      setShowConfirmModal(true);
    } else {
      executeRequestOtp();
    }
  };

  // Step 1: Submit Form & Request Email Verification OTP
  const executeRequestOtp = async () => {
    setShowConfirmModal(false);
    const targetRole =
      selectedRole === 'GARAGE_OWNER'
        ? 'GARAGE_OWNER'
        : selectedRole === 'PASSENGER'
        ? 'PASSENGER'
        : 'DRIVER';

    setLoading(true);
    const res = await authApiService.requestRegisterOtp(email.trim(), phone.trim(), targetRole);
    setLoading(false);

    if (res.success) {
      setCooldown(res.cooldownSeconds || 60);
      setNoticeMsg(`Email verification OTP sent to ${email.trim()}.`);
      setStep('VERIFY_OTP');
    } else {
      setErrorMsg(res.error || 'Failed to dispatch registration OTP.');
    }
  };

  // Resend Registration OTP
  const handleResendOtp = async () => {
    setErrorMsg(null);
    const targetRole =
      selectedRole === 'GARAGE_OWNER'
        ? 'GARAGE_OWNER'
        : selectedRole === 'PASSENGER'
        ? 'PASSENGER'
        : 'DRIVER';

    setLoadingResend(true);
    const res = await authApiService.requestRegisterOtp(email.trim(), phone.trim(), targetRole);
    setLoadingResend(false);

    if (res.success) {
      setCooldown(res.cooldownSeconds || 60);
      setNoticeMsg(`A new OTP code has been sent to ${email.trim()}.`);
    } else {
      setErrorMsg(res.error || 'Failed to resend OTP.');
    }
  };

  // Step 2: Verify OTP & Complete Account Creation
  const handleVerifyAndCreateAccount = async (codeToVerify?: string) => {
    setErrorMsg(null);
    const targetOtp = codeToVerify || otp;

    if (!targetOtp || targetOtp.length !== 6) {
      setErrorMsg('Please enter the full 6-digit verification code.');
      return;
    }

    let role = 'PASSENGER';
    let driverMode: 'GARAGE_REGISTERED' | 'SELF_OWNED' | undefined;

    if (selectedRole === 'GARAGE_OWNER') {
      role = 'GARAGE_OWNER';
    } else if (selectedRole === 'GARAGE_DRIVER') {
      role = 'DRIVER';
      driverMode = 'GARAGE_REGISTERED';
    } else if (selectedRole === 'SELF_DRIVER') {
      role = 'DRIVER';
      driverMode = 'SELF_OWNED';
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      password,
      role,
      driverMode,
      nidNumber: nidNumber.trim() || undefined,
      dateOfBirth: dateOfBirth.trim() || undefined,
      nidFrontDocumentRef: nidFrontDocumentRef || undefined,
      nidBackDocumentRef: nidBackDocumentRef || undefined,
      city,
      area: area.trim() || undefined,
      address: address.trim() || undefined,
      garageName: garageName.trim() || undefined,
      garageAddress: garageAddress.trim() || undefined,
      garageCapacity: Number(garageCapacity) || 10,
      otp: targetOtp,
    };

    setLoading(true);
    const res = await authApiService.verifyAndRegister(payload);
    setLoading(false);

    if (res.success) {
      setCompletedStatus(res.accountStatus === 'PENDING' ? 'PENDING' : 'ACTIVE');
      setStep('COMPLETED');

      if (res.accountStatus === 'ACTIVE') {
        login(email.trim(), password);
      }
    } else {
      setErrorMsg(res.error || 'Failed to complete registration.');
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        onClose={handleClose}
        title={
          step === 'COMPLETED'
            ? 'Registration Submitted'
            : step === 'VERIFY_OTP'
            ? 'Verify Email OTP'
            : 'Create RIK-RIDE Account'
        }
      >
        <ScrollView contentContainerStyle={styles.modalContent}>
          {errorMsg && (
            <View style={[styles.alertBanner, { backgroundColor: colors.dangerSurface, borderColor: colors.danger }]}>
              <Icon name="alert-triangle" size={16} color={colors.danger} />
              <Text style={[styles.alertText, { color: colors.danger }]}>{errorMsg}</Text>
            </View>
          )}

          {noticeMsg && step !== 'COMPLETED' && (
            <View style={[styles.alertBanner, { backgroundColor: colors.infoSurface, borderColor: colors.info }]}>
              <Icon name="info" size={16} color={colors.info} />
              <Text style={[styles.alertText, { color: colors.info }]}>{noticeMsg}</Text>
            </View>
          )}

          {/* STEP 1: REGISTRATION FORM & ROLE SELECTOR */}
          {step === 'FORM' && (
            <View style={styles.formStack}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>Select Account Type</Text>

              {/* Role Selection Chips */}
              <View style={styles.roleGrid}>
                <TouchableOpacity
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor: selectedRole === 'PASSENGER' ? colors.primarySurface : colors.surfaceElevated,
                      borderColor: selectedRole === 'PASSENGER' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedRole('PASSENGER')}
                >
                  <Icon name="user" size={18} color={selectedRole === 'PASSENGER' ? colors.primary : colors.textMuted} />
                  <Text style={[styles.roleTitle, { color: colors.textPrimary }]}>Passenger</Text>
                  <Text style={[styles.roleSub, { color: colors.textMuted }]}>Instant ride requests</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor: selectedRole === 'SELF_DRIVER' ? colors.primarySurface : colors.surfaceElevated,
                      borderColor: selectedRole === 'SELF_DRIVER' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedRole('SELF_DRIVER')}
                >
                  <Icon name="truck" size={18} color={selectedRole === 'SELF_DRIVER' ? colors.primary : colors.textMuted} />
                  <Text style={[styles.roleTitle, { color: colors.textPrimary }]}>Self-Owned Driver</Text>
                  <Text style={[styles.roleSub, { color: colors.textMuted }]}>Independent owner-driver</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor: selectedRole === 'GARAGE_DRIVER' ? colors.primarySurface : colors.surfaceElevated,
                      borderColor: selectedRole === 'GARAGE_DRIVER' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedRole('GARAGE_DRIVER')}
                >
                  <Icon name="user-check" size={18} color={selectedRole === 'GARAGE_DRIVER' ? colors.primary : colors.textMuted} />
                  <Text style={[styles.roleTitle, { color: colors.textPrimary }]}>Garage Driver</Text>
                  <Text style={[styles.roleSub, { color: colors.textMuted }]}>Operate garage rickshaws</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor: selectedRole === 'GARAGE_OWNER' ? colors.primarySurface : colors.surfaceElevated,
                      borderColor: selectedRole === 'GARAGE_OWNER' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedRole('GARAGE_OWNER')}
                >
                  <Icon name="home" size={18} color={selectedRole === 'GARAGE_OWNER' ? colors.primary : colors.textMuted} />
                  <Text style={[styles.roleTitle, { color: colors.textPrimary }]}>Garage Owner</Text>
                  <Text style={[styles.roleSub, { color: colors.textMuted }]}>Manage fleet & drivers</Text>
                </TouchableOpacity>
              </View>

              {/* Account Information Section */}
              <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: spacing.xs }]}>
                Account Credentials
              </Text>

              <Input
                label="Full Legal Name *"
                placeholder="e.g. Anika Rahman"
                value={name}
                onChangeText={setName}
                leftIcon={<Icon name="user" size={16} color={colors.textMuted} />}
                helperText="Must match official NID document exactly"
              />

              <View style={styles.rowTwo}>
                <View style={styles.flexOne}>
                  <Input
                    label="Mobile Phone Number *"
                    placeholder="e.g. 01700000000"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    leftIcon={<Icon name="phone" size={16} color={colors.textMuted} />}
                  />
                </View>
                <View style={styles.flexOne}>
                  <Input
                    label="Email Address (For OTP) *"
                    placeholder="user@example.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    leftIcon={<Icon name="mail" size={16} color={colors.textMuted} />}
                  />
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.flexOne}>
                  <Input
                    label="Account Password *"
                    placeholder="Min 8 characters"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    leftIcon={<Icon name="lock" size={16} color={colors.textMuted} />}
                  />
                </View>
                <View style={styles.flexOne}>
                  <Input
                    label="Confirm Password *"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    leftIcon={<Icon name="lock" size={16} color={colors.textMuted} />}
                    rightIcon={
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                        <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} color={colors.primary} />
                      </TouchableOpacity>
                    }
                  />
                </View>
              </View>

              {/* Mandatory NID Field for Drivers and Garage Owners */}
              {selectedRole !== 'PASSENGER' && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: spacing.xs }]}>
                    Identity Verification (Required for {selectedRole === 'GARAGE_OWNER' ? 'Garage Owner' : 'Driver'})
                  </Text>

                  <View style={styles.rowTwo}>
                    <View style={styles.flexOne}>
                      <Input
                        label="National ID (NID) Number *"
                        placeholder="e.g. 19952691234567890"
                        value={nidNumber}
                        onChangeText={setNidNumber}
                        keyboardType="number-pad"
                        leftIcon={<Icon name="file-text" size={16} color={colors.textMuted} />}
                      />
                    </View>
                    <View style={styles.flexOne}>
                      <Input
                        label="Date of Birth (YYYY-MM-DD) *"
                        placeholder="1992-05-14"
                        value={dateOfBirth}
                        onChangeText={setDateOfBirth}
                        leftIcon={<Icon name="calendar" size={16} color={colors.textMuted} />}
                      />
                    </View>
                  </View>

                  {/* NID Document Attachment Inputs */}
                  <View style={{ gap: spacing.xs }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                      NID Document Uploads (Front & Back)
                    </Text>
                    <View style={styles.rowTwo}>
                      <TouchableOpacity
                        style={[styles.docUploadBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                        onPress={() => handleSelectDoc('FRONT')}
                      >
                        <Icon name={nidFrontDocumentRef ? 'check-circle' : 'upload'} size={16} color={nidFrontDocumentRef ? colors.success : colors.primary} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textPrimary }}>
                          {nidFrontDocumentRef ? 'NID Front Attached' : 'Upload NID Front'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.docUploadBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                        onPress={() => handleSelectDoc('BACK')}
                      >
                        <Icon name={nidBackDocumentRef ? 'check-circle' : 'upload'} size={16} color={nidBackDocumentRef ? colors.success : colors.primary} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textPrimary }}>
                          {nidBackDocumentRef ? 'NID Back Attached' : 'Upload NID Back'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.rowTwo}>
                    <View style={styles.flexOne}>
                      <Input
                        label="Operating City"
                        value={city}
                        onChangeText={setCity}
                        leftIcon={<Icon name="map-pin" size={16} color={colors.textMuted} />}
                      />
                    </View>
                    <View style={styles.flexOne}>
                      <Input
                        label="Primary Area / Thana"
                        placeholder="e.g. Motijheel / Dhanmondi"
                        value={area}
                        onChangeText={setArea}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Garage Details for Garage Owner Registration */}
              {selectedRole === 'GARAGE_OWNER' && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: spacing.xs }]}>
                    Rickshaw Garage Profile
                  </Text>

                  <Input
                    label="Garage Business Name *"
                    placeholder="e.g. Motijheel Rickshaw Hub"
                    value={garageName}
                    onChangeText={setGarageName}
                    leftIcon={<Icon name="home" size={16} color={colors.textMuted} />}
                  />

                  <Input
                    label="Full Garage Address *"
                    placeholder="e.g. Motijheel Commercial Area, Dhaka 1000"
                    value={garageAddress}
                    onChangeText={setGarageAddress}
                  />

                  <Input
                    label="Estimated Vehicle Capacity"
                    placeholder="10"
                    value={garageCapacity}
                    onChangeText={setGarageCapacity}
                    keyboardType="number-pad"
                  />
                </>
              )}

              <View style={styles.actionRow}>
                <Button title="Cancel" variant="ghost" onPress={handleClose} />
                <Button
                  title="Send Email Verification OTP"
                  variant="primary"
                  loading={loading}
                  icon={<Icon name="send" size={14} color="#FFFFFF" />}
                  onPress={handleInitiateOtpRequest}
                />
              </View>
            </View>
          )}

          {/* STEP 2: VERIFY EMAIL OTP */}
          {step === 'VERIFY_OTP' && (
            <View style={styles.formStack}>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                We sent a 6-digit verification code to <Text style={{ fontWeight: '700', color: colors.primary }}>{email}</Text>. Please enter the OTP to verify your account registration.
              </Text>

              <OtpInput
                value={otp}
                onChangeOtp={setOtp}
                onComplete={(code) => handleVerifyAndCreateAccount(code)}
                onResend={handleResendOtp}
                resendCooldownSeconds={cooldown}
                loadingResend={loadingResend}
                disabled={loading}
              />

              <View style={styles.actionRow}>
                <Button title="Back to Form" variant="ghost" onPress={() => setStep('FORM')} />
                <Button
                  title="Verify & Create Account"
                  variant="primary"
                  loading={loading}
                  icon={<Icon name="check-circle" size={14} color="#FFFFFF" />}
                  onPress={() => handleVerifyAndCreateAccount()}
                />
              </View>
            </View>
          )}

          {/* STEP 3: COMPLETED NOTICE */}
          {step === 'COMPLETED' && (
            <View style={styles.successBox}>
              {completedStatus === 'ACTIVE' ? (
                <>
                  <View style={[styles.successBadge, { backgroundColor: colors.successSurface, borderColor: colors.success }]}>
                    <Icon name="check-circle" size={32} color={colors.success} />
                    <Text style={[styles.successTitle, { color: colors.success }]}>
                      Passenger Account Activated!
                    </Text>
                  </View>
                  <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
                    Your email has been verified and your RIK-RIDE passenger account is ready. You are now logged in!
                  </Text>
                </>
              ) : (
                <>
                  <View style={[styles.successBadge, { backgroundColor: colors.warningSurface, borderColor: colors.warning }]}>
                    <Icon name="clock" size={32} color={colors.warning} />
                    <Text style={[styles.successTitle, { color: colors.warning }]}>
                      Application Pending Operational Approval
                    </Text>
                  </View>
                  <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
                    Your email verification is complete and your {selectedRole === 'GARAGE_OWNER' ? 'Garage Owner' : 'Driver'} application has been submitted to System Administration. Once approved, you can log in to access your portal.
                  </Text>
                </>
              )}

              <Button
                title="Return to Sign In"
                variant="primary"
                size="lg"
                icon={<Icon name="log-in" size={16} color="#FFFFFF" />}
                onPress={() => {
                  handleClose();
                  onSuccessReturnLogin();
                }}
                style={{ width: '100%', marginTop: spacing.sm }}
              />
            </View>
          )}
        </ScrollView>
      </Modal>

      {/* IDENTITY VERIFICATION CONFIRMATION PRE-SUBMISSION MODAL */}
      <Modal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Verify Identity Information Carefully"
      >
        <View style={{ gap: spacing.md, paddingVertical: spacing.xs }}>
          <View style={[styles.alertBanner, { backgroundColor: colors.warningSurface, borderColor: colors.warning }]}>
            <Icon name="alert-triangle" size={20} color={colors.warning} />
            <Text style={[styles.alertText, { color: colors.warning, fontSize: 13 }]}>
              Important Notice for {selectedRole === 'GARAGE_OWNER' ? 'Garage Owner' : 'Driver'} Registration
            </Text>
          </View>

          <Text style={{ fontSize: 13, color: colors.textPrimary, lineHeight: 19 }}>
            Please verify your identity information carefully. Your <Text style={{ fontWeight: '800' }}>Legal Name ({name})</Text>, <Text style={{ fontWeight: '800' }}>Date of Birth ({dateOfBirth})</Text>, and <Text style={{ fontWeight: '800' }}>NID Number ({nidNumber})</Text> must match your official government NID document exactly.
          </Text>

          <Text style={{ fontSize: 13, color: colors.danger, fontWeight: '600', lineHeight: 18 }}>
            If the submitted information does not match your official documents, your application may be rejected by System Administrators and you may be required to submit a new application.
          </Text>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setConfirmCheckbox(!confirmCheckbox)}
          >
            <View
              style={[
                styles.checkboxBox,
                {
                  borderColor: confirmCheckbox ? colors.primary : colors.border,
                  backgroundColor: confirmCheckbox ? colors.primary : 'transparent',
                },
              ]}
            >
              {confirmCheckbox && <Icon name="check" size={12} color="#FFFFFF" />}
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, flex: 1 }}>
              I confirm that my name, date of birth, and NID number match my official documents exactly.
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs }}>
            <Button title="Edit Details" variant="outline" onPress={() => setShowConfirmModal(false)} />
            <Button
              title="Confirm & Request OTP"
              variant="primary"
              disabled={!confirmCheckbox}
              loading={loading}
              icon={<Icon name="send" size={14} color="#FFFFFF" />}
              onPress={executeRequestOtp}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    padding: spacing.xs,
    gap: spacing.md,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs + 2,
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  formStack: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  roleCard: {
    flex: 1,
    minWidth: 140,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    gap: 4,
  },
  roleTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  roleSub: {
    fontSize: 11,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexOne: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  stepSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  successBox: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  successBadge: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    width: '100%',
    gap: spacing.xs,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  successDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  docUploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs + 2,
    marginTop: 4,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
});
