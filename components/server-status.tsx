"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface ServiceStatus {
  name: string
  status: "available" | "not configured" | "error" | "unknown"
}

export function ServerStatus() {
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [lastChecked, setLastChecked] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkServerStatus = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/server-status")

      if (!response.ok) {
        throw new Error(`Failed to check server status: ${response.statusText}`)
      }

      const data = await response.json()
      setServices(data.services)
      setLastChecked(data.timestamp)
    } catch (err) {
      console.error("Error checking server status:", err)
      setError(`Failed to check server status: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkServerStatus()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "not configured":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "available":
        return "Available"
      case "not configured":
        return "Not Configured"
      case "error":
        return "Error"
      default:
        return "Unknown"
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case "available":
        return "text-green-500"
      case "not configured":
        return "text-yellow-500"
      case "error":
        return "text-red-500"
      default:
        return "text-gray-500"
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Server Status</h2>
            <Button onClick={checkServerStatus} variant="outline" disabled={isLoading} size="sm">
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-3 rounded-md">{error}</div>
          )}

          <div className="space-y-4">
            {services.map((service, index) => (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center">
                  {getStatusIcon(service.status)}
                  <span className="ml-3 font-medium">{service.name}</span>
                </div>
                <span className={`font-medium ${getStatusClass(service.status)}`}>{getStatusText(service.status)}</span>
              </motion.div>
            ))}

            {services.length === 0 && !isLoading && !error && (
              <div className="text-center py-8">
                <p className="text-gray-500">No service status information available</p>
              </div>
            )}

            {isLoading && services.length === 0 && (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {lastChecked && (
            <div className="text-sm text-gray-500 text-right">
              Last checked: {new Date(lastChecked).toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
