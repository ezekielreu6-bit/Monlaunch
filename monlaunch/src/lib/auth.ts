import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { SiweMessage } from "siwe";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Ethereum",
      credentials: {
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.message || !credentials?.signature) return null;

          const siwe = new SiweMessage(
            JSON.parse(credentials.message)
          );

          const result = await siwe.verify({
            signature: credentials.signature,
            // domain and nonce are validated inside siwe.verify
          });

          if (result.success) {
            return {
              id: siwe.address,
              name: siwe.address,
              address: siwe.address,
            };
          }
          return null;
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = (user as { address: string }).address;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user = {
          ...session.user,
          name: token.sub,
        };
        (session as { address?: string }).address = token.sub;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/",
    error: "/",
  },
};

export const getSession = () => getServerSession(authOptions);
