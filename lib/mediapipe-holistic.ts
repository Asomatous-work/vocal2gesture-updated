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
      const { Holistic } = await import("@mediapipe/holistic")

      this.holistic = new Holistic({
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
      const { Camera } = await import("@mediapipe/camera_utils")

      this.camera = new Camera(videoElement, {
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
