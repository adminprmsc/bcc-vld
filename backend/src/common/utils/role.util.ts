import { users_role } from '@prisma/client';

/** Map Prisma enum value to API role string (legacy Sequelize format). */
export function roleEnumToApi(role: users_role | string | null | undefined): string {
  if (!role) {
    return '';
  }
  return role.toString().replace(/_/g, ' ');
}

export function roleApiToEnum(role: string): users_role {
  return role.replace(/ /g, '_') as users_role;
}
