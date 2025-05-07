import { SignLanguageTrainerWithPython } from "@/components/sign-language-trainer-with-python"
import { BackButton } from "@/components/back-button"

export default function TrainingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <BackButton />
      </div>

      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Sign Language Training</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Train the system to recognize your custom sign language gestures
        </p>
      </div>

      <SignLanguageTrainerWithPython />
    </div>
  )
}
