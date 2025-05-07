"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton-loader"

// Use dynamic import with ssr: false to prevent the component from being rendered during build
const LSTMGestureTrainer = dynamic(
  () => import("@/components/lstm-gesture-trainer").then((mod) => mod.LSTMGestureTrainer),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading gesture trainer...</p>
        </div>
      </div>
    ),
  },
)

export function TrainingClient() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Gesture Training</h1>
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <LSTMGestureTrainer />
      </Suspense>
    </div>
  )
}
