"use client"

import React, { useState, useEffect, Suspense } from "react"
import { Activity, KeyRound, Loader2, CheckCircle2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { resetPassword } from "@/actions/auth"
import { toast } from "sonner"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""
  const token = searchParams.get("token") || ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!email || !token) {
      setError("Invalid or missing password reset token/email parameters in URL.")
    }
  }, [email, token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !token) return

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }

    setLoading(true)
    setError("")

    const res = await resetPassword(email, token, password)
    setLoading(false)

    if (res.success) {
      setSuccess(true)
      toast.success("Password reset successfully!")
    } else {
      setError(res.error || "Failed to reset password. The link may have expired.")
    }
  }

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center text-emerald-500">
          <CheckCircle2 className="w-16 h-16" />
        </div>
        <div className="bg-emerald-500/10 text-emerald-500 text-sm p-4 rounded-md border border-emerald-500/20 font-medium">
          Your password has been reset successfully. You can now sign in with your new password.
        </div>
        <Link
          href="/login"
          className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Go to Sign In
        </Link>
      </div>
    )
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 text-center">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">New Password</label>
        <input
          type="password"
          required
          disabled={!email || !token}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Confirm New Password</label>
        <input
          type="password"
          required
          disabled={!email || !token}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !password || password !== confirmPassword || !email || !token}
        className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Resetting Password...
          </>
        ) : (
          <>
            <KeyRound className="w-4 h-4" />
            Update Password
          </>
        )}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-primary">
          <Activity className="w-12 h-12" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
          Choose a new password
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Please enter and confirm your new Zeta password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card border border-border py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10">
          <Suspense
            fallback={
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
