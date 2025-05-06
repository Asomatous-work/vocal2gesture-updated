"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/components/ui/use-toast"
import { Camera, CameraOff, Trash, RefreshCw, Terminal, Brain, Github } from "lucide-react"
import { HolisticDetection } from "@/lib/mediapipe-holistic"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TrainingVisualization } from "./training-visualization"
import { LSTMGestureModel, type LSTMModelConfig } from "@/lib/lstm-gesture-model"
import { modelManager } from "@/lib/model-manager"
import * as tf from "@tensorflow/tfjs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

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

export function LSTMGestureTrainer() {
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
  const [isSavingToGitHub, setIsSavingToGitHub] = useState(false)
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
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [isInitializing, setIsInitializing] = useState(false)
  const [handDetected, setHandDetected] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const holisticRef = useRef<HolisticDetection | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const landmarksRef = useRef<any[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)
  const lstmModelRef = useRef<LSTMGestureModel | null>(null)
  const collectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const collectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Initialize TensorFlow.js
  useEffect(() => {
    const initTF = async () => {
      try {
        await tf.ready()
        addLog("info", "TensorFlow.js initialized successfully")
        setTfReady(true)

        // Create LSTM model instance
        const config: LSTMModelConfig = {
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

              // Check if hands are detected
              const hasLeftHand = results.leftHandLandmarks && results.leftHandLandmarks.length > 0
              const hasRightHand = results.rightHandLandmarks && results.rightHandLandmarks.length > 0

              setHandDetected(hasLeftHand || hasRightHand)

              // If collecting samples, store the landmarks
              if (isCollecting && gestureName) {
                const landmarks = extractLandmarks(results)

                // Only add landmarks if we have valid hand data
                if (hasLeftHand || hasRightHand) {
                  landmarksRef.current.push(landmarks)

                  // Update sample collection progress
                  setSampleFrameCount(landmarksRef.current.length)
                  setCollectionProgress((landmarksRef.current.length / totalSampleFrames) * 100)

                  // Log collection progress periodically
                  if (landmarksRef.current.length % 5 === 0) {
                    addLog("info", `Collecting frames: ${landmarksRef.current.length}/${totalSampleFrames}`)
                    setDebugInfo(`Collecting frames: ${landmarksRef.current.length}/${totalSampleFrames}`)
                  }

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

    if (!handDetected) {
      toast({
        title: "No Hand Detected",
        description: "Please position your hand in the camera view.",
        variant: "destructive",
      })

      addLog("warning", "Cannot collect sample: No hand detected")
      return
    }

    // Reset collection state
    landmarksRef.current = []
    setSampleFrameCount(0)
    setCollectionProgress(0)
    setIsCollecting(true)
    setCollectionError(null)
    setDebugInfo("Starting collection...")

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

    // This interval will check if we're making progress in collection
    collectionIntervalRef.current = setInterval(() => {
      if (isCollecting) {
        // If we haven't collected any frames in the last 2 seconds, show a hint
        if (landmarksRef.current.length === 0) {
          setDebugInfo("No hand landmarks detected. Make sure your hand is visible in the camera.")
        } else if (landmarksRef.current.length < 5 && sampleFrameCount < 5) {
          setDebugInfo(`Only ${landmarksRef.current.length} frames collected. Keep your hand visible.`)
        }
      }
    }, 2000)

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

    // Draw face landmarks
    if (results.faceLandmarks) {
      ctx.fillStyle = "rgba(255, 0, 0, 0.5)"
      for (const landmark of results.faceLandmarks) {
        ctx.beginPath()
        ctx.arc(landmark.x * width, landmark.y * height, 1, 0, 2 * Math.PI)
        ctx.fill()
      }
    }

    // Draw pose landmarks
    if (results.poseLandmarks) {
      ctx.fillStyle = "rgba(0, 255, 0, 0.5)"
      for (const landmark of results.poseLandmarks) {
        ctx.beginPath()
        ctx.arc(landmark.x * width, landmark.y * height, 3, 0, 2 * Math.PI)
        ctx.fill()
      }
    }

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
        const config: LSTMModelConfig = {
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

      // Save the model
      const modelId = `lstm_model_${Date.now()}`
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
        title: "LSTM Model Trained",
        description: `Your LSTM model has been trained with ${gestures.length} gestures and saved to local storage.`,
      })

      setIsModelLoaded(true)
      addLog("success", `LSTM model saved successfully with ID: ${modelId}`)
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

  // Save the trained model to GitHub - using the existing GitHub config
  const saveModelToGitHub = async () => {
    if (!lstmModelRef.current || !isModelLoaded) {
      toast({
        title: "No Model Available",
        description: "Please train an LSTM model first.",
        variant: "destructive",
      })
      return
    }

    setIsSavingToGitHub(true)
    addLog("info", "Preparing to save LSTM model to GitHub...")

    try {
      // Export model data
      const modelData = await lstmModelRef.current.exportForGitHub()

      // Save to model manager
      for (const gesture of gestures) {
        modelManager.saveGesture(gesture)
      }

      // Save LSTM model data
      localStorage.setItem("lstm_model_data", JSON.stringify(modelData))

      // Save to GitHub using the existing GitHub configuration
      const saved = await modelManager.saveToGitHub()

      if (saved) {
        toast({
          title: "Model Saved to GitHub",
          description: "Your LSTM model has been saved to GitHub for cross-device usage.",
        })
        addLog("success", "LSTM model saved to GitHub successfully")
      } else {
        throw new Error("Failed to save to GitHub")
      }
    } catch (error) {
      console.error("Error saving model to GitHub:", error)
      toast({
        title: "GitHub Save Error",
        description: "There was an error saving your model to GitHub.",
        variant: "destructive",
      })

      addLog("error", `Failed to save model to GitHub: ${error}`)
    } finally {
      setIsSavingToGitHub(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center mb-4">
          <Image src="/images/gesture-logo.png" alt="Vocal2Gestures Logo" width={60} height={60} className="mr-3" />
          <h2 className="text-3xl md:text-4xl font-bold">LSTM Gesture Training System</h2>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Create and train your own custom hand gestures using LSTM neural networks for improved recognition.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Camera and Detection */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
            <CardHeader>
              <div className="flex items-center">
                <Image src="/images/gesture-logo.png" alt="Gesture Detection" width={30} height={30} className="mr-2" />
                <div>
                  <CardTitle>Gesture Detection</CardTitle>
                  <CardDescription>Position your hands in the camera view to detect gestures</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-6">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ objectFit: "cover" }}
                    className={`absolute inset-0 w-full h-full ${isCameraActive ? "opacity-100" : "opacity-0"}`}
                  />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                  {isCameraActive && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {isCollecting
                        ? `Collecting: ${sampleFrameCount}/${totalSampleFrames}`
                        : handDetected
                          ? "Hand Detected ✓"
                          : "No Hand Detected"}
                    </div>
                  )}
                  {!isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-white">Camera is off</p>
                    </div>
                  )}
                  {isInitializing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center">
                        <LoadingSpinner size="lg" />
                        <p className="text-white mt-2">Initializing MediaPipe...</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 mb-6">
                  <Button
                    onClick={toggleCamera}
                    className={`${
                      isCameraActive
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    }`}
                    disabled={isInitializing}
                  >
                    {isInitializing ? (
                      <LoadingSpinner className="mr-2" />
                    ) : isCameraActive ? (
                      <CameraOff className="mr-2 h-4 w-4" />
                    ) : (
                      <Camera className="mr-2 h-4 w-4" />
                    )}
                    {isInitializing ? "Initializing..." : isCameraActive ? "Stop Camera" : "Start Camera"}
                  </Button>
                </div>

                <div className="w-full space-y-4">
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
                    <Alert variant="destructive" className="mt-2">
                      <AlertTitle>Collection Error</AlertTitle>
                      <AlertDescription>{collectionError}</AlertDescription>
                    </Alert>
                  )}

                  {debugInfo && <div className="text-sm text-muted-foreground bg-muted p-2 rounded">{debugInfo}</div>}

                  <div className="flex gap-4">
                    <Button
                      onClick={startCollecting}
                      disabled={!isCameraActive || isCollecting || !gestureName || !detectionActive || isInitializing}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 flex-1"
                    >
                      {isCollecting ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Collecting...
                        </>
                      ) : (
                        "Collect Sample"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={resetGestures}
                      disabled={gestures.length === 0}
                      className="flex-1"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Reset All
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Training Interface */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
            <CardHeader>
              <div className="flex items-center">
                <Brain className="mr-2 h-5 w-5" />
                <div>
                  <CardTitle>LSTM Model Training</CardTitle>
                  <CardDescription>Train your neural network with collected samples</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Collected Gestures</h3>
                  {gestures.length > 0 ? (
                    <div className="space-y-2">
                      {gestures.map((gesture, index) => (
                        <div
                          key={`gesture-${index}-${gesture.name}`}
                          className="flex justify-between items-center p-2 bg-background rounded-md"
                        >
                          <span className="font-medium">{gesture.name}</span>
                          <span className="text-sm text-muted-foreground">{gesture.samples} samples</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No gestures collected yet</p>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="epochs">Training Epochs</Label>
                      <span>{totalEpochs}</span>
                    </div>
                    <Slider
                      id="epochs"
                      min={10}
                      max={100}
                      step={5}
                      value={[totalEpochs]}
                      onValueChange={(value) => setTotalEpochs(value[0])}
                      disabled={isTraining}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="hiddenUnits">LSTM Hidden Units</Label>
                      <span>{hiddenUnits}</span>
                    </div>
                    <Slider
                      id="hiddenUnits"
                      min={16}
                      max={128}
                      step={16}
                      value={[hiddenUnits]}
                      onValueChange={(value) => setHiddenUnits(value[0])}
                      disabled={isTraining}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="learningRate">Learning Rate</Label>
                      <span>{learningRate}</span>
                    </div>
                    <Slider
                      id="learningRate"
                      min={0.0001}
                      max={0.01}
                      step={0.0001}
                      value={[learningRate]}
                      onValueChange={(value) => setLearningRate(value[0])}
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

                {modelAccuracy > 0 && (
                  <div className="p-4 bg-background rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Model Accuracy</span>
                      <span className="text-lg font-bold">{modelAccuracy.toFixed(1)}%</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={trainModel}
                    disabled={gestures.length < 1 || isTraining || !tfReady}
                    className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 flex-1"
                  >
                    {isTraining ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Training...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        Train LSTM
                      </>
                    )}
                  </Button>
                  <Button onClick={saveModelToGitHub} disabled={!isModelLoaded || isSavingToGitHub} className="flex-1">
                    {isSavingToGitHub ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Github className="mr-2 h-4 w-4" />
                        Save to GitHub
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Training Console */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-8"
      >
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gray-900 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Terminal className="mr-2 h-5 w-5" />
                <CardTitle>Training Console</CardTitle>
              </div>
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
              <ScrollArea className="h-64 rounded-b-lg">
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

              <TrainingVisualization
                isTraining={isTraining}
                currentEpoch={currentEpoch}
                totalEpochs={totalEpochs}
                accuracy={modelAccuracy}
                loss={epochLoss}
              />
            </div>
          </CardContent>
        </Card>
        {isTraining && (
          <div className="mt-2 bg-gray-800 rounded-md p-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Current Epoch Progress</span>
              <span>Processing data...</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.random() * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
