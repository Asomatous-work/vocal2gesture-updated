"use client"

import dynamic from "next/dynamic"

// Use dynamic import with ssr: false to prevent the component from being rendered during build
const LSTMGestureTrainerClient = dynamic(
  () => import("@/components/lstm-gesture-trainer-client").then((mod) => mod.LSTMGestureTrainerClient),
  { ssr: false },
)

export function TrainingClient() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Gesture Training</h1>
      <LSTMGestureTrainerClient />
    </div>
  )
}
