//mock
import type {LoginRequest, LoginResponse,} from "../types/auth";

import { login as mockLogin } from "../api/mock/authMock";

export async function login(
  data: LoginRequest
): Promise<LoginResponse> {

  return await mockLogin(data);
}

//รอdatabase
// import type { LoginRequest, LoginResponse } from "../types/auth";
// import { login as apiLogin } from "../api/auth";

// export async function login(
//   data: LoginRequest
// ): Promise<LoginResponse> {
//   return await apiLogin(data);
// }