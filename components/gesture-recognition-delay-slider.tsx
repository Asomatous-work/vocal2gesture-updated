"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

interface GestureRecognitionDelaySliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}

export function GestureRecognitionDelaySlider({
  value,
  onChange,
  min = 100,
  max = 1000,
  step = 50,
}: GestureRecognitionDelaySliderProps) {
  const [localValue, setLocalValue] = useState(value)

  const handleChange = (newValue: number[]) => {
    setLocalValue(newValue[0])
    onChange(newValue[0])
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recognition Delay</CardTitle>
        <CardDescription>Adjust the delay between gesture recognitions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Delay: {localValue}ms</Label>
            <div className="text-sm text-muted-foreground">
              {localValue < 300 ? "Faster" : localValue > 700 ? "More Stable" : "Balanced"}
            </div>
          </div>

          <Slider value={[localValue]} min={min} max={max} step={step} onValueChange={handleChange} />

          <div className="grid grid-cols-3 text-xs text-muted-foreground">
            <div>Responsive</div>
            <div className="text-center">Balanced</div>
            <div className="text-right">Stable</div>
          </div>

          <div className="text-sm text-muted-foreground mt-2">
            <p>
              Lower values make the recognition more responsive but may cause more false positives. Higher values
              provide more stable recognition but with increased latency.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
