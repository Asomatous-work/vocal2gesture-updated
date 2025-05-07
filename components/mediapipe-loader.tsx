"use client"

import { useState, useEffect } from "react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface MediaPipeLoaderProps {
  onLoaded: () => void
  onError?: (error: Error) => void
}

export function MediaPipeLoader({ onLoaded, onError }: MediaPipeLoaderProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadAttempts, setLoadAttempts] = useState(0)

  useEffect(() => {
    loadMediaPipeScripts()
  }, [loadAttempts])

  const loadMediaPipeScripts = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("MediaPipeLoader: Starting script loading...")

      // Check if already loaded
      if (window.Holistic && window.Camera) {
        console.log("MediaPipeLoader: Scripts already loaded")
        setLoading(false)
        onLoaded()
        return
      }

      // Load Holistic script
      await loadScript(
        "https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/holistic.js",
        "mediapipe-holistic",
      )
      console.log("MediaPipeLoader: Holistic script loaded")

      // Load Camera script
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js", "mediapipe-camera")
      console.log("MediaPipeLoader: Camera script loaded")

      // Wait for objects to be available
      await waitForObjects()

      console.log("MediaPipeLoader: All scripts loaded successfully")
      setLoading(false)
      onLoaded()
    } catch (err) {
      console.error("MediaPipeLoader: Error loading scripts:", err)
      setError(`Failed to load MediaPipe: ${err.message}`)
      setLoading(false)
      if (onError) onError(err)
    }
  }

  const loadScript = (src: string, id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Remove existing script if any
      const existingScript = document.getElementById(id)
      if (existingScript) {
        document.body.removeChild(existingScript)
      }

      const script = document.createElement("script")
      script.id = id
      script.src = src
      script.crossOrigin = "anonymous"
      script.async = true

      script.onload = () => resolve()
      script.onerror = (e) => reject(new Error(`Failed to load script: ${src}`))

      document.body.appendChild(script)
    })
  }

  const waitForObjects = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const maxWaitTime = 5000 // 5 seconds
      const startTime = Date.now()

      const checkObjects = () => {
        if (window.Holistic && window.Camera) {
          resolve()
        } else if (Date.now() - startTime > maxWaitTime) {
          reject(new Error("Timed out waiting for MediaPipe objects"))
        } else {
          setTimeout(checkObjects, 100)
        }
      }

      checkObjects()
    })
  }

  const handleRetry = () => {
    setLoadAttempts((prev) => prev + 1)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-center text-muted-foreground">Loading MediaPipe detection libraries...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Detection Error</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>{error}</p>
          <Button size="sm" onClick={handleRetry} className="mt-2">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Loading
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return null
}

// Add to global Window interface
declare global {
  interface Window {
    Holistic: any
    Camera: any
  }
}
