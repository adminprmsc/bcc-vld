import type { ComponentType } from 'react';
import type { UserRole } from '../core/types';
import RaEnvironmentHome from './raEnvironment/HomeScreen';
import BccOfficerHome from './bccOfficer/HomeScreen';
import SamplerHome from './pcrwrSampler/HomeScreen';
import LabHome from './pcrwrLab/HomeScreen';
import TehsilManagerHome from './tehsilManager/HomeScreen';
import DistrictManagerHome from './districtManager/HomeScreen';
import { roleMetadata, type RoleMetadata } from './metadata';

export interface RoleDefinition {
  role: UserRole;
  label: string;
  description: string;
  homeLabel: string;
  homeIcon: string;
  accentColor: string;
  HomeComponent: ComponentType<any>;
  demoName: string;
  demoEmail: string;
}

export const roleDefinitions: Record<UserRole, RoleDefinition> = {
  'ra-environment': attachHomeComponent(roleMetadata['ra-environment'], RaEnvironmentHome),
  'bcc-officer': attachHomeComponent(roleMetadata['bcc-officer'], BccOfficerHome),
  'pcrwr-sampler': attachHomeComponent(roleMetadata['pcrwr-sampler'], SamplerHome),
  'pcrwr-lab': attachHomeComponent(roleMetadata['pcrwr-lab'], LabHome),
  tm: attachHomeComponent(roleMetadata.tm, TehsilManagerHome),
  dm: attachHomeComponent(roleMetadata.dm, DistrictManagerHome)
};

export function getRoleDefinition(role: UserRole): RoleDefinition {
  return roleDefinitions[role];
}

function attachHomeComponent(metadata: RoleMetadata, HomeComponent: ComponentType<any>): RoleDefinition {
  return {
    ...metadata,
    HomeComponent
  };
}
