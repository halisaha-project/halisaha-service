export interface CreateUserData {
  name: string;
  surname: string;
  username: string;
  email: string;
  passwordHash: string;
  emailVerified?: boolean;
}
