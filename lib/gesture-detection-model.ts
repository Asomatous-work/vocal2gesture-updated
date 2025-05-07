// Basic gesture detection model
export interface GestureDetectionResult {
  gesture: string
  confidence: number
}

export interface HandLandmark {
  x: number
  y: number
  z: number
}

// Simple gesture patterns (very basic implementation)
const gesturePatterns = [
  {
    name: "hello",
    description: "Open palm, fingers spread",
    pattern: (landmarks: HandLandmark[]) => {
      // This is a simplified check - in a real implementation,
      // you would use more sophisticated pattern matching
      if (!landmarks || landmarks.length < 21) return 0

      // Check if fingers are spread (very basic check)
      const fingersSpread =
        landmarks[8].y < landmarks[5].y && // index finger up
        landmarks[12].y < landmarks[9].y && // middle finger up
        landmarks[16].y < landmarks[13].y && // ring finger up
        landmarks[20].y < landmarks[17].y // pinky up

      return fingersSpread ? 0.8 : 0
    },
  },
  {
    name: "thank you",
    description: "Flat hand from mouth moving forward",
    pattern: (landmarks: HandLandmark[]) => {
      if (!landmarks || landmarks.length < 21) return 0

      // Check if hand is flat (simplified)
      const handFlat =
        Math.abs(landmarks[8].y - landmarks[12].y) < 0.05 &&
        Math.abs(landmarks[12].y - landmarks[16].y) < 0.05 &&
        Math.abs(landmarks[16].y - landmarks[20].y) < 0.05

      return handFlat ? 0.75 : 0
    },
  },
  {
    name: "yes",
    description: "Nodding motion with fist",
    pattern: (landmarks: HandLandmark[]) => {
      if (!landmarks || landmarks.length < 21) return 0

      // Check if hand is in fist position (simplified)
      const fist =
        landmarks[8].y > landmarks[5].y && // index finger down
        landmarks[12].y > landmarks[9].y && // middle finger down
        landmarks[16].y > landmarks[13].y && // ring finger down
        landmarks[20].y > landmarks[17].y // pinky down

      return fist ? 0.7 : 0
    },
  },
  {
    name: "no",
    description: "Side to side motion with index finger",
    pattern: (landmarks: HandLandmark[]) => {
      if (!landmarks || landmarks.length < 21) return 0

      // Check if only index finger is extended
      const indexOnly =
        landmarks[8].y < landmarks[5].y && // index finger up
        landmarks[12].y > landmarks[9].y && // middle finger down
        landmarks[16].y > landmarks[13].y && // ring finger down
        landmarks[20].y > landmarks[17].y // pinky down

      return indexOnly ? 0.85 : 0
    },
  },
  {
    name: "please",
    description: "Circular motion on chest with flat hand",
    pattern: (landmarks: HandLandmark[]) => {
      if (!landmarks || landmarks.length < 21) return 0

      // Check if hand is flat (simplified)
      const handFlat =
        Math.abs(landmarks[8].y - landmarks[12].y) < 0.05 &&
        Math.abs(landmarks[12].y - landmarks[16].y) < 0.05 &&
        Math.abs(landmarks[16].y - landmarks[20].y) < 0.05

      return handFlat ? 0.65 : 0
    },
  },
]

export class GestureDetectionModel {
  private lastDetectedGesture: string | null = null
  private gestureStartTime = 0
  private gestureHoldTime = 500 // ms to hold a gesture before detecting

  /**
   * Detect a gesture from hand landmarks
   * @param landmarks Hand landmarks from MediaPipe
   * @returns Detection result with gesture name and confidence
   */
  public detectGesture(landmarks: HandLandmark[]): GestureDetectionResult | null {
    if (!landmarks || landmarks.length === 0) {
      this.resetGestureDetection()
      return null
    }

    // Find the gesture with highest confidence
    let bestMatch: GestureDetectionResult | null = null
    let highestConfidence = 0

    for (const gesture of gesturePatterns) {
      const confidence = gesture.pattern(landmarks)

      if (confidence > highestConfidence && confidence > 0.6) {
        highestConfidence = confidence
        bestMatch = {
          gesture: gesture.name,
          confidence,
        }
      }
    }

    // If no gesture detected with sufficient confidence
    if (!bestMatch) {
      this.resetGestureDetection()
      return null
    }

    // Check if this is the same gesture as last time
    if (this.lastDetectedGesture === bestMatch.gesture) {
      // Check if we've held the gesture long enough
      if (Date.now() - this.gestureStartTime >= this.gestureHoldTime) {
        // We've held the gesture long enough, return it
        return bestMatch
      }
      // Still holding but not long enough yet
      return null
    } else {
      // New gesture detected, start timing
      this.lastDetectedGesture = bestMatch.gesture
      this.gestureStartTime = Date.now()
      return null
    }
  }

  /**
   * Reset the gesture detection state
   */
  private resetGestureDetection(): void {
    this.lastDetectedGesture = null
    this.gestureStartTime = 0
  }

  /**
   * Set the required hold time for gesture detection
   * @param timeMs Time in milliseconds
   */
  public setGestureHoldTime(timeMs: number): void {
    this.gestureHoldTime = timeMs
  }
}

// Create a singleton instance
let gestureDetectionModel: GestureDetectionModel | null = null

export function getGestureDetectionModel(): GestureDetectionModel {
  if (!gestureDetectionModel) {
    gestureDetectionModel = new GestureDetectionModel()
  }
  return gestureDetectionModel
}
