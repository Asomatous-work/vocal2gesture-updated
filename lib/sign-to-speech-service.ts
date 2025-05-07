/**
 * Service to communicate with the Python backend for sign-to-speech functionality
 */
export class SignToSpeechService {
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
   * Recognize a sign from an image
   * @param imageData Base64 encoded image data
   * @param confidenceThreshold Confidence threshold for recognition
   */
  async recognizeSign(imageData: string, confidenceThreshold = 0.5): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("Python backend is not available")
    }

    const response = await fetch(`${this.baseUrl}/api/sign-to-speech/recognize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: imageData, confidenceThreshold }),
    })

    if (!response.ok) {
      throw new Error(`Failed to recognize sign: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Translate a sign to speech text
   * @param imageData Base64 encoded image data
   * @param confidenceThreshold Confidence threshold for recognition
   */
  async translateSignToSpeech(imageData: string, confidenceThreshold = 0.5): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("Python backend is not available")
    }

    const response = await fetch(`${this.baseUrl}/api/sign-to-speech/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: imageData, confidenceThreshold }),
    })

    if (!response.ok) {
      throw new Error(`Failed to translate sign: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * List all sign language models
   */
  async listModels(): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("Python backend is not available")
    }

    const response = await fetch(`${this.baseUrl}/api/sign-to-speech/models`)

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Load a sign language model
   * @param modelId Model ID
   */
  async loadModel(modelId: string): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("Python backend is not available")
    }

    const response = await fetch(`${this.baseUrl}/api/sign-to-speech/load-model`, {
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
}

// Create a singleton instance
export const signToSpeechService = new SignToSpeechService()
