declare module 'otplib' {
  interface AuthenticatorOptions {
    digits?: number;
    step?: number;
    window?: number;
    algorithm?: string;
    encoding?: string;
  }

  interface Authenticator {
    options: AuthenticatorOptions;
    generateSecret(): string;
    generate(secret: string): string;
    verify(options: { token: string; secret: string }): boolean;
    check(token: string, secret: string): boolean;
    keyuri(accountName: string, issuer: string, secret: string): string;
  }

  export const authenticator: Authenticator;
}
