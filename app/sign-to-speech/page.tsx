"use client"

import { useState, useEffect, useRef } from "react"
import { useToast } from "@/components/ui/use-toast"
import { HolisticDetection } from "@/lib/mediapipe-holistic"
import { LSTMGestureModel } from "@/lib/lstm-gesture-model"
import { modelManager } from "@/lib/model-manager"
import * as tf from "@tensorflow/tfjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, CameraOff, RefreshCw, Github, Brain, Settings, History } from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"

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
  translation: string
}

export default function SignToSpeechPage() {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recognizedText, setRecognizedText] = useState("")
  const [loadedModel, setLoadedModel] = useState<GestureModel | null>(null)
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string; timestamp: string }[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>("")
  const [confidenceScore, setConfidenceScore] = useState<number>(0)
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.25)
  const [lastPredictions, setLastPredictions] = useState<{ gesture: string; confidence: number }[]>([])
  const [debugMode, setDebugMode] = useState<boolean>(true)
  const [continuousRecognition, setContinuousRecognition] = useState<boolean>(true)
  const [debugInfo, setDebugInfo] = useState<{
    fps: number
    handDetected: boolean
    processingTime: number
    lastFrameTime: number
    frameCount: number
    lastGesture: string
  }>({
    fps: 0,
    handDetected: false,
    processingTime: 0,
    lastFrameTime: Date.now(),
    frameCount: 0,
    lastGesture: "",
  })
  const [currentDetection, setCurrentDetection] = useState<string>("")
  const [useLSTM, setUseLSTM] = useState<boolean>(true)
  const [isLSTMLoaded, setIsLSTMLoaded] = useState<boolean>(false)
  const [isLoadingFromGitHub, setIsLoadingFromGitHub] = useState<boolean>(false)
  const [recognitionDelay, setRecognitionDelay] = useState<number>(500)
  const [detectionHistory, setDetectionHistory] = useState<
    { gesture: string; confidence: number; timestamp: number }[]
  >([])

  // Phrase detection states
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [recognizedPhrase, setRecognizedPhrase] = useState<Phrase | null>(null)
  const [recognizedGestures, setRecognizedGestures] = useState<string[]>([])
  const [phraseDetectionEnabled, setPhraseDetectionEnabled] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<string>("recognition")

  const fpsInterval = useRef<NodeJS.Timeout | null>(null)
  const frameCountRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(Date.now())
  const cameraInitialized = useRef<boolean>(false)
  const lastRecognitionTime = useRef<number>(0)
  const gestureHistory = useRef<{ gesture: string; timestamp: number }[]>([])
  const stableGestureCount = useRef<{ [key: string]: number }>({})
  const lastRecognizedGesture = useRef<string>("")
  const phraseInProgressRef = useRef<boolean>(false)
  const phraseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lstmModelRef = useRef<LSTMGestureModel | null>(null)
  const landmarksBufferRef = useRef<any[]>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const holisticRef = useRef<HolisticDetection | null>(null)
  const { toast } = useToast()

  // Initialize TensorFlow.js and load LSTM model
  useEffect(() => {
    const initTF = async () => {
      if (useLSTM) {
        try {
          await tf.ready()
          console.log("TensorFlow.js initialized")

          // Try to load existing LSTM model
          const savedModels = JSON.parse(localStorage.getItem("savedLSTMModels") || "[]")
          if (savedModels.length > 0) {
            const latestModel = savedModels[savedModels.length - 1]

            try {
              // Create LSTM model instance
              const config = {
                sequenceLength: 30,
                numFeatures: 63,
                numClasses: 0,
                hiddenUnits: 64,
                learningRate: 0.001,
              }

              lstmModelRef.current = new LSTMGestureModel(config)
              const loaded = await lstmModelRef.current.loadFromLocalStorage(latestModel.id)

              if (loaded) {
                console.log("LSTM model loaded successfully")
                setIsLSTMLoaded(true)
                toast({
                  title: "LSTM Model Loaded",
                  description: `Loaded model: ${latestModel.name}`,
                })
              } else {
                console.warn("Failed to load LSTM model")
                setIsLSTMLoaded(false)
              }
            } catch (error) {
              console.error("Error loading LSTM model:", error)
              setIsLSTMLoaded(false)
            }
          } else {
            console.log("No saved LSTM models found")
            setIsLSTMLoaded(false)
          }
        } catch (error) {
          console.error("Error initializing TensorFlow.js:", error)
          setUseLSTM(false)
        }
      }
    }

    initTF()

    // Load available models from localStorage
    loadSavedModels()

    // Load saved phrases
    const savedPhrases = JSON.parse(localStorage.getItem("savedGesturePhrases") || "[]")
    setPhrases(savedPhrases)

    return () => {
      // Clean up TensorFlow resources
      if (lstmModelRef.current) {
        lstmModelRef.current.dispose()
      }
    }
  }, [toast])

  // Load available models from localStorage
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
    } catch (error) {
      console.error("Error loading saved models:", error)
    }
  }

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
        landmarksBufferRef.current = []
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

          // Update debug info
          setDebugInfo((prev) => ({
            ...prev,
            handDetected:
              (results.leftHandLandmarks && results.leftHandLandmarks.length > 0) ||
              (results.rightHandLandmarks && results.rightHandLandmarks.length > 0),
            lastFrameTime: now,
            frameCount: frameCountRef.current,
          }))

          drawResults(results)

          // Extract landmarks for recognition
          const landmarks = extractLandmarks(results)
          const hasHands =
            (results.leftHandLandmarks && results.leftHandLandmarks.length > 0) ||
            (results.rightHandLandmarks && results.rightHandLandmarks.length > 0)

          if (hasHands) {
            // Add to landmarks buffer for LSTM
            if (useLSTM) {
              landmarksBufferRef.current.push(landmarks)

              // Keep only the most recent frames
              if (landmarksBufferRef.current.length > 30) {
                landmarksBufferRef.current.shift()
              }

              // If we have enough frames and continuous recognition is enabled
              if (landmarksBufferRef.current.length >= 30 && continuousRecognition && isLSTMLoaded) {
                // Check if we're past the cooldown period
                if (now - lastRecognitionTime.current >= recognitionDelay) {
                  recognizeGestureWithLSTM(landmarksBufferRef.current)
                  lastRecognitionTime.current = now
                }
              }
            } else if (loadedModel && continuousRecognition) {
              // Use traditional recognition
              if (now - lastRecognitionTime.current >= recognitionDelay) {
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
          const now = Date.now()
          const elapsed = now - debugInfo.lastFrameTime
          const fps = Math.round((frameCountRef.current * 1000) / elapsed)

          setDebugInfo((prev) => ({
            ...prev,
            fps,
          }))

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
      // Create a floating window in the bottom-left corner
      const padding = 10
      const boxWidth = 200
      const boxHeight = 60
      const cornerRadius = 8

      // Draw background with rounded corners
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.beginPath()
      ctx.moveTo(padding + cornerRadius, padding)
      ctx.lineTo(padding + boxWidth - cornerRadius, padding)
      ctx.arcTo(padding + boxWidth, padding, padding + boxWidth, padding + cornerRadius, cornerRadius)
      ctx.lineTo(padding + boxWidth, padding + boxHeight - cornerRadius)
      ctx.arcTo(
        padding + boxWidth,
        padding + boxHeight,
        padding + boxWidth - cornerRadius,
        padding + boxHeight,
        cornerRadius,
      )
      ctx.lineTo(padding + cornerRadius, padding + boxHeight)
      ctx.arcTo(padding, padding + boxHeight, padding, padding + boxHeight - cornerRadius, cornerRadius)
      ctx.lineTo(padding, padding + cornerRadius)
      ctx.arcTo(padding, padding, padding + cornerRadius, padding, cornerRadius)
      ctx.closePath()
      ctx.fill()

      // Draw gesture name
      ctx.fillStyle = "white"
      ctx.font = "bold 18px Arial"
      ctx.textAlign = "left"
      ctx.fillText(recognizedText, padding + 10, padding + 25)

      // Draw confidence percentage
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
      ctx.font = "14px Arial"
      ctx.fillText(`${confidenceScore.toFixed(1)}% confidence`, padding + 10, padding + 45)
    }

    // Draw recognized phrase if available
    if (recognizedPhrase) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
      ctx.fillRect(0, 40, width, 40)

      ctx.fillStyle = "white"
      ctx.font = "bold 20px Arial"
      ctx.textAlign = "center"
      ctx.fillText(`Phrase: ${recognizedPhrase.translation || recognizedPhrase.name}`, width / 2, 65)
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

    // Draw debug info if enabled
    if (debugMode) {
      const debugX = width - 150
      const debugY = 20
      const lineHeight = 20

      ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
      ctx.fillRect(debugX - 10, debugY - 15, 160, 100)

      ctx.fillStyle = "white"
      ctx.font = "12px monospace"
      ctx.textAlign = "left"
      ctx.fillText(`FPS: ${debugInfo.fps}`, debugX, debugY + lineHeight * 0)
      ctx.fillText(`Hands: ${debugInfo.handDetected ? "YES" : "NO"}`, debugX, debugY + lineHeight * 1)
      ctx.fillText(`Mode: ${useLSTM ? "LSTM" : "Traditional"}`, debugX, debugY + lineHeight * 2)
      ctx.fillText(`LSTM: ${isLSTMLoaded ? "Loaded" : "Not Loaded"}`, debugX, debugY + lineHeight * 3)
      ctx.fillText(`Buffer: ${landmarksBufferRef.current.length}/30`, debugX, debugY + lineHeight * 4)
    }
  }

  // Recognize gesture using the LSTM model
  const recognizeGestureWithLSTM = async (landmarksBuffer: any[]) => {
    if (!lstmModelRef.current || !isLSTMLoaded) return

    try {
      const startTime = performance.now()

      // Use the LSTM model to predict the gesture
      const prediction = lstmModelRef.current.predict(landmarksBuffer)

      const endTime = performance.now()
      const processingTime = endTime - startTime

      // Update debug info
      setDebugInfo((prev) => ({
        ...prev,
        processingTime,
        lastGesture: prediction.label,
      }))

      // Only update if confidence is above threshold
      if (prediction.confidence > confidenceThreshold) {
        const gesture = prediction.label
        const confidence = prediction.confidence * 100

        // Add to gesture history
        gestureHistory.current.push({
          gesture,
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
        stableGestureCount.current[gesture] = (stableGestureCount.current[gesture] || 0) + 1

        // Reset counts for other gestures
        Object.keys(stableGestureCount.current).forEach((g) => {
          if (g !== gesture) {
            stableGestureCount.current[g] = 0
          }
        })

        // Only update recognized text if the gesture is stable (seen multiple times)
        const requiredStability = 3 // Need to see the same gesture 3 times to consider it stable
        if (stableGestureCount.current[gesture] >= requiredStability) {
          // Only update and speak if it's a new gesture
          if (gesture !== lastRecognizedGesture.current) {
            setRecognizedText(gesture)
            setConfidenceScore(confidence)
            speakText(gesture)

            // Add to detection history
            setDetectionHistory((prev) => {
              const newHistory = [
                { gesture, confidence, timestamp: Date.now() },
                ...prev.slice(0, 19), // Keep only the 20 most recent detections
              ]
              return newHistory
            })

            // Add to recognized gestures for phrase detection
            if (phraseDetectionEnabled) {
              // Reset the phrase timeout if it exists
              if (phraseTimeoutRef.current) {
                clearTimeout(phraseTimeoutRef.current)
              }

              // Add the new gesture to the sequence
              setRecognizedGestures((prev) => {
                const updatedGestures = [...prev, gesture]

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
            }

            lastRecognizedGesture.current = gesture
          } else {
            // Just update the confidence if it's the same gesture
            setConfidenceScore(confidence)
          }
        }
      }
    } catch (error) {
      console.error("Error recognizing gesture with LSTM:", error)
    }
  }

  // Recognize gesture using the traditional model
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

          // Add to detection history
          setDetectionHistory((prev) => {
            const newHistory = [
              { gesture: topGesture, confidence: predictions[0].confidence * 100, timestamp: Date.now() },
              ...prev.slice(0, 19), // Keep only the 20 most recent detections
            ]
            return newHistory
          })

          // Add to recognized gestures for phrase detection
          if (phraseDetectionEnabled) {
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
          }

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
        setRecognizedPhrase(phrase)

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
          setRecognizedPhrase(null)
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
      return hand.map((landmark) => ({
        x: landmark.x - wrist.x,
        y: landmark.y - wrist.y,
        z: landmark.z ? landmark.z - (wrist.z || 0) : 0,
      }))
    }

    const normalizedCurrent = normalizeHand(currentHand)
    const normalizedSample = normalizeHand(sampleHand)

    // Calculate Euclidean distance between corresponding landmarks
    let totalDistance = 0
    let maxDistance = 0
    const numLandmarks = Math.min(normalizedCurrent.length, normalizedSample.length)

    for (let i = 0; i < numLandmarks; i++) {
      const current = normalizedCurrent[i]
      const sample = normalizedSample[i]

      const distance = Math.sqrt(
        Math.pow(current.x - sample.x, 2) + Math.pow(current.y - sample.y, 2) + Math.pow(current.z - sample.z, 2),
      )

      totalDistance += distance
      maxDistance = Math.max(maxDistance, distance)
    }

    // Calculate average distance
    const avgDistance = totalDistance / numLandmarks

    // Convert distance to similarity score (0-1)
    // Lower distance = higher similarity
    const similarity = Math.max(0, 1 - avgDistance * 5) // Scale factor of 5 to make the similarity more sensitive

    return similarity
  }

  // Speak the recognized text using the Web Speech API
  const speakText = (text: string) => {
    if (!text || !window.speechSynthesis) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    window.speechSynthesis.speak(utterance)
  }

  // Load model from GitHub
  const loadModelFromGitHub = async () => {
    setIsLoadingFromGitHub(true)

    try {
      // Initialize GitHub integration if not already done
      const githubSettings = JSON.parse(localStorage.getItem("githubSettings") || "{}")
      if (!githubSettings.owner || !githubSettings.repo) {
        toast({
          title: "GitHub Settings Missing",
          description: "Please configure your GitHub settings in the Model Management page.",
          variant: "destructive",
        })
        setIsLoadingFromGitHub(false)
        return
      }

      // Initialize GitHub integration
      modelManager.initGitHub({
        owner: githubSettings.owner,
        repo: githubSettings.repo,
        branch: githubSettings.branch || "main",
      })

      // Load from GitHub
      const success = await modelManager.loadFromGitHub()

      if (success) {
        toast({
          title: "GitHub Load Successful",
          description: "Your models have been loaded from GitHub.",
        })

        // Try to load LSTM model data if available
        try {
          const lstmModelData = localStorage.getItem("lstm_model_data")
          if (lstmModelData && lstmModelRef.current) {
            const modelData = JSON.parse(lstmModelData)
            const imported = await lstmModelRef.current.importFromGitHub(modelData)

            if (imported) {
              setIsLSTMLoaded(true)
              toast({
                title: "LSTM Model Loaded",
                description: "LSTM model loaded from GitHub successfully.",
              })
            }
          }
        } catch (error) {
          console.error("Error loading LSTM model from GitHub:", error)
        }

        // Reload available models
        loadSavedModels()
      } else {
        toast({
          title: "GitHub Load Failed",
          description: "Failed to load models from GitHub. Please check your settings.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading from GitHub:", error)
      toast({
        title: "GitHub Error",
        description: "An error occurred while loading from GitHub.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingFromGitHub(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center mb-4">
          <Image src="/images/gesture-logo.png" alt="Vocal2Gestures Logo" width={60} height={60} className="mr-3" />
          <h2 className="text-3xl md:text-4xl font-bold">Sign to Speech Recognition</h2>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Use hand gestures to communicate with real-time sign language recognition powered by LSTM neural networks.
        </p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
          <TabsTrigger value="recognition">Recognition</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="recognition" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Camera View */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Camera className="mr-2 h-5 w-5" />
                      <CardTitle>Camera View</CardTitle>
                    </div>
                    <Button onClick={toggleCamera} variant={isCameraActive ? "destructive" : "default"} size="sm">
                      {isCameraActive ? <CameraOff className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
                      {isCameraActive ? "Stop Camera" : "Start Camera"}
                    </Button>
                  </div>
                  <CardDescription>Position your hands in the camera view to detect gestures</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ objectFit: "cover" }}
                      className={`absolute inset-0 w-full h-full ${isCameraActive ? "opacity-100" : "opacity-0"}`}
                    />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                    {!isCameraActive && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-white">Camera is off</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch id="lstm-mode" checked={useLSTM} onCheckedChange={setUseLSTM} disabled={isProcessing} />
                        <Label htmlFor="lstm-mode">Use LSTM Model</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="continuous-recognition"
                          checked={continuousRecognition}
                          onCheckedChange={setContinuousRecognition}
                        />
                        <Label htmlFor="continuous-recognition">Continuous Recognition</Label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch id="debug-mode" checked={debugMode} onCheckedChange={setDebugMode} />
                        <Label htmlFor="debug-mode">Debug Mode</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="phrase-detection"
                          checked={phraseDetectionEnabled}
                          onCheckedChange={setPhraseDetectionEnabled}
                        />
                        <Label htmlFor="phrase-detection">Phrase Detection</Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recognition Results */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Brain className="mr-2 h-5 w-5" />
                      <CardTitle>Recognition Results</CardTitle>
                    </div>
                    <Button onClick={loadModelFromGitHub} variant="outline" size="sm" disabled={isLoadingFromGitHub}>
                      {isLoadingFromGitHub ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Github className="mr-2 h-4 w-4" />
                      )}
                      Load from GitHub
                    </Button>
                  </div>
                  <CardDescription>
                    {useLSTM
                      ? "Using LSTM neural network for gesture recognition"
                      : "Using traditional model for gesture recognition"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Current Recognition */}
                    <div className="p-6 bg-background rounded-lg text-center">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Current Recognition</h3>
                      <div className="text-4xl font-bold mb-2">{recognizedText || "..."}</div>
                      {recognizedText && (
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                          <div
                            className="bg-gradient-to-r from-purple-600 to-pink-600 h-2.5 rounded-full"
                            style={{ width: `${confidenceScore}%` }}
                          ></div>
                        </div>
                      )}
                    </div>

                    {/* Phrase Recognition */}
                    {phraseDetectionEnabled && (
                      <div className="p-4 bg-background rounded-lg">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Gesture Sequence</h3>
                        {recognizedGestures.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {recognizedGestures.map((gesture, index) => (
                              <div
                                key={index}
                                className="px-3 py-1 bg-purple-100 dark:bg-purple-900 rounded-full text-sm"
                              >
                                {gesture}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">No gesture sequence detected</p>
                        )}

                        {recognizedPhrase && (
                          <div className="mt-4 p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                            <p className="font-medium">{recognizedPhrase.name}</p>
                            <p className="text-sm">{recognizedPhrase.translation}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Top Predictions */}
                    {lastPredictions.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Top Predictions</h3>
                        <div className="space-y-2">
                          {lastPredictions.slice(0, 3).map((prediction, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span>{prediction.gesture}</span>
                              <div className="flex items-center">
                                <div className="w-24 bg-gray-200 rounded-full h-2 mr-2 dark:bg-gray-700">
                                  <div
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full"
                                    style={{ width: `${prediction.confidence * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs">{(prediction.confidence * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                <CardTitle>Recognition Settings</CardTitle>
              </div>
              <CardDescription>Configure gesture recognition parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Model Selection */}
                <div className="space-y-2">
                  <Label htmlFor="model-selection">Recognition Model</Label>
                  <Select
                    value={selectedModelId}
                    onValueChange={(value) => {
                      setSelectedModelId(value)
                      loadModel(value)
                    }}
                  >
                    <SelectTrigger id="model-selection">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select the model to use for traditional gesture recognition
                  </p>
                </div>

                {/* Confidence Threshold */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="confidence-threshold">Confidence Threshold</Label>
                    <span>{(confidenceThreshold * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    id="confidence-threshold"
                    min={0.1}
                    max={0.9}
                    step={0.05}
                    value={[confidenceThreshold]}
                    onValueChange={(value) => setConfidenceThreshold(value[0])}
                  />
                  <p className="text-xs text-muted-foreground">
                    Adjust how confident the system needs to be before recognizing a gesture
                  </p>
                </div>

                {/* Recognition Delay */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="recognition-delay">Recognition Delay</Label>
                    <span>{recognitionDelay}ms</span>
                  </div>
                  <Slider
                    id="recognition-delay"
                    min={100}
                    max={1000}
                    step={50}
                    value={[recognitionDelay]}
                    onValueChange={(value) => setRecognitionDelay(value[0])}
                  />
                  <p className="text-xs text-muted-foreground">
                    Adjust the delay between recognition attempts (lower = more responsive, higher = more stable)
                  </p>
                </div>

                {/* Model Type */}
                <div className="space-y-2">
                  <Label>Recognition Model Type</Label>
                  <div className="flex items-center space-x-2">
                    <Switch id="use-lstm" checked={useLSTM} onCheckedChange={setUseLSTM} />
                    <Label htmlFor="use-lstm">Use LSTM Neural Network</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    LSTM models provide better temporal understanding of gestures but require more processing power
                  </p>
                </div>

                {/* GitHub Integration */}
                <div className="space-y-2">
                  <Label>GitHub Integration</Label>
                  <Button
                    onClick={loadModelFromGitHub}
                    variant="outline"
                    className="w-full"
                    disabled={isLoadingFromGitHub}
                  >
                    {isLoadingFromGitHub ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Github className="mr-2 h-4 w-4" />
                    )}
                    Load Models from GitHub
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Load your trained models from GitHub for cross-device usage
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="flex items-center">
                <History className="mr-2 h-5 w-5" />
                <CardTitle>Detection History</CardTitle>
              </div>
              <CardDescription>Recent gesture detections and their confidence scores</CardDescription>
            </CardHeader>
            <CardContent>
              {detectionHistory.length > 0 ? (
                <div className="space-y-4">
                  {detectionHistory.map((detection, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-background rounded-lg">
                      <div>
                        <p className="font-medium">{detection.gesture}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(detection.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2 dark:bg-gray-700">
                          <div
                            className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full"
                            style={{ width: `${detection.confidence}%` }}
                          ></div>
                        </div>
                        <span className="text-xs">{detection.confidence.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No detection history available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start the camera and make gestures to see the detection history
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
