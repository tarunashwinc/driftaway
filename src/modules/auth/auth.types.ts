export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    phone: string;
    name: string;
    role: string;
  };
  isNewUser: boolean;
}
