import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { APP_NAME, APP_URL, isIllinoisEmail, normalizeNetid } from "@/lib/constants";

export const auth = betterAuth({
  appName: APP_NAME,
  baseURL: APP_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    APP_URL,
    "https://rentals.flashpointuiuc.com",
    "https://flashpointuiuc.com",
    "http://localhost:3000",
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
    onExistingUserSignUp: async ({ user }) => {
      if (!isIllinoisEmail(user.email)) return;
      await sendEmail({
        to: user.email,
        subject: `${APP_NAME}: you already have an account`,
        text: `Hi ${user.name},\n\nSomeone tried to create a new ${APP_NAME} account with your Illinois email. You already have an account — log in here:\n${APP_URL}/login\n\nForgot your password?\n${APP_URL}/forgot-password\n\nIf this wasn’t you, you can ignore this message.`,
      });
    },
    sendResetPassword: async ({ user, url }) => {
      if (!isIllinoisEmail(user.email)) {
        return;
      }
      await sendEmail({
        to: user.email,
        subject: `${APP_NAME}: reset your password`,
        text: `Hi ${user.name},\n\nReset your password:\n${url}\n\nIf you did not request this, ignore this email.\n\nTip: if you don’t see this message, check your spam or junk folder.`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, token }) => {
      // Point to our confirm page (button click) so mail scanners don't auto-verify via GET.
      const confirmUrl = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
      await sendEmail({
        to: user.email,
        subject: `${APP_NAME}: verify your email`,
        text: `Hi ${user.name},\n\nVerify your Illinois email to activate your account:\n${confirmUrl}\n\nOn that page, click “Verify email” to finish.\n\nDon’t see this message? Check your spam or junk folder — @illinois.edu filters often hide first-time mail.\n\nOnly @illinois.edu accounts are allowed.`,
      });
    },
  },
  user: {
    additionalFields: {
      netid: {
        type: "string",
        required: true,
        input: true,
      },
      isMember: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: true,
      },
      isManager: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isIllinoisEmail(user.email)) {
            throw new Error("Only @illinois.edu emails are allowed");
          }
          const netid = normalizeNetid(String((user as { netid?: string }).netid ?? ""));
          if (!netid || !/^[a-z0-9]+$/.test(netid)) {
            throw new Error("NetID is required (letters and numbers only)");
          }
          const email = user.email.toLowerCase();
          const localPart = email.split("@")[0]?.split("+")[0] ?? "";
          if (netid !== localPart) {
            throw new Error("NetID must match the part before @ in your Illinois email");
          }
          return {
            data: {
              ...user,
              email,
              netid,
            },
          };
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type SessionUser = typeof auth.$Infer.Session.user;
