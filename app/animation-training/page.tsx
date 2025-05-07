"use client"

import { AnimationTrainer } from "@/components/animation-trainer"
import { BackButton } from "@/components/back-button"

export default function AnimationTrainingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <BackButton />
      </div>
      <AnimationTrainer />
    </div>
  )
}
