import type { DefaultSession, DefaultUser } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";
import type { UserRole } from "@prisma/client";

/**
 * NextAuth Session/User/JWT 타입 보강.
 * - `(session.user as any).id` 같은 캐스팅을 제거할 수 있게 한다.
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: UserRole;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: UserRole;
  }
}
