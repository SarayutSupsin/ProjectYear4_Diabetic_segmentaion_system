import type { User } from "./user";

export interface LoginRequest {
  username: string;
  password: string;
  role: "patient" | "nurse" | "admin";
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}