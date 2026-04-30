import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../users/user.entity';

export interface OrgUserPayload {
  userId: string;
  organizationId: string;
  role: UserRole;
  email: string;
}

export const OrgUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OrgUserPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: OrgUserPayload }>();
    return request.user;
  },
);

