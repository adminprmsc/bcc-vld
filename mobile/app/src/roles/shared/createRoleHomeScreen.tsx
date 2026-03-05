import { useContext } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { ThemeContext } from '../../core/theme/themes';
import { useSessionActions } from '../../core/hooks/useSession';
import { useSessionProfile } from '../../core/hooks/useSession';

interface HighlightCard {
  title: string;
  description: string;
}

interface QuickAction {
  title: string;
  description: string;
}

interface RoleHomeBlueprint {
  title: string;
  subtitle: string;
  highlights: HighlightCard[];
  quickActions?: QuickAction[];
}

export function createRoleHomeScreen({ title, subtitle, highlights, quickActions = [] }: RoleHomeBlueprint) {
  return function RoleHomeScreen() {
    const theme = useContext(ThemeContext);
    const profile = useSessionProfile();
    const { signOut } = useSessionActions();

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.container}
      >
        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          {profile ? (
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Signed in as {profile.name}</Text>
          ) : null}
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Focus Areas</Text>
          <View style={styles.cardGrid}>
            {highlights.map(item => (
              <View
                key={item.title}
                style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.title}</Text>
                <Text style={[styles.cardBody, { color: theme.colors.textSecondary }]}>{item.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {quickActions.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
            <View style={styles.cardStack}>
              {quickActions.map(item => (
                <View
                  key={item.title}
                  style={[styles.quickCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                >
                  <Text style={[styles.quickTitle, { color: theme.colors.text }]}>{item.title}</Text>
                  <Text style={[styles.cardBody, { color: theme.colors.textSecondary }]}>{item.description}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.signOutButton, { borderColor: theme.colors.border }]}
          onPress={() => {
            signOut().catch(error => console.warn('Sign out failed', error));
          }}
        >
          <Text style={[styles.signOutText, { color: theme.colors.textSecondary }]}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 24
  },
  headerBlock: {
    gap: 8
  },
  title: {
    fontSize: 26,
    fontWeight: '700'
  },
  subtitle: {
    fontSize: 14
  },
  section: {
    gap: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  cardGrid: {
    gap: 12
  },
  cardStack: {
    gap: 12
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8
  },
  quickCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600'
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: '600'
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20
  },
  signOutButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '500'
  }
});
