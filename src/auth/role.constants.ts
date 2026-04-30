import { AdminRole } from '@prisma/client';

export const ROLE = {
  ADMIN: 'ADMIN' as unknown as AdminRole,
  SUPER_ADMIN: 'SUPER_ADMIN' as unknown as AdminRole,
  PRESSER: 'PRESSER' as unknown as AdminRole,
};
