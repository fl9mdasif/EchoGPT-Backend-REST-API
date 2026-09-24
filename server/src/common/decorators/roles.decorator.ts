import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../generated/prisma/enums.js';

export const ROLES_KEY = 'roles';

/** Restricts a route to the given roles. Used with RolesGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
