"use client"

import { useState, useRef, useEffect } from "react"
import { Camera, CameraOff, Play, Square, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { MediaPipeLoader } from "@/components/mediapipe-loader"
import { getMediaPipeHolistic } from "@/lib/mediapipe-holistic"
import { getSignLanguageDataService, type AnimationFrame, type Animation } from "@/lib/sign-language-data"
import { v4 as uuidv4 } from "uuid"

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
  const [mediaPipeLoaded, setMediaPipeLoaded] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playbackCanvasRef = useRef<HTMLCanvasElement>(null)
  const holisticRef = useRef(getMediaPipeHolistic())
  const signLanguageService = useRef(getSignLanguageDataService())
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (isCameraActive) {
        stopCamera()
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
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
    }
  }

  const startRecording = () => {
    if (!isCameraActive) return

    setRecordingFrames([])
    setRecordingStartTime(Date.now())
    setIsRecording(true)
  }

  const stopRecording = () => {
    setIsRecording(false)
  }

  const playRecording = () => {
    if (recordingFrames.length === 0 || !playbackCanvasRef.current) return

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
    }
  }

  const saveAnimation = () => {
    if (recordingFrames.length === 0 || !word.trim()) {
      setError("Please record an animation and enter a word")
      return
    }

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
        setWord("")
        setRecordingFrames([])
        setRecordingDuration(0)
        setError(null)
        alert(`Animation for "${word}" saved successfully!`)
      } else {
        throw new Error("Failed to save animation")
      }
    } catch (err) {
      console.error("Error saving animation:", err)
      setError(`Failed to save animation: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const clearRecording = () => {
    setRecordingFrames([])
    setRecordingDuration(0)
    stopPlayback()
  }

  const handleMediaPipeLoaded = () => {
    setMediaPipeLoaded(true)
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Animation Trainer</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Record sign language animations to be used in the Speak to Sign feature.
            </p>
          </div>

          {!mediaPipeLoaded ? (
            <MediaPipeLoader onLoaded={handleMediaPipeLoaded} />
          ) : (
            <>
              {error && (
                <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-3 rounded-md">
                  {error}
                </div>
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

                      {!isCameraActive && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Button onClick={startCamera}>
                            <Camera className="mr-2 h-4 w-4" />
                            Start Camera
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    {isCameraActive && (
                      <>
                        {!isRecording ? (
                          <Button onClick={startRecording} variant="default" className="flex-1">
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

                    <Button onClick={toggleCamera} variant={isCameraActive ? "outline" : "default"} className="flex-1">
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
                    <div className="text-sm text-gray-500">
                      <p>Frames: {recordingFrames.length}</p>
                      <p>Duration: {(recordingDuration / 1000).toFixed(2)}s</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveAnimation} disabled={recordingFrames.length === 0 || !word.trim()}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Animation
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
