import type {
  LoginRequest,
  LoginResponse,
} from "../../types/auth";

import { users } from "../../mock/users";

export async function login(
  data: LoginRequest
): Promise<LoginResponse> {

  // จำลองเวลาเรียก API
  await new Promise((resolve) =>
    setTimeout(resolve, 1000)
  );

  const user = users.find(
    (u) =>
      u.username === data.username &&
      u.password === data.password &&
      u.role === data.role
  );

  if (!user) {
    return {
      success: false,
      message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
    };
  }

  return {
    success: true,
    message: "เข้าสู่ระบบสำเร็จ",
    token: "mock-jwt-token",
    user,
  };
}