import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/calendar.events",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (process.env.NODE_ENV === "development") {
        console.log("🔐 [NextAuth] signIn callback", {
          userId: user.id,
          email: user.email,
          accountProvider: account?.provider,
          accountType: account?.type,
          profileEmail: profile?.email,
        });
      }
      return true;
    },
    async session({ session, user, trigger }) {
      if (process.env.NODE_ENV === "development") {
        console.log("📝 [NextAuth] session callback", {
          trigger,
          sessionUser: session.user,
          dbUser: user ? { id: user.id, email: user.email } : null,
        });
      }

      if (session.user && user) {
        session.user.id = user.id;

        // Get the user's Google account to include access token AND refresh token
        const account = await prisma.account.findFirst({
          where: {
            userId: user.id,
            provider: "google",
          },
        });

        if (account?.access_token) {
          (session as any).accessToken = account.access_token;
          (session as any).refreshToken = account.refresh_token;
          (session as any).expiresAt = account.expires_at;
        }
      }

      return session;
    },
    async jwt({ token, user }) {
      if (process.env.NODE_ENV === "development") {
        console.log("🎫 [NextAuth] jwt callback", {
          hasUser: !!user,
          tokenSub: token.sub,
          tokenEmail: token.email,
        });
      }
      return token;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (process.env.NODE_ENV === "development") {
        // Check if user was created in database
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            accounts: true,
            sessions: true,
          },
        });

        console.log("✅ [NextAuth] signIn event", {
          userId: user.id,
          email: user.email,
          accountProvider: account?.provider,
          hasDbUser: !!dbUser,
          accounts: dbUser?.accounts.length || 0,
          sessions: dbUser?.sessions.length || 0,
        });
      }
    },
    async session({ session }) {
      if (process.env.NODE_ENV === "development") {
        console.log("🔄 [NextAuth] session event", {
          sessionUser: session.user,
        });
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "database",
  },
  debug: process.env.NODE_ENV === "development",
};
