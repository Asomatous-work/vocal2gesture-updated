// This is a simplified version to avoid the Module.arguments errors
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

      // Dynamically import MediaPipe to avoid SSR issues
      try {
        // Use dynamic import with proper error handling
        const mediapipeHolistic = await import("@mediapipe/holistic")

        if (!mediapipeHolistic || !mediapipeHolistic.Holistic) {
          throw new Error("MediaPipe Holistic module not found or invalid")
        }

        this.holistic = new mediapipeHolistic.Holistic({
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
      } catch (error) {
        console.error("Error importing MediaPipe Holistic:", error)
        if (this.options.onError) {
          this.options.onError(error as Error)
        }
      }
    } catch (error) {
      console.error("Error initializing MediaPipe Holistic:", error)
      if (this.options.onError) {
        this.options.onError(error as Error)
      }
    }
  }

  public async start(videoElement: HTMLVideoElement): Promise<void> {
    if (!this.holistic || this.isRunning) return

    try {
      // Dynamically import Camera to avoid SSR issues
      try {
        const mediapipeCamera = await import("@mediapipe/camera_utils")

        if (!mediapipeCamera || !mediapipeCamera.Camera) {
          throw new Error("MediaPipe Camera module not found or invalid")
        }

        this.camera = new mediapipeCamera.Camera(videoElement, {
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
      } catch (error) {
        console.error("Error importing MediaPipe Camera:", error)
        if (this.options.onError) {
          this.options.onError(error as Error)
        }
      }
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
