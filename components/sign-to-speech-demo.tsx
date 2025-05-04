"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, CameraOff, Volume2, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { HolisticDetection } from "@/lib/mediapipe-holistic"

export function SignToSpeechDemo() {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recognizedText, setRecognizedText] = useState("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { toast } = useToast()

  // Sample hand gestures and their meanings (for demo purposes)
  const sampleGestures = ["Hello", "How are you", "I am fine", "Thank you", "Good morning"]

  useEffect(() => {
    return () => {
      // Clean up camera stream when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const toggleCamera = async () => {
    if (isCameraActive) {
      // Stop the camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      setIsCameraActive(false)
      setRecognizedText("")
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
        }

        setIsCameraActive(true)
        toast({
          title: "Camera Activated",
          description: "Make hand gestures in front of the camera.",
        })
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

  const processGesture = () => {
    if (!isCameraActive) {
      toast({
        title: "Camera Inactive",
        description: "Please activate the camera first.",
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

    // Simulate processing delay and random gesture recognition
    setTimeout(() => {
      // For demo purposes, randomly select a gesture
      const randomGesture = sampleGestures[Math.floor(Math.random() * sampleGestures.length)]
      setRecognizedText(randomGesture)
      setIsProcessing(false)

      // Simulate text-to-speech
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(randomGesture)
        window.speechSynthesis.speak(utterance)
      }
    }, 2000)
  }

  const resetDemo = () => {
    setRecognizedText("")
    if (isCameraActive && streamRef.current) {
      // Keep camera on but reset recognized text
    }
  }

  // Initialize MediaPipe Holistic
  useEffect(() => {
    if (isCameraActive && !isProcessing) {
      const initializeHolistic = async () => {
        const holisticDetection = new HolisticDetection({
          onResults: (results) => {
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
          },
          onError: (error) => {
            console.error("MediaPipe Holistic error:", error)
          },
        })

        await holisticDetection.initialize()
        await holisticDetection.start(videoRef.current!)

        return () => {
          holisticDetection.stop()
        }
      }

      const cleanup = initializeHolistic()
      return () => {
        cleanup.then((cleanupFn) => cleanupFn && cleanupFn())
      }
    }
  }, [isCameraActive, isProcessing])

  return (
    <section
      id="sign-to-speech"
      className="py-20 bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-background dark:to-gray-900"
    >
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Sign to Speech Translation</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Use hand gestures in front of your camera and have them translated to text and speech.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
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

                  <Button
                    onClick={toggleCamera}
                    size="lg"
                    className={`rounded-full w-16 h-16 mb-6 ${
                      isCameraActive
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                    }`}
                  >
                    {isCameraActive ? <CameraOff className="h-6 w-6" /> : <Camera className="h-6 w-6" />}
                  </Button>

                  <div className="flex gap-4">
                    <Button
                      onClick={processGesture}
                      disabled={!isCameraActive || isProcessing}
                      className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
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

                    <Button variant="outline" onClick={resetDemo} disabled={!recognizedText}>
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col items-center">
              <Card className="w-full border-none shadow-lg bg-background">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold mb-2">Recognized Text</h3>
                    <p className="text-muted-foreground text-sm">The translation of your sign language gestures</p>
                  </div>

                  <div className="min-h-[200px] flex items-center justify-center">
                    {recognizedText ? (
                      <div className="text-center">
                        <p className="text-3xl font-bold mb-6">{recognizedText}</p>
                        <Button
                          onClick={() => {
                            if ("speechSynthesis" in window) {
                              const utterance = new SpeechSynthesisUtterance(recognizedText)
                              window.speechSynthesis.speak(utterance)
                            }
                          }}
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
                </CardContent>
              </Card>

              <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">How It Works</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Our system uses advanced computer vision to detect hand landmarks and recognize Indian Sign Language
                  gestures.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="aspect-square bg-background rounded-md p-2 flex items-center justify-center"
                    >
                      <img
                        src={`/placeholder.svg?key=qk5b1&height=80&width=80&query=hand landmark detection ${i}`}
                        alt={`Hand landmark visualization ${i}`}
                        className="max-w-full max-h-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
