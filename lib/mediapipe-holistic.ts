export interface HolisticDetectionOptions {
  onResults: (results: any) => void
  onError?: (error: Error) => void
}

export class HolisticDetection {
  private holistic: any = null
  private camera: any = null
  private options: HolisticDetectionOptions
  private isRunning = false

  constructor(options: HolisticDetectionOptions) {
    this.options = options
  }

  public async initialize(): Promise<void> {
    try {
      // Only initialize in browser environment
      if (typeof window === "undefined") return

      // Load the MediaPipe scripts directly if not already loaded
      await this.loadMediaPipeScripts()

      // Access the global Holistic object
      if (window.Holistic) {
        this.holistic = new window.Holistic({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
          },
        })

        this.holistic.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        this.holistic.onResults((results: any) => {
          if (this.options.onResults) {
            this.options.onResults(results)
          }
        })

        console.log("MediaPipe Holistic initialized successfully")
        return
      } else {
        throw new Error("MediaPipe Holistic not available")
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
      return
    }

    return new Promise((resolve, reject) => {
      // Load Holistic script
      const holisticScript = document.createElement("script")
      holisticScript.src = "https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/holistic.js"
      holisticScript.async = true
      holisticScript.onload = () => {
        // Load Camera script after Holistic is loaded
        const cameraScript = document.createElement("script")
        cameraScript.src = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js"
        cameraScript.async = true
        cameraScript.onload = () => resolve()
        cameraScript.onerror = (e) => reject(new Error("Failed to load Camera script"))
        document.body.appendChild(cameraScript)
      }
      holisticScript.onerror = (e) => reject(new Error("Failed to load Holistic script"))
      document.body.appendChild(holisticScript)
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
