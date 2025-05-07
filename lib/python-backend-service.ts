/**
 * Service to interact with the Python backend or Vercel API routes
 */
export class PythonBackendService {
  private isAvailable = false
  private useVercelRoutes = true

  constructor() {
    // Check if we're using Vercel API routes or an external Python backend
    this.useVercelRoutes =
      !process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL === "vercel"
    this.checkAvailability()
  }

  /**
   * Check if the backend is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const endpoint = this.useVercelRoutes ? "/api/status" : `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/status`

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        this.isAvailable = true
        console.log("Backend is available")
        return true
      }

      this.isAvailable = false
      console.log("Backend is not available")
      return false
    } catch (error) {
      console.error("Error checking backend availability:", error)
      this.isAvailable = false
      return false
    }
  }

  /**
   * Get the availability status of the backend
   */
  getAvailabilityStatus(): boolean {
    return this.isAvailable
  }

  /**
   * Process hand landmarks for sign language recognition
   */
  async processHandLandmarks(landmarks: any): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("Backend is not available")
    }

    try {
      const endpoint = this.useVercelRoutes
        ? "/api/process-landmarks"
        : `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/process-landmarks`

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ landmarks }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error processing hand landmarks:", error)
      throw error
    }
  }

  /**
   * Train a model with the provided data
   */
  async trainModel(trainingData: any): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("Backend is not available")
    }

    try {
      const endpoint = this.useVercelRoutes
        ? "/api/train-model"
        : `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/train-model`

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(trainingData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error training model:", error)
      throw error
    }
  }

  /**
   * Process video frame for sign language recognition
   */
  async processVideoFrame(imageData: string): Promise<any> {
    if (!this.isAvailable) {
      throw new Error("Backend is not available")
    }

    try {
      const endpoint = this.useVercelRoutes
        ? "/api/process-frame"
        : `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/process-frame`

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageData }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error processing video frame:", error)
      throw error
    }
  }
}

// Create a singleton instance
export const pythonBackendService = new PythonBackendService()
