import { Camera } from "@mediapipe/camera_utils"
import { Holistic, type Results } from "@mediapipe/holistic"

export interface HolisticConfig {
  minDetectionConfidence?: number
  minTrackingConfidence?: number
  refineFaceLandmarks?: boolean
  enableSegmentation?: boolean
  smoothSegmentation?: boolean
}

// Add this export interface after the existing HolisticConfig interface
export interface HolisticDetection {
  poseLandmarks?: any[]
  faceLandmarks?: any[]
  leftHandLandmarks?: any[]
  rightHandLandmarks?: any[]
  poseWorldLandmarks?: any[]
  segmentationMask?: any
  image?: any
  timestamp?: number
}

export class MediaPipeHolistic {
  private holistic: Holistic | null = null
  private camera: Camera | null = null
  private videoElement: HTMLVideoElement | null = null
  private onResultsCallback: ((results: Results) => void) | null = null
  private isRunning = false
  private config: HolisticConfig = {
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    refineFaceLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: true,
  }

  constructor(config?: HolisticConfig) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  public async initialize(): Promise<boolean> {
    try {
      this.holistic = new Holistic({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
        },
      })

      await this.holistic.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: this.config.minDetectionConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence,
        refineFaceLandmarks: this.config.refineFaceLandmarks,
        enableSegmentation: this.config.enableSegmentation,
        smoothSegmentation: this.config.smoothSegmentation,
      })

      this.holistic.onResults((results) => {
        if (this.onResultsCallback) {
          this.onResultsCallback(results)
        }
      })

      return true
    } catch (error) {
      console.error("Error initializing MediaPipe Holistic:", error)
      return false
    }
  }

  public async startCamera(videoElement: HTMLVideoElement): Promise<boolean> {
    if (!this.holistic) {
      console.error("MediaPipe Holistic not initialized")
      return false
    }

    try {
      this.videoElement = videoElement
      this.camera = new Camera(videoElement, {
        onFrame: async () => {
          if (this.holistic && this.isRunning) {
            await this.holistic.send({ image: videoElement })
          }
        },
        width: 640,
        height: 480,
      })

      await this.camera.start()
      this.isRunning = true
      return true
    } catch (error) {
      console.error("Error starting camera:", error)
      return false
    }
  }

  public stopCamera(): void {
    if (this.camera) {
      this.camera.stop()
      this.isRunning = false
    }
  }

  public onResults(callback: (results: Results) => void): void {
    this.onResultsCallback = callback
  }

  public isInitialized(): boolean {
    return !!this.holistic
  }

  public isActive(): boolean {
    return this.isRunning
  }

  public async detectSingleImage(
    imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  ): Promise<Results | null> {
    if (!this.holistic) {
      console.error("MediaPipe Holistic not initialized")
      return null
    }

    try {
      let results: Results | null = null

      // Create a one-time callback to capture results
      const originalCallback = this.onResultsCallback

      await new Promise<void>((resolve) => {
        this.holistic!.onResults((res) => {
          results = res
          resolve()
        })

        this.holistic!.send({ image: imageElement })
      })

      // Restore original callback
      this.holistic.onResults((res) => {
        if (originalCallback) originalCallback(res)
      })

      return results
    } catch (error) {
      console.error("Error detecting single image:", error)
      return null
    }
  }
}

// Create a singleton instance
let mediaPipeHolistic: MediaPipeHolistic | null = null

export function getMediaPipeHolistic(config?: HolisticConfig): MediaPipeHolistic {
  if (!mediaPipeHolistic && typeof window !== "undefined") {
    mediaPipeHolistic = new MediaPipeHolistic(config)
  }
  return mediaPipeHolistic as MediaPipeHolistic
}
