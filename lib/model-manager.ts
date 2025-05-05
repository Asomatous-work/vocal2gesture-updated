import { Octokit } from "@octokit/rest"

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
  epochs: number
  accuracy: number
  finalLoss: number
  timestamp: string
  version: string
  lastUpdated: string
  description?: string
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
}

// GitHub configuration
interface GitHubConfig {
  owner: string
  repo: string
  token?: string
  branch?: string
}

export class ModelManager {
  private consolidatedModel: ConsolidatedModel | null = null
  private octokit: Octokit | null = null
  private githubConfig: GitHubConfig | null = null

  constructor() {
    // Initialize by loading from localStorage
    this.loadFromLocalStorage()
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

  // Consolidate all existing models into one
  public async consolidateModels(): Promise<boolean> {
    try {
      // Get all saved model IDs
      const savedModels = JSON.parse(localStorage.getItem("savedGestureModels") || "[]")

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
        const modelData = localStorage.getItem(modelInfo.id)
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

      // Save the consolidated model
      this.consolidatedModel = consolidatedModel
      this.saveToLocalStorage()

      return true
    } catch (error) {
      console.error("Error consolidating models:", error)
      return false
    }
  }

  // Save the consolidated model to localStorage
  private saveToLocalStorage(): void {
    if (!this.consolidatedModel) return

    try {
      // Save the main model
      localStorage.setItem("consolidatedGestureModel", JSON.stringify(this.consolidatedModel.model))

      // Save individual gesture files
      for (const [gestureName, gestureData] of Object.entries(this.consolidatedModel.gestureFiles)) {
        localStorage.setItem(`gesture_${gestureName}`, JSON.stringify(gestureData))
      }

      // Save metadata
      localStorage.setItem(
        "consolidatedModelInfo",
        JSON.stringify({
          version: this.consolidatedModel.version,
          lastUpdated: this.consolidatedModel.lastUpdated,
          gestureCount: Object.keys(this.consolidatedModel.gestureFiles).length,
        }),
      )

      console.log("Consolidated model saved to localStorage")
    } catch (error) {
      console.error("Error saving consolidated model to localStorage:", error)
    }
  }

  // Load the consolidated model from localStorage
  private loadFromLocalStorage(): void {
    try {
      const modelData = localStorage.getItem("consolidatedGestureModel")
      if (!modelData) return

      const model = JSON.parse(modelData) as GestureModel

      // Load individual gesture files
      const gestureFiles: Record<string, GestureData> = {}
      for (const gesture of model.gestures) {
        const gestureData = localStorage.getItem(`gesture_${gesture.name}`)
        if (gestureData) {
          gestureFiles[gesture.name] = JSON.parse(gestureData)
        } else {
          gestureFiles[gesture.name] = gesture
        }
      }

      // Load metadata
      const metadataStr = localStorage.getItem("consolidatedModelInfo")
      const metadata = metadataStr
        ? JSON.parse(metadataStr)
        : {
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
          }

      this.consolidatedModel = {
        model,
        gestureFiles,
        version: metadata.version,
        lastUpdated: metadata.lastUpdated,
      }

      console.log("Consolidated model loaded from localStorage")
    } catch (error) {
      console.error("Error loading consolidated model from localStorage:", error)
    }
  }

  // Save a new gesture to the consolidated model
  public saveGesture(gestureData: GestureData): boolean {
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
      this.saveToLocalStorage()

      return true
    } catch (error) {
      console.error("Error saving gesture to consolidated model:", error)
      return false
    }
  }

  // Get the consolidated model
  public getConsolidatedModel(): GestureModel | null {
    return this.consolidatedModel?.model || null
  }

  // Get a specific gesture
  public getGesture(gestureName: string): GestureData | null {
    return this.consolidatedModel?.gestureFiles[gestureName] || null
  }

  // Get all gestures
  public getAllGestures(): GestureData[] {
    return this.consolidatedModel?.model.gestures || []
  }

  // Save to GitHub
  public async saveToGitHub(): Promise<boolean> {
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
            },
            null,
            2,
          ),
        ).toString("base64"),
        branch,
      })

      console.log("Model saved to GitHub successfully")
      return true
    } catch (error) {
      console.error("Error saving to GitHub:", error)
      return false
    }
  }

  // Load from GitHub
  public async loadFromGitHub(): Promise<boolean> {
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

      // Save to localStorage for offline use
      this.saveToLocalStorage()

      console.log("Model loaded from GitHub successfully")
      return true
    } catch (error) {
      console.error("Error loading from GitHub:", error)
      return false
    }
  }
}

// Create a singleton instance
export const modelManager = new ModelManager()
