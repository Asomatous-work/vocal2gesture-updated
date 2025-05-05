export interface GestureData {
  name: string
  landmarks: any[]
  samples: number
  images?: string[]
}

// This is a singleton class to manage gesture models
class ModelManager {
  private gestures: GestureData[] = []
  private signImages: { word: string; url: string; id: string }[] = []
  private githubConfig: { owner: string; repo: string; branch: string; token?: string } | null = null
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
  public initGitHub(config: { owner: string; repo: string; branch: string; token?: string }) {
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
        // Preserve existing images if any
        images: [...(this.gestures[existingIndex].images || []), ...(gesture.images || [])],
      }
    } else {
      // Add new gesture
      this.gestures.push({
        name: gesture.name,
        landmarks: gesture.landmarks,
        samples: gesture.samples,
        images: gesture.images || [],
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
        // Merge images arrays, removing duplicates
        images: Array.from(new Set([...(this.gestures[existingIndex].images || []), ...(gesture.images || [])])),
      }
    } else {
      // Add new gesture
      this.gestures.push({
        name: gesture.name,
        landmarks: gesture.landmarks,
        samples: gesture.samples,
        images: gesture.images || [],
      })
    }

    // Save to localStorage
    this.saveToLocalStorage()
  }

  // Add a sign image
  public addSignImage(word: string, url: string, id: string = Date.now().toString()) {
    const existingIndex = this.signImages.findIndex((img) => img.id === id)

    if (existingIndex >= 0) {
      // Update existing image
      this.signImages[existingIndex] = { word, url, id }
    } else {
      // Add new image
      this.signImages.push({ word, url, id })
    }

    // Also add to gesture data for slideshow
    const gestureIndex = this.gestures.findIndex((g) => g.name === word)
    if (gestureIndex >= 0) {
      // Add to existing gesture
      if (!this.gestures[gestureIndex].images) {
        this.gestures[gestureIndex].images = []
      }
      if (!this.gestures[gestureIndex].images.includes(url)) {
        this.gestures[gestureIndex].images.push(url)
      }
    } else {
      // Create new gesture with this image
      this.gestures.push({
        name: word,
        landmarks: [],
        samples: 0,
        images: [url],
      })
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
      const signLanguageImages = localStorage.getItem("signLanguageImages")

      if (gestureData) {
        this.gestures = JSON.parse(gestureData)
      }

      if (imageData) {
        this.signImages = JSON.parse(imageData)
      }

      // Also load from signLanguageImages if available (for backward compatibility)
      if (signLanguageImages) {
        try {
          const parsedImages = JSON.parse(signLanguageImages)
          // Add these images to gestures for slideshow
          for (const image of parsedImages) {
            this.addSignImage(image.word, image.url, image.id)
          }
        } catch (e) {
          console.error("Error parsing signLanguageImages:", e)
        }
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
    if (!this.githubConfig) {
      // Set default GitHub config if not already set
      this.initGitHub({
        owner: "user",
        repo: "vocal2gestures",
        branch: "main",
      })
    }

    try {
      // Prepare data to save
      const data = {
        gestures: this.gestures,
        signImages: this.signImages,
        metadata: {
          timestamp: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        },
      }

      // In a real implementation, we would use the GitHub API
      // For now, we'll just save to localStorage with a GitHub key
      localStorage.setItem("github_backup", JSON.stringify(data))
      console.log("Saved to GitHub (simulated):", this.githubConfig)

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
      // For now, we'll just load from localStorage with a GitHub key
      const githubData = localStorage.getItem("github_backup")

      if (githubData) {
        const data = JSON.parse(githubData)

        if (data.gestures) {
          this.gestures = data.gestures
        }

        if (data.signImages) {
          this.signImages = data.signImages
        }

        // Save to localStorage for consistency
        this.saveToLocalStorage()

        return true
      }

      return false
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
    try {
      // Load any sign language images that might not be in the model manager yet
      const signLanguageImages = localStorage.getItem("signLanguageImages")
      if (signLanguageImages) {
        const parsedImages = JSON.parse(signLanguageImages)
        for (const image of parsedImages) {
          this.addSignImage(image.word, image.url, image.id)
        }
      }

      // Load any LSTM model data
      const lstmModelData = localStorage.getItem("lstm_model_data")
      if (lstmModelData) {
        const modelData = JSON.parse(lstmModelData)
        if (modelData.classes) {
          // Ensure all classes from the LSTM model are in our gestures
          for (const className of modelData.classes) {
            if (!this.getGesture(className)) {
              this.saveGesture({
                name: className,
                landmarks: [],
                samples: 0,
                images: [],
              })
            }
          }
        }
      }

      // Save everything to localStorage
      this.saveToLocalStorage()

      return true
    } catch (error) {
      console.error("Error consolidating models:", error)
      return false
    }
  }
}

// Create a singleton instance
export const modelManager = new ModelManager()
