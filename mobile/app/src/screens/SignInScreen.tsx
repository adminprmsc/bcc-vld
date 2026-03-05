import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemeContext } from '../core/theme/themes';
import { useSessionActions, useSessionError, useSessionStatus } from '../core/hooks/useSession';
import type { Credentials } from '../core/auth/sessionService';

export default function SignInScreen() {
  const theme = useContext(ThemeContext);
  const status = useSessionStatus();
  const error = useSessionError();
  const { signIn } = useSessionActions();
  const [credentials, setCredentials] = useState<Credentials>({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const isAuthenticating = status === 'authenticating';
  const isSubmitDisabled = !credentials.email.trim() || !credentials.password;

  useEffect(() => {
    if (error) {
      Alert.alert('Sign-in error', error);
    }
  }, [error]);

  const handleSubmit = () => {
    if (isSubmitDisabled || isAuthenticating) {
      return;
    }
    signIn({
      email: credentials.email.trim(),
      password: credentials.password
    }).catch(signInError => {
      console.warn('Sign-in action failed', signInError);
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>PRMSC Field Operations</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Sign in with your PRMSC credentials.</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Email</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="name@prmsc.gov.pk"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={credentials.email}
            onChangeText={text => setCredentials(prev => ({ ...prev, email: text }))}
            editable={!isAuthenticating}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Password</Text>
          <View style={[styles.passwordRow, { borderColor: theme.colors.border }]}>
            <TextInput
              style={[styles.passwordInput, { color: theme.colors.text }]}
              placeholder="Enter password"
              placeholderTextColor={theme.colors.textSecondary}
              secureTextEntry={!showPassword}
              value={credentials.password}
              onChangeText={text => setCredentials(prev => ({ ...prev, password: text }))}
              editable={!isAuthenticating}
            />
            <TouchableOpacity onPress={() => setShowPassword(value => !value)} disabled={isAuthenticating}>
              <Text style={{ color: theme.colors.primary }}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.signInButton,
          {
            backgroundColor: isSubmitDisabled ? theme.colors.surface : theme.colors.primary,
            borderColor: theme.colors.border
          }
        ]}
        disabled={isSubmitDisabled || isAuthenticating}
        onPress={handleSubmit}
      >
        {isAuthenticating ? (
          <ActivityIndicator color={theme.colors.surface} />
        ) : (
          <Text
            style={[
              styles.signInText,
              { color: isSubmitDisabled ? theme.colors.textSecondary : theme.colors.surface }
            ]}
          >
            Continue
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
    gap: 24
  },
  header: {
    gap: 8
  },
  title: {
    fontSize: 28,
    fontWeight: '700'
  },
  subtitle: {
    fontSize: 15
  },
  form: {
    gap: 20
  },
  fieldGroup: {
    gap: 8
  },
  label: {
    fontSize: 14
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16
  },
  passwordRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    marginRight: 12
  },
  signInButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1
  },
  signInText: {
    fontSize: 16,
    fontWeight: '600'
  }
});
