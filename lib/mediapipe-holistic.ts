import { hasHandsDetected, hasPoseDetected, hasFaceDetected } from "./pose-utils"

export interface HolisticDetectionOptions {
  onResults: (results: any) => void
  onError?: (error: Error) => void
  onStatusChange?: (status: "initializing" | "ready" | "running" | "error" | "stopped") => void
  modelComplexity?: number
  smoothLandmarks?: boolean
  minDetectionConfidence?: number
  minTrackingConfidence?: number
  enableFaceGeometry?: boolean
  refineFaceLandmarks?: boolean
}

export class HolisticDetection {
  private holistic: any = null
  private camera: any = null
  private options: HolisticDetectionOptions
  private isRunning = false
  private scriptsLoaded = false
  private loadAttempts = 0
  private maxLoadAttempts = 3
  private status: "initializing" | "ready" | "running" | "error" | "stopped" = "initializing"
  private videoElement: HTMLVideoElement | null = null

  constructor(options: HolisticDetectionOptions) {
    this.options = {
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.2,
      minTrackingConfidence: 0.2,
      enableFaceGeometry: false,
      refineFaceLandmarks: false,
      ...options,
    }

    this.updateStatus("initializing")
  }

  private updateStatus(newStatus: "initializing" | "ready" | "running" | "error" | "stopped") {
    this.status = newStatus
    if (this.options.onStatusChange) {
      this.options.onStatusChange(newStatus)
    }
  }

