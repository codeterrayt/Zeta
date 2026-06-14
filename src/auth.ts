import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

// Extend next-auth types so session.user contains role and isOwner
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
      isOwner?: boolean
    }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user || !user.password) {
          return null
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValid) return null

        // Email verification check (if SMTP is configured)
        const smtpSettings = await prisma.systemSettings.findUnique({
          where: { id: "system" }
        })
        const isSmtpConfigured = !!(
          smtpSettings &&
          smtpSettings.smtpHost &&
          smtpSettings.smtpPort &&
          smtpSettings.smtpUser &&
          smtpSettings.smtpPass
        )

        if (isSmtpConfigured && !user.emailVerified) {
          throw new Error("EmailNotVerified")
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          isOwner: user.isOwner
        }
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.name = user.name
        token.email = user.email
        token.role = (user as any).role
        token.isOwner = (user as any).isOwner
      } else if (token.sub) {
        try {
          // Fetch fresh role and isOwner from DB on subsequent requests
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true, isOwner: true }
          })
          if (dbUser) {
            token.role = dbUser.role
            token.isOwner = dbUser.isOwner
          }
        } catch (err) {
          console.error("JWT callback user fetch error:", err)
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        session.user.name = token.name ?? session.user.name
        session.user.email = token.email ?? session.user.email
        session.user.role = token.role as string
        session.user.isOwner = token.isOwner as boolean
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
})
