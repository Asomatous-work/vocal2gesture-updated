import { Octokit } from "@octokit/rest"
import type { LSTMGestureModel } from "./lstm-gesture-model"

// Define types for our models
export interface HandLandmark {
  x: number
  y: number
  z?: number
}

export interface GestureSample {
  leftHand?: HandLandmark[]
  rightHand?: HandLandmark[]
  pose?: HandLandmark[]
  face?: HandLandmark[]
  timestamp: number
}

export interface GestureData {
  name: string
  landmarks: any[] // Full landmark data
  samples: number
  sampleData: GestureSample[] // Organized sample data
  images?: string[] // URLs to sample images
}

export interface ModelMetadata {
  version: string
  timestamp: string
  gestures: string[]
  lstmModel?: boolean
}

export interface GestureModel {
  gestures: GestureData[]
  metadata: ModelMetadata
}

export interface ConsolidatedModel {
  model: GestureModel
  gestureFiles: Record<string, GestureData> // Gesture name -> GestureData
  version: string
  lastUpdated: string
  lstmModelData?: any // LSTM model data if available
}

// GitHub configuration
interface GitHubConfig {
  owner: string
  repo: string
  token?: string
  branch?: string
}

class ModelManager {
  private gestures: GestureData[] = []
  private signImages: { [key: string]: string[] } = {}
  private githubToken: string | null = null
  private githubRepo: string | null = null
  private githubOwner: string | null = null
  private consolidatedModel: ConsolidatedModel | null = null
  private octokit: Octokit | null = null
  private githubConfig: GitHubConfig | null = null
  private lstmModel: LSTMGestureModel | null = null

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== "undefined") {
      // Load GitHub config from localStorage
      this.loadGitHubConfig()
      // Initialize by loading from localStorage
      this.loadFromLocalStorage()
    }
  }

  // Load GitHub configuration
  private loadGitHubConfig() {
    if (typeof window !== "undefined") {
      this.githubToken = localStorage.getItem("githubToken")
      this.githubRepo = localStorage.getItem("githubRepo")
      this.githubOwner = localStorage.getItem("githubOwner")
    }
  }

  // Set GitHub configuration
  public setGitHubConfig(token: string, owner: string, repo: string) {
    this.githubToken = token
    this.githubOwner = owner
    this.githubRepo = repo

    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("githubToken", token)
      localStorage.setItem("githubOwner", owner)
      localStorage.setItem("githubRepo", repo)
    }

    return true
  }

  // Check if GitHub is configured
  public isGitHubConfigured(): boolean {
    return !!(this.githubToken && this.githubOwner && this.githubRepo)
  }

  // Get GitHub configuration
  public getGitHubConfig() {
    return {
      token: this.githubToken,
      owner: this.githubOwner,
      repo: this.githubRepo,
    }
  }

  // Initialize GitHub integration
  public initGitHub(config: GitHubConfig): boolean {
    try {
      if (config.token) {
        this.octokit = new Octokit({
          auth: config.token,
        })
      } else {
        // Anonymous access for public repos
        this.octokit = new Octokit()
      }

      this.githubConfig = {
        owner: config.owner,
        repo: config.repo,
        branch: config.branch || "main",
      }

      return true
    } catch (error) {
      console.error("Failed to initialize GitHub:", error)
      return false
    }
  }

  // Set LSTM model reference
  public setLSTMModel(model: LSTMGestureModel): void {
    this.lstmModel = model
  }

  // Save a gesture
  public saveGesture(gesture: GestureData): boolean {
    try {
      // Check if gesture already exists
      const existingIndex = this.gestures.findIndex((g) => g.name === gesture.name)

      if (existingIndex >= 0) {
        // Update existing gesture
        this.gestures[existingIndex] = gesture
      } else {
        // Add new gesture
        this.gestures.push(gesture)
      }

      return true
    } catch (error) {
      console.error("Error saving gesture:", error)
      return false
    }
  }

  // Get all gestures
  public getGestures(): GestureData[] {
    return this.gestures
  }

  // Add a sign image
  public addSignImage(word: string, imageUrl: string): boolean {
    try {
      if (!this.signImages[word]) {
        this.signImages[word] = []
      }

      // Add image if it doesn't already exist
      if (!this.signImages[word].includes(imageUrl)) {
        this.signImages[word].push(imageUrl)
      }

      return true
    } catch (error) {
      console.error("Error adding sign image:", error)
      return false
    }
  }

  // Get sign images for a word
  public getSignImages(word: string): string[] {
    return this.signImages[word] || []
  }

  // Get all sign images
  public getAllSignImages(): { [key: string]: string[] } {
    return this.signImages
  }

  // Save to localStorage
  public saveToLocalStorage(): boolean {
    if (typeof window === "undefined") return false

    try {
      // Save gestures
      localStorage.setItem("gestureModels", JSON.stringify(this.gestures))

      // Save sign images
      localStorage.setItem("signLanguageImages", JSON.stringify(this.signImages))

      return true
    } catch (error) {
      console.error("Error saving to localStorage:", error)
      return false
    }
  }

  // Load models from localStorage
  public loadFromLocalStorage(): boolean {
    if (typeof window === "undefined") return false

    try {
      // Load gestures
      const gesturesJson = localStorage.getItem("gestureModels")
      if (gesturesJson) {
        this.gestures = JSON.parse(gesturesJson)
      }

      // Load sign images
      const signImagesJson = localStorage.getItem("signLanguageImages")
      if (signImagesJson) {
        this.signImages = JSON.parse(signImagesJson)
      }

      return true
    } catch (error) {
      console.error("Error loading from localStorage:", error)
      return false
    }
  }

  // Consolidate all models for GitHub storage
  public async consolidateModels(): Promise<boolean> {
    try {
      // Load any existing models from localStorage
      if (typeof window !== "undefined") {
        this.loadFromLocalStorage()

        // Get LSTM model data if available
        const lstmModelData = localStorage.getItem("lstm_model_data")

        // Create consolidated model object
        const consolidatedModel = {
          metadata: {
            version: "1.0",
            timestamp: new Date().toISOString(),
            gestures: this.gestures.map((g) => g.name),
            lstmModel: !!lstmModelData,
          },
          gestures: this.gestures,
          signImages: this.signImages,
          lstmModelData: lstmModelData ? JSON.parse(lstmModelData) : null,
        }

        // Save consolidated model to localStorage
        localStorage.setItem("consolidatedModel", JSON.stringify(consolidatedModel))
      }

      return true
    } catch (error) {
      console.error("Error consolidating models:", error)
      return false
    }
  }

  // Save models to GitHub
  public async saveToGitHub(): Promise<boolean> {
    if (!this.isGitHubConfigured()) {
      console.error("GitHub not configured")
      return false
    }

    try {
      // Consolidate models first
      await this.consolidateModels()

      // Get consolidated model
      let consolidatedModel: string | null = null
      if (typeof window !== "undefined") {
        consolidatedModel = localStorage.getItem("consolidatedModel")
      }
      if (!consolidatedModel) {
        throw new Error("No consolidated model found")
      }

      // Create Octokit instance
      const octokit = new Octokit({
        auth: this.githubToken,
      })

      // Check if file exists to get SHA
      let fileSha: string | undefined
      try {
        const { data } = await octokit.repos.getContent({
          owner: this.githubOwner!,
          repo: this.githubRepo!,
          path: "models/vocal2gestures-model.json",
        })

        if ("sha" in data) {
          fileSha = data.sha
        }
      } catch (error) {
        // File doesn't exist yet, which is fine
        console.log("File doesn't exist yet, creating new file")
      }

      // Create or update file
      await octokit.repos.createOrUpdateFileContents({
        owner: this.githubOwner!,
        repo: this.githubRepo!,
        path: "models/vocal2gestures-model.json",
        message: "Update gesture models",
        content: Buffer.from(consolidatedModel).toString("base64"),
        sha: fileSha,
      })

      return true
    } catch (error) {
      console.error("Error saving to GitHub:", error)
      return false
    }
  }

  // Load models from GitHub
  public async loadFromGitHub(): Promise<boolean> {
    if (!this.isGitHubConfigured()) {
      console.error("GitHub not configured")
      return false
    }

    try {
      // Create Octokit instance
      const octokit = new Octokit({
        auth: this.githubToken,
      })

      // Get file content
      const { data } = await octokit.repos.getContent({
        owner: this.githubOwner!,
        repo: this.githubRepo!,
        path: "models/vocal2gestures-model.json",
      })

      if (!("content" in data)) {
        throw new Error("Invalid response from GitHub")
      }

      // Decode content
      const content = Buffer.from(data.content, "base64").toString()
      const model = JSON.parse(content)

      // Update local data
      this.gestures = model.gestures || []
      this.signImages = model.signImages || {}

      // Save LSTM model data if available
      if (model.lstmModelData && typeof window !== "undefined") {
        localStorage.setItem("lstm_model_data", JSON.stringify(model.lstmModelData))
      }

      // Save to localStorage
      this.saveToLocalStorage()

      return true
    } catch (error) {
      console.error("Error loading from GitHub:", error)
      return false
    }
  }

  // Consolidate all existing models into one
  public async consolidateModelsOld(): Promise<boolean> {
    try {
      // Get all saved model IDs
      let savedModels: any[] = []
      if (typeof window !== "undefined") {
        savedModels = JSON.parse(localStorage.getItem("savedGestureModels") || "[]")
      }

      if (savedModels.length === 0) {
        console.warn("No models found to consolidate")
        return false
      }

      // Create a new consolidated model
      const consolidatedModel: ConsolidatedModel = {
        model: {
          gestures: [],
          metadata: {
            epochs: 0,
            accuracy: 0,
            finalLoss: 0,
            timestamp: new Date().toISOString(),
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
            description: "Consolidated model from multiple sources",
          },
        },
        gestureFiles: {},
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
      }

      // Track unique gestures to avoid duplicates
      const uniqueGestures = new Set<string>()
      let totalAccuracy = 0
      let totalEpochs = 0
      let totalModels = 0

      // Process each model
      for (const modelInfo of savedModels) {
        let modelData: string | null = null
        if (typeof window !== "undefined") {
          modelData = localStorage.getItem(modelInfo.id)
        }
        if (!modelData) continue

        const model = JSON.parse(modelData) as GestureModel

        // Update metadata averages
        totalAccuracy += model.metadata.accuracy || 0
        totalEpochs += model.metadata.epochs || 0
        totalModels++

        // Process each gesture
        for (const gesture of model.gestures) {
          // Skip if we already have this gesture
          if (uniqueGestures.has(gesture.name)) {
            // Merge samples instead of skipping
            const existingGestureIndex = consolidatedModel.model.gestures.findIndex((g) => g.name === gesture.name)
            if (existingGestureIndex >= 0) {
              const existingGesture = consolidatedModel.model.gestures[existingGestureIndex]

              // Merge landmarks and update sample count
              existingGesture.landmarks = [...existingGesture.landmarks, ...gesture.landmarks]
              existingGesture.samples += gesture.samples

              // Update in the gesture files record
              consolidatedModel.gestureFiles[gesture.name] = existingGesture
            }
            continue
          }

          // Add to unique gestures
          uniqueGestures.add(gesture.name)

          // Create sample data if not present
          if (!gesture.sampleData) {
            gesture.sampleData = []

            // Convert landmarks to sample data (simplified)
            for (let i = 0; i < gesture.landmarks.length; i += 30) {
              const sampleLandmarks = gesture.landmarks.slice(i, i + 30)
              if (sampleLandmarks.length > 0) {
                gesture.sampleData.push({
                  leftHand: sampleLandmarks[0].leftHand,
                  rightHand: sampleLandmarks[0].rightHand,
                  timestamp: Date.now(),
                })
              }
            }
          }

          // Add to consolidated model
          consolidatedModel.model.gestures.push(gesture)

          // Add to gesture files record
          consolidatedModel.gestureFiles[gesture.name] = gesture
        }
      }

      // Update metadata with averages
      if (totalModels > 0) {
        consolidatedModel.model.metadata.accuracy = totalAccuracy / totalModels
        consolidatedModel.model.metadata.epochs = Math.round(totalEpochs / totalModels)
      }

      // Check if we have LSTM model data to include
      let lstmModelData: string | null = null
      if (typeof window !== "undefined") {
        lstmModelData = localStorage.getItem("lstm_model_data")
      }
      if (lstmModelData) {
        consolidatedModel.lstmModelData = JSON.parse(lstmModelData)
        consolidatedModel.model.metadata.usesLSTM = true
      }

      // Save the consolidated model
      this.consolidatedModel = consolidatedModel
      this.saveToLocalStorageOld()

      return true
    } catch (error) {
      console.error("Error consolidating models:", error)
      return false
    }
  }

  // Save the consolidated model to localStorage
  private saveToLocalStorageOld(): void {
    if (!this.consolidatedModel) return

    try {
      // Save the main model
      if (typeof window !== "undefined") {
        localStorage.setItem("consolidatedGestureModel", JSON.stringify(this.consolidatedModel.model))
      }

      // Save individual gesture files
      for (const [gestureName, gestureData] of Object.entries(this.consolidatedModel.gestureFiles)) {
        if (typeof window !== "undefined") {
          localStorage.setItem(`gesture_${gestureName}`, JSON.stringify(gestureData))
        }
      }

      // Save metadata
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "consolidatedModelInfo",
          JSON.stringify({
            version: this.consolidatedModel.version,
            lastUpdated: this.consolidatedModel.lastUpdated,
            gestureCount: Object.keys(this.consolidatedModel.gestureFiles).length,
            usesLSTM: this.consolidatedModel.model.metadata.usesLSTM || false,
          }),
        )
      }

      // Save LSTM model data if available
      if (this.consolidatedModel.lstmModelData && typeof window !== "undefined") {
        localStorage.setItem("lstm_model_data", JSON.stringify(this.consolidatedModel.lstmModelData))
      }

      console.log("Consolidated model saved to localStorage")
    } catch (error) {
      console.error("Error saving consolidated model to localStorage:", error)
    }
  }

  // Load the consolidated model from localStorage
  private loadFromLocalStorageOld(): void {
    try {
      let modelData: string | null = null
      if (typeof window !== "undefined") {
        modelData = localStorage.getItem("consolidatedGestureModel")
      }
      if (!modelData) return

      const model = JSON.parse(modelData) as GestureModel

      // Load individual gesture files
      const gestureFiles: Record<string, GestureData> = {}
      for (const gesture of model.gestures) {
        let gestureData: string | null = null
        if (typeof window !== "undefined") {
          gestureData = localStorage.getItem(`gesture_${gesture.name}`)
        }
        if (gestureData) {
          gestureFiles[gesture.name] = JSON.parse(gestureData)
        } else {
          gestureFiles[gesture.name] = gesture
        }
      }

      // Load metadata
      let metadataStr: string | null = null
      if (typeof window !== "undefined") {
        metadataStr = localStorage.getItem("consolidatedModelInfo")
      }
      const metadata = metadataStr
        ? JSON.parse(metadataStr)
        : {
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
          }

      // Load LSTM model data if available
      let lstmModelData: string | null = null
      if (typeof window !== "undefined") {
        lstmModelData = localStorage.getItem("lstm_model_data")
      }

      this.consolidatedModel = {
        model,
        gestureFiles,
        version: metadata.version,
        lastUpdated: metadata.lastUpdated,
        lstmModelData: lstmModelData ? JSON.parse(lstmModelData) : undefined,
      }

      console.log("Consolidated model loaded from localStorage")
    } catch (error) {
      console.error("Error loading consolidated model from localStorage:", error)
    }
  }

  // Save a new gesture to the consolidated model
  public saveGestureOld(gestureData: GestureData): boolean {
    try {
      if (!this.consolidatedModel) {
        // Initialize a new consolidated model if none exists
        this.consolidatedModel = {
          model: {
            gestures: [],
            metadata: {
              epochs: 0,
              accuracy: 0,
              finalLoss: 0,
              timestamp: new Date().toISOString(),
              version: "1.0.0",
              lastUpdated: new Date().toISOString(),
            },
          },
          gestureFiles: {},
          version: "1.0.0",
          lastUpdated: new Date().toISOString(),
        }
      }

      // Check if gesture already exists
      const existingIndex = this.consolidatedModel.model.gestures.findIndex((g) => g.name === gestureData.name)

      if (existingIndex >= 0) {
        // Update existing gesture
        this.consolidatedModel.model.gestures[existingIndex] = gestureData
      } else {
        // Add new gesture
        this.consolidatedModel.model.gestures.push(gestureData)
      }

      // Update gesture files record
      this.consolidatedModel.gestureFiles[gestureData.name] = gestureData

      // Update metadata
      this.consolidatedModel.lastUpdated = new Date().toISOString()
      this.consolidatedModel.model.metadata.lastUpdated = new Date().toISOString()

      // Save to localStorage
      this.saveToLocalStorageOld()

      return true
    } catch (error) {
      console.error("Error saving gesture to consolidated model:", error)
      return false
    }
  }

  // Save LSTM model data
  public saveLSTMModelDataOld(modelData: any): boolean {
    try {
      if (!this.consolidatedModel) {
        this.consolidateModelsOld()
      }

      if (this.consolidatedModel) {
        this.consolidatedModel.lstmModelData = modelData
        this.consolidatedModel.model.metadata.usesLSTM = true
        this.saveToLocalStorageOld()
        return true
      }

      return false
    } catch (error) {
      console.error("Error saving LSTM model data:", error)
      return false
    }
  }

  // Get the consolidated model
  public getConsolidatedModelOld(): GestureModel | null {
    return this.consolidatedModel?.model || null
  }

  // Get a specific gesture
  public getGestureOld(gestureName: string): GestureData | null {
    return this.consolidatedModel?.gestureFiles[gestureName] || null
  }

  // Get all gestures
  public getAllGesturesOld(): GestureData[] {
    return this.consolidatedModel?.model.gestures || []
  }

  // Get LSTM model data
  public getLSTMModelDataOld(): any | null {
    return this.consolidatedModel?.lstmModelData || null
  }

  // Save to GitHub
  public async saveToGitHubOld(): Promise<boolean> {
    if (!this.octokit || !this.githubConfig || !this.consolidatedModel) {
      console.error("GitHub not initialized or no model to save")
      return false
    }

    try {
      const { owner, repo, branch } = this.githubConfig

      // Get the latest commit SHA
      const { data: refData } = await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      })

      const latestCommitSha = refData.object.sha

      // Save the main model file
      await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: "models/consolidated_model.json",
        message: "Update consolidated model",
        content: Buffer.from(JSON.stringify(this.consolidatedModel.model, null, 2)).toString("base64"),
        branch,
        sha: latestCommitSha,
      })

      // Save individual gesture files
      for (const [gestureName, gestureData] of Object.entries(this.consolidatedModel.gestureFiles)) {
        await this.octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: `models/gestures/${gestureName}.json`,
          message: `Update gesture: ${gestureName}`,
          content: Buffer.from(JSON.stringify(gestureData, null, 2)).toString("base64"),
          branch,
        })
      }

      // Save metadata
      await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: "models/metadata.json",
        message: "Update model metadata",
        content: Buffer.from(
          JSON.stringify(
            {
              version: this.consolidatedModel.version,
              lastUpdated: this.consolidatedModel.lastUpdated,
              gestureCount: Object.keys(this.consolidatedModel.gestureFiles).length,
              usesLSTM: this.consolidatedModel.model.metadata.usesLSTM || false,
            },
            null,
            2,
          ),
        ).toString("base64"),
        branch,
      })

      // Save LSTM model data if available
      if (this.consolidatedModel.lstmModelData) {
        await this.octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: "models/lstm_model_data.json",
          message: "Update LSTM model data",
          content: Buffer.from(JSON.stringify(this.consolidatedModel.lstmModelData, null, 2)).toString("base64"),
          branch,
        })
      }

      console.log("Model saved to GitHub successfully")
      return true
    } catch (error) {
      console.error("Error saving to GitHub:", error)
      return false
    }
  }

  // Load from GitHub
  public async loadFromGitHubOld(): Promise<boolean> {
    if (!this.octokit || !this.githubConfig) {
      console.error("GitHub not initialized")
      return false
    }

    try {
      const { owner, repo, branch } = this.githubConfig

      // Load the main model file
      const { data: modelFileData } = await this.octokit.repos.getContent({
        owner,
        repo,
        path: "models/consolidated_model.json",
        ref: branch,
      })

      if (!("content" in modelFileData)) {
        throw new Error("Invalid response format for model file")
      }

      const modelContent = Buffer.from(modelFileData.content, "base64").toString()
      const model = JSON.parse(modelContent) as GestureModel

      // Load metadata
      const { data: metadataFileData } = await this.octokit.repos.getContent({
        owner,
        repo,
        path: "models/metadata.json",
        ref: branch,
      })

      if (!("content" in metadataFileData)) {
        throw new Error("Invalid response format for metadata file")
      }

      const metadataContent = Buffer.from(metadataFileData.content, "base64").toString()
      const metadata = JSON.parse(metadataContent)

      // Initialize the consolidated model
      this.consolidatedModel = {
        model,
        gestureFiles: {},
        version: metadata.version,
        lastUpdated: metadata.lastUpdated,
      }

      // Load individual gesture files
      for (const gesture of model.gestures) {
        try {
          const { data: gestureFileData } = await this.octokit.repos.getContent({
            owner,
            repo,
            path: `models/gestures/${gesture.name}.json`,
            ref: branch,
          })

          if (!("content" in gestureFileData)) {
            throw new Error(`Invalid response format for gesture file: ${gesture.name}`)
          }

          const gestureContent = Buffer.from(gestureFileData.content, "base64").toString()
          this.consolidatedModel.gestureFiles[gesture.name] = JSON.parse(gestureContent)
        } catch (error) {
          console.warn(`Error loading gesture file for ${gesture.name}:`, error)
          // Use the gesture data from the main model as fallback
          this.consolidatedModel.gestureFiles[gesture.name] = gesture
        }
      }

      // Try to load LSTM model data if available
      try {
        const { data: lstmModelData } = await this.octokit.repos.getContent({
          owner,
          repo,
          path: "models/lstm_model_data.json",
          ref: branch,
        })

        if ("content" in lstmModelData) {
          const lstmContent = Buffer.from(lstmModelData.content, "base64").toString()
          this.consolidatedModel.lstmModelData = JSON.parse(lstmContent)

          // If we have an LSTM model instance, import the data
          if (this.lstmModel && this.consolidatedModel.lstmModelData) {
            await this.lstmModel.importFromGitHub(this.consolidatedModel.lstmModelData)
          }
        }
      } catch (error) {
        console.warn("LSTM model data not found or could not be loaded:", error)
      }

      // Save to localStorage for offline use
      this.saveToLocalStorageOld()

      console.log("Model loaded from GitHub successfully")
      return true
    } catch (error) {
      console.error("Error loading from GitHub:", error)
      return false
    }
  }
}

// Create singleton instance
export const modelManager = new ModelManager()
