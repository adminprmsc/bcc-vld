import { useContext, useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ThemeContext } from '../core/theme/themes';
import MetricCard from '../components/MetricCard';
import Timeline from '../components/Timeline';
import { useDashboardData } from '../core/hooks/useDashboardData';
import type { DashboardMetric } from '../core/types';

export default function DashboardScreen() {
  const theme = useContext(ThemeContext);
  const { metrics, timeline, generatedAt, isLoading, isFetching, refetch } = useDashboardData();

  const metricRows = useMemo(() => {
    const rows: DashboardMetric[][] = [];
    for (let i = 0; i < metrics.length; i += 2) {
      rows.push(metrics.slice(i, i + 2));
    }
    return rows;
  }, [metrics]);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={() => {
            void refetch();
          }}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View style={styles.headerRow}>
        <Text style={[styles.heading, { color: theme.colors.text }]}>Field Operations Overview</Text>
        {generatedAt ? (
          <Text style={[styles.updated, { color: theme.colors.textSecondary }]}>Updated {new Date(generatedAt).toLocaleTimeString()}</Text>
        ) : null}
      </View>

      {isLoading && metrics.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        metricRows.map((row, index) => (
          <View key={index} style={styles.metricsRow}>
            {row.map(metric => (
              <MetricCard
                key={metric.id}
                title={metric.title}
                value={metric.value.toLocaleString()}
                tone={metric.tone}
              />
            ))}
            {row.length === 1 ? <View style={styles.metricSpacer} /> : null}
          </View>
        ))
      )}

      <Timeline title="Recent Activity" entries={timeline} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 16
  },
  headerRow: {
    gap: 4
  },
  heading: {
    fontSize: 24,
    fontWeight: '600'
  },
  updated: {
    fontSize: 13
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12
  },
  metricSpacer: {
    flex: 1
  },
  loadingState: {
    paddingVertical: 40,
    alignItems: 'center'
  }
});
