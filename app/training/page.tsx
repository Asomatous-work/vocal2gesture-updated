import { LSTMGestureTrainer } from "@/components/lstm-gesture-trainer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Gesture Training | Vocal2Gestures",
  description: "Train custom hand gestures using LSTM neural networks for improved sign language recognition",
}

export default function TrainingPage() {
  return <LSTMGestureTrainer />
}
