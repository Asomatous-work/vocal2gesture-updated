import { PageContainer } from "@/components/page-container"
import { BackButton } from "@/components/back-button"
import { AdvancedModelTrainer } from "@/components/advanced-model-trainer"

export default function AdvancedTrainingPage() {
  return (
    <PageContainer>
      <div className="container mx-auto py-8">
        <BackButton href="/training" />

        <h1 className="text-3xl font-bold mb-8 mt-4">Advanced Model Training</h1>

        <div className="mb-6">
          <p className="text-lg mb-4">
            Train high-accuracy sign language recognition models using Python's advanced machine learning capabilities.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Why Use Advanced Training?</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Higher accuracy with CNN-LSTM hybrid models</li>
              <li>Automatic data augmentation to improve generalization</li>
              <li>Advanced training techniques like early stopping and learning rate reduction</li>
              <li>Better performance on complex gestures</li>
              <li>Comprehensive model evaluation tools</li>
            </ul>
          </div>
        </div>

        <AdvancedModelTrainer />

        <div className="mt-8 bg-muted/30 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Getting Started</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Make sure the Python backend is running</li>
            <li>Collect gesture samples using the standard trainer</li>
            <li>Choose a model architecture (CNN-LSTM recommended)</li>
            <li>Adjust training parameters as needed</li>
            <li>Train your model and evaluate its performance</li>
            <li>Save your model for future use</li>
          </ol>
        </div>
      </div>
    </PageContainer>
  )
}
