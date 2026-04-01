export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: 'admin' | 'customer';
}
