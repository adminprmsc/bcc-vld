export const QueryKeys = {
  dashboard: ['dashboard'] as const,
  tasks: ['tasks'] as const,
  syncStatus: ['sync-status'] as const,
  mapOverlays: ['map', 'overlays'] as const,
  requisitions: ['requisitions'] as const,
  requisitionDetail: (id: string) => ['requisitions', id] as const
};
