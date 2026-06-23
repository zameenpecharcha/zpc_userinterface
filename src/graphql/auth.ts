import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      success
      token
      refreshToken
      message
      userInfo {
        id
        firstName
        lastName
        email
        phone
        profilePhoto
        role
        address
        latitude
        longitude
        bio
        isactive
        emailVerified
        phoneVerified
        createdAt
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation CreateUser(
    $firstName: String!
    $lastName: String!
    $email: String!
    $phone: String!
    $password: String!
    $role: String
    $address: String
    $latitude: Float
    $longitude: Float
    $bio: String
  ) {
    createUser(
      firstName: $firstName
      lastName: $lastName
      email: $email
      phone: $phone
      password: $password
      role: $role
      address: $address
      latitude: $latitude
      longitude: $longitude
      bio: $bio
    ) {
      id
      firstName
      lastName
      email
      phone
      profilePhoto
      role
      address
      latitude
      longitude
      bio
      isactive
      emailVerified
      phoneVerified
      createdAt
    }
  }
`;

export const SEND_OTP_MUTATION = gql`
  mutation SendOTP($email: String!, $phone: String, $type: OTPType) {
    sendOtp(email: $email, phone: $phone, type: $type) {
      success
      message
      channels
    }
  }
`;

export const VERIFY_OTP_MUTATION = gql`
  mutation VerifyOTP($email: String!, $otpCode: String!, $type: OTPType) {
    verifyOtp(email: $email, otpCode: $otpCode, type: $type) {
      success
      token
      message
      userInfo {
        id
        firstName
        lastName
        email
        phone
        profilePhoto
        role
        address
        latitude
        longitude
        bio
        isactive
        emailVerified
        phoneVerified
        createdAt
      }
    }
  }
`;

export const FORGOT_PASSWORD_MUTATION = gql`
  mutation ForgotPassword($email: String!, $phone: String) {
    forgotPassword(email: $email, phone: $phone) {
      success
      message
      channels
    }
  }
`;

export const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword(
    $email: String!
    $otpCode: String!
    $newPassword: String!
    $confirmPassword: String!
  ) {
    resetPassword(
      email: $email
      otpCode: $otpCode
      newPassword: $newPassword
      confirmPassword: $confirmPassword
    ) {
      success
      message
      userInfo {
        id
        firstName
        lastName
        email
        phone
        profilePhoto
        role
        address
        latitude
        longitude
        bio
        isactive
        emailVerified
        phoneVerified
        createdAt
      }
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout($token: String!, $refreshToken: String) {
    logout(token: $token, refreshToken: $refreshToken) {
      success
      message
    }
  }
`;
