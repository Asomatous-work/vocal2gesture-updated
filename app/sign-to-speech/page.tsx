"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Camera, CameraOff, Volume2, VolumeX, History, Loader2, Download, Upload, Save } from "lucide-react"
import { HolisticDetection } from "@/lib/mediapipe-holistic"
import { modelManager } from "@/lib/model-manager"
import { LSTMGestureModel } from "@/lib/lstm-gesture-model"
import { GestureConfidenceVisualizer } from "@/components/gesture-confidence-visualizer"
import { DetectionHistoryLog } from "@/components/detection-history-log"
import { GestureRecognitionDelaySlider } from "@/components/gesture-recognition-delay-slider"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Skeleton } from "@/components/ui/skeleton-loader"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { put } from "@vercel/blob"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BackButton } from "@/components/back-button"

interface DetectedGesture {
  name: string
  confidence: number
  timestamp: number
}

interface LogEntry {
  id: number
  type: "info" | "success" | "error" | "warning"
  message: string
  timestamp: Date
}

export default function SignToSpeechPage() {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true)
  const [recognizedGesture, setRecognizedGesture] = useState<string>("")
  const [confidenceScores, setConfidenceScores] = useState<{ [key: string]: number }>({})
  const [detectionHistory, setDetectionHistory] = useState<DetectedGesture[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [recognitionDelay, setRecognitionDelay] = useState(500)
  const [showDetectionHistory, setShowDetectionHistory] = useState(false)
  const [lastDetectionTime, setLastDetectionTime] = useState(0)
  const [isCameraInitializing, setIsCameraInitializing] = useState(false)
  const [activeTab, setActiveTab] = useState("camera")
  const [gestureName, setGestureName] = useState("")
  const [isCollecting, setIsCollecting] = useState(false)
  const [collectionProgress, setCollectionProgress] = useState(0)
  const [sampleFrameCount, setSampleFrameCount] = useState(0)
  const [totalSampleFrames] = useState(30)
  const [handDetected, setHandDetected] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [githubToken, setGithubToken] = useState<string>("")
  const [isSavingToken, setIsSavingToken] = useState(false)
  const [githubTokenSaved, setGithubTokenSaved] = useState(false)
  const [collectedGestures, setCollectedGestures] = useState<
    {
      name: string
      landmarks: any[]
      samples: number
    }[]
  >([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const holisticRef = useRef<HolisticDetection | null>(null)
  const lstmModelRef = useRef<LSTMGestureModel | null>(null)
  const recognitionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const landmarksRef = useRef<any[]>([])
  const collectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const collectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Initialize models and load from GitHub if available
  const initModels = async () => {
    setIsLoading(true)
    try {
      // First check if we have models in local storage
      const localLoaded = await modelManager.loadFromLocalStorage()

      // Only try GitHub if local storage doesn't have models
      if (!localLoaded) {
        try {
          // Check if GitHub is configured before attempting to load
          const githubSettings = localStorage.getItem("githubSettings")
          if (githubSettings) {
            const config = JSON.parse(githubSettings)
            if (config.owner && config.repo && config.token) {
              // GitHub is properly configured, try to load
              const loaded = await modelManager.loadFromGitHub()
              if (loaded) {
                toast({
                  title: "Models Loaded",
                  description: "Successfully loaded models from GitHub.",
                })
              }
            } else {
              console.log("GitHub not fully configured, skipping GitHub load")
            }
          }
        } catch (githubError) {
          console.error("Error loading from GitHub:", githubError)
          // Continue with local storage if GitHub fails
        }
      } else {
        toast({
          title: "Models Loaded",
          description: "Successfully loaded models from local storage.",
        })
      }

      // Initialize LSTM model if available
      try {
        const savedModels = JSON.parse(localStorage.getItem("savedLSTMModels") || "[]")
        if (savedModels.length > 0) {
          const latestModel = savedModels[savedModels.length - 1]

          // Create LSTM model instance
          lstmModelRef.current = new LSTMGestureModel({
            sequenceLength: 30,
            numFeatures: 63,
            numClasses: 0, // Will be set during load
            hiddenUnits: 64,
            learningRate: 0.001,
          })

          const loaded = await lstmModelRef.current.loadFromLocalStorage(latestModel.id)
          if (loaded) {
            console.log("LSTM model loaded successfully")
            addLog("success", "LSTM model loaded successfully")
          }
        }
      } catch (error) {
        console.error("Error loading LSTM model:", error)
        addLog("error", `Error loading LSTM model: ${error.message}`)
      }

      // Check if we have any models loaded
      if (modelManager.getGestures().length === 0) {
        toast({
          title: "No Models Found",
          description: "Please collect some gestures first or import gesture data.",
          variant: "warning",
        })
        addLog("warning", "No gesture models found. Please collect samples or import data.")
      } else {
        addLog("info", `Loaded ${modelManager.getGestures().length} gestures`)
      }
    } catch (error) {
      console.error("Error initializing models:", error)
      toast({
        title: "Model Loading Error",
        description: "There was an error loading the gesture models. Please try again.",
        variant: "destructive",
      })
      addLog("error", `Model loading error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    initModels()

    return () => {
      // Clean up
      if (lstmModelRef.current) {
        lstmModelRef.current.dispose()
      }
    }
  }, [])

  // Scroll to bottom of logs when new logs are added
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs])

  // Add log entry
  const addLog = (type: LogEntry["type"], message: string) => {
    setLogs((prevLogs) => [
      ...prevLogs,
      {
        id: Date.now() + Math.random(), // Ensure unique IDs
        type,
        message,
        timestamp: new Date(),
      },
    ])
  }

  // Format timestamp for logs
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
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

      setIsCameraActive(false)
      setIsRecognizing(false)
      setHandDetected(false)
      addLog("info", "Camera stopped")
    } else {
      // Start the camera
      setIsCameraInitializing(true)
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
        addLog("success", "Camera activated successfully")

        // Initialize holistic detection
        await initializeHolistic()

        // Auto-start recognition
        setIsRecognizing(true)
      } catch (error) {
        console.error("Error accessing camera:", error)
        toast({
          title: "Camera Error",
          description: "Could not access your camera. Please check permissions.",
          variant: "destructive",
        })
        addLog("error", `Camera error: ${error.message}`)
      } finally {
        setIsCameraInitializing(false)
      }
    }
  }

  // Initialize MediaPipe Holistic
  const initializeHolistic = async () => {
    if (holisticRef.current) {
      holisticRef.current.stop()
    }

    try {
      holisticRef.current = new HolisticDetection({
        onResults: (results) => {
          drawResults(results)

          // Check if hands are detected
          const hasLeftHand = results.leftHandLandmarks && results.leftHandLandmarks.length > 0
          const hasRightHand = results.rightHandLandmarks && results.rightHandLandmarks.length > 0

          // Update hand detection status
          const wasHandDetected = handDetected
          setHandDetected(hasLeftHand || hasRightHand)

          // Log when hand detection status changes
          if (wasHandDetected !== (hasLeftHand || hasRightHand)) {
            addLog(
              hasLeftHand || hasRightHand ? "info" : "warning",
              hasLeftHand || hasRightHand ? "Hand detected" : "Hand lost from view",
            )
          }

          // If collecting samples, store the landmarks
          if (isCollecting && gestureName) {
            const landmarks = extractLandmarks(results)

            // Only add landmarks if we have valid hand data
            if (hasLeftHand || hasRightHand) {
              landmarksRef.current.push(landmarks)

              // Update sample collection progress
              setSampleFrameCount(landmarksRef.current.length)
              setCollectionProgress((landmarksRef.current.length / totalSampleFrames) * 100)

              // Add sample to current gesture after collecting frames
              if (landmarksRef.current.length >= totalSampleFrames) {
                addSampleToGesture()
                landmarksRef.current = []
                setSampleFrameCount(0)
                setCollectionProgress(0)
                setIsCollecting(false)

                // Clear any existing timeout
                if (collectionTimeoutRef.current) {
                  clearTimeout(collectionTimeoutRef.current)
                  collectionTimeoutRef.current = null
                }

                // Clear collection interval
                if (collectionIntervalRef.current) {
                  clearInterval(collectionIntervalRef.current)
                  collectionIntervalRef.current = null
                }

                toast({
                  title: "Sample Collected",
                  description: `Added a new sample for "${gestureName}"`,
                })

                addLog("success", `Sample collected for gesture "${gestureName}"`)
              }
            }
          }

          // Only process for gesture recognition if we're in recognition mode
          if (isRecognizing && (hasLeftHand || hasRightHand)) {
            const landmarks = extractLandmarks(results)

            // Check if enough time has passed since last detection
            const now = Date.now()
            if (now - lastDetectionTime >= recognitionDelay) {
              recognizeGesture(landmarks)
              setLastDetectionTime(now)
            }
          }
        },
        onError: (error) => {
          console.error("MediaPipe Holistic error:", error)
          addLog("error", `MediaPipe error: ${error.message}`)
        },
      })

      await holisticRef.current.initialize()
      addLog("info", "MediaPipe Holistic initialized successfully")

      if (videoRef.current && isCameraActive) {
        await holisticRef.current.start(videoRef.current)
        addLog("info", "MediaPipe detection started")
      }
    } catch (error) {
      console.error("Failed to initialize MediaPipe Holistic:", error)
      addLog("error", `Failed to initialize MediaPipe: ${error.message}`)
    }
  }

  // Add current landmarks as a sample to the gesture
  const addSampleToGesture = () => {
    if (!gestureName || landmarksRef.current.length === 0) return

    setCollectedGestures((prevGestures) => {
      // Check if gesture already exists
      const existingGestureIndex = prevGestures.findIndex((g) => g.name === gestureName)

      if (existingGestureIndex >= 0) {
        // Update existing gesture
        const updatedGestures = [...prevGestures]
        updatedGestures[existingGestureIndex] = {
          ...updatedGestures[existingGestureIndex],
          landmarks: [...updatedGestures[existingGestureIndex].landmarks, ...landmarksRef.current],
          samples: updatedGestures[existingGestureIndex].samples + 1,
        }
        return updatedGestures
      } else {
        // Create new gesture
        return [
          ...prevGestures,
          {
            name: gestureName,
            landmarks: [...landmarksRef.current],
            samples: 1,
          },
        ]
      }
    })

    // Also add to model manager
    modelManager.addGesture({
      name: gestureName,
      landmarks: [...landmarksRef.current],
      samples: 1,
    })
  }

  // Start collecting samples
  const startCollecting = () => {
    if (!gestureName) {
      toast({
        title: "Missing Gesture Name",
        description: "Please enter a name for the gesture.",
        variant: "destructive",
      })
      addLog("warning", "Cannot collect sample: Missing gesture name")
      return
    }

    if (!isCameraActive) {
      toast({
        title: "Camera Inactive",
        description: "Please activate the camera first.",
        variant: "destructive",
      })
      addLog("warning", "Cannot collect sample: Camera is inactive")
      return
    }

    // Force collection even if hand is not detected, but warn the user
    if (!handDetected) {
      toast({
        title: "Warning: No Hand Detected",
        description: "No hand is currently detected. Try repositioning your hand or proceed anyway.",
        variant: "warning",
      })
      addLog("warning", "Collecting sample with no hand detected - results may be poor")
    } else {
      addLog("info", "Hand detected - starting collection")
    }

    // Reset collection state
    landmarksRef.current = []
    setSampleFrameCount(0)
    setCollectionProgress(0)
    setIsCollecting(true)

    toast({
      title: "Collecting Sample",
      description: "Hold the gesture steady in front of the camera.",
    })
    addLog("info", `Started collecting sample for gesture "${gestureName}"`)

    // Add a safety timeout to prevent getting stuck
    if (collectionTimeoutRef.current) {
      clearTimeout(collectionTimeoutRef.current)
    }

    // Set up a collection interval to actively check for hand landmarks
    if (collectionIntervalRef.current) {
      clearInterval(collectionIntervalRef.current)
    }

    collectionTimeoutRef.current = setTimeout(() => {
      if (isCollecting) {
        if (landmarksRef.current.length > 0 && landmarksRef.current.length < totalSampleFrames) {
          // If we have some frames but not enough, save what we've got
          addSampleToGesture()
          addLog("warning", `Collection timeout - saved partial sample with ${landmarksRef.current.length} frames`)
          toast({
            title: "Partial Sample Collected",
            description: `Saved ${landmarksRef.current.length} frames for "${gestureName}"`,
          })
        } else if (landmarksRef.current.length === 0) {
          addLog("error", "Collection failed - no hand gestures detected")
          toast({
            title: "Collection Failed",
            description: "No hand gestures were detected. Please try again.",
            variant: "destructive",
          })
        }

        landmarksRef.current = []
        setSampleFrameCount(0)
        setCollectionProgress(0)
        setIsCollecting(false)

        // Clear collection interval
        if (collectionIntervalRef.current) {
          clearInterval(collectionIntervalRef.current)
          collectionIntervalRef.current = null
        }

        collectionTimeoutRef.current = null
      }
    }, 10000) // 10 second timeout
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

    // Add recognition result if available
    if (isRecognizing && recognizedGesture) {
      // Draw floating window in bottom-left corner
      const padding = 10
      const boxWidth = 200
      const boxHeight = 60
      const boxX = padding
      const boxY = height - boxHeight - padding

      // Draw background
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"
      ctx.lineWidth = 1
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)

      // Draw text
      ctx.fillStyle = "white"
      ctx.font = "bold 18px Arial"
      ctx.textAlign = "left"
      ctx.fillText(recognizedGesture, boxX + 10, boxY + 25)

      // Draw confidence
      const confidence = confidenceScores[recognizedGesture] || 0
      ctx.font = "14px Arial"
      ctx.fillText(`Confidence: ${(confidence * 100).toFixed(1)}%`, boxX + 10, boxY + 45)
    }

    // Add collection status if collecting
    if (isCollecting) {
      // Draw collection progress at the top
      const progressWidth = width * 0.8
      const progressHeight = 20
      const progressX = (width - progressWidth) / 2
      const progressY = 20

      // Draw background
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.fillRect(progressX - 10, progressY - 15, progressWidth + 20, progressHeight + 30)

      // Draw progress bar background
      ctx.fillStyle = "rgba(100, 100, 100, 0.5)"
      ctx.fillRect(progressX, progressY, progressWidth, progressHeight)

      // Draw progress
      ctx.fillStyle = "rgba(0, 255, 0, 0.7)"
      ctx.fillRect(progressX, progressY, progressWidth * (sampleFrameCount / totalSampleFrames), progressHeight)

      // Draw text
      ctx.fillStyle = "white"
      ctx.font = "14px Arial"
      ctx.textAlign = "center"
      ctx.fillText(
        `Collecting: ${sampleFrameCount}/${totalSampleFrames} frames for "${gestureName}"`,
        width / 2,
        progressY + progressHeight + 15,
      )
    }
  }

  // Recognize gesture using both traditional and LSTM models
  const recognizeGesture = (currentLandmarks: any) => {
    // First try LSTM recognition if available
    if (lstmModelRef.current) {
      try {
        const prediction = lstmModelRef.current.predict(currentLandmarks)
        if (prediction && prediction.confidence > 0.7) {
          handleGestureDetected(prediction.label, prediction.confidence)
          return
        }
      } catch (error) {
        console.error("LSTM prediction error:", error)
      }
    }

    // Fall back to traditional recognition
    const gestures = modelManager.getGestures()
    if (!gestures || gestures.length === 0) return

    const scores: { [key: string]: number } = {}
    let bestMatch = ""
    let highestConfidence = 0

    // For each gesture in the model
    for (const gesture of gestures) {
      let totalConfidence = 0
      let sampleCount = 0

      // Compare with each sample of this gesture
      for (const sample of gesture.landmarks) {
        // Calculate similarity between current landmarks and this sample
        const similarity = calculateSimilarity(currentLandmarks, sample)

        totalConfidence += similarity
        sampleCount++
      }

      // Calculate average confidence across all samples
      const avgConfidence = sampleCount > 0 ? totalConfidence / sampleCount : 0
      scores[gesture.name] = avgConfidence

      // Track the best match
      if (avgConfidence > highestConfidence) {
        highestConfidence = avgConfidence
        bestMatch = gesture.name
      }
    }

    // Update state with recognition results
    setConfidenceScores(scores)

    // Only update recognized gesture if confidence is above threshold
    if (highestConfidence > 0.6) {
      handleGestureDetected(bestMatch, highestConfidence)
    }
  }

  // Handle detected gesture
  const handleGestureDetected = (gestureName: string, confidence: number) => {
    setRecognizedGesture(gestureName)

    // Add to detection history
    const newDetection = {
      name: gestureName,
      confidence: confidence,
      timestamp: Date.now(),
    }

    setDetectionHistory((prev) => {
      const updated = [newDetection, ...prev].slice(0, 20)
      return updated
    })

    // Speak the gesture if speech is enabled
    if (isSpeechEnabled) {
      speakText(gestureName)
    }
  }

  // Calculate similarity between two landmark sets
  const calculateSimilarity = (current: any, sample: any): number => {
    let totalSimilarity = 0
    let pointCount = 0

    // Compare right hand landmarks
    if (current.rightHand.length > 0 && sample.rightHand?.length > 0) {
      const handSimilarity = compareHandLandmarks(current.rightHand, sample.rightHand)
      totalSimilarity += handSimilarity.similarity
      pointCount += handSimilarity.count
    }

    // Compare left hand landmarks
    if (current.leftHand.length > 0 && sample.leftHand?.length > 0) {
      const handSimilarity = compareHandLandmarks(current.leftHand, sample.leftHand)
      totalSimilarity += handSimilarity.similarity
      pointCount += handSimilarity.count
    }

    // Return average similarity
    return pointCount > 0 ? totalSimilarity / pointCount : 0
  }

  // Compare hand landmarks and return similarity score
  const compareHandLandmarks = (current: any[], sample: any[]) => {
    let totalSimilarity = 0
    let count = 0

    // Compare each landmark point
    for (let i = 0; i < Math.min(current.length, sample.length); i++) {
      const currentPoint = current[i]
      const samplePoint = sample[i]

      if (currentPoint && samplePoint) {
        // Calculate Euclidean distance
        const distance = Math.sqrt(
          Math.pow(currentPoint.x - samplePoint.x, 2) +
            Math.pow(currentPoint.y - samplePoint.y, 2) +
            Math.pow((currentPoint.z || 0) - (samplePoint.z || 0), 2),
        )

        // Convert distance to similarity (1 = identical, 0 = completely different)
        const similarity = Math.max(0, 1 - distance * 5)

        totalSimilarity += similarity
        count++
      }
    }

    return { similarity: totalSimilarity, count }
  }

  // Speak text using speech synthesis
  const speakText = (text: string) => {
    if (!isSpeechEnabled) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1.0
    window.speechSynthesis.speak(utterance)
  }

  // Toggle speech output
  const toggleSpeech = () => {
    setIsSpeechEnabled(!isSpeechEnabled)

    // Cancel any ongoing speech when disabled
    if (isSpeechEnabled) {
      window.speechSynthesis.cancel()
    }

    toast({
      title: isSpeechEnabled ? "Speech Disabled" : "Speech Enabled",
      description: isSpeechEnabled ? "Speech output has been turned off." : "Speech output has been turned on.",
    })
  }

  // Handle recognition delay change
  const handleDelayChange = (value: number) => {
    setRecognitionDelay(value)
  }

  // Toggle detection history
  const toggleDetectionHistory = () => {
    setShowDetectionHistory(!showDetectionHistory)
  }

  // Export collected gestures to a JSON file
  const exportGestures = () => {
    setIsExporting(true)
    try {
      // Combine collected gestures with model manager gestures
      const allGestures = [...collectedGestures, ...modelManager.getGestures()]

      // Remove duplicates
      const uniqueGestures = allGestures.reduce((acc, current) => {
        const x = acc.find((item) => item.name === current.name)
        if (!x) {
          return acc.concat([current])
        } else {
          return acc
        }
      }, [] as any[])

      // Create export data
      const exportData = {
        gestures: uniqueGestures,
        metadata: {
          exportDate: new Date().toISOString(),
          version: "1.0",
          totalGestures: uniqueGestures.length,
          totalSamples: uniqueGestures.reduce((sum, gesture) => sum + gesture.samples, 0),
        },
      }

      // Convert to JSON string
      const jsonString = JSON.stringify(exportData, null, 2)

      // Create a blob and download link
      const blob = new Blob([jsonString], { type: "application/json" })
      const url = URL.createObjectURL(blob)

      // Create download link and trigger download
      const a = document.createElement("a")
      a.href = url
      a.download = `gesture-data-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()

      // Clean up
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: "Gesture data has been exported successfully.",
      })
      addLog("success", "Gesture data exported successfully")
    } catch (error) {
      console.error("Error exporting gestures:", error)
      toast({
        title: "Export Error",
        description: "There was an error exporting the gesture data.",
        variant: "destructive",
      })
      addLog("error", `Export error: ${error.message}`)
    } finally {
      setIsExporting(false)
    }
  }

  // Import gestures from a JSON file
  const importGestures = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Handle file selection for import
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!data.gestures || !Array.isArray(data.gestures)) {
        throw new Error("Invalid gesture data format")
      }

      // Add each gesture to the model manager
      let importCount = 0
      for (const gesture of data.gestures) {
        if (gesture.name && gesture.landmarks && gesture.landmarks.length > 0) {
          modelManager.addGesture(gesture)
          importCount++
        }
      }

      // Update collected gestures state
      setCollectedGestures((prev) => {
        const newGestures = [...prev]

        // Add imported gestures that don't already exist
        for (const gesture of data.gestures) {
          if (!newGestures.some((g) => g.name === gesture.name)) {
            newGestures.push(gesture)
          }
        }

        return newGestures
      })

      toast({
        title: "Import Successful",
        description: `Imported ${importCount} gestures successfully.`,
      })
      addLog("success", `Imported ${importCount} gestures from file`)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Error importing gestures:", error)
      toast({
        title: "Import Error",
        description: "There was an error importing the gesture data.",
        variant: "destructive",
      })
      addLog("error", `Import error: ${error.message}`)
    } finally {
      setIsImporting(false)
    }
  }

  // Save GitHub token
  const saveGitHubToken = async () => {
    if (!githubToken) {
      toast({
        title: "Missing Token",
        description: "Please enter a GitHub personal access token.",
        variant: "destructive",
      })
      return
    }

    setIsSavingToken(true)
    addLog("info", "Saving GitHub token...")

    try {
      // Validate the token with GitHub API
      const response = await fetch("/api/github-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: githubToken,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to validate GitHub token")
      }

      // Save to model manager
      modelManager.initGitHub({
        owner: "Asomatous-work", // Default owner
        repo: "vocal2gesture-updated", // Default repo
        branch: "main", // Default branch
        token: githubToken,
      })

      setGithubTokenSaved(true)
      toast({
        title: "GitHub Token Saved",
        description: "Your GitHub token has been saved successfully.",
      })
      addLog("success", "GitHub token saved successfully")

      // Clear the token field for security
      setTimeout(() => {
        setGithubToken("")
      }, 2000)
    } catch (error) {
      console.error("Error saving GitHub token:", error)
      toast({
        title: "Token Error",
        description: error.message || "There was an error saving your GitHub token.",
        variant: "destructive",
      })
      addLog("error", `Failed to save GitHub token: ${error.message}`)
    } finally {
      setIsSavingToken(false)
    }
  }

  // Save collected gestures to both Upstash and GitHub
  const saveGestures = async () => {
    if (collectedGestures.length === 0) {
      toast({
        title: "No Gestures",
        description: "Please collect some gesture samples first.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    addLog("info", "Saving gesture data...")

    try {
      // Step 1: Save to localStorage via model manager
      for (const gesture of collectedGestures) {
        modelManager.saveGesture(gesture)
      }

      // Step 2: Save to Upstash (Vercel Blob)
      const gestureData = {
        gestures: collectedGestures,
        metadata: {
          timestamp: new Date().toISOString(),
          version: "1.0",
        },
      }

      const jsonBlob = new Blob([JSON.stringify(gestureData, null, 2)], { type: "application/json" })
      const file = new File([jsonBlob], "gesture-data.json", { type: "application/json" })

      // Upload to Vercel Blob
      const blob = await put(`gestures-${Date.now()}.json`, file, {
        access: "public",
        addRandomSuffix: false,
      })

      addLog("success", `Saved to Upstash: ${blob.url}`)

      // Step 3: Save to GitHub if configured
      if (modelManager.isGitHubConfigured()) {
        try {
          const saved = await modelManager.saveToGitHub()
          if (saved) {
            addLog("success", "Saved to GitHub successfully")
          }
        } catch (githubError) {
          console.error("GitHub save error:", githubError)
          addLog("warning", `GitHub save failed: ${githubError.message}. Data is still saved locally and to Upstash.`)
          // Continue even if GitHub save fails
        }
      } else {
        addLog("warning", "GitHub not configured. Data saved locally and to Upstash only.")
      }

      toast({
        title: "Gestures Saved",
        description: "Your gesture data has been saved successfully.",
      })
    } catch (error) {
      console.error("Error saving gestures:", error)
      toast({
        title: "Save Error",
        description: "There was an error saving your gesture data.",
        variant: "destructive",
      })
      addLog("error", `Save error: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-4">
        <BackButton />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 md:mb-12"
      >
        <div className="flex items-center justify-center mb-4">
          <Image src="/images/gesture-logo.png" alt="Vocal2Gestures Logo" width={60} height={60} className="mr-3" />
          <h2 className="text-2xl md:text-4xl font-bold">Enhanced Sign to Speech Translator</h2>
        </div>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Make hand gestures in front of the camera to translate sign language into speech. Collect, save, and manage
          your own custom gestures.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Main Camera View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-2"
        >
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Camera View</CardTitle>
                <CardDescription>Make hand gestures in front of the camera</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={toggleSpeech} className="h-8">
                  {isSpeechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="outline" onClick={toggleDetectionHistory} className="h-8">
                  <History className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="camera">Recognition</TabsTrigger>
                  <TabsTrigger value="collection">Collection</TabsTrigger>
                  <TabsTrigger value="storage">Storage</TabsTrigger>
                </TabsList>

                <TabsContent value="camera" className="mt-0">
                  <div className="relative aspect-video bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`absolute inset-0 w-full h-full object-cover ${isCameraActive ? "opacity-100" : "opacity-0"}`}
                    />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                    {!isCameraActive && !isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {isCameraInitializing ? (
                          <LoadingSpinner text="Initializing camera..." />
                        ) : (
                          <Button
                            onClick={toggleCamera}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          >
                            <Camera className="mr-2 h-4 w-4" />
                            Start Camera
                          </Button>
                        )}
                      </div>
                    )}
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <LoadingSpinner size="lg" text="Loading models..." />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-wrap gap-2 md:gap-4 justify-between items-center">
                    <Button
                      onClick={toggleCamera}
                      className={`${
                        isCameraActive
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      }`}
                      disabled={isLoading || isCameraInitializing}
                    >
                      {isCameraInitializing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Initializing...
                        </>
                      ) : isCameraActive ? (
                        <>
                          <CameraOff className="mr-2 h-4 w-4" />
                          Stop Camera
                        </>
                      ) : (
                        <>
                          <Camera className="mr-2 h-4 w-4" />
                          Start Camera
                        </>
                      )}
                    </Button>

                    <GestureRecognitionDelaySlider
                      value={recognitionDelay}
                      onChange={handleDelayChange}
                      disabled={!isCameraActive}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="collection" className="mt-0">
                  <div className="relative aspect-video bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`absolute inset-0 w-full h-full object-cover ${isCameraActive ? "opacity-100" : "opacity-0"}`}
                    />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                    {isCameraActive && !isCollecting && (
                      <div
                        className={`absolute top-2 left-2 right-2 px-3 py-2 rounded text-sm font-medium text-center ${
                          handDetected ? "bg-green-500/70 text-white" : "bg-red-500/70 text-white"
                        }`}
                      >
                        {handDetected
                          ? "Hand Detected ✓ Ready to collect samples"
                          : "No Hand Detected - Please position your hand in view"}
                      </div>
                    )}
                    {!isCameraActive && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Button
                          onClick={toggleCamera}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Start Camera
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 gap-2">
                      <Label htmlFor="gestureName">Gesture Name</Label>
                      <Input
                        id="gestureName"
                        placeholder="Enter gesture name (e.g., Hello, Thank You)"
                        value={gestureName}
                        onChange={(e) => setGestureName(e.target.value)}
                        disabled={isCollecting || !isCameraActive}
                      />
                    </div>

                    {isCollecting && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Collection Progress</span>
                          <span>
                            {sampleFrameCount}/{totalSampleFrames} frames
                          </span>
                        </div>
                        <Progress value={collectionProgress} className="h-2" />
                      </div>
                    )}

                    <Button
                      onClick={startCollecting}
                      disabled={!isCameraActive || isCollecting || !gestureName}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {isCollecting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Collecting...
                        </>
                      ) : (
                        "Collect Sample"
                      )}
                    </Button>

                    {collectedGestures.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Collected Gestures</h3>
                        <div className="bg-background rounded-md p-2 max-h-32 overflow-y-auto">
                          {collectedGestures.map((gesture, index) => (
                            <div
                              key={`gesture-${index}-${gesture.name}`}
                              className="flex justify-between items-center py-1"
                            >
                              <span className="font-medium">{gesture.name}</span>
                              <span className="text-xs text-muted-foreground">{gesture.samples} samples</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="storage" className="mt-0 p-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-2">
                      <Label htmlFor="githubToken">GitHub Personal Access Token</Label>
                      <div className="flex gap-2">
                        <Input
                          id="githubToken"
                          type="password"
                          placeholder="Enter your GitHub token"
                          value={githubToken}
                          onChange={(e) => setGithubToken(e.target.value)}
                        />
                        <Button variant="outline" onClick={saveGitHubToken} disabled={!githubToken || isSavingToken}>
                          {isSavingToken ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Token with 'repo' scope required for GitHub integration
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={saveGestures}
                        disabled={collectedGestures.length === 0 || isSaving}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Gestures
                          </>
                        )}
                      </Button>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          onClick={exportGestures}
                          disabled={
                            isExporting || (collectedGestures.length === 0 && modelManager.getGestures().length === 0)
                          }
                        >
                          {isExporting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          Export
                        </Button>

                        <Button variant="outline" onClick={importGestures} disabled={isImporting}>
                          {isImporting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          Import
                        </Button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept=".json"
                          style={{ display: "none" }}
                          onChange={handleFileSelect}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 text-xs text-muted-foreground mt-2">
                      <div className="flex items-center">
                        <div
                          className={`w-2 h-2 rounded-full mr-1 ${modelManager.isGitHubConfigured() ? "bg-green-500" : "bg-red-500"}`}
                        ></div>
                        <span>GitHub</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full mr-1 bg-green-500"></div>
                        <span>Upstash</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full mr-1 bg-green-500"></div>
                        <span>Local Storage</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recognition Results and Logs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="space-y-6">
            <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
              <CardHeader>
                <CardTitle>Recognition Results</CardTitle>
                <CardDescription>Detected gestures and confidence scores</CardDescription>
              </CardHeader>
              <CardContent>
                {showDetectionHistory ? (
                  <DetectionHistoryLog history={detectionHistory} />
                ) : isCameraActive &&
                  !recognizedGesture &&
                  confidenceScores &&
                  Object.keys(confidenceScores).length === 0 ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-2/3" />
                      <Skeleton className="h-8 w-3/4" />
                    </div>
                  </div>
                ) : (
                  <GestureConfidenceVisualizer
                    recognizedGesture={recognizedGesture}
                    confidenceScores={confidenceScores}
                    isCameraActive={isCameraActive}
                  />
                )}
              </CardContent>
            </Card>

            {/* Logs */}
            <Card className="overflow-hidden border-none shadow-lg">
              <CardHeader className="bg-gray-900 text-white">
                <div className="flex items-center justify-between">
                  <CardTitle>Activity Log</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLogs([])}
                    className="h-8 text-xs text-white hover:text-white hover:bg-gray-800"
                  >
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="bg-gray-950 text-gray-200 font-mono text-sm">
                  <ScrollArea className="h-48 rounded-b-lg">
                    <div className="p-4 space-y-1">
                      {logs.length === 0 ? (
                        <div className="text-gray-500 italic">Activity logs will appear here...</div>
                      ) : (
                        logs.map((log) => (
                          <div key={`log-${log.id}`} className="flex">
                            <span className="text-gray-500 mr-2">[{formatTimestamp(log.timestamp)}]</span>
                            <span
                              className={`
                              ${log.type === "info" && "text-blue-400"}
                              ${log.type === "success" && "text-green-400"}
                              ${log.type === "error" && "text-red-400"}
                              ${log.type === "warning" && "text-yellow-400"}
                            `}
                            >
                              {log.type === "info" && "ℹ️"}
                              {log.type === "success" && "✅"}
                              {log.type === "error" && "❌"}
                              {log.type === "warning" && "⚠️"} {log.message}
                            </span>
                          </div>
                        ))
                      )}
                      <div ref={logsEndRef} />
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
