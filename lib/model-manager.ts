export interface GestureData {
  name: string
  landmarks: any[]
  samples: number
  images?: string[]
}

// This is a singleton class to manage gesture models
class ModelManager {
  private gestures: GestureData[] = []
  private signImages: { word: string; url: string; id: string; category?: string; tags?: string[] }[] = []
  private githubConfig: { owner: string; repo: string; branch: string; token?: string } | null = null
  private isInitialized = false
  private storageQuotaExceeded = false

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
      } else {
        // Set default config if none exists
        this.githubConfig = {
          owner: "",
          repo: "",
          branch: "main",
        }
      }
    } catch (error) {
      console.error("Error loading GitHub config:", error)
      // Initialize with empty config if there's an error
      this.githubConfig = {
        owner: "",
        repo: "",
        branch: "main",
      }
    }
  }

  // Check if GitHub config is valid and complete
  private isGitHubConfigValid(): boolean {
    return !!(
      this.githubConfig &&
      this.githubConfig.owner &&
      this.githubConfig.owner.trim() !== "" &&
      this.githubConfig.repo &&
      this.githubConfig.repo.trim() !== "" &&
      this.githubConfig.token &&
      this.githubConfig.token.trim() !== ""
    )
  }

  // Initialize GitHub integration
  public async initGitHub(config: { owner: string; repo: string; branch: string; token?: string }) {
    // Validate required fields
    if (!config.owner || !config.repo) {
      throw new Error("GitHub owner and repository name are required")
    }

    // Validate the token if provided
    if (config.token) {
      try {
        // Test the token with a simple GitHub API call
        const response = await fetch("/api/github-config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: config.token,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to validate GitHub token")
        }
      } catch (error) {
        console.error("Error validating GitHub token:", error)
        throw error
      }
    }

    this.githubConfig = config

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("githubSettings", JSON.stringify(config))
      } catch (error) {
        console.error("Error saving GitHub config:", error)
        this.storageQuotaExceeded = true
      }
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

    // Only save to localStorage if we haven't exceeded quota
    if (!this.storageQuotaExceeded) {
      this.saveToLocalStorage()
    }
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

    // Only save to localStorage if we haven't exceeded quota
    if (!this.storageQuotaExceeded) {
      this.saveToLocalStorage()
    }
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

  // Check if storage quota is exceeded
  public isStorageQuotaExceeded(): boolean {
    return this.storageQuotaExceeded
  }

  // Save model to localStorage
  public saveToLocalStorage() {
    if (typeof window === "undefined") return false

    try {
      // Try to save just the essential data first
      const essentialData = this.gestures.map((gesture) => ({
        name: gesture.name,
        samples: gesture.samples,
        // Don't include full landmarks array, just count
        landmarkCount: gesture.landmarks.length,
        // Include only image count, not the actual images
        imageCount: gesture.images ? gesture.images.length : 0,
      }))

      localStorage.setItem("gestureModelMeta", JSON.stringify(essentialData))

      // Now try to save the full data
      localStorage.setItem("gestureModel", JSON.stringify(this.gestures))
      localStorage.setItem("signImages", JSON.stringify(this.signImages))

      // Reset quota exceeded flag if we succeeded
      this.storageQuotaExceeded = false
      return true
    } catch (error) {
      console.error("Error saving to localStorage:", error)
      this.storageQuotaExceeded = true
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

  // Add the missing isGitHubConfigured function
  public isGitHubConfigured(): boolean {
    return this.isGitHubConfigValid()
  }

  // Add the missing saveToGitHub function
  public async saveToGitHub(): Promise<boolean> {
    if (typeof window === "undefined") return false

    // Validate GitHub config before proceeding
    if (!this.isGitHubConfigValid()) {
      throw new Error("Missing required GitHub configuration: owner, repo, and token are required")
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

      // Convert to JSON string
      const content = JSON.stringify(data, null, 2)

      // Save to GitHub using our API route
      const response = await fetch("/api/github/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: this.githubConfig!.owner,
          repo: this.githubConfig!.repo,
          branch: this.githubConfig!.branch || "main",
          path: "vocal2gestures-data.json",
          content,
          message: "Update gesture data",
          token: this.githubConfig!.token,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save to GitHub")
      }

      const result = await response.json()
      console.log("Saved to GitHub successfully:", result)

      return true
    } catch (error) {
      console.error("Error saving to GitHub:", error)
      throw error
    }
  }

  // Add the missing loadFromGitHub function
  public async loadFromGitHub(): Promise<boolean> {
    if (typeof window === "undefined") return false

    // Check if GitHub config exists
    if (!this.githubConfig) {
      console.log("GitHub configuration not found")
      return false
    }

    // Validate GitHub config before proceeding
    if (!this.githubConfig.owner || !this.githubConfig.repo || !this.githubConfig.token) {
      console.log("Incomplete GitHub configuration")
      return false
    }

    try {
      // Fetch the data file from GitHub
      const response = await fetch("/api/github/fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: this.githubConfig.owner,
          repo: this.githubConfig.repo,
          branch: this.githubConfig.branch || "main",
          path: "vocal2gestures-data.json",
          token: this.githubConfig.token,
        }),
      })

      // If the file doesn't exist yet, that's okay
      if (response.status === 404) {
        console.log("No data file found on GitHub yet")
        return false
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to load from GitHub")
      }

      const result = await response.json()

      if (result.success && result.data.content) {
        const data = JSON.parse(result.data.content)

        if (data.gestures) {
          this.gestures = data.gestures
        }

        if (data.signImages) {
          this.signImages = data.signImages
        }

        // Save to localStorage for offline use
        this.saveToLocalStorage()

        return true
      }

      return false
    } catch (error) {
      console.error("Error loading from GitHub:", error)
      throw error
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
      this.storageQuotaExceeded = false
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
        // Process images if needed
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

  // Get GitHub configuration (for use in other services)
  public getGitHubConfig() {
    return this.githubConfig
  }
}

// Create a singleton instance
export const modelManager = new ModelManager()
