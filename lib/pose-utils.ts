// Constants for pose connections
export const POSE_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 7],
  [0, 4],
  [4, 5],
  [5, 6],
  [6, 8],
  [9, 10],
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [0, 11],
  [0, 12],
]

// Constants for hand connections
export const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
]

// Simplified face mesh tesselation (reduced for performance)
export const FACEMESH_TESSELATION = [
  [127, 34],
  [34, 139],
  [139, 127],
  [127, 162],
  [162, 21],
  [21, 54],
  [54, 127],
  [234, 127],
  [127, 93],
  [93, 132],
  [132, 58],
  [58, 172],
  [172, 234],
  [10, 338],
  [338, 297],
  [297, 332],
  [332, 284],
  [284, 251],
  [251, 389],
  [389, 356],
  [356, 454],
  [454, 323],
  [323, 361],
  [361, 288],
  [288, 397],
  [397, 365],
  [365, 379],
  [379, 378],
  [378, 400],
  [400, 377],
  [377, 152],
  [152, 148],
  [148, 176],
  [176, 149],
  [149, 150],
  [150, 136],
  [136, 172],
  [172, 58],
  [58, 132],
  [132, 93],
  [93, 234],
  [234, 127],
  [127, 162],
  [162, 21],
  [21, 54],
  [54, 103],
  [103, 67],
  [67, 109],
  [109, 10],
]

// Animation data structure
export interface AnimationData {
  word: string
  frames: AnimationFrame[]
  metadata?: {
    fps?: number
    duration?: number
    frameCount?: number
  }
}

export interface AnimationFrame {
  pose?: any[]
  leftHand?: any[]
  rightHand?: any[]
  face?: any[]
  timestamp?: number
}

// Helper function to draw landmarks on canvas
export function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: any[],
  options: { color: string; radius?: number; lineWidth?: number },
) {
  if (!landmarks || landmarks.length === 0) return

  const canvas = ctx.canvas
  const radius = options.radius || 3

  ctx.fillStyle = options.color

  for (const landmark of landmarks) {
    if (landmark.visibility && landmark.visibility < 0.1) continue

    ctx.beginPath()
    ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, radius, 0, 2 * Math.PI)
    ctx.fill()
  }
}

// Helper function to draw connections between landmarks
export function drawConnectors(
  ctx: CanvasRenderingContext2D,
  landmarks: any[],
  connections: number[][],
  options: { color: string; lineWidth?: number },
) {
  if (!landmarks || landmarks.length === 0) return

  const canvas = ctx.canvas
  const lineWidth = options.lineWidth || 2

  ctx.strokeStyle = options.color
  ctx.lineWidth = lineWidth

  for (const connection of connections) {
    const from = landmarks[connection[0]]
    const to = landmarks[connection[1]]

    if (!from || !to) continue
    if (from.visibility && to.visibility && (from.visibility < 0.1 || to.visibility < 0.1)) continue

    ctx.beginPath()
    ctx.moveTo(from.x * canvas.width, from.y * canvas.height)
    ctx.lineTo(to.x * canvas.width, to.y * canvas.height)
    ctx.stroke()
  }
}

// Extract landmarks from MediaPipe results
export function extractLandmarks(results: any): AnimationFrame {
  return {
    pose: results.poseLandmarks || [],
    leftHand: results.leftHandLandmarks || [],
    rightHand: results.rightHandLandmarks || [],
    face: results.faceLandmarks || [],
    timestamp: Date.now(),
  }
}

// Check if hands are detected in results
export function hasHandsDetected(results: any): boolean {
  const hasLeftHand = results.leftHandLandmarks && results.leftHandLandmarks.length > 0
  const hasRightHand = results.rightHandLandmarks && results.rightHandLandmarks.length > 0
  return hasLeftHand || hasRightHand
}

// Check if pose is detected in results
export function hasPoseDetected(results: any): boolean {
  return results.poseLandmarks && results.poseLandmarks.length > 0
}

// Check if face is detected in results
export function hasFaceDetected(results: any): boolean {
  return results.faceLandmarks && results.faceLandmarks.length > 0
}
