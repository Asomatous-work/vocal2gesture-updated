"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Trash } from "lucide-react"

interface DetectionHistoryLogProps {
  history: {
    gesture: string
    confidence: number
    timestamp: number
  }[]
  maxHeight?: string
  onClear?: () => void
}

export function DetectionHistoryLog({ history, maxHeight = "300px", onClear }: DetectionHistoryLogProps) {
  const [formattedHistory, setFormattedHistory] = useState<
    {
      gesture: string
      confidence: number
      formattedTime: string
      timestamp: number
    }[]
  >([])

  useEffect(() => {
    // Format timestamps
    const formatted = history.map((item) => ({
      ...item,
      formattedTime: new Date(item.timestamp).toLocaleTimeString(),
    }))
    setFormattedHistory(formatted)
  }, [history])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Detection History</CardTitle>
          <CardDescription>Recent gesture recognitions</CardDescription>
        </div>
        {onClear && (
          <Button variant="outline" size="sm" onClick={onClear}>
            <Trash className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className={`pr-4`} style={{ maxHeight }}>
          {formattedHistory.length > 0 ? (
            <div className="space-y-2">
              {formattedHistory.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-background rounded-lg border border-muted flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{item.gesture}</div>
                    <div className="text-xs text-muted-foreground">{item.formattedTime}</div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2 dark:bg-gray-700">
                      <div
                        className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full"
                        style={{ width: `${item.confidence}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-mono">{item.confidence.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No detection history available</div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
