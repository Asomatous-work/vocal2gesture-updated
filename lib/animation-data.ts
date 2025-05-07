export interface PoseLandmark {
  x: number
  y: number
  z?: number
  visibility?: number
}

export interface HandLandmark {
  x: number
  y: number
  z?: number
}

export interface FaceLandmark {
  x: number
  y: number
  z?: number
}

export interface AnimationFrame {
  timestamp: number
  pose: PoseLandmark[]
  leftHand: HandLandmark[]
  rightHand: HandLandmark[]
  face?: FaceLandmark[]
}

export interface AnimationData {
  id: string
  word: string
  frames: AnimationFrame[]
  duration: number
  createdAt: string
  metadata?: {
    fps?: number
    frameCount?: number
    [key: string]: any
  }
}

export interface AnimationDataset {
  animations: { [key: string]: AnimationData }
  version: string
  lastUpdated: string
}

// Helper functions for animation data
export const animationUtils = {
  createEmptyAnimation(word: string): AnimationData {
    return {
      id: `anim_${word.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`,
      word,
      frames: [],
      duration: 0,
      createdAt: new Date().toISOString(),
      metadata: {
        fps: 30,
        frameCount: 0,
      },
    }
  },

  addFrame(animation: AnimationData, frame: AnimationFrame): AnimationData {
    const newFrames = [...animation.frames, frame]
    return {
      ...animation,
      frames: newFrames,
      duration: frame.timestamp, // Last frame timestamp is the duration
      metadata: {
        ...animation.metadata,
        frameCount: newFrames.length,
      },
    }
  },

  // Compress animation data by reducing precision and removing unnecessary data
  compressAnimation(animation: AnimationData): AnimationData {
    const compressedFrames = animation.frames.map((frame) => {
      return {
        timestamp: frame.timestamp,
        pose: frame.pose.map((landmark) => ({
          x: Number.parseFloat(landmark.x.toFixed(4)),
          y: Number.parseFloat(landmark.y.toFixed(4)),
          z: landmark.z ? Number.parseFloat(landmark.z.toFixed(4)) : undefined,
          visibility: landmark.visibility ? Number.parseFloat(landmark.visibility.toFixed(2)) : undefined,
        })),
        leftHand: frame.leftHand.map((landmark) => ({
          x: Number.parseFloat(landmark.x.toFixed(4)),
          y: Number.parseFloat(landmark.y.toFixed(4)),
          z: landmark.z ? Number.parseFloat(landmark.z.toFixed(4)) : undefined,
        })),
        rightHand: frame.rightHand.map((landmark) => ({
          x: Number.parseFloat(landmark.x.toFixed(4)),
          y: Number.parseFloat(landmark.y.toFixed(4)),
          z: landmark.z ? Number.parseFloat(landmark.z.toFixed(4)) : undefined,
        })),
        face: frame.face
          ? frame.face.map((landmark) => ({
              x: Number.parseFloat(landmark.x.toFixed(4)),
              y: Number.parseFloat(landmark.y.toFixed(4)),
              z: landmark.z ? Number.parseFloat(landmark.z.toFixed(4)) : undefined,
            }))
          : undefined,
      }
    })

    return {
      ...animation,
      frames: compressedFrames,
    }
  },
}
