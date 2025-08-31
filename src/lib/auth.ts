import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions, Session } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import EmailProvider from "next-auth/providers/email";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "database" },
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
      maxAge: 24 * 60 * 60,
      async sendVerificationRequest({ url, identifier, provider }) {
        // Dev fallback: log link if no SMTP
        if (!provider.server) {
          console.log(`Login link for ${identifier}: ${url}`);
          return;
        }
        // Default behavior uses provider.server via nodemailer
        const { createTransport } = await import("nodemailer");
        const transport = createTransport(provider.server);
        await transport.sendMail({
          to: identifier,
          from: provider.from,
          subject: "Your sign-in link",
          text: `Sign in: ${url}`,
          html: `<p>Sign in:</p><p><a href="${url}">${url}</a></p>`,
        });
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })]
      : []),
  ],
  pages: {},
  callbacks: {
    session: async ({ session, user }) => {
      // augment session.user with id when available
      if (session.user && user?.id) {
        (session.user as Session["user"] & { id?: string }).id = user.id;
      }
      return session;
    },
  },
};
