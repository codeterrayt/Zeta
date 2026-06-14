"use client"

import React, { useState, useEffect, Suspense } from "react"
import { Activity, KeyRound, Loader2, ArrowLeft } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { verifyEmailCode, resendVerificationCode } from "@/actions/auth"
import { toast } from "sonner"

function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailParam = searchParams.get("email") || ""

  const [email, setEmail] = useState(emailParam)
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [emailParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !code) return

    setLoading(true)
    setError("")
    setSuccessMsg("")

    const res = await verifyEmailCode(email, code)
    setLoading(false)

    if (res.success) {
      toast.success("Email verified successfully! Please sign in.")
      router.push("/login?registered=true")
    } else {
      setError(res.error || "Failed to verify email code")
    }
  }

  const handleResend = async () => {
    if (!email) {
      setError("Email address is required to resend verification code.")
      return
    }

    setResending(true)
    setError("")
    setSuccessMsg("")

    const res = await resendVerificationCode(email)
    setResending(false)

    if (res.success) {
      if (res.requiresVerification === false) {
        toast.success("Email auto-verified since SMTP is not configured!")
        router.push("/login")
      } else {
        setSuccessMsg("A new verification code has been sent to your email.")
        toast.success("Verification code resent!")
      }
    } else {
      setError(res.error || "Failed to resend code")
    }
  }

  return (
    <div className="bg-card border border-border py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10">
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 text-center">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-500/10 text-emerald-500 text-sm p-3 rounded-md border border-emerald-500/20 text-center">
            {successMsg}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Email address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!!emailParam}
            placeholder="name@example.com"
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">6-Digit Verification Code</label>
          <input
            type="text"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-center font-bold tracking-widest text-lg focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <KeyRound className="w-4 h-4" />
              Verify Account
            </>
          )}
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row text-sm">
        <button
          onClick={handleResend}
          disabled={resending}
          className="text-primary hover:underline font-medium disabled:opacity-50"
        >
          {resending ? "Resending code..." : "Resend Code"}
        </button>

        <Link href="/login" className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Sign In
        </Link>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-primary">
          <Activity className="w-12 h-12" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
          Verify your Email
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter the verification code sent to your email to activate your account.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-8 bg-card border border-border sm:rounded-xl">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          }
        >
          <VerifyEmailForm />
        </Suspense>
      </div>
    </div>
  )
}
