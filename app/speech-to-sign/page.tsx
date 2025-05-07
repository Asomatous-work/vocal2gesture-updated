"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function SpeechToSignRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/enhanced-speech-to-sign")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-muted-foreground">Redirecting to Enhanced Speech to Sign...</p>
      </div>
    </div>
  )
}
