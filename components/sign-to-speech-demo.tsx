"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Camera, CameraOff, Volume2, VolumeX, Loader2, AlertTriangle } from "lucide-react"
import { HolisticDetection } from "@/lib/mediapipe-holistic"
import { modelManager } from "@/lib/model-manager"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { MediaPipeLoader } from "@/components/mediapipe-loader"
import {
  drawLandmarks,
  drawConnectors,
  HAND_CONNECTIONS,
  POSE_CONNECTIONS,
  FACEMESH_TESSELATION,
} from "@/lib/pose-utils"
import { signToSpeechService } from "@/lib/sign-to-speech-service"

export function SignToSpeechDemo() {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true)
  const [recognizedGesture, setRecognizedGesture] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isCameraInitializing, setIsCameraInitializing] = useState(false)
  const [handDetected, setHandDetected] = useState(false)
  const [mediaPipeLoaded, setMediaPipeLoaded] = useState(false)
  const [detectionStatus, setDetectionStatus] = useState<"initializing" | "ready" | "running" | "error" | "stopped">(
    "initializing",
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pythonBackendAvailable, setPythonBackendAvailable] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const holisticRef = useRef<HolisticDetection | null>(null)
  const recognitionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastDetectionTimeRef = useRef<number>(0)
  const { toast } = useToast()

  // Initialize models
  useEffect(() => {
    const initModels = async () => {
      setIsLoading(true)
      try {
        await modelManager.loadFromLocalStorage()
        setIsLoading(false)
      } catch (error) {
        console.error("Error initializing models:", error)
        setErrorMessage("Failed to load gesture models. Please try again.")
        setIsLoading(false)
      }
    }

    initModels()

    return () => {
      // Clean up
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (holisticRef.current) {
        holisticRef.current.stop()
      }
    }
  }, [])

  // Check if Python backend is available
  useEffect(() => {
    const checkPythonBackend = async () => {
      try {
        const available = await signToSpeechService.checkAvailability()
        setPythonBackendAvailable(available)

        if (available) {
          console.log("Python backend is available for sign-to-speech")

          // Load available models
          const modelsResponse = await signToSpeechService.listModels()
          if (modelsResponse.models && modelsResponse.models.length > 0) {
            // Load the first model
            const firstModel = modelsResponse.models[0]
            await signToSpeechService.loadModel(firstModel.id)
            console.log(`Loaded sign language model: ${firstModel.name}`)
          }
        } else {
          console.warn("Python backend is not available. Using JavaScript fallback.")
        }
      } catch (error) {
        console.error("Error checking Python backend:", error)
        setPythonBackendAvailable(false)
      }
    }

    checkPythonBackend()
  }, [])

  // Handle MediaPipe loaded
  const handleMediaPipeLoaded = () => {
    setMediaPipeLoaded(true)
    setDetectionStatus("ready")
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
      setDetectionStatus("stopped")
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
        setErrorMessage("Could not access your camera. Please check permissions.")
        setDetectionStatus("error")
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
          setHandDetected(hasLeftHand || hasRightHand)

          // Only process for gesture recognition if we're in recognition mode
          if (isRecognizing && (hasLeftHand || hasRightHand)) {
            // Check if enough time has passed since last detection (throttle)
            const now = Date.now()
            if (now - lastDetectionTimeRef.current >= 500) {
              // 500ms delay between recognitions
              recognizeGesture(results)
              lastDetectionTimeRef.current = now
            }
          }
        },
        onError: (error) => {
          console.error("MediaPipe Holistic error:", error)
          setErrorMessage(`MediaPipe error: ${error.message}`)
          setDetectionStatus("error")
        },
        onStatusChange: (status) => {
          setDetectionStatus(status)
        },
        // More sensitive detection settings for demo
        minDetectionConfidence: 0.2,
        minTrackingConfidence: 0.2,
      })

      await holisticRef.current.initialize()

      if (videoRef.current && isCameraActive) {
        await holisticRef.current.start(videoRef.current)
      }
    } catch (error) {
      console.error("Failed to initialize MediaPipe Holistic:", error)
      setErrorMessage(`Failed to initialize detection: ${error.message}`)
      setDetectionStatus("error")
    }
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
    if (results.leftHandLandmarks) {
      drawConnectors(ctx, results.leftHandLandmarks, HAND_CONNECTIONS, { color: "rgba(0, 0, 255, 0.7)", lineWidth: 2 })
      drawLandmarks(ctx, results.leftHandLandmarks, { color: "rgba(0, 0, 255, 0.7)", radius: 3 })
    }

    if (results.rightHandLandmarks) {
      drawConnectors(ctx, results.rightHandLandmarks, HAND_CONNECTIONS, {
        color: "rgba(255, 0, 255, 0.7)",
        lineWidth: 2,
      })
      drawLandmarks(ctx, results.rightHandLandmarks, { color: "rgba(255, 0, 255, 0.7)", radius: 3 })
    }

    // Draw pose landmarks (simplified)
    if (results.poseLandmarks) {
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: "rgba(0, 255, 0, 0.5)", lineWidth: 2 })
      drawLandmarks(ctx, results.poseLandmarks, { color: "rgba(0, 255, 0, 0.5)", radius: 2 })
    }

    // Draw face mesh (simplified)
    if (results.faceLandmarks) {
      drawConnectors(ctx, results.faceLandmarks, FACEMESH_TESSELATION, {
        color: "rgba(255, 255, 255, 0.2)",
        lineWidth: 1,
      })
    }

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
      ctx.font = "14px Arial"
      ctx.fillText(`Detected Sign`, boxX + 10, boxY + 45)
    }
  }

  // Recognize gesture using model manager
  const recognizeGesture = (results: any) => {
    const gestures = modelManager.getGestures()
    if (!gestures || gestures.length === 0) return

    let bestMatch = ""
    let highestConfidence = 0

    // Extract landmarks for comparison
    const currentLandmarks = {
      pose: results.poseLandmarks || [],
      leftHand: results.leftHandLandmarks || [],
      rightHand: results.rightHandLandmarks || [],
      face: results.faceLandmarks || [],
    }

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

      // Track the best match
      if (avgConfidence > highestConfidence && avgConfidence > 0.6) {
        highestConfidence = avgConfidence
        bestMatch = gesture.name
      }
    }

    // Only update recognized gesture if confidence is above threshold
    if (bestMatch) {
      setRecognizedGesture(bestMatch)

      // Speak the gesture if speech is enabled
      if (isSpeechEnabled) {
        speakText(bestMatch)
      }
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
  }

  // Retry detection after error
  const handleRetry = async () => {
    setErrorMessage(null)

    // Stop any existing camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (holisticRef.current) {
      holisticRef.current.stop()
    }

    setIsCameraActive(false)
    setIsRecognizing(false)

    // Wait a moment before retrying
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Try to initialize again
    if (mediaPipeLoaded) {
      toggleCamera()
    } else {
      setDetectionStatus("initializing")
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
          <CardHeader>
            <CardTitle>Sign to Speech Translation</CardTitle>
            <CardDescription>
              Make hand gestures in front of the camera to translate sign language into speech
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!mediaPipeLoaded ? (
              <div className="p-6">
                <MediaPipeLoader onLoaded={handleMediaPipeLoaded} />
              </div>
            ) : (
              <>
                <div className="relative aspect-video bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`absolute inset-0 w-full h-full object-cover ${isCameraActive ? "opacity-100" : "opacity-0"}`}
                  />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

                  {/* Status overlay */}
                  {isCameraActive && (
                    <div
                      className={`absolute top-2 left-2 right-2 px-3 py-2 rounded text-sm font-medium text-center ${
                        handDetected ? "bg-green-500/70 text-white" : "bg-red-500/70 text-white"
                      }`}
                    >
                      {handDetected ? "Hand Detected ✓" : "No Hand Detected - Please position your hand in view"}
                    </div>
                  )}

                  {/* Error message */}
                  {errorMessage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                      <Alert variant="destructive" className="max-w-md">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Detection Error</AlertTitle>
                        <AlertDescription>{errorMessage}</AlertDescription>
                        <Button variant="outline" size="sm" onClick={handleRetry} className="mt-2">
                          Retry
                        </Button>
                      </Alert>
                    </div>
                  )}

                  {!isCameraActive && !isLoading && !errorMessage && (
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
                  {pythonBackendAvailable && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                      Python Backend Active
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
                    disabled={isLoading || isCameraInitializing || !!errorMessage}
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

                  <Button variant="outline" onClick={toggleSpeech} disabled={!isCameraActive} className="h-10">
                    {isSpeechEnabled ? (
                      <>
                        <Volume2 className="mr-2 h-4 w-4" />
                        Speech On
                      </>
                    ) : (
                      <>
                        <VolumeX className="mr-2 h-4 w-4" />
                        Speech Off
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
