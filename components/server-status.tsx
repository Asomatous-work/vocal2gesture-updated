"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { pythonBackendService } from "@/lib/python-backend-service"
import { AlertCircle, CheckCircle, Server } from "lucide-react"
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip"

export function ServerStatus() {
  const [isServerAvailable, setIsServerAvailable] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkServerStatus = async () => {
    setIsLoading(true)
    try {
      const isAvailable = await pythonBackendService.checkAvailability()
      setIsServerAvailable(isAvailable)
      setLastChecked(new Date())
    } catch (error) {
      console.error("Error checking server status:", error)
      setIsServerAvailable(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkServerStatus()

    // Check server status every 30 seconds
    const interval = setInterval(() => {
      checkServerStatus()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <TooltipProvider>
      <div className="flex items-center space-x-2">
        <Server className="h-4 w-4" />
        <span className="text-sm font-medium">Python Backend:</span>
        {isLoading ? (
          <Badge variant="outline" className="animate-pulse">
            Checking...
          </Badge>
        ) : isServerAvailable ? (
          <Tooltip content="Python backend is available and connected">
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              <span>Connected</span>
            </Badge>
          </Tooltip>
        ) : (
          <Tooltip content="Python backend is not available. Some features may be limited.">
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>Disconnected</span>
            </Badge>
          </Tooltip>
        )}
        {lastChecked && <span className="text-xs text-gray-500">Last checked: {lastChecked.toLocaleTimeString()}</span>}
        <button onClick={checkServerStatus} className="text-xs text-blue-500 hover:text-blue-700 underline">
          Refresh
        </button>
      </div>
    </TooltipProvider>
  )
}
