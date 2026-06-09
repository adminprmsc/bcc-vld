import { users_role } from '@prisma/client';
import { roleEnumToApi } from '../../common/utils/role.util';

export interface UserResponse {
  id: bigint | number | string;
  numericId: number | null;
  name: string;
  email: string;
  role: string;
  gender: string;
  cnic: string;
  cnicExpiry: string;
  address: string;
  dob: string;
  phone: string;
  activeStatus: string;
}

type UserLike = {
  id: bigint;
  simple_id?: number | null;
  name: string;
  email: string;
  role: users_role;
  gender?: string | null;
  cnic?: string | null;
  cnic_expiry?: string | null;
  address?: string | null;
  dob?: string | null;
  phone?: string | null;
  active_status?: string | null;
};

export function toUserResponse(user: UserLike): UserResponse {
  return {
    id: user.id,
    numericId: user.simple_id ?? null,
    name: user.name,
    email: user.email,
    role: roleEnumToApi(user.role),
    gender: user.gender || '',
    cnic: user.cnic || '',
    cnicExpiry: user.cnic_expiry || '',
    address: user.address || '',
    dob: user.dob || '',
    phone: user.phone || '',
    activeStatus: user.active_status || '',
  };
}
