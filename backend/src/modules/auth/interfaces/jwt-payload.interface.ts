import { AppRole } from '../auth-role.utils';

export interface JwtPayload {
  sub: string;
  email: string;
  role: AppRole;
}
