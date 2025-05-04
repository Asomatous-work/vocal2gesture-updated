"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Camera, CameraOff, Play, RefreshCw, Trash, Download, Upload } from "lucide-react"
import { HolisticDetection } from "@/lib/mediapipe-holistic"

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

export default function ModelViewerPage() {
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string; timestamp: string }[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>("")
  const [loadedModel, setLoadedModel] = useState<GestureModel | null>(null)
  const [selectedGesture, setSelectedGesture] = useState<string>("")
  const [selectedSample, setSelectedSample] = useState<number>(0)
  const [selectedFrame, setSelectedFrame] = useState<number>(0)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [recognizedGesture, setRecognizedGesture] = useState<string>("")
  const [confidenceScores, setConfidenceScores] = useState<{ [key: string]: number }>({})

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const liveCanvasRef = useRef<HTMLCanvasElement>(null)
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

      // Reset selections
      setSelectedGesture(model.gestures.length > 0 ? model.gestures[0].name : "")
      setSelectedSample(0)
      setSelectedFrame(0)

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

  // Handle model selection change
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = e.target.value
    setSelectedModelId(modelId)
    loadModel(modelId)
  }

  // Draw landmarks on canvas
  const drawLandmarks = () => {
    if (!canvasRef.current || !loadedModel) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    const width = canvasRef.current.width
    const height = canvasRef.current.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#1a1a1a"
    ctx.fillRect(0, 0, width, height)

    // Find the selected gesture
    const gesture = loadedModel.gestures.find((g) => g.name === selectedGesture)
    if (!gesture) return

    // Calculate the starting index for the selected sample
    // Assuming each sample has 30 frames
    const framesPerSample = 30
    const startIdx = selectedSample * framesPerSample

    // Get the frame data
    const frameIdx = startIdx + selectedFrame
    if (frameIdx >= gesture.landmarks.length) return

    const frameLandmarks = gesture.landmarks[frameIdx]
    if (!frameLandmarks) return

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

    // Draw left and right hand landmarks
    drawHand(frameLandmarks.leftHand, "rgba(0, 0, 255, 0.7)")
    drawHand(frameLandmarks.rightHand, "rgba(255, 0, 255, 0.7)")

    // Add text label
    ctx.fillStyle = "white"
    ctx.font = "14px Arial"
    ctx.textAlign = "center"
    ctx.fillText(
      `Gesture: ${selectedGesture} - Sample: ${selectedSample + 1} - Frame: ${selectedFrame + 1}`,
      width / 2,
      20,
    )
  }

  // Update canvas when selections change
  useEffect(() => {
    drawLandmarks()
  }, [selectedGesture, selectedSample, selectedFrame, loadedModel])

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
        if (
          isRecognizing &&
          loadedModel &&
          (results.leftHandLandmarks?.length > 0 || results.rightHandLandmarks?.length > 0)
        ) {
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
    if (!liveCanvasRef.current || !videoRef.current) return

    const ctx = liveCanvasRef.current.getContext("2d")
    if (!ctx) return

    const width = videoRef.current.videoWidth
    const height = videoRef.current.videoHeight

    liveCanvasRef.current.width = width
    liveCanvasRef.current.height = height

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
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
      ctx.fillRect(0, height - 40, width, 40)

      ctx.fillStyle = "white"
      ctx.font = "20px Arial"
      ctx.textAlign = "center"
      ctx.fillText(recognizedGesture, width / 2, height - 15)
    }
  }

  // Toggle recognition mode
  const toggleRecognition = () => {
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

    setIsRecognizing(!isRecognizing)
    if (!isRecognizing) {
      toast({
        title: "Recognition Started",
        description: "Make gestures in front of the camera to test recognition.",
      })
    } else {
      setRecognizedGesture("")
      setConfidenceScores({})
    }
  }

  // Recognize gesture using the loaded model
  const recognizeGesture = (currentLandmarks: any) => {
    if (!loadedModel || !currentLandmarks) return

    const scores: { [key: string]: number } = {}
    let bestMatch = ""
    let highestConfidence = 0

    // For each gesture in the model
    for (const gesture of loadedModel.gestures) {
      let totalConfidence = 0
      let sampleCount = 0

      // Calculate the number of samples based on landmarks length
      const framesPerSample = 30
      const totalSamples = Math.floor(gesture.landmarks.length / framesPerSample)

      // Compare with each sample of this gesture
      for (let sampleIdx = 0; sampleIdx < totalSamples; sampleIdx++) {
        // Use the middle frame of each sample for comparison
        const frameIdx = sampleIdx * framesPerSample + Math.floor(framesPerSample / 2)
        const sampleLandmarks = gesture.landmarks[frameIdx]

        if (!sampleLandmarks) continue

        // Calculate similarity between current landmarks and this sample
        const similarity = calculateSimilarity(currentLandmarks, sampleLandmarks)

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
      setRecognizedGesture(bestMatch)
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
        // Adjust the scaling factor as needed
        const similarity = Math.max(0, 1 - distance * 5)

        totalSimilarity += similarity
        count++
      }
    }

    return { similarity: totalSimilarity, count }
  }

  // Export model to JSON file
  const exportModel = () => {
    if (!loadedModel) {
      toast({
        title: "No Model Loaded",
        description: "Please load a model to export.",
        variant: "destructive",
      })
      return
    }

    try {
      const modelJson = JSON.stringify(loadedModel, null, 2)
      const blob = new Blob([modelJson], { type: "application/json" })
      const url = URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = url
      a.download = `gesture-model-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Model Exported",
        description: "Your gesture model has been exported as a JSON file.",
      })
    } catch (error) {
      console.error("Error exporting model:", error)
      toast({
        title: "Export Error",
        description: "There was an error exporting your model.",
        variant: "destructive",
      })
    }
  }

  // Import model from JSON file
  const importModel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const modelData = JSON.parse(event.target?.result as string) as GestureModel

        // Generate a unique model ID
        const modelId = `gesture-model-${Date.now()}`

        // Save to localStorage
        localStorage.setItem(modelId, JSON.stringify(modelData))

        // Add to saved models list
        const savedModels = JSON.parse(localStorage.getItem("savedGestureModels") || "[]")
        savedModels.push({
          id: modelId,
          name: `Imported Model ${savedModels.length + 1}`,
          gestures: modelData.gestures.map((g) => g.name),
          timestamp: new Date().toISOString(),
        })
        localStorage.setItem("savedGestureModels", JSON.stringify(savedModels))

        // Refresh available models
        setAvailableModels(savedModels)

        // Select the imported model
        setSelectedModelId(modelId)
        loadModel(modelId)

        toast({
          title: "Model Imported",
          description: "Your gesture model has been imported successfully.",
        })
      } catch (error) {
        console.error("Error importing model:", error)
        toast({
          title: "Import Error",
          description: "There was an error importing your model. Please check the file format.",
          variant: "destructive",
        })
      }
    }

    reader.readAsText(file)

    // Reset the input
    e.target.value = ""
  }

  // Delete the selected model
  const deleteModel = () => {
    if (!selectedModelId) {
      toast({
        title: "No Model Selected",
        description: "Please select a model to delete.",
        variant: "destructive",
      })
      return
    }

    try {
      // Remove from localStorage
      localStorage.removeItem(selectedModelId)

      // Update saved models list
      const savedModels = JSON.parse(localStorage.getItem("savedGestureModels") || "[]")
      const updatedModels = savedModels.filter((model: any) => model.id !== selectedModelId)
      localStorage.setItem("savedGestureModels", JSON.stringify(updatedModels))

      // Update current model if needed
      if (localStorage.getItem("currentGestureModel") === selectedModelId) {
        localStorage.removeItem("currentGestureModel")
      }

      // Update state
      setAvailableModels(updatedModels)
      setLoadedModel(null)
      setSelectedModelId("")

      toast({
        title: "Model Deleted",
        description: "The selected model has been deleted.",
      })
    } catch (error) {
      console.error("Error deleting model:", error)
      toast({
        title: "Delete Error",
        description: "There was an error deleting the model.",
        variant: "destructive",
      })
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
          <h2 className="text-3xl md:text-4xl font-bold">Gesture Model Viewer</h2>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          View and test your trained gesture models with actual keypoint data
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Model Selection and Management */}
        <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
          <CardHeader>
            <CardTitle>Model Management</CardTitle>
            <CardDescription>Select, view, and manage your trained gesture models</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="model-select" className="mb-2 block">
                  Select Model
                </Label>
                <div className="flex gap-2">
                  <select
                    id="model-select"
                    value={selectedModelId}
                    onChange={handleModelChange}
                    className="flex-1 p-2 border rounded-md bg-background"
                  >
                    <option value="">Select a model</option>
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({new Date(model.timestamp).toLocaleString()})
                      </option>
                    ))}
                  </select>
                  <Button variant="destructive" size="icon" onClick={deleteModel} disabled={!selectedModelId}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={exportModel} disabled={!loadedModel} className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Export Model
                </Button>

                <div className="relative flex-1">
                  <input
                    type="file"
                    id="import-model"
                    accept=".json"
                    onChange={importModel}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button className="w-full">
                    <Upload className="mr-2 h-4 w-4" />
                    Import Model
                  </Button>
                </div>
              </div>
            </div>

            {loadedModel && (
              <div className="space-y-4">
                <div className="p-4 bg-background/80 backdrop-blur-sm rounded-lg">
                  <h3 className="font-medium mb-2">Model Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Gestures:</div>
                    <div>{loadedModel.gestures.length}</div>
                    <div className="text-muted-foreground">Total Samples:</div>
                    <div>{loadedModel.gestures.reduce((sum, g) => sum + g.samples, 0)}</div>
                    <div className="text-muted-foreground">Training Epochs:</div>
                    <div>{loadedModel.metadata.epochs}</div>
                    <div className="text-muted-foreground">Accuracy:</div>
                    <div>{loadedModel.metadata.accuracy.toFixed(2)}%</div>
                    <div className="text-muted-foreground">Final Loss:</div>
                    <div>{loadedModel.metadata.finalLoss.toFixed(4)}</div>
                    <div className="text-muted-foreground">Trained On:</div>
                    <div>{new Date(loadedModel.metadata.timestamp).toLocaleString()}</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Available Gestures</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {loadedModel.gestures.map((gesture) => (
                      <Button
                        key={gesture.name}
                        variant={selectedGesture === gesture.name ? "default" : "outline"}
                        onClick={() => setSelectedGesture(gesture.name)}
                        className="justify-start"
                      >
                        <span className="truncate">{gesture.name}</span>
                        <span className="ml-auto text-xs bg-muted/50 px-2 py-0.5 rounded-full">
                          {gesture.samples} samples
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Keypoint Visualization */}
        <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
          <CardHeader>
            <CardTitle>Keypoint Visualization</CardTitle>
            <CardDescription>View the saved keypoints for your trained gestures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadedModel && selectedGesture ? (
              <>
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <canvas ref={canvasRef} width={640} height={480} className="w-full h-full" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">Sample</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSelectedSample(Math.max(0, selectedSample - 1))}
                        disabled={selectedSample === 0}
                      >
                        -
                      </Button>
                      <div className="flex-1 text-center">
                        {selectedSample + 1} /{" "}
                        {Math.ceil(
                          loadedModel.gestures.find((g) => g.name === selectedGesture)?.landmarks.length / 30,
                        ) || 1}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const gesture = loadedModel.gestures.find((g) => g.name === selectedGesture)
                          const maxSample = gesture ? Math.ceil(gesture.landmarks.length / 30) - 1 : 0
                          setSelectedSample(Math.min(maxSample, selectedSample + 1))
                        }}
                        disabled={
                          selectedSample >=
                            Math.ceil(
                              loadedModel.gestures.find((g) => g.name === selectedGesture)?.landmarks.length / 30,
                            ) -
                              1 || 0
                        }
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Frame</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSelectedFrame(Math.max(0, selectedFrame - 1))}
                        disabled={selectedFrame === 0}
                      >
                        -
                      </Button>
                      <div className="flex-1 text-center">{selectedFrame + 1} / 30</div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSelectedFrame(Math.min(29, selectedFrame + 1))}
                        disabled={selectedFrame >= 29}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-6 mb-4">
                  <Image src="/images/gesture-logo.png" alt="Gesture Logo" width={60} height={60} />
                </div>
                <h3 className="text-lg font-medium mb-2">No Gesture Selected</h3>
                <p className="text-muted-foreground max-w-sm">
                  Please select a model and gesture to view the saved keypoints.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Testing */}
      <div className="mt-8">
        <Card className="overflow-hidden border-none shadow-lg">
          <CardHeader>
            <CardTitle>Live Testing</CardTitle>
            <CardDescription>Test your model with real-time gesture recognition</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="camera">
              <TabsList className="mb-4">
                <TabsTrigger value="camera">Camera View</TabsTrigger>
                <TabsTrigger value="results">Recognition Results</TabsTrigger>
              </TabsList>

              <TabsContent value="camera" className="space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`absolute inset-0 w-full h-full object-cover ${isCameraActive ? "opacity-100" : "opacity-0"}`}
                  />
                  <canvas ref={liveCanvasRef} className="absolute inset-0 w-full h-full" />
                  {!isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-white">Camera is off</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
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
                    onClick={toggleRecognition}
                    disabled={!isCameraActive || !loadedModel}
                    className={`flex-1 ${
                      isRecognizing
                        ? "bg-amber-500 hover:bg-amber-600"
                        : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    }`}
                  >
                    {isRecognizing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Stop Recognition
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Start Recognition
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="results">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-medium mb-4">Recognition Results</h3>

                  {recognizedGesture ? (
                    <div className="text-center mb-6">
                      <div className="text-3xl font-bold mb-2">{recognizedGesture}</div>
                      <div className="text-sm text-muted-foreground">
                        Confidence: {(confidenceScores[recognizedGesture] * 100).toFixed(1)}%
                      </div>
                    </div>
                  ) : (
                    <div className="text-center mb-6 text-muted-foreground">
                      {isRecognizing ? "Waiting for gesture..." : "Start recognition to see results"}
                    </div>
                  )}

                  <h4 className="font-medium mb-2 text-sm">All Gestures</h4>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {Object.entries(confidenceScores)
                        .sort(([, a], [, b]) => b - a)
                        .map(([gesture, confidence]) => (
                          <div
                            key={gesture}
                            className="flex justify-between items-center p-2 bg-background/80 rounded-md"
                          >
                            <span>{gesture}</span>
                            <div className="flex items-center">
                              <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full"
                                  style={{ width: `${confidence * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-xs">{(confidence * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
