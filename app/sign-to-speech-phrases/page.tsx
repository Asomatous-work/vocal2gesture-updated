"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Camera, CameraOff, Volume2, RefreshCw, ToggleRight, ToggleLeft } from "lucide-react"
import { HolisticDetection } from "@/lib/mediapipe-holistic"
import { PhraseManager } from "@/components/phrase-manager"
import { BackButton } from "@/components/back-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface GestureModel {
  gestures: {
    name: string
    landmarks: any[]
    samples: number
  }[]
  metadata: {
    epochs: number
    accuracy: number
    finalLoss: number
    timestamp: string
  }
}

interface Phrase {
  id: string
  name: string
  gestures: string[]
  translation?: string
}

export default function SignToSpeechPhrasesPage() {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recognizedText, setRecognizedText] = useState("")
  const [loadedModel, setLoadedModel] = useState<GestureModel | null>(null)
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string; timestamp: string }[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>("")
  const [confidenceScore, setConfidenceScore] = useState<number>(0)
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.25)
  const [lastPredictions, setLastPredictions] = useState<{ gesture: string; confidence: number }[]>([])
  const [continuousRecognition, setContinuousRecognition] = useState<boolean>(true)
  const [recognizedGestures, setRecognizedGestures] = useState<string[]>([])
  const [detectedPhrase, setDetectedPhrase] = useState<Phrase | null>(null)
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [activeTab, setActiveTab] = useState("recognition")

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const holisticRef = useRef<HolisticDetection | null>(null)
  const fpsInterval = useRef<NodeJS.Timeout | null>(null)
  const frameCountRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(Date.now())
  const cameraInitialized = useRef<boolean>(false)
  const lastRecognitionTime = useRef<number>(0)
  const recognitionCooldown = 500 // 0.5 second cooldown between recognitions
  const gestureHistory = useRef<{ gesture: string; timestamp: number }[]>([])
  const stableGestureCount = useRef<{ [key: string]: number }>({})
  const lastRecognizedGesture = useRef<string>("")
  const phraseInProgressRef = useRef<boolean>(false)
  const phraseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Load available models from localStorage
  useEffect(() => {
    const loadSavedModels = () => {
      try {
        const savedModels = JSON.parse(localStorage.getItem("savedGestureModels") || "[]")
        setAvailableModels(savedModels)

        // Set the current model as selected if available
        const currentModelId = localStorage.getItem("currentGestureModel")
        if (currentModelId) {
          setSelectedModelId(currentModelId)
          loadModel(currentModelId)
        } else if (savedModels.length > 0) {
          setSelectedModelId(savedModels[0].id)
          loadModel(savedModels[0].id)
        }

        // Load saved phrases
        const savedPhrases = JSON.parse(localStorage.getItem("savedGesturePhrases") || "[]")
        setPhrases(savedPhrases)
      } catch (error) {
        console.error("Error loading saved models:", error)
      }
    }

    loadSavedModels()
  }, [])

  // Load a specific model from localStorage
  const loadModel = (modelId: string) => {
    try {
      const modelData = localStorage.getItem(modelId)
      if (!modelData) {
        toast({
          title: "Model Not Found",
          description: "The requested model could not be found in local storage.",
          variant: "destructive",
        })
        return
      }

      const model = JSON.parse(modelData) as GestureModel
      setLoadedModel(model)

      toast({
        title: "Model Loaded",
        description: `Loaded model with ${model.gestures.length} gestures.`,
      })
    } catch (error) {
      console.error("Error loading model:", error)
      toast({
        title: "Load Error",
        description: "There was an error loading your model.",
        variant: "destructive",
      })
    }
  }

  // Toggle camera
  const toggleCamera = async () => {
    if (isCameraActive) {
      // Stop the camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      if (holisticRef.current) {
        holisticRef.current.stop()
      }

      // Clear FPS interval
      if (fpsInterval.current) {
        clearInterval(fpsInterval.current)
        fpsInterval.current = null
      }

      setIsCameraActive(false)
      cameraInitialized.current = false
    } else {
      // Start the camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        })

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()

          // Wait for video to be ready
          await new Promise((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = () => resolve(null)
            }
          })
        }

        setIsCameraActive(true)
        toast({
          title: "Camera Activated",
          description: "Make hand gestures in front of the camera.",
        })

        // Initialize holistic detection
        await initializeHolistic()
        cameraInitialized.current = true

        // Reset gesture history and stable count
        gestureHistory.current = []
        stableGestureCount.current = {}
        setRecognizedGestures([])
      } catch (error) {
        console.error("Error accessing camera:", error)
        toast({
          title: "Camera Error",
          description: "Could not access your camera. Please check permissions.",
          variant: "destructive",
        })
      }
    }
  }

  // Initialize MediaPipe Holistic
  const initializeHolistic = async () => {
    console.log("Initializing MediaPipe Holistic...")

    if (holisticRef.current) {
      holisticRef.current.stop()
    }

    try {
      holisticRef.current = new HolisticDetection({
        onResults: (results) => {
          // Track frame time for FPS calculation
          const now = Date.now()
          const elapsed = now - lastFrameTimeRef.current
          lastFrameTimeRef.current = now
          frameCountRef.current++

          drawResults(results)

          // Only process for gesture recognition if we have a loaded model
          const hasLeftHand = results.leftHandLandmarks && results.leftHandLandmarks.length > 0
          const hasRightHand = results.rightHandLandmarks && results.rightHandLandmarks.length > 0

          if (loadedModel && (hasLeftHand || hasRightHand)) {
            const landmarks = extractLandmarks(results)

            // If continuous recognition is enabled or we're manually processing
            if (continuousRecognition || isProcessing) {
              // Check if we're past the cooldown period
              if (now - lastRecognitionTime.current >= recognitionCooldown) {
                recognizeGesture(landmarks)
                lastRecognitionTime.current = now
              }
            }
          }
        },
        onError: (error) => {
          console.error("MediaPipe Holistic error:", error)
        },
      })

      await holisticRef.current.initialize()
      console.log("MediaPipe Holistic initialized successfully")

      if (videoRef.current && isCameraActive) {
        console.log("Starting MediaPipe Holistic with video element")
        await holisticRef.current.start(videoRef.current)
        console.log("MediaPipe Holistic started successfully")

        // Start FPS calculation interval
        if (fpsInterval.current) {
          clearInterval(fpsInterval.current)
        }

        fpsInterval.current = setInterval(() => {
          frameCountRef.current = 0
        }, 1000)
      }

      return true
    } catch (error) {
      console.error("Failed to initialize MediaPipe Holistic:", error)
      toast({
        title: "Detection Error",
        description: "Failed to initialize hand detection. Please try restarting the camera.",
        variant: "destructive",
      })
      return false
    }
  }

  // Extract relevant landmarks from MediaPipe results
  const extractLandmarks = (results: any) => {
    const landmarks = {
      pose: results.poseLandmarks || [],
      leftHand: results.leftHandLandmarks || [],
      rightHand: results.rightHandLandmarks || [],
      face: results.faceLandmarks || [],
    }

    return landmarks
  }

  // Draw the detection results on canvas
  const drawResults = (results: any) => {
    if (!canvasRef.current || !videoRef.current) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    const width = videoRef.current.videoWidth
    const height = videoRef.current.videoHeight

    canvasRef.current.width = width
    canvasRef.current.height = height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw video frame
    ctx.drawImage(videoRef.current, 0, 0, width, height)

    // Draw hand landmarks
    const drawHand = (landmarks: any[], color: string) => {
      if (!landmarks || landmarks.length === 0) return

      ctx.fillStyle = color
      for (const landmark of landmarks) {
        ctx.beginPath()
        ctx.arc(landmark.x * width, landmark.y * height, 5, 0, 2 * Math.PI)
        ctx.fill()
      }

      // Connect landmarks with lines
      ctx.strokeStyle = color
      ctx.lineWidth = 2

      // Connect fingers
      const fingers = [
        [0, 1, 2, 3, 4], // thumb
        [0, 5, 6, 7, 8], // index
        [0, 9, 10, 11, 12], // middle
        [0, 13, 14, 15, 16], // ring
        [0, 17, 18, 19, 20], // pinky
      ]

      for (const finger of fingers) {
        ctx.beginPath()
        for (let i = 0; i < finger.length; i++) {
          const landmark = landmarks[finger[i]]
          if (i === 0) {
            ctx.moveTo(landmark.x * width, landmark.y * height)
          } else {
            ctx.lineTo(landmark.x * width, landmark.y * height)
          }
        }
        ctx.stroke()
      }
    }

    drawHand(results.leftHandLandmarks, "rgba(0, 0, 255, 0.7)")
    drawHand(results.rightHandLandmarks, "rgba(255, 0, 255, 0.7)")

    // Draw recognized gesture if available
    if (recognizedText) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
      ctx.fillRect(0, height - 40, width, 40)

      ctx.fillStyle = "white"
      ctx.font = "bold 20px Arial"
      ctx.textAlign = "center"
      ctx.fillText(recognizedText, width / 2, height - 15)
    }

    // Draw detected phrase if available
    if (detectedPhrase) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
      ctx.fillRect(0, 40, width, 40)

      ctx.fillStyle = "white"
      ctx.font = "bold 20px Arial"
      ctx.textAlign = "center"
      ctx.fillText(`Phrase: ${detectedPhrase.translation || detectedPhrase.name}`, width / 2, 65)
    }

    // Draw gesture sequence if in progress
    if (recognizedGestures.length > 0) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
      ctx.fillRect(0, height - 80, width, 40)

      ctx.fillStyle = "white"
      ctx.font = "bold 16px Arial"
      ctx.textAlign = "center"
      ctx.fillText(`Sequence: ${recognizedGestures.join(" → ")}`, width / 2, height - 55)
    }
  }

  // Recognize gesture using the loaded model
  const recognizeGesture = (currentLandmarks: any) => {
    if (!loadedModel || !currentLandmarks) return

    // Completely revised implementation with better normalization and comparison
    const predictions: { gesture: string; confidence: number }[] = []

    // For each gesture in the model
    for (const gesture of loadedModel.gestures) {
      let bestSimilarity = 0
      let totalSamples = 0

      // Compare with each sample of this gesture
      for (let i = 0; i < gesture.landmarks.length; i += 30) {
        // Assuming 30 frames per sample
        const sampleLandmarks = gesture.landmarks.slice(i, i + 30)
        if (sampleLandmarks.length === 0) continue

        // Find the middle frame as representative
        const midFrameIndex = Math.floor(sampleLandmarks.length / 2)
        const sampleFrame = sampleLandmarks[midFrameIndex]
        if (!sampleFrame) continue

        // Calculate similarity between current landmarks and this sample
        let similarity = 0

        // Check which hand to compare (prefer right hand if available)
        if (currentLandmarks.rightHand.length > 0 && sampleFrame.rightHand?.length > 0) {
          similarity = compareHandLandmarks(currentLandmarks.rightHand, sampleFrame.rightHand)
        } else if (currentLandmarks.leftHand.length > 0 && sampleFrame.leftHand?.length > 0) {
          similarity = compareHandLandmarks(currentLandmarks.leftHand, sampleFrame.leftHand)
        }

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity
        }

        totalSamples++
      }

      // Only add prediction if we had valid samples to compare
      if (totalSamples > 0) {
        predictions.push({
          gesture: gesture.name,
          confidence: bestSimilarity,
        })
      }
    }

    // Sort by confidence (highest first)
    predictions.sort((a, b) => b.confidence - a.confidence)

    // Update state with all predictions
    setLastPredictions(predictions)

    // If the top prediction has sufficient confidence
    if (predictions.length > 0 && predictions[0].confidence > confidenceThreshold) {
      const topGesture = predictions[0].gesture

      // Add to gesture history
      gestureHistory.current.push({
        gesture: topGesture,
        timestamp: Date.now(),
      })

      // Keep only recent history (last 3 seconds)
      const threeSecondsAgo = Date.now() - 3000
      gestureHistory.current = gestureHistory.current.filter((item) => item.timestamp >= threeSecondsAgo)

      // Count occurrences of each gesture in recent history
      const gestureCounts: { [key: string]: number } = {}
      gestureHistory.current.forEach((item) => {
        gestureCounts[item.gesture] = (gestureCounts[item.gesture] || 0) + 1
      })

      // Update stable gesture count
      stableGestureCount.current[topGesture] = (stableGestureCount.current[topGesture] || 0) + 1

      // Reset counts for other gestures
      Object.keys(stableGestureCount.current).forEach((gesture) => {
        if (gesture !== topGesture) {
          stableGestureCount.current[gesture] = 0
        }
      })

      // Only update recognized text if the gesture is stable (seen multiple times)
      const requiredStability = 3 // Need to see the same gesture 3 times to consider it stable
      if (stableGestureCount.current[topGesture] >= requiredStability) {
        // Only update and speak if it's a new gesture
        if (topGesture !== lastRecognizedGesture.current) {
          setRecognizedText(topGesture)
          setConfidenceScore(predictions[0].confidence * 100)
          speakText(topGesture)

          // Add to recognized gestures for phrase detection
          // Reset the phrase timeout if it exists
          if (phraseTimeoutRef.current) {
            clearTimeout(phraseTimeoutRef.current)
          }

          // Add the new gesture to the sequence
          setRecognizedGestures((prev) => {
            const updatedGestures = [...prev, topGesture]

            // Check if this sequence matches any saved phrases
            checkForPhraseMatch(updatedGestures)

            // Set a timeout to reset the sequence after 5 seconds of inactivity
            phraseTimeoutRef.current = setTimeout(() => {
              setRecognizedGestures([])
              phraseInProgressRef.current = false
            }, 5000)

            return updatedGestures
          })

          phraseInProgressRef.current = true
          lastRecognizedGesture.current = topGesture
        } else {
          // Just update the confidence if it's the same gesture
          setConfidenceScore(predictions[0].confidence * 100)
        }
      }
    }
  }

  // Check if the current gesture sequence matches any saved phrases
  const checkForPhraseMatch = (gestures: string[]) => {
    if (gestures.length === 0) return

    // Check each phrase for a match
    for (const phrase of phrases) {
      // Check if the current gesture sequence matches this phrase
      if (arraysEqual(gestures, phrase.gestures)) {
        // We found a match!
        setDetectedPhrase(phrase)

        // Speak the phrase translation
        if (phrase.translation) {
          speakText(phrase.translation)
        }

        // Show toast notification
        toast({
          title: "Phrase Detected!",
          description: `"${phrase.name}": ${phrase.translation || phrase.name}`,
          duration: 3000,
        })

        // Reset the gesture sequence after a successful match
        setTimeout(() => {
          setRecognizedGestures([])
          setDetectedPhrase(null)
          phraseInProgressRef.current = false
        }, 3000)

        return
      }
    }
  }

  // Helper function to check if two arrays have the same elements in the same order
  const arraysEqual = (a: any[], b: any[]) => {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false
    }
    return true
  }

  // Compare hand landmarks and return similarity score (0-1)
  const compareHandLandmarks = (currentHand: any[], sampleHand: any[]): number => {
    if (!currentHand || !sampleHand || currentHand.length === 0 || sampleHand.length === 0) {
      return 0
    }

    // Normalize the hand positions to be relative to the wrist (landmark 0)
    const normalizeHand = (hand: any[]) => {
      const wrist = hand[0]
      return hand.map((point) => ({
        x: point.x - wrist.x,
        y: point.y - wrist.y,
        z: (point.z || 0) - (wrist.z || 0),
      }))
    }

    const normalizedCurrent = normalizeHand(currentHand)
    const normalizedSample = normalizeHand(sampleHand)

    // Calculate the scale factor based on hand size
    const getHandSize = (hand: any[]) => {
      let maxDist = 0
      for (const point of hand) {
        const dist = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z)
        if (dist > maxDist) maxDist = dist
      }
      return maxDist
    }

    const currentSize = getHandSize(normalizedCurrent)
    const sampleSize = getHandSize(normalizedSample)

    // Scale factor to normalize hand sizes
    const scaleFactor = currentSize > 0 && sampleSize > 0 ? sampleSize / currentSize : 1

    // Calculate similarity between normalized landmarks
    let totalSimilarity = 0
    let pointCount = 0

    // Focus on fingertips (landmarks 4, 8, 12, 16, 20) and key joints
    const keyPoints = [4, 8, 12, 16, 20, 5, 9, 13, 17] // Fingertips and first knuckles

    for (const pointIdx of keyPoints) {
      if (pointIdx < normalizedCurrent.length && pointIdx < normalizedSample.length) {
        const currentPoint = normalizedCurrent[pointIdx]
        const samplePoint = normalizedSample[pointIdx]

        // Scale the current point
        const scaledPoint = {
          x: currentPoint.x * scaleFactor,
          y: currentPoint.y * scaleFactor,
          z: currentPoint.z * scaleFactor,
        }

        // Calculate Euclidean distance
        const distance = Math.sqrt(
          Math.pow(scaledPoint.x - samplePoint.x, 2) +
            Math.pow(scaledPoint.y - samplePoint.y, 2) +
            Math.pow(scaledPoint.z - samplePoint.z, 2),
        )

        // Convert distance to similarity (1 = identical, 0 = completely different)
        // Adjust the scaling factor as needed
        const similarity = Math.max(0, 1 - distance * 2)

        // Weight fingertips more heavily
        const weight = [4, 8, 12, 16, 20].includes(pointIdx) ? 2.0 : 1.0

        totalSimilarity += similarity * weight
        pointCount += weight
      }
    }

    return pointCount > 0 ? totalSimilarity / pointCount : 0
  }

  // Process gesture recognition
  const processGesture = async () => {
    if (!isCameraActive) {
      toast({
        title: "Camera Inactive",
        description: "Please activate the camera first.",
        variant: "destructive",
      })
      return
    }

    if (!loadedModel) {
      toast({
        title: "No Model Loaded",
        description: "Please load a trained gesture model first.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    // The actual recognition happens continuously in the onResults callback
    setTimeout(() => {
      setIsProcessing(false)
    }, 1000)
  }

  // Speak the recognized text
  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      window.speechSynthesis.speak(utterance)
    }
  }

  // Reset recognition
  const resetRecognition = () => {
    setRecognizedText("")
    setConfidenceScore(0)
    setLastPredictions([])
    setRecognizedGestures([])
    setDetectedPhrase(null)
    gestureHistory.current = []
    stableGestureCount.current = {}
    lastRecognizedGesture.current = ""

    if (phraseTimeoutRef.current) {
      clearTimeout(phraseTimeoutRef.current)
      phraseTimeoutRef.current = null
    }

    phraseInProgressRef.current = false
  }

  // Handle model selection change
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = e.target.value
    setSelectedModelId(modelId)
    loadModel(modelId)
  }

  // Toggle continuous recognition
  const toggleContinuousRecognition = () => {
    setContinuousRecognition(!continuousRecognition)
    toast({
      title: continuousRecognition ? "Continuous Recognition Disabled" : "Continuous Recognition Enabled",
      description: continuousRecognition
        ? "You'll need to press the Recognize button manually"
        : "Gestures will be recognized automatically",
    })
  }

  // Save phrases to localStorage
  const handleSavePhrases = (updatedPhrases: Phrase[]) => {
    setPhrases(updatedPhrases)
    localStorage.setItem("savedGesturePhrases", JSON.stringify(updatedPhrases))

    toast({
      title: "Phrases Saved",
      description: `Saved ${updatedPhrases.length} phrases to local storage.`,
    })
  }

  // Get available gestures from loaded model
  const getAvailableGestures = () => {
    if (!loadedModel) return []
    return loadedModel.gestures.map((g) => g.name)
  }

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (holisticRef.current) {
        holisticRef.current.stop()
      }

      if (fpsInterval.current) {
        clearInterval(fpsInterval.current)
      }

      if (phraseTimeoutRef.current) {
        clearTimeout(phraseTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <BackButton />
      </div>

      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Sign Language Phrase Detection</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Create and detect sequences of gestures to form complete phrases
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="recognition">Recognition</TabsTrigger>
          <TabsTrigger value="phrases">Phrase Manager</TabsTrigger>
        </TabsList>

        <TabsContent value="recognition" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Camera View */}
            <div>
              <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
                <CardContent className="p-8">
                  <div className="flex flex-col items-center">
                    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-6">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`absolute inset-0 w-full h-full object-cover ${isCameraActive ? "opacity-100" : "opacity-0"}`}
                      />
                      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                      {!isCameraActive && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <p className="text-white">Camera is off</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 mb-6 w-full">
                      <Button
                        onClick={toggleCamera}
                        className={`flex-1 ${
                          isCameraActive
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                        }`}
                      >
                        {isCameraActive ? <CameraOff className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
                        {isCameraActive ? "Stop Camera" : "Start Camera"}
                      </Button>

                      <Button
                        onClick={processGesture}
                        disabled={!isCameraActive || isProcessing || !loadedModel || continuousRecognition}
                        className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Recognize Gesture"
                        )}
                      </Button>
                    </div>

                    <div className="w-full mb-4">
                      <label htmlFor="model-select" className="block text-sm font-medium mb-2">
                        Select Trained Model
                      </label>
                      <select
                        id="model-select"
                        value={selectedModelId}
                        onChange={handleModelChange}
                        className="w-full p-2 border rounded-md bg-background"
                        disabled={isCameraActive}
                      >
                        <option value="">Select a model</option>
                        {availableModels.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name} ({new Date(model.timestamp).toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <label htmlFor="confidence-threshold" className="block text-sm font-medium">
                          Confidence Threshold: {(confidenceThreshold * 100).toFixed(0)}%
                        </label>
                      </div>
                      <input
                        id="confidence-threshold"
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.05"
                        value={confidenceThreshold}
                        onChange={(e) => setConfidenceThreshold(Number.parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Less strict (10%)</span>
                        <span>More strict (90%)</span>
                      </div>
                    </div>

                    <div className="w-full mt-4 flex items-center justify-between">
                      <span className="text-sm font-medium">Continuous Recognition:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleContinuousRecognition}
                        className="flex items-center gap-2"
                      >
                        {continuousRecognition ? (
                          <>
                            <ToggleRight className="h-6 w-6 text-green-500" />
                            <span className="text-green-500">ON</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-6 w-6 text-gray-500" />
                            <span className="text-gray-500">OFF</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recognition Results */}
            <div>
              <Card className="overflow-hidden border-none shadow-lg bg-background">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold mb-2">Recognized Gesture</h3>
                    <p className="text-muted-foreground text-sm">The translation of your sign language gestures</p>
                  </div>

                  <div className="min-h-[100px] flex items-center justify-center">
                    {recognizedText ? (
                      <div className="text-center">
                        <p className="text-3xl font-bold mb-2">{recognizedText}</p>
                        {confidenceScore > 0 && (
                          <p className="text-sm text-muted-foreground mb-6">
                            Confidence: {confidenceScore.toFixed(1)}%
                          </p>
                        )}
                        <Button
                          onClick={() => speakText(recognizedText)}
                          className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                        >
                          <Volume2 className="mr-2 h-4 w-4" />
                          Speak Again
                        </Button>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center">Recognized gestures will appear here</p>
                    )}
                  </div>

                  {detectedPhrase && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg">
                      <h4 className="font-medium text-center mb-2">Detected Phrase</h4>
                      <p className="text-xl font-bold text-center mb-2">{detectedPhrase.name}</p>
                      <p className="text-center text-muted-foreground">
                        {detectedPhrase.translation || detectedPhrase.name}
                      </p>
                    </div>
                  )}

                  {recognizedGestures.length > 0 && (
                    <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-medium mb-2">Current Gesture Sequence</h4>
                      <div className="flex flex-wrap gap-2">
                        {recognizedGestures.map((gesture, index) => (
                          <div key={index} className="bg-background px-3 py-1 rounded-full flex items-center">
                            <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2">
                              {index + 1}
                            </span>
                            {gesture}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-8">
                    <Button variant="outline" onClick={resetRecognition} className="w-full">
                      Reset Recognition
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="phrases" className="mt-4">
          <PhraseManager
            availableGestures={getAvailableGestures()}
            onSavePhrases={handleSavePhrases}
            initialPhrases={phrases}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
