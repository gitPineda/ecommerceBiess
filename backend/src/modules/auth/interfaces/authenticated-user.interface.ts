import { AppRole } from '../auth-role.utils';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: AppRole;
}
