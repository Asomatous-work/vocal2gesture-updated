import { TrainingClient } from "./training-client"

export const metadata = {
  title: "Gesture Training | Vocal2Gestures",
  description: "Train custom hand gestures using LSTM neural networks for improved sign language recognition",
}

export default function TrainingPage() {
  return <TrainingClient />
}