  public async initialize(): Promise<boolean> {
    try {
      // Only initialize in browser environment
      if (typeof window === "undefined") {
        this.updateStatus("error")
        throw new Error("Cannot initialize MediaPipe in non-browser environment")
      }

      console.log("Starting MediaPipe Holistic initialization...")
      this.updateStatus("initializing")

      // Load the MediaPipe scripts
      await this.loadMediaPipeScripts()

      // Wait for scripts to be fully loaded
      await this.waitForScriptsToLoad()

      // Access the global Holistic object
      if (window.Holistic) {
        console.log("Creating Holistic instance...")
        this.holistic = new window.Holistic({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/${file}`
          },
        })

        console.log("Setting Holistic options...")
        this.holistic.setOptions({
          modelComplexity: this.options.modelComplexity,
          smoothLandmarks: this.options.smoothLandmarks,
          minDetectionConfidence: this.options.minDetectionConfidence,
          minTrackingConfidence: this.options.minTrackingConfidence,
          enableFaceGeometry: this.options.enableFaceGeometry,
          refineFaceLandmarks: this.options.refineFaceLandmarks,
        })

        this.holistic.onResults((results: any) => {
          if (this.options.onResults) {
            // Add detection flags for easier access
            results.hasHands = hasHandsDetected(results)
            results.hasPose = hasPoseDetected(results)
            results.hasFace = hasFaceDetected(results)

            this.options.onResults(results)
          }
        })

        console.log("MediaPipe Holistic initialized successfully")
        this.updateStatus("ready")
        return true
      } else {
        this.updateStatus("error")
        throw new Error("MediaPipe Holistic not available after loading scripts")
      }
    } catch (error) {
      console.error("Error initializing MediaPipe Holistic:", error)
      this.updateStatus("error")

      if (this.options.onError) {
        this.options.onError(error as Error)
      }

      // Retry initialization if under max attempts
      if (this.loadAttempts < this.maxLoadAttempts) {
        this.loadAttempts++
        console.log(`Retrying initialization (attempt ${this.loadAttempts} of ${this.maxLoadAttempts})...`)
        await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second before retry
        return this.initialize()
      }

      return false
    }
  }

  private async loadMediaPipeScripts(): Promise<void> {
    // Check if scripts are already loaded
    if (window.Holistic && window.Camera) {
      console.log("MediaPipe scripts already loaded")
      this.scriptsLoaded = true
      return
    }

    console.log("Loading MediaPipe scripts...")
    return new Promise((resolve, reject) => {
      // Remove any existing scripts to avoid conflicts
      const existingHolistic = document.querySelector('script[src*="mediapipe/holistic"]')
      const existingCamera = document.querySelector('script[src*="mediapipe/camera_utils"]')

      if (existingHolistic) document.body.removeChild(existingHolistic)
      if (existingCamera) document.body.removeChild(existingCamera)

      // Create a script element for loading the Holistic model
      const holisticScript = document.createElement("script")
      holisticScript.src = "https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/holistic.js"
      holisticScript.crossOrigin = "anonymous"
      holisticScript.async = true

      // Create a script element for loading the Camera utilities
      const cameraScript = document.createElement("script")
      cameraScript.src = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js"
      cameraScript.crossOrigin = "anonymous"
      cameraScript.async = true

      // Add event listeners for script loading
      holisticScript.onload = () => {
        console.log("Holistic script loaded successfully")
        document.body.appendChild(cameraScript)
      }

      cameraScript.onload = () => {
        console.log("Camera script loaded successfully")
        this.scriptsLoaded = true
        resolve()
      }

      // Add error handlers
      holisticScript.onerror = (e) => {
        console.error("Failed to load Holistic script:", e)
        reject(new Error("Failed to load Holistic script"))
      }

      cameraScript.onerror = (e) => {
        console.error("Failed to load Camera script:", e)
        reject(new Error("Failed to load Camera script"))
      }

      // Append the Holistic script to the document body
      document.body.appendChild(holisticScript)
    })
  }

  private async waitForScriptsToLoad(): Promise<void> {
    console.log("Waiting for MediaPipe scripts to initialize...")
    // Wait for scripts to be fully loaded and objects to be available
    return new Promise((resolve) => {
      const maxWaitTime = 10000 // 10 seconds max wait
      const startTime = Date.now()

      const checkScripts = () => {
        if (window.Holistic && window.Camera) {
          console.log("MediaPipe objects available")
          resolve()
        } else if (Date.now() - startTime > maxWaitTime) {
          console.warn("Timed out waiting for MediaPipe objects, continuing anyway")
          resolve()
        } else {
          setTimeout(checkScripts, 100)
        }
      }

      // Start checking if scripts are loaded
      checkScripts()
    })
  }

  public async start(videoElement: HTMLVideoElement): Promise<boolean> {
    if (!this.holistic) {
      console.error("Holistic not initialized, cannot start")
      this.updateStatus("error")
      return false
    }

    if (this.isRunning) {
      console.log("MediaPipe already running")
      return true
    }

    try {
      console.log("Starting MediaPipe camera...")
      this.videoElement = videoElement

      if (!window.Camera) {
        throw new Error("MediaPipe Camera not available")
      }

      // Ensure video has crossOrigin attribute set
      videoElement.crossOrigin = "anonymous"

      this.camera = new window.Camera(videoElement, {
        onFrame: async () => {
          if (!this.holistic || !this.isRunning) return

          try {
            await this.holistic.send({ image: videoElement })
          } catch (error) {
            console.error("Error in holistic.send:", error)
            if (this.options.onError) {
              this.options.onError(error as Error)
            }
          }
        },
        width: 640,
        height: 480,
      })

      this.isRunning = true
      await this.camera.start()
      console.log("MediaPipe camera started successfully")
      this.updateStatus("running")
      return true
    } catch (error) {
      console.error("Error starting camera:", error)
      this.isRunning = false
      this.updateStatus("error")

      if (this.options.onError) {
        this.options.onError(error as Error)
      }
      return false
    }
  }

  public stop(): void {
    console.log("Stopping MediaPipe detection")
    this.isRunning = false
    this.updateStatus("stopped")

    if (this.camera) {
      this.camera.stop()
      this.camera = null
    }
  }

  public isInitialized(): boolean {
    return this.holistic !== null
  }

  public getStatus(): string {
    return this.status
  }

  public async restart(): Promise<boolean> {
    this.stop()

    // Small delay to ensure clean restart
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (this.videoElement) {
      return this.start(this.videoElement)
    }

    return false
  }
}

// Add these to the global Window interface
declare global {
  interface Window {
    Holistic: any
    Camera: any
  }
}
