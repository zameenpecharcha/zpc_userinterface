import { ApolloClient } from '@apollo/client';
import {
  LOGIN_MUTATION,
  REGISTER_MUTATION,
  SEND_OTP_MUTATION,
  VERIFY_OTP_MUTATION,
  FORGOT_PASSWORD_MUTATION,
  RESET_PASSWORD_MUTATION,
  LOGOUT_MUTATION,
} from '../graphql/auth';
import {
  LoginInput,
  RegisterInput,
  OTPInput,
  VerifyOTPInput,
  ResetPasswordInput,
  LogoutInput,
  AuthResponse,
  UserInfo,
} from '../types/auth';

export class AuthService {
  private client: ApolloClient<any>;

  constructor(client: ApolloClient<any>) {
    this.client = client;
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const { data } = await this.client.mutate({
      mutation: LOGIN_MUTATION,
      variables: input,
    });
    return data.login;
  }

  async register(input: RegisterInput): Promise<UserInfo> {
    const { data } = await this.client.mutate({
      mutation: REGISTER_MUTATION,
      variables: input,
    });
    return data.createUser;
  }

  async sendOTP(input: OTPInput): Promise<AuthResponse> {
    const { data } = await this.client.mutate({
      mutation: SEND_OTP_MUTATION,
      variables: {
        email: input.email,
        phone: input.phone,
        type: input.type,
      },
    });
    return data.sendOtp;
  }

  async verifyOTP(input: VerifyOTPInput): Promise<AuthResponse> {
    const { data } = await this.client.mutate({
      mutation: VERIFY_OTP_MUTATION,
      variables: {
        email: input.email,
        otpCode: input.otpCode,
        type: input.type,
      },
    });
    return data.verifyOtp;
  }

  async forgotPassword(input: OTPInput): Promise<AuthResponse> {
    const { data } = await this.client.mutate({
      mutation: FORGOT_PASSWORD_MUTATION,
      variables: {
        email: input.email,
        phone: input.phone,
      },
    });
    return data.forgotPassword;
  }

  async resetPassword(input: ResetPasswordInput): Promise<AuthResponse> {
    const { data } = await this.client.mutate({
      mutation: RESET_PASSWORD_MUTATION,
      variables: input,
    });
    return data.resetPassword;
  }

  async logout(input: LogoutInput): Promise<AuthResponse> {
    const { data } = await this.client.mutate({
      mutation: LOGOUT_MUTATION,
      variables: input,
    });
    return data.logout;
  }
}
