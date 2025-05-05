export interface GestureData {
  name: string
  landmarks: any[]
  samples: number
  images?: string[]
}

// This is a singleton class to manage gesture models
class ModelManager {
  private gestures: GestureData[] = []
  private signImages: { word: string; url: string }[] = []
  private githubConfig: { owner: string; repo: string; branch: string } | null = null
  private isInitialized = false

  constructor() {
    // Only initialize from localStorage when in browser environment
    if (typeof window !== "undefined") {
      this.loadGitHubConfig()
      this.loadFromLocalStorage()
    }
  }

  // Load GitHub configuration from localStorage
  private loadGitHubConfig() {
    if (typeof window === "undefined") return

    try {
      const config = localStorage.getItem("githubSettings")
      if (config) {
        this.githubConfig = JSON.parse(config)
      }
    } catch (error) {
      console.error("Error loading GitHub config:", error)
    }
  }

  // Initialize GitHub integration
  public initGitHub(config: { owner: string; repo: string; branch: string }) {
    this.githubConfig = config

    if (typeof window !== "undefined") {
      localStorage.setItem("githubSettings", JSON.stringify(config))
    }
  }

  // Add a gesture to the model
  public addGesture(gesture: GestureData) {
    const existingIndex = this.gestures.findIndex((g) => g.name === gesture.name)

    if (existingIndex >= 0) {
      // Update existing gesture
      this.gestures[existingIndex] = {
        ...this.gestures[existingIndex],
        landmarks: [...this.gestures[existingIndex].landmarks, ...gesture.landmarks],
        samples: this.gestures[existingIndex].samples + gesture.samples,
      }
    } else {
      // Add new gesture
      this.gestures.push({
        name: gesture.name,
        landmarks: gesture.landmarks,
        samples: gesture.samples,
      })
    }

    // Save to localStorage
    this.saveToLocalStorage()
  }

  public saveGesture(gesture: GestureData) {
    const existingIndex = this.gestures.findIndex((g) => g.name === gesture.name)

    if (existingIndex >= 0) {
      // Update existing gesture
      this.gestures[existingIndex] = {
        ...this.gestures[existingIndex],
        name: gesture.name,
        landmarks: gesture.landmarks,
        samples: gesture.samples,
        images: gesture.images,
      }
    } else {
      // Add new gesture
      this.gestures.push({
        name: gesture.name,
        landmarks: gesture.landmarks,
        samples: gesture.samples,
        images: gesture.images,
      })
    }

    // Save to localStorage
    this.saveToLocalStorage()
  }

  // Add a sign image
  public addSignImage(word: string, url: string) {
    const existingIndex = this.signImages.findIndex((img) => img.word === word)

    if (existingIndex >= 0) {
      // Update existing image
      this.signImages[existingIndex].url = url
    } else {
      // Add new image
      this.signImages.push({ word, url })
    }

    // Save to localStorage
    this.saveToLocalStorage()
  }

  // Get all gestures
  public getGestures(): GestureData[] {
    return this.gestures
  }

  public getGesture(name: string): GestureData | undefined {
    return this.gestures.find((g) => g.name === name)
  }

  public getAllGestures(): GestureData[] {
    return this.gestures
  }

  // Get all sign images
  public getSignImages() {
    return this.signImages
  }

  // Save model to localStorage
  public saveToLocalStorage() {
    if (typeof window === "undefined") return false

    try {
      localStorage.setItem("gestureModel", JSON.stringify(this.gestures))
      localStorage.setItem("signImages", JSON.stringify(this.signImages))
      return true
    } catch (error) {
      console.error("Error saving to localStorage:", error)
      return false
    }
  }

  // Load model from localStorage
  public loadFromLocalStorage() {
    if (typeof window === "undefined") return false

    try {
      const gestureData = localStorage.getItem("gestureModel")
      const imageData = localStorage.getItem("signImages")

      if (gestureData) {
        this.gestures = JSON.parse(gestureData)
      }

      if (imageData) {
        this.signImages = JSON.parse(imageData)
      }

      this.isInitialized = true
      return true
    } catch (error) {
      console.error("Error loading from localStorage:", error)
      return false
    }
  }

  // Save model to GitHub
  public async saveToGitHub() {
    if (typeof window === "undefined") return false
    if (!this.githubConfig) return false

    try {
      // In a real implementation, we would use the GitHub API
      // For now, we'll just simulate success
      console.log("Saving to GitHub:", this.githubConfig)

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      return true
    } catch (error) {
      console.error("Error saving to GitHub:", error)
      return false
    }
  }

  // Load model from GitHub
  public async loadFromGitHub() {
    if (typeof window === "undefined") return false
    if (!this.githubConfig) return false

    try {
      // In a real implementation, we would use the GitHub API
      // For now, we'll just simulate success
      console.log("Loading from GitHub:", this.githubConfig)

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // For demo purposes, we'll just load from localStorage
      return this.loadFromLocalStorage()
    } catch (error) {
      console.error("Error loading from GitHub:", error)
      return false
    }
  }

  // Clear all data
  public clearAll() {
    if (typeof window === "undefined") return false

    this.gestures = []
    this.signImages = []

    try {
      localStorage.removeItem("gestureModel")
      localStorage.removeItem("signImages")
      return true
    } catch (error) {
      console.error("Error clearing data:", error)
      return false
    }
  }

  public getConsolidatedModel() {
    return {
      gestures: this.getGestures(),
      metadata: {
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    }
  }

  public async consolidateModels(): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 1000)
    })
  }
}

// Create a singleton instance
export const modelManager = new ModelManager()
