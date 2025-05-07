"use client"

import { useEffect, useState } from "react"
import { LSTMGestureTrainer } from "./lstm-gesture-trainer"

export function LSTMGestureTrainerClient() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading gesture trainer...</p>
        </div>
      </div>
    )
  }

  return <LSTMGestureTrainer />
}
