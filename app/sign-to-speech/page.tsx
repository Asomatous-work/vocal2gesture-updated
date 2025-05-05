"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Camera, CameraOff, Volume2, VolumeX, RefreshCw, History } from "lucide-react"
import { HolisticDetection } from "@/lib/mediapipe-holistic"
import { modelManager } from "@/lib/model-manager"
import { LSTMGestureModel } from "@/lib/lstm-gesture-model"
import { GestureConfidenceVisualizer } from "@/components/gesture-confidence-visualizer"
import { DetectionHistoryLog } from "@/components/detection-history-log"
import { GestureRecognitionDelaySlider } from "@/components/gesture-recognition-delay-slider"

interface DetectedGesture {
  name: string
  confidence: number
  timestamp: number
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

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const holisticRef = useRef<HolisticDetection | null>(null)
  const lstmModelRef = useRef<LSTMGestureModel | null>(null)
  const recognitionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Initialize models and load from GitHub if available
  useEffect(() => {
    const initModels = async () => {
      setIsLoading(true)
      try {
        // Try to load models from GitHub first
        const loaded = await modelManager.loadFromGitHub()
        if (loaded) {
          toast({
            title: "Models Loaded",
            description: "Successfully loaded models from GitHub.",
          })
        } else {
          // Fall back to local storage
          const localLoaded = await modelManager.loadFromLocalStorage()
          if (localLoaded) {
            toast({
              title: "Models Loaded",
              description: "Successfully loaded models from local storage.",
            })
          } else {
            toast({
              title: "No Models Found",
              description: "Please train some gestures first.",
              variant: "destructive",
            })
          }
        }

        // Initialize LSTM model
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
          }
        }
      } catch (error) {
        console.error("Error initializing models:", error)
        toast({
          title: "Model Loading Error",
          description: "There was an error loading the gesture models.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    initModels()

    return () => {
      // Clean up
      if (lstmModelRef.current) {
        lstmModelRef.current.dispose()
      }
    }
  }, [toast])

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
        initializeHolistic()

        // Auto-start recognition
        setIsRecognizing(true)
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
    if (holisticRef.current) {
      holisticRef.current.stop()
    }

    holisticRef.current = new HolisticDetection({
      onResults: (results) => {
        drawResults(results)

        // Only process for gesture recognition if we're in recognition mode
        if (isRecognizing && (results.leftHandLandmarks?.length > 0 || results.rightHandLandmarks?.length > 0)) {
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
      },
    })

    try {
      await holisticRef.current.initialize()

      if (videoRef.current && isCameraActive) {
        await holisticRef.current.start(videoRef.current)
      }
    } catch (error) {
      console.error("Failed to initialize MediaPipe Holistic:", error)
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

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 md:mb-12"
      >
        <div className="flex items-center justify-center mb-4">
          <Image src="/images/gesture-logo.png" alt="Vocal2Gestures Logo" width={60} height={60} className="mr-3" />
          <h2 className="text-2xl md:text-4xl font-bold">Sign to Speech Translator</h2>
        </div>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Make hand gestures in front of the camera to translate sign language into speech
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
                    <Button
                      onClick={toggleCamera}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Start Camera
                    </Button>
                  </div>
                )}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-white mb-2" />
                      <p className="text-white">Loading models...</p>
                    </div>
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
                  disabled={isLoading}
                >
                  {isCameraActive ? <CameraOff className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
                  {isCameraActive ? "Stop Camera" : "Start Camera"}
                </Button>

                <GestureRecognitionDelaySlider
                  value={recognitionDelay}
                  onChange={handleDelayChange}
                  disabled={!isCameraActive}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recognition Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 h-full">
            <CardHeader>
              <CardTitle>Recognition Results</CardTitle>
              <CardDescription>Detected gestures and confidence scores</CardDescription>
            </CardHeader>
            <CardContent>
              {showDetectionHistory ? (
                <DetectionHistoryLog history={detectionHistory} />
              ) : (
                <GestureConfidenceVisualizer
                  recognizedGesture={recognizedGesture}
                  confidenceScores={confidenceScores}
                  isCameraActive={isCameraActive}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
