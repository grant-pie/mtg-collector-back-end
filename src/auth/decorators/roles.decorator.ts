// src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Role } from '../../user/enums/role.enum';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);