import { users_role } from '@prisma/client';
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
export declare function toUserResponse(user: UserLike): UserResponse;
export {};
