import { useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeContext, type Theme } from '../core/theme/themes';

type Tone = 'primary' | 'critical' | 'warning';

interface Props {
  title: string;
  value: string;
  tone?: Tone;
}

export default function MetricCard({ title, value, tone = 'primary' }: Props) {
  const theme = useContext(ThemeContext);
  const badgeColor = getToneColor(theme, tone);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.badge, { backgroundColor: badgeColor }]} />
      <Text style={[styles.value, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.title, { color: theme.colors.textSecondary }]}>{title}</Text>
    </View>
  );
}

function getToneColor(theme: Theme, tone: Tone) {
  switch (tone) {
    case 'critical':
      return theme.colors.critical;
    case 'warning':
      return theme.colors.warning;
    default:
      return theme.colors.primary;
  }
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  badge: {
    width: 28,
    height: 6,
    borderRadius: 3,
    marginBottom: 12
  },
  value: {
    fontSize: 28,
    fontWeight: '700'
  },
  title: {
    fontSize: 14,
    marginTop: 4
  }
});
