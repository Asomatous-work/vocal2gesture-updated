import type { Results } from "@mediapipe/holistic"

export interface HolisticDetectionOptions {
  modelComplexity?: 0 | 1 | 2
  smoothLandmarks?: boolean
  enableSegmentation?: boolean
  refineFaceLandmarks?: boolean
  minDetectionConfidence?: number
  minTrackingConfidence?: number
  onResults?: (results: Results) => void
  onError?: (error: any) => void
}

export class HolisticDetection {
  private holistic: any
  private camera: any
  private isRunning = false
  private options: HolisticDetectionOptions

  constructor(options: HolisticDetectionOptions = {}) {
    this.options = {
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      refineFaceLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      ...options,
    }
  }

  public async initialize(): Promise<boolean> {
    try {
      // Import MediaPipe Holistic dynamically
      const { Holistic } = await import("@mediapipe/holistic")

      this.holistic = new Holistic({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/${file}`
        },
      })

      // Configure the holistic instance
      await this.holistic.setOptions({
        modelComplexity: this.options.modelComplexity,
        smoothLandmarks: this.options.smoothLandmarks,
        enableSegmentation: this.options.enableSegmentation,
        refineFaceLandmarks: this.options.refineFaceLandmarks,
        minDetectionConfidence: this.options.minDetectionConfidence,
        minTrackingConfidence: this.options.minTrackingConfidence,
      })

      // Set up the results callback
      this.holistic.onResults((results: Results) => {
        if (this.options.onResults) {
          this.options.onResults(results)
        }
      })

      return true
    } catch (error) {
      console.error("Error initializing MediaPipe Holistic:", error)
      if (this.options.onError) {
        this.options.onError(error)
      }
      return false
    }
  }

  public async start(videoElement: HTMLVideoElement): Promise<boolean> {
    if (!this.holistic || !videoElement) {
      return false
    }

    try {
      // Initialize the camera
      this.camera = new (await import("@mediapipe/camera_utils")).Camera(videoElement, {
        onFrame: async () => {
          if (this.isRunning && videoElement.readyState === 4) {
            try {
              await this.holistic.send({ image: videoElement })
            } catch (error) {
              console.error("Error processing frame:", error)
              if (this.options.onError) {
                this.options.onError(error)
              }
            }
          }
        },
        width: 640,
        height: 480,
      })

      // Start the camera
      await this.camera.start()
      this.isRunning = true
      return true
    } catch (error) {
      console.error("Error starting MediaPipe Holistic:", error)
      if (this.options.onError) {
        this.options.onError(error)
      }
      return false
    }
  }

  public stop(): void {
    this.isRunning = false
    if (this.camera) {
      this.camera.stop()
    }
  }

  public isSupported(): boolean {
    return typeof window !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  }
}
