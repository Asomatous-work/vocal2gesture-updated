"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"

interface GestureConfidenceVisualizerProps {
  predictions: { gesture: string; confidence: number }[]
  maxItems?: number
}

export function GestureConfidenceVisualizer({ predictions, maxItems = 5 }: GestureConfidenceVisualizerProps) {
  const [animatedPredictions, setAnimatedPredictions] = useState(predictions)

  // Animate changes in predictions
  useEffect(() => {
    setAnimatedPredictions(predictions.slice(0, maxItems))
  }, [predictions, maxItems])

  if (!predictions || predictions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gesture Confidence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">No gesture predictions available</div>
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
