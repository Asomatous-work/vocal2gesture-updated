"use client"

import { useEffect, useRef } from "react"

interface TrainingVisualizationProps {
  isTraining: boolean
  currentEpoch: number
  totalEpochs: number
  accuracy: number
  loss: number
}

export function TrainingVisualization({
  isTraining,
  currentEpoch,
  totalEpochs,
  accuracy,
  loss,
}: TrainingVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

    // Draw background
    ctx.fillStyle = "#1a1a1a"
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)

    if (!isTraining) {
      // Draw "Ready" state
      ctx.fillStyle = "#ffffff"
      ctx.font = "12px monospace"
      ctx.textAlign = "center"
      ctx.fillText("Ready for training", canvasRef.current.width / 2, canvasRef.current.height / 2)
      return
    }

    // Draw epoch progress
    const epochProgress = currentEpoch / totalEpochs
    const width = canvasRef.current.width * epochProgress

    // Draw accuracy line
    const accuracyHeight = canvasRef.current.height * (1 - accuracy / 100)
    ctx.strokeStyle = "#8b5cf6" // Purple
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, canvasRef.current.height * 0.8)
    ctx.lineTo(width, accuracyHeight)
    ctx.stroke()

    // Draw loss line
    const lossHeight = canvasRef.current.height * (0.2 + loss * 0.6)
    ctx.strokeStyle = "#ec4899" // Pink
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, canvasRef.current.height * 0.4)
    ctx.lineTo(width, lossHeight)
    ctx.stroke()

    // Draw points for current values
    ctx.fillStyle = "#8b5cf6"
    ctx.beginPath()
    ctx.arc(width, accuracyHeight, 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "#ec4899"
    ctx.beginPath()
    ctx.arc(width, lossHeight, 4, 0, Math.PI * 2)
    ctx.fill()

    // Draw labels
    ctx.fillStyle = "#ffffff"
    ctx.font = "10px monospace"
    ctx.fillText(`Accuracy: ${accuracy.toFixed(1)}%`, width - 100, accuracyHeight - 10)
    ctx.fillText(`Loss: ${loss.toFixed(4)}`, width - 100, lossHeight - 10)

    // Draw epoch marker
    ctx.fillStyle = "#ffffff"
    ctx.fillText(`Epoch ${currentEpoch}/${totalEpochs}`, width - 50, canvasRef.current.height - 5)

    // Simulate neural network activity
    if (isTraining) {
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * canvasRef.current.width
        const y = Math.random() * canvasRef.current.height
        const radius = Math.random() * 2 + 1

        ctx.fillStyle = `rgba(139, 92, 246, ${Math.random() * 0.5})`
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }, [isTraining, currentEpoch, totalEpochs, accuracy, loss])

  if (!isTraining) return null

  return (
    <div className="mt-2 bg-gray-900 rounded-md p-2">
      <div className="text-xs text-gray-400 mb-1">Training Visualization</div>
      <canvas ref={canvasRef} width={300} height={100} className="w-full h-24 rounded-md" />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span className="text-purple-400">— Accuracy</span>
        <span className="text-pink-400">— Loss</span>
      </div>
    </div>
  )
}
