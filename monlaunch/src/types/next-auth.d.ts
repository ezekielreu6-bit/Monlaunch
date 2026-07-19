import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User extends DefaultUser {
    address: string;
  }

  interface Session extends DefaultSession {
    address?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    address?: string;
  }
}