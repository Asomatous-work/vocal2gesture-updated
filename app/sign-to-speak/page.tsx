"use client"

import { useState, useEffect, useRef } from "react"
import { Camera, CameraOff, Volume2, Trash2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { PageContainer } from "@/components/page-container"
import { MediaPipeLoader } from "@/components/mediapipe-loader"
import { getMediaPipeHolistic } from "@/lib/mediapipe-holistic"

export default function SignToSpeakPage() {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectedGestures, setDetectedGestures] = useState<string[]>([])
  const [currentText, setCurrentText] = useState("")
  const [confidence, setConfidence] = useState(0)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7)
  const [error, setError] = useState<string | null>(null)
  const [mediaPipeLoaded, setMediaPipeLoaded] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const holisticRef = useRef(getMediaPipeHolistic())

  useEffect(() => {
    return () => {
      if (isCameraActive) {
        stopCamera()
      }
    }
  }, [])

  const startCamera = async () => {
    if (!videoRef.current) return

    try {
      setError(null)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      })

      videoRef.current.srcObject = stream
      setIsCameraActive(true)

      // Initialize MediaPipe Holistic if not already initialized
      if (!holisticRef.current.isInitialized()) {
        await holisticRef.current.initialize()
      }

      // Start detection
      await holisticRef.current.startCamera(videoRef.current)
      holisticRef.current.onResults(handleResults)
      setIsDetecting(true)
    } catch (err) {
      console.error("Error starting camera:", err)
      setError(`Failed to start camera: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }

    holisticRef.current.stopCamera()
    setIsCameraActive(false)
    setIsDetecting(false)
  }

  const toggleCamera = () => {
    if (isCameraActive) {
      stopCamera()
    } else {
      startCamera()
    }
  }

  const handleResults = (results: any) => {
    if (!canvasRef.current) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

    // Draw video frame
    if (videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)
    }

    // Draw hand landmarks
    if (results.leftHandLandmarks) {
      drawLandmarks(ctx, results.leftHandLandmarks, "rgba(0, 255, 0, 0.8)")
    }

    if (results.rightHandLandmarks) {
      drawLandmarks(ctx, results.rightHandLandmarks, "rgba(0, 0, 255, 0.8)")
    }

    // Here you would implement gesture recognition based on the landmarks
    // For now, we'll simulate detection with a random gesture every few seconds
    simulateGestureDetection()
  }

  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: any[], color: string) => {
    if (!landmarks || landmarks.length === 0) return

    // Draw landmarks
    ctx.fillStyle = color
    for (const landmark of landmarks) {
      const x = landmark.x * canvasRef.current!.width
      const y = landmark.y * canvasRef.current!.height

      ctx.beginPath()
      ctx.arc(x, y, 5, 0, 2 * Math.PI)
      ctx.fill()
    }

    // Connect landmarks with lines
    ctx.strokeStyle = color
    ctx.lineWidth = 2

    // Hand connections (simplified)
    const connections = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4], // thumb
      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8], // index finger
      [0, 9],
      [9, 10],
      [10, 11],
      [11, 12], // middle finger
      [0, 13],
      [13, 14],
      [14, 15],
      [15, 16], // ring finger
      [0, 17],
      [17, 18],
      [18, 19],
      [19, 20], // pinky
      [0, 5],
      [5, 9],
      [9, 13],
      [13, 17], // palm
    ]

    for (const [i, j] of connections) {
      if (landmarks[i] && landmarks[j]) {
        ctx.beginPath()
        ctx.moveTo(landmarks[i].x * canvasRef.current!.width, landmarks[i].y * canvasRef.current!.height)
        ctx.lineTo(landmarks[j].x * canvasRef.current!.width, landmarks[j].y * canvasRef.current!.height)
        ctx.stroke()
      }
    }
  }

  // This is a placeholder function to simulate gesture detection
  // In a real implementation, you would use a trained model to recognize gestures
  const simulateGestureDetection = () => {
    if (!isDetecting) return

    // Randomly detect a gesture every few seconds
    if (Math.random() < 0.01) {
      const gestures = ["hello", "thank you", "please", "yes", "no", "help"]
      const randomGesture = gestures[Math.floor(Math.random() * gestures.length)]
      const randomConfidence = 0.7 + Math.random() * 0.3 // Between 0.7 and 1.0

      if (randomConfidence >= confidenceThreshold) {
        addDetectedGesture(randomGesture, randomConfidence)
      }
    }
  }

  const addDetectedGesture = (gesture: string, detectionConfidence: number) => {
    setDetectedGestures((prev) => [...prev, gesture])
    setCurrentText((prev) => (prev ? `${prev} ${gesture}` : gesture))
    setConfidence(detectionConfidence)

    if (autoSpeak) {
      speakText(gesture)
    }
  }

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      window.speechSynthesis.speak(utterance)
    }
  }

  const clearDetections = () => {
    setDetectedGestures([])
    setCurrentText("")
  }

  const speakCurrentText = () => {
    if (currentText) {
      speakText(currentText)
    }
  }

  const handleMediaPipeLoaded = () => {
    setMediaPipeLoaded(true)
  }

  return (
    <PageContainer title="Sign to Speech" subtitle="Translate sign language to speech in real-time">
      {!mediaPipeLoaded && <MediaPipeLoader onLoaded={handleMediaPipeLoaded} />}

      {mediaPipeLoaded && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Camera Feed</h2>
                  <Button
                    onClick={toggleCamera}
                    variant={isCameraActive ? "destructive" : "default"}
                    size="icon"
                    className="rounded-full h-12 w-12"
                  >
                    {isCameraActive ? <CameraOff className="h-6 w-6" /> : <Camera className="h-6 w-6" />}
                  </Button>
                </div>

                {error && (
                  <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-3 rounded-md">
                    {error}
                  </div>
                )}

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

                  {!isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-gray-500 dark:text-gray-400">Click the camera button to start</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex space-x-2">
                    <Button onClick={speakCurrentText} variant="outline" disabled={!currentText}>
                      <Volume2 className="mr-2 h-4 w-4" />
                      Speak
                    </Button>
                    <Button onClick={clearDetections} variant="outline" disabled={detectedGestures.length === 0}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="auto-speak" checked={autoSpeak} onCheckedChange={setAutoSpeak} />
                    <Label htmlFor="auto-speak">Auto-speak</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Detection Settings</h2>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="confidence-threshold">Confidence Threshold: {confidenceThreshold.toFixed(2)}</Label>
                  </div>
                  <Slider
                    id="confidence-threshold"
                    value={[confidenceThreshold]}
                    min={0.5}
                    max={1}
                    step={0.01}
                    onValueChange={(value) => setConfidenceThreshold(value[0])}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>More detections</span>
                    <span>Higher accuracy</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-speak">Auto-speak detected signs</Label>
                  <Switch id="auto-speak" checked={autoSpeak} onCheckedChange={setAutoSpeak} />
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Current Detection</h3>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md min-h-12 flex items-center">
                  {currentText ? (
                    <p className="text-lg">{currentText}</p>
                  ) : (
                    <p className="text-gray-500">No gestures detected yet</p>
                  )}
                </div>

                {confidence > 0 && (
                  <div className="mt-2 flex items-center">
                    <span className="text-sm text-gray-500 mr-2">Confidence:</span>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${confidence * 100}%` }} />
                    </div>
                    <span className="text-sm text-gray-500 ml-2">{Math.round(confidence * 100)}%</span>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Detection History</h3>
                <div className="max-h-40 overflow-y-auto p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                  {detectedGestures.length > 0 ? (
                    <ul className="space-y-1">
                      {detectedGestures.map((gesture, index) => (
                        <li key={index} className="flex items-center">
                          <span className="text-gray-500 text-sm mr-2">{index + 1}.</span>
                          <span>{gesture}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No detection history</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  )
}
