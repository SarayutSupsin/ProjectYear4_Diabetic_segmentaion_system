export type UserRole = "patient" | "nurse" | "admin";

export interface User {
  id: number;
  username: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}