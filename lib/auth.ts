import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

async function refreshAccessToken(token: any) {
  try {
    const url = "https://oauth2.googleapis.com/token";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

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
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in - store tokens in JWT
      if (account && user) {
        if (process.env.NODE_ENV === "development") {
          console.log("🎫 [NextAuth] Initial JWT creation", {
            userId: user.id,
            email: user.email,
            hasAccessToken: !!account.access_token,
            hasRefreshToken: !!account.refresh_token,
            expiresAt: account.expires_at,
          });
        }

        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at ? account.expires_at * 1000 : 0,
          userId: user.id,
        };
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.expiresAt as number)) {
        if (process.env.NODE_ENV === "development") {
          const expiresIn = Math.floor(
            ((token.expiresAt as number) - Date.now()) / 1000 / 60
          );
          console.log(
            `🎫 [NextAuth] Token still valid (expires in ${expiresIn} minutes)`
          );
        }
        return token;
      }

      // Access token has expired, try to refresh it
      if (process.env.NODE_ENV === "development") {
        console.log("🔄 [NextAuth] Token expired, refreshing...");
      }
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        (session as any).accessToken = token.accessToken;
        (session as any).refreshToken = token.refreshToken;
        (session as any).expiresAt = token.expiresAt;
        (session as any).error = token.error;

        if (process.env.NODE_ENV === "development") {
          console.log("📝 [NextAuth] Session created", {
            userId: session.user.id,
            email: session.user.email,
            hasAccessToken: !!token.accessToken,
            hasError: !!token.error,
          });
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  debug: process.env.NODE_ENV === "development",
};
