import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isLoginBlocked, logLoginAttempt, getClientInfo } from "@/lib/security";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7일
  },
  pages: { signIn: "/login" },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password) return null;

        const { ip, userAgent } = getClientInfo();

        // 레이트 리밋 체크
        const blocked = await isLoginBlocked(email, ip);
        if (blocked.blocked) {
          await logLoginAttempt({ email, userId: null, success: false, reason: "rate_limited", ip, userAgent });
          throw new Error("로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.");
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await logLoginAttempt({ email, userId: null, success: false, reason: "no_user", ip, userAgent });
          // 보안상 동일한 메시지 반환 (이메일 존재 여부 노출 금지)
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          await logLoginAttempt({ email, userId: user.id, success: false, reason: "wrong_password", ip, userAgent });
          return null;
        }

        await logLoginAttempt({ email, userId: user.id, success: true, ip, userAgent });

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) (session.user as any).id = token.id;
      return session;
    },
  },
};
