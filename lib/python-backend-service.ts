/**
 * Service to communicate with the Python backend
 */
export class PythonBackendService {
  private baseUrl: string
  private isAvailable = false

  constructor(baseUrl = "http://localhost:5000") {
    this.baseUrl = baseUrl
    this.checkAvailability()
  }

  /**
   * Check if the Python backend is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`)
      if (response.ok) {
        this.isAvailable = true
        return true
      }
      return false
    } catch (error) {
      console.error("Python backend is not available:", error)
      this.isAvailable = false
      return false
    }
  }

  /**
   * Check if the service is available
   */
  getAvailability(): boolean {
    return this.isAvailable
  }

  /**
   * Process a video frame and get hand landmarks
   * @param imageData Base64 encoded image data
   */
  async processFrame(imageData: string): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("Python backend is not available")
    }

    const response = await fetch(`${this.baseUrl}/api/process-frame`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: imageData }),
    })

    if (!response.ok) {
      throw new Error(`Failed to process frame: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Recognize a gesture from landmarks
   * @param landmarks Hand landmarks
   * @param confidenceThreshold Confidence threshold for recognition
   */
  async recognizeGesture(landmarks: any, confidenceThreshold = 0.7): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("Python backend is not available")
    }

    const response = await fetch(`${this.baseUrl}/api/recognize-gesture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ landmarks, confidenceThreshold }),
    })

    if (!response.ok) {
      throw new Error(`Failed to recognize gesture: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Train a new gesture recognition model with advanced options
   * @param gestures Gesture data
   * @param epochs Number of training epochs
   * @param learningRate Learning rate for training
   * @param modelType Type of model to train (lstm or cnn_lstm)
   * @param batchSize Batch size for training
   */
  async trainModel(
    gestures: any[],
    epochs = 100,
    learningRate = 0.001,
    modelType = "cnn_lstm",
    batchSize = 32,
  ): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("Python backend is not available")
    }

    const response = await fetch(`${this.baseUrl}/api/train-model`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gestures,
        epochs,
        learningRate,
        modelType,
        batchSize,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to train model: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Save the current model
   * @param name Model name
   */
  async saveModel(name: string): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("Python backend is not available")
    }

    const response = await fetch(`${this.baseUrl}/api/save-model`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      throw new Error(`Failed to save model: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Load a saved model
   * @param modelId Model ID
   */
  async loadModel(modelId: string): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("Python backend is not available")
    }

    const response = await fetch(`${this.baseUrl}/api/load-model`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ modelId }),
    })

    if (!response.ok) {
      throw new Error(`Failed to load model: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * List all saved models
   */
  async listModels(): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("Python backend is not available")
    }

    const response = await fetch(`${this.baseUrl}/api/list-models`)

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Collect a sample for a gesture
   * @param gestureName Gesture name
   * @param frames Array of frames with landmarks
   */
  async collectSample(gestureName: string, frames: any[]): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("Python backend is not available")
    }

    const response = await fetch(`${this.baseUrl}/api/collect-sample`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gestureName, frames }),
    })

    if (!response.ok) {
      throw new Error(`Failed to collect sample: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Evaluate the current model
   * @param testData Optional test data for evaluation
   */
  async evaluateModel(testData?: any[]): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("Python backend is not available")
    }

    const response = await fetch(`${this.baseUrl}/api/evaluate-model`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ testData }),
    })

    if (!response.ok) {
      throw new Error(`Failed to evaluate model: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get available training options
   */
  async getTrainingOptions(): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("Python backend is not available")
    }

    const response = await fetch(`${this.baseUrl}/api/training-options`)

    if (!response.ok) {
      throw new Error(`Failed to get training options: ${response.statusText}`)
    }

    return response.json()
  }
}

// Create a singleton instance
export const pythonBackendService = new PythonBackendService()
