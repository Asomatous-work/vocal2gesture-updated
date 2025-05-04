"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, CameraOff, Volume2, RefreshCw } from "lucide-react"
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
  const [lastPredictions, setLastPredictions] = useState<{ gesture: string; confidence: number }[]>([])

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

      setIsCameraActive(false)
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

        // Only process for gesture recognition if we have a loaded model
        if (loadedModel && (results.leftHandLandmarks?.length > 0 || results.rightHandLandmarks?.length > 0)) {
          const landmarks = extractLandmarks(results)
          recognizeGesture(landmarks)
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
  }

  // Recognize gesture using the loaded model
  const recognizeGesture = (currentLandmarks: any) => {
    if (!loadedModel || !currentLandmarks) return

    // Simple implementation: compare the current landmarks with the stored landmarks
    // and find the closest match based on Euclidean distance

    const predictions: { gesture: string; confidence: number }[] = []

    // For each gesture in the model
    for (const gesture of loadedModel.gestures) {
      let minDistance = Number.POSITIVE_INFINITY

      // Compare with each sample of this gesture
      for (let i = 0; i < gesture.landmarks.length; i += 30) {
        // Assuming 30 frames per sample
        const sampleLandmarks = gesture.landmarks.slice(i, i + 30)

        // Calculate distance between current landmarks and this sample
        let distance = 0
        let count = 0

        // Compare hand landmarks
        if (currentLandmarks.rightHand.length > 0 && sampleLandmarks.some((s: any) => s.rightHand?.length > 0)) {
          for (let j = 0; j < Math.min(currentLandmarks.rightHand.length, 21); j++) {
            const current = currentLandmarks.rightHand[j]

            // Find the corresponding landmark in the sample
            const sample = sampleLandmarks.find((s: any) => s.rightHand?.[j])?.rightHand?.[j]

            if (current && sample) {
              const d = Math.sqrt(
                Math.pow(current.x - sample.x, 2) +
                  Math.pow(current.y - sample.y, 2) +
                  Math.pow((current.z || 0) - (sample.z || 0), 2),
              )
              distance += d
              count++
            }
          }
        }

        if (currentLandmarks.leftHand.length > 0 && sampleLandmarks.some((s: any) => s.leftHand?.length > 0)) {
          for (let j = 0; j < Math.min(currentLandmarks.leftHand.length, 21); j++) {
            const current = currentLandmarks.leftHand[j]

            // Find the corresponding landmark in the sample
            const sample = sampleLandmarks.find((s: any) => s.leftHand?.[j])?.leftHand?.[j]

            if (current && sample) {
              const d = Math.sqrt(
                Math.pow(current.x - sample.x, 2) +
                  Math.pow(current.y - sample.y, 2) +
                  Math.pow((current.z || 0) - (sample.z || 0), 2),
              )
              distance += d
              count++
            }
          }
        }

        if (count > 0) {
          distance /= count // Average distance
          minDistance = Math.min(minDistance, distance)
        }
      }

      // Convert distance to confidence (inverse relationship)
      // Lower distance = higher confidence
      const confidence = Math.max(0, 1 - minDistance * 5) // Scale factor can be adjusted

      predictions.push({
        gesture: gesture.name,
        confidence: confidence,
      })
    }

    // Sort by confidence (highest first)
    predictions.sort((a, b) => b.confidence - a.confidence)

    // Update state with top predictions
    setLastPredictions(predictions)

    // If the top prediction has sufficient confidence, update the recognized text
    if (predictions.length > 0 && predictions[0].confidence > 0.6) {
      setRecognizedText(predictions[0].gesture)
      setConfidenceScore(predictions[0].confidence * 100)

      // Speak the recognized text
      if (predictions[0].gesture !== recognizedText) {
        speakText(predictions[0].gesture)
      }
    }
  }

  // Process gesture recognition
  const processGesture = () => {
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

    // Capture current frame from video to canvas
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d")
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }

    // The actual recognition happens continuously in the onResults callback
    // This function just triggers a manual capture and processing

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
                    disabled={!isCameraActive || isProcessing || !loadedModel}
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
    </div>
  )
}
