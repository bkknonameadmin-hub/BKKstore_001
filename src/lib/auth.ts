import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import NaverProvider from "next-auth/providers/naver";
import KakaoProvider from "next-auth/providers/kakao";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isLoginBlocked, logLoginAttempt, getClientInfo } from "@/lib/security";

const SIGNUP_BONUS_POINT = 1000;

const providers: NextAuthOptions["providers"] = [
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

      const blocked = await isLoginBlocked(email, ip);
      if (blocked.blocked) {
        await logLoginAttempt({ email, userId: null, success: false, reason: "rate_limited", ip, userAgent });
        throw new Error("로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.");
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) {
        // 패스워드 없음 = 소셜 가입 회원
        await logLoginAttempt({ email, userId: user?.id || null, success: false, reason: user ? "no_password" : "no_user", ip, userAgent });
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
];

// 네이버 OAuth (선택적)
if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
  providers.push(NaverProvider({
    clientId: process.env.NAVER_CLIENT_ID,
    clientSecret: process.env.NAVER_CLIENT_SECRET,
  }));
}

// 카카오 OAuth (선택적)
if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
  providers.push(KakaoProvider({
    clientId: process.env.KAKAO_CLIENT_ID,
    clientSecret: process.env.KAKAO_CLIENT_SECRET,
  }));
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
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
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      // OAuth 신규 가입자에게 가입 축하 적립금 지급
      // 이미 등록된 회원이면 동일 이메일을 OAuth와 자동 연결 (Adapter가 처리)
      if (account && account.provider !== "credentials" && user.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } });
        if (!existing) {
          // PrismaAdapter가 곧 User를 생성할 텐데, 적립금은 createdEvent 에서 처리
          return true;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.id = (user as any).id;
      // 매 요청마다 DB 조회는 부담이지만, 처음 로그인시 user.id 가 셋팅되도록 보장
      if (!token.id && token.email) {
        const u = await prisma.user.findUnique({ where: { email: token.email as string } });
        if (u) token.id = u.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) (session.user as any).id = token.id;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // OAuth 가입자에게도 가입 축하 적립금 지급
      if (!user.id) return;
      try {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: { pointBalance: { increment: SIGNUP_BONUS_POINT } },
          }),
          prisma.pointHistory.create({
            data: {
              userId: user.id,
              amount: SIGNUP_BONUS_POINT,
              reason: "회원가입 축하 (소셜)",
            },
          }),
        ]);
      } catch (e) {
        console.error("signup bonus error", e);
      }
    },
    async signIn({ user, account }) {
      // Credentials 는 authorize() 에서 이미 기록 → OAuth 로그인만 여기서 기록
      if (!account || account.provider === "credentials") return;
      const { ip, userAgent } = getClientInfo();
      if (user.email) {
        await logLoginAttempt({
          email: user.email,
          userId: user.id || null,
          success: true,
          reason: `oauth:${account.provider}`,
          ip, userAgent,
        });
      }
    },
  },
};
