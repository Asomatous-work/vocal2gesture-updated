export interface AnimationData {
  word: string
  frames: AnimationFrame[]
  metadata?: {
    fps?: number
    duration?: number
    frameCount?: number
    createdAt?: string
  }
}

export interface AnimationFrame {
  pose?: any[]
  leftHand?: any[]
  rightHand?: any[]
  face?: any[]
  timestamp?: number
}

export function createEmptyAnimation(word: string): AnimationData {
  return {
    word,
    frames: [],
    metadata: {
      fps: 30,
      frameCount: 0,
      createdAt: new Date().toISOString(),
    },
  }
}

export function addFrameToAnimation(animation: AnimationData, frame: AnimationFrame): AnimationData {
  const updatedAnimation = {
    ...animation,
    frames: [...animation.frames, frame],
    metadata: {
      ...animation.metadata,
      frameCount: animation.frames.length + 1,
      duration: ((animation.frames.length + 1) / (animation.metadata?.fps || 30)) * 1000, // duration in ms
    },
  }

  return updatedAnimation
}

export function serializeAnimation(animation: AnimationData): string {
  return JSON.stringify(animation)
}

export function deserializeAnimation(data: string): AnimationData {
  return JSON.parse(data)
}

export function compressAnimation(animation: AnimationData, targetFps = 15): AnimationData {
  if (!animation.frames.length) return animation

  const originalFps = animation.metadata?.fps || 30
  const frameInterval = Math.round(originalFps / targetFps)

  if (frameInterval <= 1) return animation

  const compressedFrames = animation.frames.filter((_, index) => index % frameInterval === 0)

  return {
    ...animation,
    frames: compressedFrames,
    metadata: {
      ...animation.metadata,
      fps: targetFps,
      frameCount: compressedFrames.length,
      duration: (compressedFrames.length / targetFps) * 1000, // duration in ms
    },
  }
}

export const animationUtils = {
  createEmptyAnimation,
  addFrameToAnimation,
  serializeAnimation,
  deserializeAnimation,
  compressAnimation,
}
