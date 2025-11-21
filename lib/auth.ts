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
      console.log("🔐 [NextAuth] signIn callback triggered");
      console.log("   User:", { id: user.id, email: user.email, name: user.name });
      console.log("   Account:", { provider: account?.provider, type: account?.type });
      console.log("   Profile:", { email: profile?.email });
      return true;
    },
    async session({ session, user, trigger }) {
      console.log("📝 [NextAuth] session callback triggered");
      console.log("   Session user:", session.user);
      console.log("   Database user:", { id: user?.id, email: user?.email });

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

      console.log("   Final session:", session);
      return session;
    },
    async jwt({ token, user }) {
      console.log("🎫 [NextAuth] jwt callback triggered");
      console.log("   Token:", token);
      console.log("   User:", user);
      return token;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      console.log("✅ [NextAuth] signIn event - User signed in successfully");
      console.log("   User ID:", user.id);
      console.log("   Email:", user.email);

      // Check if user was created in database
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          accounts: true,
          sessions: true,
        },
      });
      console.log("   Database check:", dbUser ? "✅ User found in DB" : "❌ User NOT in DB");
      console.log("   Accounts:", dbUser?.accounts.length || 0);
      console.log("   Sessions:", dbUser?.sessions.length || 0);
    },
    async session({ session }) {
      console.log("🔄 [NextAuth] session event - Session accessed");
      console.log("   Session:", session);
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
