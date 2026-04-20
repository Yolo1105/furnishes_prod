import NextAuth, { type DefaultSession } from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import * as bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/eva/db";
import { getAuthSecret } from "@/lib/auth/auth-secret";
import { logSecurityEvent } from "@/lib/eva/core/security-logger";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
    } & DefaultSession["user"];
  }
}

const CredentialsSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

type JwtToken = {
  id?: string;
  role?: string;
  sv?: number;
  sub?: string;
  exp?: number;
};

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const parsed = CredentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;
      const user = await prisma.user.findUnique({
        where: { email },
      });
      const dbUser = user as { password?: string | null } | null;
      if (!user || !dbUser?.password) {
        await bcrypt.compare(
          password,
          "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.GF.GhK5mGIkJQO",
        );
        logSecurityEvent({
          type: "auth_failure",
          details: "login_failed_unknown_user",
        });
        return null;
      }
      const ok = await bcrypt.compare(password, dbUser.password);
      if (!ok) {
        logSecurityEvent({
          type: "auth_failure",
          userId: user.id,
          details: "login_failed_bad_password",
        });
        return null;
      }
      return {
        id: user.id,
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        image: user.image ?? undefined,
      };
    },
  }),
];

if (
  process.env.GOOGLE_CLIENT_ID?.trim() &&
  process.env.GOOGLE_CLIENT_SECRET?.trim()
) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID.trim(),
      clientSecret: process.env.GOOGLE_CLIENT_SECRET.trim(),
      allowDangerousEmailAccountLinking: false,
    }),
  );
}

export const authConfig = {
  secret: getAuthSecret(),
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      const t = token as JwtToken;
      const uid = (user?.id as string) || t.id || t.sub;
      if (user && uid) {
        const dbUser = await prisma.user.findUnique({
          where: { id: uid },
          select: { role: true, sessionVersion: true },
        });
        if (!dbUser) {
          return { ...token, exp: Math.floor(Date.now() / 1000) - 60 };
        }
        t.id = uid;
        t.role = dbUser.role != null ? String(dbUser.role) : "user";
        t.sv = dbUser.sessionVersion;
        return token;
      }
      if (uid && !user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: uid },
          select: { sessionVersion: true },
        });
        if (!dbUser) {
          return { ...token, exp: Math.floor(Date.now() / 1000) - 60 };
        }
        if (t.sv === undefined) {
          t.sv = dbUser.sessionVersion;
        } else if (t.sv !== dbUser.sessionVersion) {
          return { ...token, exp: Math.floor(Date.now() / 1000) - 60 };
        }
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as JwtToken;
      if (session.user) {
        session.user.id = t.id ?? token.sub ?? "";
        session.user.role = t.role ?? "user";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export class UnauthorizedError extends Error {
  constructor(msg = "Not signed in") {
    super(msg);
    this.name = "UnauthorizedError";
  }
}

export async function getUser(): Promise<{
  userId: string;
  email: string;
} | null> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) return null;
    return { userId: session.user.id, email: session.user.email };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<{
  userId: string;
  email: string;
}> {
  const u = await getUser();
  if (!u) throw new UnauthorizedError();
  return u;
}

/** Clears adapter-backed sessions (OAuth / DB session rows). JWT invalidation uses sessionVersion. */
export async function invalidateAllSessions(userId: string): Promise<number> {
  const result = await prisma.session.deleteMany({ where: { userId } });
  return result.count;
}
