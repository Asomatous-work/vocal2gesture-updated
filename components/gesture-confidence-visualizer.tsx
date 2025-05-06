"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"

interface GestureConfidenceVisualizerProps {
  predictions?: { gesture: string; confidence: number }[]
  recognizedGesture?: string
  confidenceScores?: { [key: string]: number }
  isCameraActive?: boolean
  maxItems?: number
}

export function GestureConfidenceVisualizer({
  predictions,
  recognizedGesture,
  confidenceScores = {},
  isCameraActive = false,
  maxItems = 5,
}: GestureConfidenceVisualizerProps) {
  const [animatedPredictions, setAnimatedPredictions] = useState<{ gesture: string; confidence: number }[]>([])
  const [isCalculating, setIsCalculating] = useState(false)

  // Add an effect to simulate calculation time for better UX
  useEffect(() => {
    if (isCameraActive && Object.keys(confidenceScores || {}).length > 0) {
      setIsCalculating(true)
      const timer = setTimeout(() => {
        setIsCalculating(false)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [confidenceScores, isCameraActive])

  // Process and format the data based on available props
  useEffect(() => {
    if (predictions && predictions.length > 0) {
      // If predictions array is provided, use it directly
      setAnimatedPredictions(predictions.slice(0, maxItems))
    } else if (confidenceScores && Object.keys(confidenceScores).length > 0) {
      // If confidence scores object is provided, convert to array format
      const formattedPredictions = Object.entries(confidenceScores)
        .map(([gesture, confidence]) => ({ gesture, confidence }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxItems)

      setAnimatedPredictions(formattedPredictions)
    } else {
      setAnimatedPredictions([])
    }
  }, [predictions, confidenceScores, maxItems])

  if (!isCameraActive) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gesture Confidence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Camera is inactive. Start the camera to see gesture predictions.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isCameraActive && isCalculating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gesture Confidence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse flex flex-col items-center justify-center py-6 space-y-4">
              <div className="h-6 bg-primary/10 rounded w-32"></div>
              <div className="h-24 bg-primary/10 rounded-lg w-full"></div>
            </div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="h-5 bg-primary/10 rounded w-24"></div>
                  <div className="h-5 bg-primary/10 rounded w-20"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (animatedPredictions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gesture Confidence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Make hand gestures to see confidence scores</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gesture Confidence</CardTitle>
      </CardHeader>
      <CardContent>
        {recognizedGesture && (
          <div className="bg-muted p-4 rounded-lg mb-4">
            <h3 className="text-xl font-bold text-center">{recognizedGesture}</h3>
          </div>
        )}
        <div className="space-y-4">
          {animatedPredictions.map((prediction, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-medium">{prediction.gesture}</span>
                <span className="text-sm">{(prediction.confidence * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${prediction.confidence * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
