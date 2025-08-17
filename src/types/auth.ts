export enum OTPType {
  VERIFICATION = 'VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  LOGIN = 'LOGIN'
}

export interface UserInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePhoto?: string;
  role?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  bio?: string;
  isactive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  message?: string;
  userInfo?: UserInfo;
  channels: string[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  bio?: string;
}

export interface OTPInput {
  email: string;
  phone?: string;
  type?: OTPType;
}

export interface VerifyOTPInput {
  email: string;
  otpCode: string;
  type?: OTPType;
}

export interface ResetPasswordInput {
  email: string;
  otpCode: string;
  newPassword: string;
  confirmPassword: string;
}

export interface LogoutInput {
  token: string;
  refreshToken?: string;
}
