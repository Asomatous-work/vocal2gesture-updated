"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Camera, CameraOff, Save, Trash2, AlertCircle, Download, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { HolisticDetection } from "@/lib/mediapipe-holistic"
import { modelManager } from "@/lib/model-manager"
import { LSTMGestureModel } from "@/lib/lstm-gesture-model"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import * as tf from "@tensorflow/tfjs"

interface GestureData {
  name: string
  landmarks: any[]
  samples: number
  sampleData?: any[]
}

interface LogEntry {
  id: number
  type: "info" | "success" | "error" | "warning" | "epoch"
  message: string
  timestamp: Date
}

export function SignLanguageTrainer() {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isCollecting, setIsCollecting] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [gestureName, setGestureName] = useState("")
  const [gestures, setGestures] = useState<GestureData[]>([])
  const [currentEpoch, setCurrentEpoch] = useState(0)
  const [totalEpochs, setTotalEpochs] = useState(50)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [modelAccuracy, setModelAccuracy] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [epochLoss, setEpochLoss] = useState<number>(0)
  const [learningRate, setLearningRate] = useState<number>(0.001)
  const [collectionProgress, setCollectionProgress] = useState(0)
  const [sampleFrameCount, setSampleFrameCount] = useState(0)
  const [totalSampleFrames] = useState(30)
  const [hiddenUnits, setHiddenUnits] = useState(64)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [tfReady, setTfReady] = useState(false)
  const [detectionActive, setDetectionActive] = useState(false)
  const [collectionError, setCollectionError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [handDetected, setHandDetected] = useState(false)
  const [activeTab, setActiveTab] = useState("camera")
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const holisticRef = useRef<HolisticDetection | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const landmarksRef = useRef<any[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)
  const lstmModelRef = useRef<LSTMGestureModel | null>(null)
  const collectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const collectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Initialize TensorFlow.js
  useEffect(() => {
    const initTF = async () => {
      try {
        await tf.ready()
        addLog("info", "TensorFlow.js initialized successfully")
        setTfReady(true)

        // Create LSTM model instance
        const config = {
          sequenceLength: 30,
          numFeatures: 63,
          numClasses: 0,
          hiddenUnits: hiddenUnits,
          learningRate: learningRate,
        }

        lstmModelRef.current = new LSTMGestureModel(config)

        // Try to load existing model
        try {
          const savedModels = JSON.parse(localStorage.getItem("savedLSTMModels") || "[]")
          if (savedModels.length > 0) {
            const latestModel = savedModels[savedModels.length - 1]
            const loaded = await lstmModelRef.current.loadFromLocalStorage(latestModel.id)
            if (loaded) {
              addLog("success", `Loaded existing LSTM model: ${latestModel.name}`)
              setIsModelLoaded(true)
            }
          }
        } catch (loadError) {
          console.error("Error loading saved model:", loadError)
          addLog("warning", "Could not load saved model, starting fresh")
        }
      } catch (error) {
        console.error("Error initializing TensorFlow.js:", error)
        addLog("error", `TensorFlow initialization error: ${error}`)
      }
    }

    initTF()

    return () => {
      // Clean up TensorFlow resources
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

  // Initialize MediaPipe Holistic
  useEffect(() => {
    if (!isCameraActive) return

    const initializeHolistic = async () => {
      setIsInitializing(true)
      try {
        if (!holisticRef.current) {
          holisticRef.current = new HolisticDetection({
            onResults: (results) => {
              drawResults(results)

              // Check if hands are detected - use a more lenient detection approach
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
            },
            onError: (error) => {
              console.error("MediaPipe Holistic error:", error)
              addLog("error", `Detection error: ${error.message || "Unknown error"}`)
            },
          })

          await holisticRef.current.initialize()
          addLog("info", "MediaPipe Holistic initialized successfully")
        }

        if (videoRef.current) {
          await holisticRef.current.start(videoRef.current)
          setDetectionActive(true)
          addLog("info", "MediaPipe detection started")
        }
      } catch (error) {
        console.error("Error initializing MediaPipe:", error)
        addLog("error", `MediaPipe initialization error: ${error}`)
        toast({
          title: "MediaPipe Error",
          description: "Could not initialize hand detection. Please try refreshing the page.",
          variant: "destructive",
        })
      } finally {
        setIsInitializing(false)
      }
    }

    initializeHolistic()

    return () => {
      if (holisticRef.current) {
        holisticRef.current.stop()
        setDetectionActive(false)
      }
    }
  }, [isCameraActive])

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
        setDetectionActive(false)
      }

      setIsCameraActive(false)
      setHandDetected(false)
      addLog("info", "Camera stopped")
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

          setIsCameraActive(true)
          toast({
            title: "Camera Activated",
            description: "Make hand gestures in front of the camera.",
          })

          addLog("success", "Camera activated successfully")
        }
      } catch (error) {
        console.error("Error accessing camera:", error)
        toast({
          title: "Camera Error",
          description: "Could not access your camera. Please check permissions.",
          variant: "destructive",
        })

        addLog("error", `Camera error: ${error}`)
      }
    }
  }

  // Add current landmarks as a sample to the gesture
  const addSampleToGesture = () => {
    if (!gestureName || landmarksRef.current.length === 0) return

    setGestures((prevGestures) => {
      // Check if gesture already exists
      const existingGestureIndex = prevGestures.findIndex((g) => g.name === gestureName)

      if (existingGestureIndex >= 0) {
        // Update existing gesture
        const updatedGestures = [...prevGestures]
        updatedGestures[existingGestureIndex] = {
          ...updatedGestures[existingGestureIndex],
          landmarks: [...updatedGestures[existingGestureIndex].landmarks, ...landmarksRef.current],
          samples: updatedGestures[existingGestureIndex].samples + 1,
          sampleData: [...(updatedGestures[existingGestureIndex].sampleData || []), [...landmarksRef.current]],
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
            sampleData: [[...landmarksRef.current]],
          },
        ]
      }
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

    if (!isCameraActive || !detectionActive) {
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
    setCollectionError(null)

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
          setCollectionError("No hand gestures were detected. Please try again.")
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

  // Reset all collected gestures
  const resetGestures = () => {
    setGestures([])
    setModelAccuracy(0)
    setCurrentEpoch(0)
    setTrainingProgress(0)
    setEpochLoss(0)
    setLogs([])

    toast({
      title: "Gestures Reset",
      description: "All collected gesture samples have been cleared.",
    })

    addLog("info", "All gestures and training data reset")
  }

  // Format timestamp for logs
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  // Get icon for log type
  const getLogTypeIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "info":
        return "ℹ️"
      case "success":
        return "✅"
      case "error":
        return "❌"
      case "warning":
        return "⚠️"
      case "epoch":
        return "🔄"
      default:
        return ""
    }
  }

  // Save the model to localStorage
  const saveModel = async () => {
    if (!lstmModelRef.current || !isModelLoaded) {
      toast({
        title: "No Model Available",
        description: "Please train an LSTM model first.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    addLog("info", "Saving LSTM model to localStorage...")

    try {
      // Generate a unique model ID
      const modelId = `lstm_model_${Date.now()}`

      // Save the model
      await lstmModelRef.current.saveToLocalStorage(modelId)

      // Save model metadata
      const savedModels = JSON.parse(localStorage.getItem("savedLSTMModels") || "[]")
      savedModels.push({
        id: modelId,
        name: `LSTM Model ${savedModels.length + 1}`,
        gestures: gestures.map((g) => g.name),
        accuracy: modelAccuracy,
        timestamp: new Date().toISOString(),
      })
      localStorage.setItem("savedLSTMModels", JSON.stringify(savedModels))

      // Set as current model
      localStorage.setItem("currentLSTMModel", modelId)

      toast({
        title: "Model Saved",
        description: "Your LSTM model has been saved successfully to local storage.",
      })

      addLog("success", `LSTM model saved successfully with ID: ${modelId}`)

      // Also save to model manager for use in sign-to-speech
      for (const gesture of gestures) {
        modelManager.addGesture({
          name: gesture.name,
          landmarks: gesture.landmarks,
          samples: gesture.samples,
        })
      }

      // Save to GitHub if configured
      if (modelManager.isGitHubConfigured()) {
        try {
          const saved = await modelManager.saveToGitHub()
          if (saved) {
            addLog("success", "Model also saved to GitHub successfully")
          }
        } catch (error) {
          console.error("GitHub save error:", error)
          addLog("warning", `GitHub save failed: ${error.message}. Model is still saved locally.`)
        }
      }
    } catch (error) {
      console.error("Error saving model:", error)
      toast({
        title: "Save Error",
        description: "There was an error saving your model.",
        variant: "destructive",
      })

      addLog("error", `Failed to save model: ${error}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Train the LSTM model with collected gestures
  const trainModel = async () => {
    if (gestures.length < 1) {
      toast({
        title: "Not Enough Gestures",
        description: "Please collect samples for at least 1 gesture.",
        variant: "destructive",
      })

      addLog("warning", "Cannot train model: Need at least 1 gesture")
      return
    }

    if (!tfReady) {
      toast({
        title: "TensorFlow Not Ready",
        description: "Please wait for TensorFlow.js to initialize.",
        variant: "destructive",
      })

      addLog("warning", "Cannot train model: TensorFlow.js not ready")
      return
    }

    setIsTraining(true)
    setCurrentEpoch(0)
    setTrainingProgress(0)
    setEpochLoss(1.0)

    addLog("info", `Starting LSTM training with ${gestures.length} gestures over ${totalEpochs} epochs`)
    addLog("info", `Learning rate: ${learningRate}, Hidden units: ${hiddenUnits}`)

    try {
      // Prepare training data
      const trainingData: any[] = []
      const labels: string[] = []

      // Log the captured gestures being used for training
      addLog("info", "Preparing gesture data for training:")
      gestures.forEach((gesture) => {
        addLog("info", `  - ${gesture.name}: ${gesture.samples} samples, ${gesture.landmarks.length} landmarks`)

        // Add each sample to training data
        if (gesture.sampleData && gesture.sampleData.length > 0) {
          for (const sample of gesture.sampleData) {
            if (sample && sample.length > 0) {
              trainingData.push(sample)
              labels.push(gesture.name)
            }
          }
        } else {
          // If sampleData is not available, create it from landmarks
          const landmarkChunks = []
          for (let i = 0; i < gesture.landmarks.length; i += totalSampleFrames) {
            const sampleLandmarks = gesture.landmarks.slice(i, i + totalSampleFrames)
            if (sampleLandmarks.length === totalSampleFrames) {
              landmarkChunks.push(sampleLandmarks)
            }
          }

          // Add each chunk as a sample
          for (const chunk of landmarkChunks) {
            trainingData.push(chunk)
            labels.push(gesture.name)
          }
        }
      })

      if (trainingData.length === 0) {
        throw new Error("No valid training data available")
      }

      addLog("info", `Total training samples: ${trainingData.length}`)
      addLog("info", "Initializing LSTM model architecture...")

      // Create or update LSTM model
      if (!lstmModelRef.current) {
        const config = {
          sequenceLength: totalSampleFrames,
          numFeatures: 63, // 21 landmarks x 3 coordinates
          numClasses: new Set(labels).size,
          hiddenUnits: hiddenUnits,
          learningRate: learningRate,
        }

        lstmModelRef.current = new LSTMGestureModel(config)
      }

      // Train normalizer first
      addLog("info", "Training data normalizer...")
      await lstmModelRef.current.trainNormalizer(trainingData)
      addLog("success", "Normalizer trained successfully")

      // Train the model
      addLog("info", "Starting LSTM model training...")
      const history = await lstmModelRef.current.train(trainingData, labels, {
        epochs: totalEpochs,
        batchSize: 16,
        validationSplit: 0.1,
        onEpochEnd: (epoch, logs) => {
          setCurrentEpoch(epoch + 1)
          setTrainingProgress(((epoch + 1) / totalEpochs) * 100)

          if (logs.loss !== undefined) {
            setEpochLoss(logs.loss)
          }

          if (logs.acc !== undefined) {
            setModelAccuracy(logs.acc * 100)
          }

          addLog(
            "epoch",
            `Epoch ${epoch + 1}/${totalEpochs} - Loss: ${logs.loss?.toFixed(4) || "N/A"} - Accuracy: ${(logs.acc !== undefined ? logs.acc * 100 : 0).toFixed(2)}%`,
          )
        },
        onTrainEnd: () => {
          addLog("success", "LSTM model training completed successfully")
        },
      })

      setIsModelLoaded(true)
      toast({
        title: "Training Complete",
        description: `Model trained with ${gestures.length} gestures and achieved ${modelAccuracy.toFixed(1)}% accuracy.`,
      })
    } catch (error) {
      console.error("Error training LSTM model:", error)
      addLog("error", `Training error: ${error}`)

      toast({
        title: "Training Error",
        description: "There was an error training the LSTM model.",
        variant: "destructive",
      })
    } finally {
      setIsTraining(false)
    }
  }

  // Export collected gestures to a JSON file
  const exportGestures = () => {
    setIsExporting(true)
    try {
      // Create export data
      const exportData = {
        gestures: gestures,
        metadata: {
          exportDate: new Date().toISOString(),
          version: "1.0",
          totalGestures: gestures.length,
          totalSamples: gestures.reduce((sum, gesture) => sum + gesture.samples, 0),
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
      addLog("error", `Export error: ${error}`)
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

      // Add imported gestures to current gestures
      setGestures((prevGestures) => {
        const newGestures = [...prevGestures]

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
        description: `Imported ${data.gestures.length} gestures successfully.`,
      })
      addLog("success", `Imported ${data.gestures.length} gestures from file`)

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
      addLog("error", `Import error: ${error}`)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
      <CardHeader>
        <CardTitle>Sign Language Trainer</CardTitle>
        <CardDescription>Collect samples and train a model to recognize sign language gestures</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera and Collection */}
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="camera">Camera</TabsTrigger>
                <TabsTrigger value="training">Training</TabsTrigger>
                <TabsTrigger value="export">Export/Import</TabsTrigger>
              </TabsList>

              <TabsContent value="camera" className="space-y-4">
                <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover opacity-0"
                    autoPlay
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    width={640}
                    height={480}
                  />

                  {!isCameraActive && !isInitializing && (
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

                  {isInitializing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <LoadingSpinner text="Initializing camera..." />
                    </div>
                  )}

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
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="gestureName">Gesture Name</Label>
                  <Input
                    id="gestureName"
                    placeholder="Enter gesture name (e.g., Hello, Thank You)"
                    value={gestureName}
                    onChange={(e) => setGestureName(e.target.value)}
                    disabled={isCollecting}
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

                {collectionError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Collection Error</AlertTitle>
                    <AlertDescription>{collectionError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={startCollecting}
                    disabled={!isCameraActive || isCollecting || !gestureName || !detectionActive || isInitializing}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 flex-1"
                  >
                    {isCollecting ? (
                      <>
                        <LoadingSpinner className="mr-2" size="sm" />
                        Collecting...
                      </>
                    ) : (
                      "Collect Sample"
                    )}
                  </Button>
                  <Button
                    onClick={toggleCamera}
                    variant={isCameraActive ? "destructive" : "outline"}
                    disabled={isInitializing}
                    className="flex-1"
                  >
                    {isCameraActive ? (
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
                </div>
              </TabsContent>

              <TabsContent value="training" className="space-y-4">
                <div className="space-y-2">
                  <Label>Training Epochs</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={10}
                      max={100}
                      step={5}
                      value={totalEpochs}
                      onChange={(e) => setTotalEpochs(Number.parseInt(e.target.value) || 50)}
                      disabled={isTraining}
                    />
                    <span className="text-sm text-muted-foreground">epochs</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Hidden Units</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={16}
                      max={128}
                      step={16}
                      value={hiddenUnits}
                      onChange={(e) => setHiddenUnits(Number.parseInt(e.target.value) || 64)}
                      disabled={isTraining}
                    />
                    <span className="text-sm text-muted-foreground">units</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Learning Rate</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0.0001}
                      max={0.01}
                      step={0.0001}
                      value={learningRate}
                      onChange={(e) => setLearningRate(Number.parseFloat(e.target.value) || 0.001)}
                      disabled={isTraining}
                    />
                  </div>
                </div>

                {(isTraining || trainingProgress > 0) && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Training Progress</span>
                      <span>
                        {currentEpoch}/{totalEpochs} epochs
                      </span>
                    </div>
                    <Progress value={trainingProgress} className="h-2" />

                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="bg-background rounded-md p-2">
                        <div className="text-xs text-muted-foreground">Loss</div>
                        <div className="font-mono font-medium">{epochLoss.toFixed(4)}</div>
                      </div>
                      <div className="bg-background rounded-md p-2">
                        <div className="text-xs text-muted-foreground">Accuracy</div>
                        <div className="font-mono font-medium">{modelAccuracy.toFixed(2)}%</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={trainModel}
                    disabled={gestures.length < 1 || isTraining || !tfReady}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 flex-1"
                  >
                    {isTraining ? (
                      <>
                        <LoadingSpinner className="mr-2" size="sm" />
                        Training...
                      </>
                    ) : (
                      "Train Model"
                    )}
                  </Button>
                  <Button onClick={saveModel} disabled={!isModelLoaded || isSaving} className="flex-1">
                    {isSaving ? (
                      <>
                        <LoadingSpinner className="mr-2" size="sm" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Model
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="export" className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={exportGestures}
                    disabled={isExporting || gestures.length === 0}
                    className="flex-1"
                  >
                    {isExporting ? (
                      <LoadingSpinner className="mr-2" size="sm" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Export Gestures
                  </Button>

                  <Button variant="outline" onClick={importGestures} disabled={isImporting} className="flex-1">
                    {isImporting ? <LoadingSpinner className="mr-2" size="sm" /> : <Upload className="mr-2 h-4 w-4" />}
                    Import Gestures
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    style={{ display: "none" }}
                    onChange={handleFileSelect}
                  />
                </div>

                <Button
                  variant="destructive"
                  onClick={resetGestures}
                  disabled={gestures.length === 0}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Reset All Gestures
                </Button>
              </TabsContent>
            </Tabs>
          </div>

          {/* Collected Gestures and Logs */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Collected Gestures</h3>
              {gestures.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-md p-4 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {gestures.map((gesture, index) => (
                      <div
                        key={`gesture-${index}-${gesture.name}`}
                        className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md"
                      >
                        <span className="font-medium">{gesture.name}</span>
                        <span className="text-sm text-muted-foreground">{gesture.samples} samples</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-md p-4 text-center text-muted-foreground">
                  No gestures collected yet
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Training Logs</h3>
              <div className="bg-gray-950 text-gray-200 font-mono text-sm rounded-md">
                <ScrollArea className="h-64">
                  <div className="p-4 space-y-1">
                    {logs.length === 0 ? (
                      <div className="text-gray-500 italic">Training logs will appear here...</div>
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
                            ${log.type === "epoch" && "text-purple-400"}
                          `}
                          >
                            {getLogTypeIcon(log.type)} {log.message}
                          </span>
                        </div>
                      ))
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
