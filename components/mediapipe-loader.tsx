"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

interface MediaPipeLoaderProps {
  onLoaded?: () => void
}

export function MediaPipeLoader({ onLoaded }: MediaPipeLoaderProps) {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMediaPipe = async () => {
      try {
        // Load MediaPipe scripts
        const scripts = [
          { name: "Camera Utils", url: "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" },
          { name: "Drawing Utils", url: "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" },
          { name: "Control Utils", url: "https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js" },
          { name: "Holistic", url: "https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js" },
        ]

        for (let i = 0; i < scripts.length; i++) {
          const script = scripts[i]
          await new Promise<void>((resolve, reject) => {
            const scriptElement = document.createElement("script")
            scriptElement.src = script.url
            scriptElement.async = true
            scriptElement.onload = () => {
              setProgress(((i + 1) / scripts.length) * 100)
              resolve()
            }
            scriptElement.onerror = () => reject(new Error(`Failed to load ${script.name}`))
            document.body.appendChild(scriptElement)
          })
        }

        // Wait a moment to ensure everything is initialized
        await new Promise((resolve) => setTimeout(resolve, 500))

        setLoading(false)
        if (onLoaded) onLoaded()
      } catch (err) {
        console.error("Error loading MediaPipe:", err)
        setError(`Failed to load MediaPipe: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    loadMediaPipe()
  }, [onLoaded])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Failed to Load MediaPipe</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
        <h3 className="text-xl font-bold mb-2">Loading MediaPipe</h3>
        <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
          <motion.div
            className="h-full bg-purple-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{Math.round(progress)}%</p>
      </div>
    )
  }

  return null
}
