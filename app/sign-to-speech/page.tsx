"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, CameraOff, Volume2, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { HolisticDetection } from "@/lib/mediapipe-holistic"
import Image from "next/image"

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

export default function SignToSpeechPage() {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recognizedText, setRecognizedText] = useState("")
  const [loadedModel, setLoadedModel] = useState<GestureModel | null>(null)
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string }[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>("")
  const [confidenceScore, setConfidenceScore] = useState<number>(0)
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.3) // Lowered threshold
  const [lastPredictions, setLastPredictions] = useState<{ gesture: string; confidence: number }[]>([])
  const [debugMode, setDebugMode] = useState<boolean>(true)
  const [continuousRecognition, setContinuousRecognition] = useState<boolean>(true) // Default to continuous
  const [debugInfo, setDebugInfo] = useState<{
    fps: number
    handDetected: boolean
    processingTime: number
    lastFrameTime: number
    frameCount: number
  }>({
    fps: 0,
    handDetected: false,
    processingTime: 0,
    lastFrameTime: Date.now(),
    frameCount: 0,
  })
  const fpsInterval = useRef<NodeJS.Timeout | null>(null)
  const frameCountRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(Date.now())
  const cameraInitialized = useRef<boolean>(false)
  const lastRecognitionTime = useRef<number>(0)
  const recognitionCooldown = 1000 // 1 second cooldown between recognitions

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const holisticRef = useRef<HolisticDetection | null>(null)
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

      // Log the loaded gestures
      console.log(
        "Loaded gestures:",
        model.gestures.map((g) => g.name),
      )
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

          // Start processing time measurement
          const processStart = performance.now()

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

            // Update debug info about hand detection
            setDebugInfo((prev) => ({
              ...prev,
              handDetected: true,
            }))
          } else {
            setDebugInfo((prev) => ({
              ...prev,
              handDetected: false,
            }))
          }

          // End processing time measurement
          const processEnd = performance.now()
          setDebugInfo((prev) => ({
            ...prev,
            processingTime: processEnd - processStart,
          }))
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
          const fps = frameCountRef.current
          frameCountRef.current = 0

          setDebugInfo((prev) => ({
            ...prev,
            fps,
            frameCount: prev.frameCount + fps,
          }))
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
  }

  // Recognize gesture using the loaded model
  const recognizeGesture = (currentLandmarks: any) => {
    if (!loadedModel || !currentLandmarks) return

    // Improved implementation with better normalization and comparison
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

    // If the top prediction has sufficient confidence, update the recognized text
    if (predictions.length > 0 && predictions[0].confidence > confidenceThreshold) {
      // Only update and speak if it's a new gesture
      if (predictions[0].gesture !== recognizedText) {
        setRecognizedText(predictions[0].gesture)
        setConfidenceScore(predictions[0].confidence * 100)
        speakText(predictions[0].gesture)
      } else {
        // Just update the confidence if it's the same gesture
        setConfidenceScore(predictions[0].confidence * 100)
      }
    }
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
        const weight = [4, 8, 12, 16, 20].includes(pointIdx) ? 1.5 : 1.0

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

    // If MediaPipe isn't running, try to reinitialize it
    if (debugInfo.fps === 0 && cameraInitialized.current) {
      console.log("Attempting to reinitialize MediaPipe...")
      await initializeHolistic()
    }

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

  // Check if MediaPipe is running and reinitialize if needed
  useEffect(() => {
    let checkInterval: NodeJS.Timeout

    if (isCameraActive) {
      checkInterval = setInterval(async () => {
        // If FPS is 0 and camera is supposed to be active, try to reinitialize
        if (debugInfo.fps === 0 && cameraInitialized.current) {
          console.log("MediaPipe not running, attempting to reinitialize...")
          await initializeHolistic()
        }
      }, 5000) // Check every 5 seconds
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval)
    }
  }, [isCameraActive, debugInfo.fps])

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
    }
  }, [])

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Sign to Speech Translation</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Use hand gestures in front of your camera and have them translated to text and speech.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
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
                  {isCameraActive && debugInfo.fps === 0 && (
                    <div className="absolute bottom-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
                      Detection not running
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

                {loadedModel && (
                  <div className="w-full p-4 bg-background/80 backdrop-blur-sm rounded-lg">
                    <h3 className="font-medium mb-2">Loaded Model Info</h3>
                    <p className="text-sm text-muted-foreground">
                      Gestures: {loadedModel.gestures.map((g) => g.name).join(", ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Accuracy: {loadedModel.metadata.accuracy.toFixed(2)}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Trained: {new Date(loadedModel.metadata.timestamp).toLocaleString()}
                    </p>
                  </div>
                )}

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
                <h3 className="text-xl font-semibold mb-2">Recognized Text</h3>
                <p className="text-muted-foreground text-sm">The translation of your sign language gestures</p>
              </div>

              <div className="min-h-[200px] flex items-center justify-center">
                {recognizedText ? (
                  <div className="text-center">
                    <p className="text-3xl font-bold mb-2">{recognizedText}</p>
                    {confidenceScore > 0 && (
                      <p className="text-sm text-muted-foreground mb-6">Confidence: {confidenceScore.toFixed(1)}%</p>
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
                  <p className="text-muted-foreground text-center">
                    {isProcessing
                      ? "Processing your gestures..."
                      : debugInfo.fps === 0 && isCameraActive
                        ? "Hand detection not running. Try restarting the camera."
                        : "Recognized text will appear here after you make hand gestures"}
                  </p>
                )}
              </div>

              {lastPredictions.length > 0 && (
                <div className="mt-8">
                  <h4 className="font-medium mb-2">All Predictions</h4>
                  <div className="space-y-2">
                    {lastPredictions.map((pred, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted/30 rounded-md">
                        <span>{pred.gesture}</span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full"
                              style={{ width: `${pred.confidence * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs">{(pred.confidence * 100).toFixed(1)}%</span>
                        </div>
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

          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2">How It Works</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Our system uses advanced computer vision to detect hand landmarks and recognize Indian Sign Language
              gestures using your trained models.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-square bg-background rounded-md p-2 flex items-center justify-center">
                <Image
                  src="/images/gesture-logo.png"
                  alt="Hand landmark detection"
                  width={80}
                  height={80}
                  className="max-w-full max-h-full"
                />
              </div>
              <div className="aspect-square bg-background rounded-md p-2 flex items-center justify-center">
                <Image
                  src="/images/gesture-logo.png"
                  alt="Hand landmark detection"
                  width={80}
                  height={80}
                  className="max-w-full max-h-full"
                />
              </div>
              <div className="aspect-square bg-background rounded-md p-2 flex items-center justify-center">
                <Image
                  src="/images/gesture-logo.png"
                  alt="Hand landmark detection"
                  width={80}
                  height={80}
                  className="max-w-full max-h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Debug Panel */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Debug Panel</h2>
          <Button variant="outline" size="sm" onClick={() => setDebugMode(!debugMode)}>
            {debugMode ? "Hide Details" : "Show Details"}
          </Button>
        </div>

        {debugMode && (
          <Card className="overflow-hidden border-none shadow-lg bg-gray-900 text-white">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-xs text-gray-400">FPS</div>
                  <div className={`text-xl font-mono ${debugInfo.fps === 0 ? "text-red-400" : "text-green-400"}`}>
                    {debugInfo.fps}
                  </div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-xs text-gray-400">Hand Detected</div>
                  <div className={`text-xl font-mono ${debugInfo.handDetected ? "text-green-400" : "text-red-400"}`}>
                    {debugInfo.handDetected ? "YES" : "NO"}
                  </div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-xs text-gray-400">Processing Time</div>
                  <div className="text-xl font-mono">{debugInfo.processingTime.toFixed(2)} ms</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-xs text-gray-400">Total Frames</div>
                  <div className="text-xl font-mono">{debugInfo.frameCount}</div>
                </div>
              </div>

              <div className="mt-4 bg-gray-800 p-3 rounded-lg">
                <div className="text-xs text-gray-400 mb-2">Recognition Status</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    Camera Active:{" "}
                    <span className={isCameraActive ? "text-green-400" : "text-red-400"}>
                      {isCameraActive ? "YES" : "NO"}
                    </span>
                  </div>
                  <div>
                    Processing:{" "}
                    <span className={isProcessing ? "text-amber-400" : "text-green-400"}>
                      {isProcessing ? "YES" : "NO"}
                    </span>
                  </div>
                  <div>
                    Model Loaded:{" "}
                    <span className={loadedModel ? "text-green-400" : "text-red-400"}>
                      {loadedModel ? "YES" : "NO"}
                    </span>
                  </div>
                  <div>
                    Gestures: <span className="text-blue-400">{loadedModel ? loadedModel.gestures.length : 0}</span>
                  </div>
                  <div>
                    Threshold: <span className="text-purple-400">{(confidenceThreshold * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    Detection:{" "}
                    <span className={debugInfo.fps > 0 ? "text-green-400" : "text-red-400"}>
                      {debugInfo.fps > 0 ? "RUNNING" : "STOPPED"}
                    </span>
                  </div>
                  <div>
                    Continuous:{" "}
                    <span className={continuousRecognition ? "text-green-400" : "text-amber-400"}>
                      {continuousRecognition ? "ON" : "OFF"}
                    </span>
                  </div>
                </div>
              </div>

              {recognizedText && (
                <div className="mt-4 bg-gray-800 p-3 rounded-lg">
                  <div className="text-xs text-gray-400 mb-2">Last Recognition</div>
                  <div className="text-lg font-bold">{recognizedText}</div>
                  <div className="text-sm">Confidence: {confidenceScore.toFixed(1)}%</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
