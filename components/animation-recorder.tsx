"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { Camera, CameraOff, Video, VideoOff, Save, Trash, Play, Pause } from "lucide-react"
import { HolisticDetection } from "@/lib/mediapipe-holistic"
import { MediaPipeLoader } from "@/components/mediapipe-loader"
import { type AnimationData, type AnimationFrame, createEmptyAnimation, compressAnimation } from "@/lib/animation-data"
import { modelManager } from "@/lib/model-manager"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  drawLandmarks,
  drawConnectors,
  POSE_CONNECTIONS,
  HAND_CONNECTIONS,
  FACEMESH_TESSELATION,
} from "@/lib/pose-utils"
import { put } from "@vercel/blob"

interface AnimationRecorderProps {
  onAnimationSaved?: (animation: AnimationData) => void
  initialWord?: string
}

export function AnimationRecorder({ onAnimationSaved, initialWord = "" }: AnimationRecorderProps) {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [word, setWord] = useState(initialWord)
  const [recordingProgress, setRecordingProgress] = useState(0)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [maxRecordingDuration] = useState(5000) // 5 seconds max
  const [currentAnimation, setCurrentAnimation] = useState<AnimationData | null>(null)
  const [mediaLibraryLoaded, setMediaLibraryLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [handDetected, setHandDetected] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playbackCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const holisticRef = useRef<HolisticDetection | null>(null)
  const recordingStartTimeRef = useRef<number>(0)
  const animationFramesRef = useRef<AnimationFrame[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const playbackFrameIndexRef = useRef<number>(0)

  const { toast } = useToast()

  // Handle MediaPipe library loading
  const handleMediaLibraryLoaded = () => {
    setMediaLibraryLoaded(true)
    toast({
      title: "Detection Libraries Loaded",
      description: "MediaPipe libraries have been loaded successfully.",
    })
  }

  // Handle MediaPipe library loading error
  const handleMediaLibraryError = (error: Error) => {
    toast({
      title: "Detection Error",
      description: `Failed to load detection libraries: ${error.message}`,
      variant: "destructive",
    })
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
      setHandDetected(false)
    } else {
      // Start the camera
      setIsInitializing(true)
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
      } catch (error) {
        console.error("Error accessing camera:", error)
        toast({
          title: "Camera Error",
          description: "Could not access your camera. Please check permissions.",
          variant: "destructive",
        })
      } finally {
        setIsInitializing(false)
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
          const hasPose = results.poseLandmarks && results.poseLandmarks.length > 0

          // Update hand detection status
          setHandDetected(hasLeftHand || hasRightHand || hasPose)

          // If recording, store the landmarks
          if (isRecording) {
            const now = Date.now()
            const timestamp = now - recordingStartTimeRef.current

            // Create animation frame
            const frame: AnimationFrame = {
              timestamp,
              pose: results.poseLandmarks || [],
              leftHand: results.leftHandLandmarks || [],
              rightHand: results.rightHandLandmarks || [],
              face: results.faceLandmarks || [],
            }

            // Add frame to animation
            animationFramesRef.current.push(frame)

            // Update recording progress
            setRecordingDuration(timestamp)
            setRecordingProgress((timestamp / maxRecordingDuration) * 100)

            // Stop recording if max duration reached
            if (timestamp >= maxRecordingDuration) {
              stopRecording()
            }
          }
        },
        onError: (error) => {
          console.error("MediaPipe Holistic error:", error)
          toast({
            title: "Detection Error",
            description: `MediaPipe error: ${error.message}`,
            variant: "destructive",
          })
        },
      })

      await holisticRef.current.initialize()

      if (videoRef.current && isCameraActive) {
        await holisticRef.current.start(videoRef.current)
      }
    } catch (error) {
      console.error("Failed to initialize MediaPipe Holistic:", error)
      toast({
        title: "Detection Error",
        description: `Failed to initialize detection: ${error.message}`,
        variant: "destructive",
      })
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

    // Draw pose landmarks
    if (results.poseLandmarks) {
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: "#00FF00", lineWidth: 2 })
      drawLandmarks(ctx, results.poseLandmarks, { color: "#FF0000", radius: 3 })
    }

    // Draw hand landmarks
    if (results.leftHandLandmarks) {
      drawConnectors(ctx, results.leftHandLandmarks, HAND_CONNECTIONS, { color: "#0000FF", lineWidth: 2 })
      drawLandmarks(ctx, results.leftHandLandmarks, { color: "#00FFFF", radius: 3 })
    }

    if (results.rightHandLandmarks) {
      drawConnectors(ctx, results.rightHandLandmarks, HAND_CONNECTIONS, { color: "#FF00FF", lineWidth: 2 })
      drawLandmarks(ctx, results.rightHandLandmarks, { color: "#FFFF00", radius: 3 })
    }

    // Draw face mesh
    if (results.faceLandmarks) {
      drawConnectors(ctx, results.faceLandmarks, FACEMESH_TESSELATION, { color: "#C0C0C070", lineWidth: 1 })
    }

    // Add recording indicator if recording
    if (isRecording) {
      // Draw recording indicator
      ctx.fillStyle = "rgba(255, 0, 0, 0.5)"
      ctx.beginPath()
      ctx.arc(30, 30, 15, 0, 2 * Math.PI)
      ctx.fill()

      // Draw recording time
      ctx.fillStyle = "white"
      ctx.font = "16px Arial"
      ctx.fillText(`${(recordingDuration / 1000).toFixed(1)}s`, 50, 35)
    }
  }

  // Start recording animation
  const startRecording = () => {
    if (!word) {
      toast({
        title: "Missing Word",
        description: "Please enter a word for this animation.",
        variant: "destructive",
      })
      return
    }

    if (!isCameraActive) {
      toast({
        title: "Camera Inactive",
        description: "Please activate the camera first.",
        variant: "destructive",
      })
      return
    }

    // Reset animation frames
    animationFramesRef.current = []
    recordingStartTimeRef.current = Date.now()
    setRecordingDuration(0)
    setRecordingProgress(0)
    setIsRecording(true)

    toast({
      title: "Recording Started",
      description: "Perform the sign language gesture now.",
    })

    // Set up recording interval to update UI
    recordingIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - recordingStartTimeRef.current
      setRecordingDuration(elapsed)
      setRecordingProgress((elapsed / maxRecordingDuration) * 100)

      if (elapsed >= maxRecordingDuration) {
        stopRecording()
      }
    }, 100)
  }

  // Stop recording animation
  const stopRecording = () => {
    if (!isRecording) return

    setIsRecording(false)

    // Clear recording interval
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }

    // Create animation data
    if (animationFramesRef.current.length > 0) {
      const animation = createEmptyAnimation(word)

      // Add all frames
      const updatedAnimation = {
        ...animation,
        frames: animationFramesRef.current,
        metadata: {
          ...animation.metadata,
          frameCount: animationFramesRef.current.length,
          fps: Math.round(animationFramesRef.current.length / (recordingDuration / 1000)),
          duration: recordingDuration,
        },
      }

      // Compress animation data
      const compressedAnimation = compressAnimation(updatedAnimation, 15) // Target 15 FPS for smoother playback

      setCurrentAnimation(compressedAnimation)

      toast({
        title: "Recording Complete",
        description: `Captured ${compressedAnimation.frames.length} frames in ${(recordingDuration / 1000).toFixed(1)} seconds.`,
      })
    } else {
      toast({
        title: "Recording Failed",
        description: "No frames were captured. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Play animation preview
  const togglePlayback = () => {
    if (!currentAnimation || currentAnimation.frames.length === 0) return

    if (isPlaying) {
      // Stop playback
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current)
        playbackIntervalRef.current = null
      }
      setIsPlaying(false)
    } else {
      // Start playback
      playbackFrameIndexRef.current = 0
      setIsPlaying(true)

      // Draw first frame
      drawAnimationFrame(currentAnimation.frames[0])

      // Set up playback interval
      const frameTime = 1000 / (currentAnimation.metadata?.fps || 30)
      playbackIntervalRef.current = setInterval(() => {
        playbackFrameIndexRef.current++

        // Loop back to beginning if we reach the end
        if (playbackFrameIndexRef.current >= currentAnimation.frames.length) {
          playbackFrameIndexRef.current = 0
        }

        // Draw the current frame
        drawAnimationFrame(currentAnimation.frames[playbackFrameIndexRef.current])
      }, frameTime)
    }
  }

  // Draw animation frame on playback canvas
  const drawAnimationFrame = (frame: AnimationFrame) => {
    if (!playbackCanvasRef.current) return

    const ctx = playbackCanvasRef.current.getContext("2d")
    if (!ctx) return

    const width = playbackCanvasRef.current.width
    const height = playbackCanvasRef.current.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Fill with background
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, width, height)

    // Draw pose landmarks
    if (frame.pose && frame.pose.length > 0) {
      drawConnectors(ctx, frame.pose, POSE_CONNECTIONS, { color: "#00FF00", lineWidth: 2 })
      drawLandmarks(ctx, frame.pose, { color: "#FF0000", radius: 3 })
    }

    // Draw hand landmarks
    if (frame.leftHand && frame.leftHand.length > 0) {
      drawConnectors(ctx, frame.leftHand, HAND_CONNECTIONS, { color: "#0000FF", lineWidth: 2 })
      drawLandmarks(ctx, frame.leftHand, { color: "#00FFFF", radius: 3 })
    }

    if (frame.rightHand && frame.rightHand.length > 0) {
      drawConnectors(ctx, frame.rightHand, HAND_CONNECTIONS, { color: "#FF00FF", lineWidth: 2 })
      drawLandmarks(ctx, frame.rightHand, { color: "#FFFF00", radius: 3 })
    }

    // Draw face mesh (simplified)
    if (frame.face && frame.face.length > 0) {
      drawConnectors(ctx, frame.face, FACEMESH_TESSELATION, { color: "#C0C0C070", lineWidth: 1 })
    }

    // Draw playback time
    ctx.fillStyle = "white"
    ctx.font = "16px Arial"
    ctx.fillText(`${(frame.timestamp / 1000).toFixed(1)}s`, 10, 20)
  }

  // Save animation to storage
  const saveAnimation = async () => {
    if (!currentAnimation) return

    setIsSaving(true)

    try {
      // Save to model manager
      modelManager.saveAnimation(currentAnimation)

      // Save to Vercel Blob
      const animationBlob = new Blob([JSON.stringify(currentAnimation)], { type: "application/json" })
      const file = new File([animationBlob], `animation_${currentAnimation.word}_${Date.now()}.json`, {
        type: "application/json",
      })

      const blob = await put(`animations/${currentAnimation.word.replace(/\s+/g, "_").toLowerCase()}.json`, file, {
        access: "public",
        addRandomSuffix: false,
      })

      console.log("Animation saved to Blob:", blob.url)

      // Save to GitHub if configured
      if (modelManager.isGitHubConfigured()) {
        try {
          await modelManager.saveAnimationToGitHub(currentAnimation)
        } catch (error) {
          console.error("GitHub save error:", error)
          // Continue even if GitHub save fails
        }
      }

      toast({
        title: "Animation Saved",
        description: `Animation for "${currentAnimation.word}" has been saved successfully.`,
      })

      // Call callback if provided
      if (onAnimationSaved) {
        onAnimationSaved(currentAnimation)
      }
    } catch (error) {
      console.error("Error saving animation:", error)
      toast({
        title: "Save Error",
        description: `Failed to save animation: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Reset current animation
  const resetAnimation = () => {
    setCurrentAnimation(null)

    // Stop playback if playing
    if (isPlaying) {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current)
        playbackIntervalRef.current = null
      }
      setIsPlaying(false)
    }
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      // Stop holistic
      if (holisticRef.current) {
        holisticRef.current.stop()
      }

      // Clear intervals
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }

      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current)
      }
    }
  }, [])

  // Initialize playback canvas
  useEffect(() => {
    if (playbackCanvasRef.current) {
      playbackCanvasRef.current.width = 320
      playbackCanvasRef.current.height = 240

      const ctx = playbackCanvasRef.current.getContext("2d")
      if (ctx) {
        ctx.fillStyle = "#000000"
        ctx.fillRect(0, 0, 320, 240)

        // Draw placeholder text
        ctx.fillStyle = "white"
        ctx.font = "16px Arial"
        ctx.textAlign = "center"
        ctx.fillText("Animation preview will appear here", 160, 120)
      }
    }
  }, [])

  return (
    <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
      <CardHeader>
        <CardTitle>Animation Recorder</CardTitle>
        <CardDescription>Record sign language animations with pose and hand movements</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {!mediaLibraryLoaded ? (
          <div className="p-6">
            <MediaPipeLoader onLoaded={handleMediaLibraryLoaded} onError={handleMediaLibraryError} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {/* Camera View */}
              <div className="space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`absolute inset-0 w-full h-full object-cover ${isCameraActive ? "opacity-100" : "opacity-0"}`}
                    crossOrigin="anonymous"
                  />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

                  {!isCameraActive && !isInitializing && (
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

                  {isInitializing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <LoadingSpinner size="lg" />
                      <p className="text-white ml-2">Initializing camera...</p>
                    </div>
                  )}

                  {isCameraActive && !isRecording && (
                    <div className="absolute top-2 left-2 right-2 px-3 py-2 rounded text-sm font-medium text-center bg-black/70 text-white">
                      {handDetected
                        ? "Hands/Pose detected ✓ Ready to record"
                        : "No hands or pose detected - Position yourself in view"}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="word">Word or Phrase</Label>
                    <Input
                      id="word"
                      placeholder="Enter word for this animation (e.g., Hello)"
                      value={word}
                      onChange={(e) => setWord(e.target.value)}
                      disabled={isRecording}
                    />
                  </div>

                  {isRecording && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Recording Progress</span>
                        <span>
                          {(recordingDuration / 1000).toFixed(1)}s / {(maxRecordingDuration / 1000).toFixed(1)}s
                        </span>
                      </div>
                      <Progress value={recordingProgress} className="h-2" />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={toggleCamera}
                      className={isCameraActive ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"}
                      disabled={isInitializing || isRecording}
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

                    {isCameraActive && (
                      <Button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={isRecording ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
                        disabled={!isCameraActive || !word}
                      >
                        {isRecording ? (
                          <>
                            <VideoOff className="mr-2 h-4 w-4" />
                            Stop Recording
                          </>
                        ) : (
                          <>
                            <Video className="mr-2 h-4 w-4" />
                            Record Animation
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview and Controls */}
              <div className="space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <canvas ref={playbackCanvasRef} className="w-full h-full" />

                  {!currentAnimation && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-white text-center">
                        {isCameraActive
                          ? "Record an animation to preview it here"
                          : "Start camera and record an animation"}
                      </p>
                    </div>
                  )}
                </div>

                {currentAnimation && (
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <div>
                        Word: <span className="font-medium">{currentAnimation.word}</span>
                      </div>
                      <div>
                        Frames: <span className="font-medium">{currentAnimation.frames.length}</span>
                      </div>
                      <div>
                        Duration:{" "}
                        <span className="font-medium">{(currentAnimation.metadata?.duration / 1000).toFixed(1)}s</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={togglePlayback} variant="outline" className="flex-1">
                        {isPlaying ? (
                          <>
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Preview
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={saveAnimation}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <LoadingSpinner className="mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Animation
                          </>
                        )}
                      </Button>

                      <Button onClick={resetAnimation} variant="outline" className="flex-none">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
