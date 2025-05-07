"use client"

import { useState, useRef, useEffect } from "react"
import { Camera, CameraOff, Play, Square, Save, Trash2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { HolisticDetection } from "@/lib/mediapipe-holistic"
import { getSignLanguageDataService, type AnimationFrame, type Animation } from "@/lib/sign-language-data"
import { v4 as uuidv4 } from "uuid"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export function AnimationTrainer() {
  const [word, setWord] = useState("")
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingFrames, setRecordingFrames] = useState<AnimationFrame[]>([])
  const [recordingStartTime, setRecordingStartTime] = useState(0)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(false)
  const [handDetected, setHandDetected] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedAnimations, setSavedAnimations] = useState<Animation[]>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playbackCanvasRef = useRef<HTMLCanvasElement>(null)
  const holisticRef = useRef<HolisticDetection | null>(null)
  const signLanguageService = useRef(getSignLanguageDataService())
  const animationFrameRef = useRef<number | null>(null)
  const { toast } = useToast()

  // Initialize MediaPipe and load saved animations
  useEffect(() => {
    const initializeHolistic = async () => {
      setIsLoading(true)
      try {
        holisticRef.current = new HolisticDetection({
          onResults: handleResults,
          onError: (error) => {
            console.error("MediaPipe error:", error)
            setError(`MediaPipe error: ${error.message || "Unknown error"}`)
          },
        })

        await holisticRef.current.initialize()
        setIsLoading(false)

        // Load saved animations
        const animations = signLanguageService.current.getAnimations()
        setSavedAnimations(animations)
      } catch (error) {
        console.error("Error initializing MediaPipe:", error)
        setError(`Failed to initialize MediaPipe: ${error instanceof Error ? error.message : String(error)}`)
        setIsLoading(false)
      }
    }

    initializeHolistic()

    return () => {
      if (isCameraActive) {
        stopCamera()
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (holisticRef.current) {
        holisticRef.current.stop()
      }
    }
  }, [])

  const startCamera = async () => {
    if (!videoRef.current || isInitializing) return

    try {
      setError(null)
      setIsInitializing(true)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })

      videoRef.current.srcObject = stream
      await videoRef.current.play()

      setIsCameraActive(true)

      // Start detection
      if (holisticRef.current) {
        await holisticRef.current.start(videoRef.current)
        toast({
          title: "Camera Activated",
          description: "Make sign language gestures in front of the camera.",
        })
      }
    } catch (err) {
      console.error("Error starting camera:", err)
      setError(`Failed to start camera: ${err instanceof Error ? err.message : String(err)}`)
      toast({
        title: "Camera Error",
        description: "Could not access your camera. Please check permissions.",
        variant: "destructive",
      })
    } finally {
      setIsInitializing(false)
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }

    if (holisticRef.current) {
      holisticRef.current.stop()
    }

    setIsCameraActive(false)

    if (isRecording) {
      stopRecording()
    }
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

    // Draw landmarks
    drawLandmarks(ctx, results)

    // Check if hands are detected
    const hasLeftHand = results.leftHandLandmarks && results.leftHandLandmarks.length > 0
    const hasRightHand = results.rightHandLandmarks && results.rightHandLandmarks.length > 0

    // Update hand detection status
    setHandDetected(hasLeftHand || hasRightHand)

    // If recording, save frame
    if (isRecording) {
      const timestamp = Date.now() - recordingStartTime

      const frame: AnimationFrame = {
        pose: results.poseLandmarks || null,
        faceLandmarks: results.faceLandmarks || null,
        leftHandLandmarks: results.leftHandLandmarks || null,
        rightHandLandmarks: results.rightHandLandmarks || null,
        timestamp,
      }

      setRecordingFrames((prev) => [...prev, frame])
      setRecordingDuration(timestamp)
    }
  }

  const drawLandmarks = (ctx: CanvasRenderingContext2D, results: any) => {
    // Draw pose landmarks
    if (results.poseLandmarks) {
      ctx.fillStyle = "rgba(255, 0, 0, 0.8)"
      for (const landmark of results.poseLandmarks) {
        const x = landmark.x * canvasRef.current!.width
        const y = landmark.y * canvasRef.current!.height

        ctx.beginPath()
        ctx.arc(x, y, 3, 0, 2 * Math.PI)
        ctx.fill()
      }
    }

    // Draw hand landmarks
    if (results.leftHandLandmarks) {
      ctx.fillStyle = "rgba(0, 255, 0, 0.8)"
      for (const landmark of results.leftHandLandmarks) {
        const x = landmark.x * canvasRef.current!.width
        const y = landmark.y * canvasRef.current!.height

        ctx.beginPath()
        ctx.arc(x, y, 5, 0, 2 * Math.PI)
        ctx.fill()
      }

      // Connect landmarks with lines
      ctx.strokeStyle = "rgba(0, 255, 0, 0.8)"
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
          const landmark = results.leftHandLandmarks[finger[i]]
          if (i === 0) {
            ctx.moveTo(landmark.x * canvasRef.current!.width, landmark.y * canvasRef.current!.height)
          } else {
            ctx.lineTo(landmark.x * canvasRef.current!.width, landmark.y * canvasRef.current!.height)
          }
        }
        ctx.stroke()
      }
    }

    if (results.rightHandLandmarks) {
      ctx.fillStyle = "rgba(0, 0, 255, 0.8)"
      for (const landmark of results.rightHandLandmarks) {
        const x = landmark.x * canvasRef.current!.width
        const y = landmark.y * canvasRef.current!.height

        ctx.beginPath()
        ctx.arc(x, y, 5, 0, 2 * Math.PI)
        ctx.fill()
      }

      // Connect landmarks with lines
      ctx.strokeStyle = "rgba(0, 0, 255, 0.8)"
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
          const landmark = results.rightHandLandmarks[finger[i]]
          if (i === 0) {
            ctx.moveTo(landmark.x * canvasRef.current!.width, landmark.y * canvasRef.current!.height)
          } else {
            ctx.lineTo(landmark.x * canvasRef.current!.width, landmark.y * canvasRef.current!.height)
          }
        }
        ctx.stroke()
      }
    }

    // Add recording status if recording
    if (isRecording) {
      // Draw recording indicator
      ctx.fillStyle = "rgba(255, 0, 0, 0.7)"
      ctx.beginPath()
      ctx.arc(30, 30, 10, 0, 2 * Math.PI)
      ctx.fill()

      // Draw recording time
      ctx.fillStyle = "white"
      ctx.font = "16px Arial"
      ctx.fillText(`Recording: ${(recordingDuration / 1000).toFixed(1)}s`, 50, 35)
    }
  }

  const startRecording = () => {
    if (!isCameraActive) {
      toast({
        title: "Camera Inactive",
        description: "Please activate the camera first.",
        variant: "destructive",
      })
      return
    }

    if (!word.trim()) {
      toast({
        title: "Missing Word",
        description: "Please enter a word or phrase for this animation.",
        variant: "destructive",
      })
      return
    }

    if (!handDetected) {
      toast({
        title: "No Hand Detected",
        description: "Please position your hand in view of the camera before recording.",
        variant: "warning",
      })
    }

    setRecordingFrames([])
    setRecordingStartTime(Date.now())
    setIsRecording(true)

    toast({
      title: "Recording Started",
      description: "Perform the sign language gesture clearly.",
    })
  }

  const stopRecording = () => {
    setIsRecording(false)

    if (recordingFrames.length > 0) {
      toast({
        title: "Recording Complete",
        description: `Captured ${recordingFrames.length} frames over ${(recordingDuration / 1000).toFixed(1)} seconds.`,
      })
    }
  }

  const playRecording = () => {
    if (recordingFrames.length === 0 || !playbackCanvasRef.current) {
      toast({
        title: "No Recording",
        description: "Please record an animation first.",
        variant: "destructive",
      })
      return
    }

    setCurrentFrame(0)
    setIsPlaying(true)

    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime

      // Find the frame to display based on elapsed time
      let frameIndex = 0
      while (frameIndex < recordingFrames.length - 1 && recordingFrames[frameIndex + 1].timestamp <= elapsed) {
        frameIndex++
      }

      setCurrentFrame(frameIndex)

      // Draw the frame
      drawRecordingFrame(frameIndex)

      // Continue animation if not at the end
      if (elapsed < recordingDuration && isPlaying) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        setIsPlaying(false)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)
  }

  const stopPlayback = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    setIsPlaying(false)
  }

  const drawRecordingFrame = (frameIndex: number) => {
    if (!playbackCanvasRef.current || recordingFrames.length === 0) return

    const ctx = playbackCanvasRef.current.getContext("2d")
    if (!ctx) return

    const frame = recordingFrames[frameIndex]

    // Clear canvas
    ctx.clearRect(0, 0, playbackCanvasRef.current.width, playbackCanvasRef.current.height)

    // Draw a silhouette background
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)"
    ctx.fillRect(0, 0, playbackCanvasRef.current.width, playbackCanvasRef.current.height)

    // Draw pose landmarks
    if (frame.pose) {
      ctx.fillStyle = "rgba(255, 0, 0, 0.8)"
      for (const landmark of frame.pose) {
        if (!landmark) continue

        const x = landmark.x * playbackCanvasRef.current.width
        const y = landmark.y * playbackCanvasRef.current.height

        ctx.beginPath()
        ctx.arc(x, y, 3, 0, 2 * Math.PI)
        ctx.fill()
      }
    }

    // Draw hand landmarks
    if (frame.leftHandLandmarks) {
      ctx.fillStyle = "rgba(0, 255, 0, 0.8)"
      for (const landmark of frame.leftHandLandmarks) {
        if (!landmark) continue

        const x = landmark.x * playbackCanvasRef.current.width
        const y = landmark.y * playbackCanvasRef.current.height

        ctx.beginPath()
        ctx.arc(x, y, 5, 0, 2 * Math.PI)
        ctx.fill()
      }

      // Connect landmarks with lines
      ctx.strokeStyle = "rgba(0, 255, 0, 0.8)"
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
          if (!frame.leftHandLandmarks[finger[i]]) continue

          const landmark = frame.leftHandLandmarks[finger[i]]
          if (i === 0) {
            ctx.moveTo(landmark.x * playbackCanvasRef.current!.width, landmark.y * playbackCanvasRef.current!.height)
          } else {
            ctx.lineTo(landmark.x * playbackCanvasRef.current!.width, landmark.y * playbackCanvasRef.current!.height)
          }
        }
        ctx.stroke()
      }
    }

    if (frame.rightHandLandmarks) {
      ctx.fillStyle = "rgba(0, 0, 255, 0.8)"
      for (const landmark of frame.rightHandLandmarks) {
        if (!landmark) continue

        const x = landmark.x * playbackCanvasRef.current.width
        const y = landmark.y * playbackCanvasRef.current.height

        ctx.beginPath()
        ctx.arc(x, y, 5, 0, 2 * Math.PI)
        ctx.fill()
      }

      // Connect landmarks with lines
      ctx.strokeStyle = "rgba(0, 0, 255, 0.8)"
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
          if (!frame.rightHandLandmarks[finger[i]]) continue

          const landmark = frame.rightHandLandmarks[finger[i]]
          if (i === 0) {
            ctx.moveTo(landmark.x * playbackCanvasRef.current!.width, landmark.y * playbackCanvasRef.current!.height)
          } else {
            ctx.lineTo(landmark.x * playbackCanvasRef.current!.width, landmark.y * playbackCanvasRef.current!.height)
          }
        }
        ctx.stroke()
      }
    }

    // Draw playback progress
    const progress = (frameIndex / (recordingFrames.length - 1)) * 100

    // Draw progress bar at the bottom
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
    ctx.fillRect(0, playbackCanvasRef.current.height - 20, playbackCanvasRef.current.width, 20)

    ctx.fillStyle = "rgba(0, 255, 0, 0.8)"
    ctx.fillRect(0, playbackCanvasRef.current.height - 20, (playbackCanvasRef.current.width * progress) / 100, 20)

    // Draw frame info
    ctx.fillStyle = "white"
    ctx.font = "12px Arial"
    ctx.fillText(`Frame: ${frameIndex + 1}/${recordingFrames.length}`, 10, playbackCanvasRef.current.height - 5)
  }

  const saveAnimation = async () => {
    if (recordingFrames.length === 0 || !word.trim()) {
      toast({
        title: "Missing Data",
        description: "Please record an animation and enter a word",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const animation: Animation = {
        id: uuidv4(),
        word: word.trim(),
        frames: recordingFrames,
        duration: recordingDuration,
        createdAt: new Date().toISOString(),
      }

      const success = signLanguageService.current.addAnimation(animation)

      if (success) {
        // Update the list of saved animations
        setSavedAnimations([...savedAnimations, animation])

        toast({
          title: "Animation Saved",
          description: `Animation for "${word}" saved successfully!`,
        })

        // Clear form for next animation
        setWord("")
        setRecordingFrames([])
        setRecordingDuration(0)
        setError(null)
      } else {
        throw new Error("Failed to save animation")
      }
    } catch (err) {
      console.error("Error saving animation:", err)
      setError(`Failed to save animation: ${err instanceof Error ? err.message : String(err)}`)

      toast({
        title: "Save Error",
        description: "There was an error saving your animation.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const clearRecording = () => {
    setRecordingFrames([])
    setRecordingDuration(0)
    stopPlayback()

    toast({
      title: "Recording Cleared",
      description: "The current recording has been cleared.",
    })
  }

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
      <CardHeader>
        <CardTitle>Animation Trainer</CardTitle>
        <CardDescription>Record sign language animations to be used in the Speak to Sign feature</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" text="Initializing MediaPipe..." />
            </div>
          ) : (
            <>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="word">Word or Phrase</Label>
                    <Input
                      id="word"
                      value={word}
                      onChange={(e) => setWord(e.target.value)}
                      placeholder="Enter the word or phrase for this animation"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Camera Feed</Label>
                    <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mt-1">
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
                            onClick={startCamera}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          >
                            <Camera className="mr-2 h-4 w-4" />
                            Start Camera
                          </Button>
                        </div>
                      )}

                      {isInitializing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <LoadingSpinner text="Starting camera..." />
                        </div>
                      )}

                      {isCameraActive && !isRecording && (
                        <div
                          className={`absolute top-2 left-2 right-2 px-3 py-2 rounded text-sm font-medium text-center ${
                            handDetected ? "bg-green-500/70 text-white" : "bg-red-500/70 text-white"
                          }`}
                        >
                          {handDetected
                            ? "Hand Detected ✓ Ready to record"
                            : "No Hand Detected - Please position your hand in view"}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    {isCameraActive && (
                      <>
                        {!isRecording ? (
                          <Button
                            onClick={startRecording}
                            variant="default"
                            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                            disabled={!word.trim()}
                          >
                            <div className="h-3 w-3 rounded-full bg-red-500 mr-2" />
                            Start Recording
                          </Button>
                        ) : (
                          <Button onClick={stopRecording} variant="destructive" className="flex-1">
                            <Square className="mr-2 h-4 w-4" />
                            Stop Recording
                          </Button>
                        )}
                      </>
                    )}

                    <Button
                      onClick={toggleCamera}
                      variant={isCameraActive ? "outline" : "default"}
                      className="flex-1"
                      disabled={isInitializing}
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
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Animation Preview</Label>
                    <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mt-1">
                      <canvas ref={playbackCanvasRef} className="w-full h-full object-cover" width={640} height={480} />

                      {recordingFrames.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <p className="text-gray-500">No animation recorded yet</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      onClick={isPlaying ? stopPlayback : playRecording}
                      variant="outline"
                      disabled={recordingFrames.length === 0}
                      className="flex-1"
                    >
                      {isPlaying ? (
                        <>
                          <Square className="mr-2 h-4 w-4" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Play
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={clearRecording}
                      variant="outline"
                      disabled={recordingFrames.length === 0}
                      className="flex-1"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                  </div>

                  {recordingFrames.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Frames: {recordingFrames.length}</span>
                        <span>Duration: {(recordingDuration / 1000).toFixed(2)}s</span>
                      </div>

                      <Progress
                        value={isPlaying ? (currentFrame / (recordingFrames.length - 1)) * 100 : 0}
                        className="h-2"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={saveAnimation}
                  disabled={recordingFrames.length === 0 || !word.trim() || isSaving}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isSaving ? <LoadingSpinner className="mr-2" size="sm" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Animation
                </Button>
              </div>

              {savedAnimations.length > 0 && (
                <div className="space-y-2">
                  <Label>Saved Animations</Label>
                  <div className="bg-white dark:bg-gray-800 rounded-md p-4 max-h-48 overflow-y-auto">
                    <div className="space-y-2">
                      {savedAnimations.map((animation) => (
                        <div
                          key={animation.id}
                          className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md"
                        >
                          <span className="font-medium">{animation.word}</span>
                          <div className="text-sm text-gray-500">
                            <span>{animation.frames.length} frames</span>
                            <span className="mx-2">•</span>
                            <span>{(animation.duration / 1000).toFixed(1)}s</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
