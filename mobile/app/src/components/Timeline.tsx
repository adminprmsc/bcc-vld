import { useContext } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ThemeContext } from '../core/theme/themes';
import type { TimelineEntry } from '../core/types';

interface Props {
  title: string;
  entries: TimelineEntry[];
}

export default function Timeline({ title, entries }: Props) {
  const theme = useContext(ThemeContext);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      <FlatList
        data={entries}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
            <View style={styles.details}>
              <Text style={[styles.entryTitle, { color: theme.colors.text }]}>{item.title}</Text>
              {item.description ? (
                <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{item.description}</Text>
              ) : null}
            </View>
            <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>{item.timestamp}</Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={{ color: theme.colors.textSecondary }}>No recent activity yet.</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    gap: 12
  },
  title: {
    fontSize: 18,
    fontWeight: '600'
  },
  separator: {
    height: 1,
    marginVertical: 12
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  details: {
    flex: 1,
    gap: 4
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '500'
  },
  meta: {
    fontSize: 13
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '500'
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center'
  }
});
