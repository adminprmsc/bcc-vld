import type { UserRole } from '../core/types';

export interface RoleMetadata {
  role: UserRole;
  label: string;
  description: string;
  homeLabel: string;
  homeIcon: string;
  accentColor: string;
  demoName: string;
  demoEmail: string;
}

export const roleMetadata: Record<UserRole, RoleMetadata> = {
  'ra-environment': {
    role: 'ra-environment',
    label: 'RA Environment',
    description: 'Monitor assets, flag critical issues, and initiate requisitions.',
    homeLabel: 'Dashboard',
    homeIcon: 'home',
    accentColor: '#2563EB',
    demoName: 'Rida Abbas',
    demoEmail: 'ra.environment@demo.prmsc'
  },
  'bcc-officer': {
    role: 'bcc-officer',
    label: 'BCC Officer',
    description: 'Manage outreach programs and land requisition progress.',
    homeLabel: 'Outreach',
    homeIcon: 'megaphone-outline',
    accentColor: '#F97316',
    demoName: 'Bilal Communication',
    demoEmail: 'bcc.officer@demo.prmsc'
  },
  'pcrwr-sampler': {
    role: 'pcrwr-sampler',
    label: 'PCRWR Sampler',
    description: 'Execute sampling assignments and manage field queues.',
    homeLabel: 'Assignments',
    homeIcon: 'water-outline',
    accentColor: '#0EA5E9',
    demoName: 'Safeena Sampler',
    demoEmail: 'sampler@demo.prmsc'
  },
  'pcrwr-lab': {
    role: 'pcrwr-lab',
    label: 'PCRWR Lab Technician',
    description: 'Capture lab results and validate quality scores.',
    homeLabel: 'Lab Desk',
    homeIcon: 'flask-outline',
    accentColor: '#14B8A6',
    demoName: 'Labib Analyst',
    demoEmail: 'lab.tech@demo.prmsc'
  },
  tm: {
    role: 'tm',
    label: 'Tehsil Manager',
    description: 'Oversee maintenance plans and tehsil operations.',
    homeLabel: 'TM Desk',
    homeIcon: 'construct-outline',
    accentColor: '#22C55E',
    demoName: 'Talha Manager',
    demoEmail: 'tm@demo.prmsc'
  },
  dm: {
    role: 'dm',
    label: 'District Manager',
    description: 'Supervise requisitions, escalations, and multi-role assignments.',
    homeLabel: 'District HQ',
    homeIcon: 'podium-outline',
    accentColor: '#8B5CF6',
    demoName: 'Dania Overseer',
    demoEmail: 'dm@demo.prmsc'
  }
};

export function getRoleMetadata(role: UserRole): RoleMetadata {
  return roleMetadata[role];
}

