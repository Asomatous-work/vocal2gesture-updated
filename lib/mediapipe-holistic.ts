export interface HolisticDetectionOptions {
  onResults: (results: any) => void
  onError?: (error: Error) => void
}

export class HolisticDetection {
  private holistic: any = null
  private camera: any = null
  private options: HolisticDetectionOptions
  private isRunning = false
  private scriptsLoaded = false

  constructor(options: HolisticDetectionOptions) {
    this.options = options
  }

  public async initialize(): Promise<void> {
    try {
      // Only initialize in browser environment
      if (typeof window === "undefined") return

      // Load the MediaPipe scripts directly if not already loaded
      await this.loadMediaPipeScripts()

      // Wait for scripts to be fully loaded
      await this.waitForScriptsToLoad()

      // Access the global Holistic object
      if (window.Holistic) {
        this.holistic = new window.Holistic({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/${file}`
          },
        })

        this.holistic.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.2, // Lower this from 0.3 to 0.2 for better detection
          minTrackingConfidence: 0.2, // Lower this from 0.5 to 0.2 for better tracking
          enableFaceGeometry: false, // Disable face geometry to focus on hands
          refineFaceLandmarks: false, // Disable face refinement to focus on hands
        })

        this.holistic.onResults((results: any) => {
          if (this.options.onResults) {
            this.options.onResults(results)
          }
        })

        console.log("MediaPipe Holistic initialized successfully")
        return
      } else {
        throw new Error("MediaPipe Holistic not available after loading scripts")
      }
    } catch (error) {
      console.error("Error initializing MediaPipe Holistic:", error)
      if (this.options.onError) {
        this.options.onError(error as Error)
      }
    }
  }

  private async loadMediaPipeScripts(): Promise<void> {
    // Check if scripts are already loaded
    if (window.Holistic && window.Camera) {
      this.scriptsLoaded = true
      return
    }

    return new Promise((resolve, reject) => {
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
    // Wait for scripts to be fully loaded and objects to be available
    return new Promise((resolve) => {
      const checkScripts = () => {
        if (window.Holistic && window.Camera) {
          resolve()
        } else {
          setTimeout(checkScripts, 100)
        }
      }

      // Start checking if scripts are loaded
      checkScripts()
    })
  }

  public async start(videoElement: HTMLVideoElement): Promise<void> {
    if (!this.holistic || this.isRunning) return

    try {
      if (!window.Camera) {
        throw new Error("MediaPipe Camera not available")
      }

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
    } catch (error) {
      console.error("Error starting camera:", error)
      this.isRunning = false
      if (this.options.onError) {
        this.options.onError(error as Error)
      }
    }
  }

  public stop(): void {
    this.isRunning = false

    if (this.camera) {
      this.camera.stop()
      this.camera = null
    }
  }
}

// Add these to the global Window interface
declare global {
  interface Window {
    Holistic: any
    Camera: any
  }
}
