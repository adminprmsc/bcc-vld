import { useContext, useMemo, type ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { ThemeContext } from '../../core/theme/themes';
import { useRequisitionDetail } from '../../core/hooks/useRequisitionsData';
import type { RequisitionDetail } from '../../core/types';
import type { RequisitionStackParamList } from '../../navigation/RequisitionNavigator';

export default function RequisitionDetailScreen() {
  const route = useRoute<RouteProp<RequisitionStackParamList, 'RequisitionDetail'>>();
  const theme = useContext(ThemeContext);
  const { requisitionId } = route.params;
  const { detail, isLoading, isFetching, refetch } = useRequisitionDetail(requisitionId);

  const checklistEntries = useMemo(() => buildChecklist(detail), [detail]);
  const acquisition = detail?.landAcquisition;
  const utilization = detail?.landUtilization;

  if (!detail && isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.textSecondary }}>Requisition not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
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
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View style={[styles.statusPill, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.statusText}>{detail.status}</Text>
          </View>
          <Text style={[styles.priority, priorityTone(theme, detail.priority)]}>{detail.priority}</Text>
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>{detail.title}</Text>
        <Text style={{ color: theme.colors.textSecondary }}>{detail.purpose}</Text>
      </View>

      <SectionCard title="Summary" theme={theme}>
        <KeyValue label="Sequence" value={detail.sequenceNumber ? `#${detail.sequenceNumber}` : '—'} />
        <KeyValue label="Required" value={formatDate(detail.requiredDate)} />
        <KeyValue label="Priority" value={detail.priority} />
        <KeyValue label="Tehsil" value={detail.tehsil ?? '—'} />
        <KeyValue label="Assigned To" value={detail.assignedTo?.name ?? 'Unassigned'} />
        <KeyValue label="Requested By" value={detail.requestedBy?.name ?? '—'} />
      </SectionCard>

      <SectionCard title="Location" theme={theme}>
        <KeyValue label="Address" value={detail.location?.address ?? 'Not provided'} />
        <KeyValue
          label="Coordinates"
          value={detail.location?.coordinates ? `${detail.location.coordinates.lat.toFixed(4)}, ${detail.location.coordinates.lng.toFixed(4)}` : '—'}
        />
        <KeyValue label="Land Type" value={detail.landType ?? '—'} />
      </SectionCard>

      {checklistEntries.length ? (
        <SectionCard
          title="Due Diligence"
          subtitle={detail.landType === 'Govt Land' ? 'Government Checklist' : 'Private Land Checklist'}
          theme={theme}
        >
          {checklistEntries.map(entry => (
            <View key={entry.label} style={styles.checklistRow}>
              <Text style={[styles.checklistLabel, { color: theme.colors.text }]}>{entry.label}</Text>
              <Text style={{ color: theme.colors.textSecondary }}>{entry.value}</Text>
            </View>
          ))}
        </SectionCard>
      ) : null}

      {acquisition ? (
        <SectionCard title="Land Acquisition" theme={theme}>
          <KeyValue label="Stage" value={acquisition.status ?? '—'} />
          <KeyValue label="Type" value={acquisition.type ?? '—'} />
          <KeyValue label="Donor" value={acquisition.donor?.fullName ?? '—'} />
          <KeyValue label="Contact" value={acquisition.donor?.contactNumber ?? '—'} />
          <KeyValue label="Khasra" value={acquisition.land?.khasraNumber ?? '—'} />
          <KeyValue label="Area" value={acquisition.land?.area ?? '—'} />
          <KeyValue label="Last Updated" value={formatDate(acquisition.updatedAt)} />
        </SectionCard>
      ) : null}

      {utilization ? (
        <SectionCard title="Land Utilization" theme={theme}>
          <KeyValue label="Phase" value={utilization.overview?.phase ?? '—'} />
          <KeyValue label="Next Milestone" value={utilization.overview?.nextMilestone ?? '—'} />
          <KeyValue label="Structures" value={`${utilization.civilStructures.length}`} />
          <KeyValue label="Machinery" value={`${utilization.machinery.length}`} />
          <KeyValue label="Progress Logs" value={`${utilization.progressUpdates.length}`} />
        </SectionCard>
      ) : null}

      <SectionCard title="Activity Log" theme={theme}>
        {detail.activityLog.length === 0 ? (
          <Text style={{ color: theme.colors.textSecondary }}>No activity recorded yet.</Text>
        ) : (
          detail.activityLog.map(entry => (
            <View key={entry.id} style={styles.logRow}>
              <Text style={[styles.logAction, { color: theme.colors.text }]}>{entry.action}</Text>
              <Text style={{ color: theme.colors.textSecondary }}>{formatDateTime(entry.timestamp)}</Text>
              <Text style={{ color: theme.colors.textSecondary }}>By {entry.user?.name ?? 'Unknown'}</Text>
              {entry.remarks ? (
                <Text style={{ color: theme.colors.textSecondary }}>{entry.remarks}</Text>
              ) : null}
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="Attachments" theme={theme}>
        {renderAttachmentList('Supporting Docs', detail.supportingDocs, theme)}
        {renderAttachmentList('Photos / Files', detail.attachments, theme)}
      </SectionCard>
    </ScrollView>
  );
}

function SectionCard({ title, subtitle, children, theme }: { title: string; subtitle?: string; children: ReactNode; theme: any }) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      {subtitle ? <Text style={{ color: theme.colors.textSecondary }}>{subtitle}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function KeyValue({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.keyValueRow}>
      <Text style={styles.keyLabel}>{label}</Text>
      <Text style={styles.valueText}>{value ?? '—'}</Text>
    </View>
  );
}

function buildChecklist(detail?: RequisitionDetail) {
  if (!detail) {
    return [] as Array<{ label: string; value: string }>;
  }
  const source = detail.landType === 'Govt Land' ? detail.govtLandChecklist : detail.privateLandChecklist;
  if (!source) {
    return [] as Array<{ label: string; value: string }>;
  }
  return Object.entries(source)
    .map(([key, value]) => ({ label: key, value: formatChecklistValue(value) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function formatChecklistValue(value: unknown) {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

function renderAttachmentList(label: string, attachments: string[], theme: any) {
  if (!attachments.length) {
    return (
      <View style={styles.attachmentBlock}>
        <Text style={{ color: theme.colors.textSecondary }}>{label}: None</Text>
      </View>
    );
  }
  return (
    <View style={styles.attachmentBlock}>
      <Text style={[styles.attachmentLabel, { color: theme.colors.text }]}>{label}</Text>
      {attachments.map(name => (
        <Text key={name} style={{ color: theme.colors.textSecondary }}>
          • {name}
        </Text>
      ))}
    </View>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function formatDateTime(value?: string) {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function priorityTone(theme: any, priority: string): TextStyle {
  const base = priority === 'High' ? theme.colors.critical : priority === 'Low' ? theme.colors.textSecondary : theme.colors.text;
  return {
    color: base,
    fontWeight: '600' as TextStyle['fontWeight']
  };
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16
  },
  header: {
    gap: 8
  },
  title: {
    fontSize: 22,
    fontWeight: '600'
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10
  },
  statusText: {
    color: '#fff',
    fontWeight: '600'
  },
  priority: {
    fontSize: 14
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  sectionBody: {
    gap: 8
  },
  keyValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  keyLabel: {
    fontSize: 13,
    color: '#475569'
  },
  valueText: {
    fontSize: 13,
    fontWeight: '500'
  },
  checklistRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0'
  },
  checklistLabel: {
    fontWeight: '600'
  },
  logRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0'
  },
  logAction: {
    fontWeight: '600',
    fontSize: 14
  },
  attachmentBlock: {
    gap: 4
  },
  attachmentLabel: {
    fontWeight: '600'
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
