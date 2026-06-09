import { users_role } from '@prisma/client';
export declare function roleEnumToApi(role: users_role | string | null | undefined): string;
export declare function roleApiToEnum(role: string): users_role;
