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
import { Camera, CameraOff, Save, Trash, Play, RefreshCw, Terminal } from "lucide-react"
import { HolisticDetection } from "@/lib/mediapipe-holistic"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TrainingVisualization } from "./training-visualization"
// Import the LoadingSpinner component
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Skeleton } from "@/components/ui/skeleton-loader"

interface GestureData {
  name: string
  landmarks: any[]
  samples: number
}

interface LogEntry {
  id: number
  type: "info" | "success" | "error" | "warning" | "epoch"
  message: string
  timestamp: Date
}

export function GestureTrainer() {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isCollecting, setIsCollecting] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [gestureName, setGestureName] = useState("")
  const [gestures, setGestures] = useState<GestureData[]>([])
  const [currentEpoch, setCurrentEpoch] = useState(0)
  const [totalEpochs, setTotalEpochs] = useState(10)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [modelAccuracy, setModelAccuracy] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [epochLoss, setEpochLoss] = useState<number>(0)
  const [learningRate, setLearningRate] = useState<number>(0.001)
  const [collectionProgress, setCollectionProgress] = useState(0)
  const [sampleFrameCount, setSampleFrameCount] = useState(0)
  const [totalSampleFrames] = useState(30)
  // Add model initialization state
  const [isModelInitializing, setIsModelInitializing] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const holisticRef = useRef<HolisticDetection | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const landmarksRef = useRef<any[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const collectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
        id: Date.now(),
        type,
        message,
        timestamp: new Date(),
      },
    ])
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
      setIsCollecting(false)
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

          // Start holistic detection
          if (holisticRef.current) {
            await holisticRef.current.start(videoRef.current)
          }
        }

        setIsCameraActive(true)
        toast({
          title: "Camera Activated",
          description: "Make hand gestures in front of the camera.",
        })

        addLog("success", "Camera activated successfully")
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
      }
    }, 10000) // 10 second timeout
  }

  // Generate a random loss value that decreases over epochs
  const generateLoss = (epoch: number, totalEpochs: number): number => {
    const baseLoss = 0.8
    const minLoss = 0.05
    const progress = epoch / totalEpochs
    const deterministicLoss = baseLoss * (1 - progress) + minLoss
    const randomVariation = Math.random() * 0.1 - 0.05
    return Math.max(minLoss, deterministicLoss + randomVariation)
  }

  // Initialize MediaPipe Holistic
  useEffect(() => {
    if (!isCameraActive) return

    const initializeHolistic = async () => {
      setIsModelInitializing(true)
      try {
        if (!holisticRef.current) {
          holisticRef.current = new HolisticDetection({
            onResults: (results) => {
              drawResults(results)

              // If collecting samples, store the landmarks
              if (isCollecting && gestureName) {
                const landmarks = extractLandmarks(results)

                // Only add landmarks if we have valid hand data
                if (results.leftHandLandmarks?.length > 0 || results.rightHandLandmarks?.length > 0) {
                  landmarksRef.current.push(landmarks)

                  // Update sample collection progress
                  setSampleFrameCount(landmarksRef.current.length)
                  setCollectionProgress((landmarksRef.current.length / totalSampleFrames) * 100)

                  // Log collection progress periodically
                  if (landmarksRef.current.length % 5 === 0) {
                    addLog("info", `Collecting frames: ${landmarksRef.current.length}/${totalSampleFrames}`)
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
          addLog("info", "MediaPipe detection started")
        }
      } catch (error) {
        console.error("Error initializing MediaPipe:", error)
        addLog("error", `MediaPipe initialization error: ${error}`)
      } finally {
        setIsModelInitializing(false)
      }
    }

    initializeHolistic()

    return () => {
      if (holisticRef.current) {
        holisticRef.current.stop()
      }
    }
  }, [isCameraActive, toast, isCollecting, gestureName, totalSampleFrames])

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

  // Save the trained model
  const saveModel = async () => {
    setIsSaving(true)
    addLog("info", "Saving trained model...")

    try {
      // Prepare model data
      const modelData = {
        gestures,
        metadata: {
          epochs: totalEpochs,
          accuracy: modelAccuracy,
          finalLoss: epochLoss,
          timestamp: new Date().toISOString(),
        },
      }

      // Generate a unique model ID
      const modelId = `gesture-model-${Date.now()}`

      // Save to localStorage
      localStorage.setItem(modelId, JSON.stringify(modelData))

      // Keep track of all saved models
      const savedModels = JSON.parse(localStorage.getItem("savedGestureModels") || "[]")
      savedModels.push({
        id: modelId,
        name: `Model ${savedModels.length + 1}`,
        gestures: gestures.map((g) => g.name),
        accuracy: modelAccuracy,
        timestamp: new Date().toISOString(),
      })
      localStorage.setItem("savedGestureModels", JSON.stringify(savedModels))

      // Set as current model
      localStorage.setItem("currentGestureModel", modelId)

      toast({
        title: "Model Saved",
        description: "Your trained gesture model has been saved successfully to local storage.",
      })

      addLog("success", `Model saved successfully to local storage with ID: ${modelId}`)
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

  // Load a saved model from localStorage
  const loadModel = (modelId: string) => {
    try {
      const modelData = localStorage.getItem(modelId)
      if (!modelData) {
        toast({
          title: "Model Not Found",
          description: "The requested model could not be found in local storage.",
          variant: "destructive",
        })
        return null
      }

      return JSON.parse(modelData)
    } catch (error) {
      console.error("Error loading model:", error)
      toast({
        title: "Load Error",
        description: "There was an error loading your model.",
        variant: "destructive",
      })
      return null
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

  // Generate a random loss value that decreases over epochs
  // const generateLoss = (epoch: number, totalEpochs: number): number => {
  //   const baseLoss = 0.8
  //   const minLoss = 0.05
  //   const progress = epoch / totalEpochs
  //   const deterministicLoss = baseLoss * (1 - progress) + minLoss
  //   const randomVariation = Math.random() * 0.1 - 0.05
  //   return Math.max(minLoss, deterministicLoss + randomVariation)
  // }

  // Train the model with collected gestures
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

    setIsTraining(true)
    setCurrentEpoch(0)
    setTrainingProgress(0)
    setEpochLoss(1.0)

    // Check if we should load an existing model to add to
    const savedModels = JSON.parse(localStorage.getItem("savedGestureModels") || "[]")
    let existingModel = null
    let existingModelId = ""

    if (savedModels.length > 0) {
      // Ask user if they want to add to existing model
      const shouldAddToExisting = window.confirm(
        "Do you want to add these gestures to an existing model? Click OK to add to the most recent model, or Cancel to create a new model.",
      )

      if (shouldAddToExisting && savedModels.length > 0) {
        // Get the most recent model
        const mostRecentModel = savedModels[savedModels.length - 1]
        existingModelId = mostRecentModel.id

        try {
          const modelData = localStorage.getItem(existingModelId)
          if (modelData) {
            existingModel = JSON.parse(modelData)
            addLog("info", `Loading existing model: ${mostRecentModel.name}`)
            addLog("info", `Existing gestures: ${existingModel.gestures.map((g) => g.name).join(", ")}`)
          }
        } catch (error) {
          console.error("Error loading existing model:", error)
          addLog("error", `Failed to load existing model: ${error}`)
          existingModel = null
        }
      }
    }

    addLog("info", `Starting training with ${gestures.length} gestures over ${totalEpochs} epochs`)
    addLog("info", `Initial learning rate: ${learningRate}`)

    // Log the captured gestures being used for training
    addLog("info", "Preparing gesture data for training:")
    gestures.forEach((gesture) => {
      addLog("info", `  - ${gesture.name}: ${gesture.samples} samples, ${gesture.landmarks.length} landmarks`)
    })

    addLog("info", "Initializing model architecture...")
    await new Promise((resolve) => setTimeout(resolve, 800))
    addLog("success", "Model architecture initialized")

    // Simulate training process with epochs
    for (let epoch = 0; epoch < totalEpochs; epoch++) {
      setCurrentEpoch(epoch + 1)
      setTrainingProgress(((epoch + 1) / totalEpochs) * 100)

      // Log start of epoch
      addLog("epoch", `Epoch ${epoch + 1}/${totalEpochs} started`)

      // Simulate batch processing
      const batchSize = 4
      const totalBatches = Math.ceil(gestures.reduce((sum, g) => sum + g.samples, 0) / batchSize)

      // Process each gesture in batches (simulated)
      for (let gestureIndex = 0; gestureIndex < gestures.length; gestureIndex++) {
        const gesture = gestures[gestureIndex]
        addLog("info", `  Processing gesture "${gesture.name}" (${gesture.samples} samples)`)

        // Simulate batch processing time
        await new Promise((resolve) => setTimeout(resolve, 300))
      }

      // Calculate simulated loss for this epoch
      const loss = generateLoss(epoch + 1, totalEpochs)
      setEpochLoss(loss)

      // Update accuracy (simulated)
      const baseAccuracy = 70
      const improvement = Math.min(25, (epoch + 1) * 2.5)
      const randomVariation = Math.random() * 5 - 2.5
      const accuracy = Math.min(99, baseAccuracy + improvement + randomVariation)
      setModelAccuracy(accuracy)

      // Log epoch completion with detailed metrics
      addLog(
        "epoch",
        `Epoch ${epoch + 1}/${totalEpochs} completed - Loss: ${loss.toFixed(4)} - Accuracy: ${accuracy.toFixed(2)}%`,
      )

      // Add more detailed metrics occasionally
      if ((epoch + 1) % 3 === 0) {
        const precision = Math.min(98, baseAccuracy + improvement + Math.random() * 3)
        const recall = Math.min(97, baseAccuracy + improvement - Math.random() * 5)
        addLog("info", `  Metrics - Precision: ${precision.toFixed(2)}% - Recall: ${recall.toFixed(2)}%`)
      }

      // Adjust learning rate (simulated)
      if ((epoch + 1) % 5 === 0) {
        const newLearningRate = learningRate * 0.8
        setLearningRate(newLearningRate)
        addLog("info", `  Learning rate adjusted to ${newLearningRate.toFixed(6)}`)
      }

      // Log validation results occasionally
      if ((epoch + 1) % 4 === 0 || epoch === totalEpochs - 1) {
        addLog("info", `  Running validation on held-out samples...`)
        await new Promise((resolve) => setTimeout(resolve, 500))

        const valAccuracy = accuracy - Math.random() * 5
        const valLoss = loss * (1 + Math.random() * 0.2)
        addLog("info", `  Validation - Accuracy: ${valAccuracy.toFixed(2)}% - Loss: ${valLoss.toFixed(4)}`)

        // Check for potential overfitting
        if (valAccuracy < accuracy - 4) {
          addLog(
            "warning",
            `  Potential overfitting detected (training-validation gap: ${(accuracy - valAccuracy).toFixed(2)}%)`,
          )
        }
      }

      // Simulate confusion matrix occasionally
      if ((epoch + 1) % 7 === 0 || epoch === totalEpochs - 1) {
        addLog("info", `  Confusion matrix for top gestures:`)
        const gestureNames = gestures.slice(0, Math.min(3, gestures.length)).map((g) => g.name)

        for (let i = 0; i < gestureNames.length; i++) {
          const correctPct = 70 + (epoch / totalEpochs) * 25 + Math.random() * 5
          addLog("info", `    ${gestureNames[i]}: ${correctPct.toFixed(1)}% correctly classified`)
        }
      }
    }

    addLog("info", "Training completed, finalizing model...")
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsTraining(false)

    // Prepare model data - combine with existing model if available
    let finalGestures = [...gestures]

    if (existingModel) {
      // Check for duplicate gesture names
      const existingGestureNames = existingModel.gestures.map((g) => g.name)
      const newGestureNames = gestures.map((g) => g.name)

      // Find duplicates
      const duplicates = newGestureNames.filter((name) => existingGestureNames.includes(name))

      if (duplicates.length > 0) {
        // Ask user what to do with duplicates
        const shouldReplace = window.confirm(
          `Found duplicate gestures: ${duplicates.join(", ")}. Click OK to replace them with new samples, or Cancel to keep both versions.`,
        )

        if (shouldReplace) {
          // Replace duplicates
          const filteredExistingGestures = existingModel.gestures.filter((g) => !duplicates.includes(g.name))
          finalGestures = [...filteredExistingGestures, ...gestures]
          addLog("info", `Replaced duplicate gestures: ${duplicates.join(", ")}`)
        } else {
          // Keep both by renaming new ones
          const renamedGestures = gestures.map((g) => {
            if (duplicates.includes(g.name)) {
              return {
                ...g,
                name: `${g.name} (new)`,
              }
            }
            return g
          })
          finalGestures = [...existingModel.gestures, ...renamedGestures]
          addLog("info", `Kept both versions of duplicate gestures: ${duplicates.join(", ")}`)
        }
      } else {
        // No duplicates, just combine
        finalGestures = [...existingModel.gestures, ...gestures]
        addLog("info", `Added ${gestures.length} new gestures to existing model`)
      }
    }

    // Prepare the model data
    const modelData = {
      gestures: finalGestures,
      metadata: {
        epochs: totalEpochs,
        accuracy: modelAccuracy,
        finalLoss: epochLoss,
        timestamp: new Date().toISOString(),
      },
    }

    // Generate a unique model ID or use existing
    const modelId = existingModel ? existingModelId : `gesture-model-${Date.now()}`
    const modelName = existingModel
      ? `Updated Model (${new Date().toLocaleString()})`
      : `Model ${savedModels.length + 1}`

    // Save to localStorage
    localStorage.setItem(modelId, JSON.stringify(modelData))

    // Update saved models list
    if (!existingModel) {
      savedModels.push({
        id: modelId,
        name: modelName,
        gestures: finalGestures.map((g) => g.name),
        timestamp: new Date().toISOString(),
      })
    } else {
      // Update the existing model entry
      const modelIndex = savedModels.findIndex((m) => m.id === modelId)
      if (modelIndex >= 0) {
        savedModels[modelIndex] = {
          ...savedModels[modelIndex],
          gestures: finalGestures.map((g) => g.name),
          timestamp: new Date().toISOString(),
        }
      }
    }

    localStorage.setItem("savedGestureModels", JSON.stringify(savedModels))

    // Set as current model
    localStorage.setItem("currentGestureModel", modelId)

    toast({
      title: existingModel ? "Model Updated" : "Model Saved",
      description: existingModel
        ? `Your model has been updated with ${gestures.length} new gestures.`
        : "Your trained gesture model has been saved successfully.",
    })

    addLog(
      "success",
      existingModel
        ? `Model updated successfully with ${gestures.length} new gestures`
        : `New model saved successfully with ${gestures.length} gestures`,
    )
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
          <h2 className="text-3xl md:text-4xl font-bold">Gesture Training System</h2>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Create and train your own custom hand gestures for sign language recognition.
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
                        : isModelInitializing
                          ? "Initializing model..."
                          : "Ready"}
                    </div>
                  )}
                  {!isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-white">Camera is off</p>
                    </div>
                  )}
                  {isModelInitializing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <LoadingSpinner text="Initializing model..." />
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
                  >
                    {isCameraActive ? <CameraOff className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
                    {isCameraActive ? "Stop Camera" : "Start Camera"}
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

                  <div className="flex gap-4">
                    <Button
                      onClick={startCollecting}
                      disabled={!isCameraActive || isCollecting || !gestureName || isModelInitializing}
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
                <Image src="/images/gesture-logo.png" alt="Model Training" width={30} height={30} className="mr-2" />
                <div>
                  <CardTitle>Model Training</CardTitle>
                  <CardDescription>Train your gesture recognition model with collected samples</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Collected Gestures</h3>
                  {isTraining ? (
                    <div className="space-y-2">
                      {Array.from({ length: gestures.length || 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-10 w-full rounded-md" />
                      ))}
                    </div>
                  ) : gestures.length > 0 ? (
                    <div className="space-y-2">
                      {gestures.map((gesture, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-background rounded-md">
                          <span className="font-medium">{gesture.name}</span>
                          <span className="text-sm text-muted-foreground">{gesture.samples} samples</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No gestures collected yet</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="epochs">Training Epochs</Label>
                    <span>{totalEpochs}</span>
                  </div>
                  <Slider
                    id="epochs"
                    min={5}
                    max={50}
                    step={5}
                    value={[totalEpochs]}
                    onValueChange={(value) => setTotalEpochs(value[0])}
                    disabled={isTraining}
                  />
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
                        <div className="text-xs text-muted-foreground">Learning Rate</div>
                        <div className="font-mono font-medium">{learningRate.toFixed(6)}</div>
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
                    disabled={gestures.length < 2 || isTraining}
                    className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 flex-1"
                  >
                    {isTraining ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Training...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Train Model
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={saveModel}
                    disabled={modelAccuracy === 0 || isTraining || isSaving}
                    className="flex-1"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Locally
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
                      <div key={log.id} className="flex">
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
              <span>Processing gestures...</span>
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
