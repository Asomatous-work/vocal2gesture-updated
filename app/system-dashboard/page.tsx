"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Github, Database, HardDrive, RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { modelManager } from "@/lib/model-manager"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Progress } from "@/components/ui/progress"

interface ServiceStatus {
  name: string
  status: "connected" | "disconnected" | "checking" | "warning"
  message: string
  lastChecked: Date | null
}

export default function SystemDashboardPage() {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: "GitHub",
      status: "checking",
      message: "Checking connection...",
      lastChecked: null,
    },
    {
      name: "Blob Storage",
      status: "checking",
      message: "Checking connection...",
      lastChecked: null,
    },
    {
      name: "IndexedDB",
      status: "checking",
      message: "Checking connection...",
      lastChecked: null,
    },
  ])
  const [isChecking, setIsChecking] = useState(true)
  const [storageStats, setStorageStats] = useState({
    localStorage: { used: 0, total: 5 * 1024 * 1024, percentage: 0 }, // 5MB default
    indexedDB: { used: 0, total: 50 * 1024 * 1024, percentage: 0 }, // 50MB default
    blob: { used: 0, total: 500 * 1024 * 1024, percentage: 0 }, // 500MB default
  })
  const [githubSettings, setGithubSettings] = useState({
    owner: "",
    repo: "",
    branch: "main",
    token: "",
  })
  const [blobToken, setBlobToken] = useState("")
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [modelStats, setModelStats] = useState({
    gestures: 0,
    samples: 0,
    images: 0,
    models: 0,
  })

  const { toast } = useToast()

  // Check service connections on component mount
  useEffect(() => {
    checkAllConnections()
    loadModelStats()
    loadStorageStats()
    loadSettings()
  }, [])

  const loadSettings = () => {
    try {
      // Load GitHub settings
      const settings = localStorage.getItem("githubSettings")
      if (settings) {
        const parsed = JSON.parse(settings)
        setGithubSettings({
          owner: parsed.owner || "",
          repo: parsed.repo || "",
          branch: parsed.branch || "main",
          token: parsed.token ? "••••••••" : "",
        })
      }
    } catch (error) {
      console.error("Error loading settings:", error)
    }
  }

  const loadModelStats = async () => {
    setIsLoadingModels(true)
    try {
      // Load models from localStorage
      await modelManager.loadFromLocalStorage()

      // Get gesture stats
      const gestures = modelManager.getGestures()
      const totalSamples = gestures.reduce((sum, g) => sum + g.samples, 0)

      // Get image stats
      const images = modelManager.getSignImages()

      // Get model stats
      const savedModels = JSON.parse(localStorage.getItem("savedLSTMModels") || "[]")

      setModelStats({
        gestures: gestures.length,
        samples: totalSamples,
        images: images.length,
        models: savedModels.length,
      })
    } catch (error) {
      console.error("Error loading model stats:", error)
    } finally {
      setIsLoadingModels(false)
    }
  }

  const loadStorageStats = async () => {
    try {
      // Check localStorage usage
      let localStorageUsed = 0
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          const value = localStorage.getItem(key)
          if (value) {
            localStorageUsed += key.length + value.length
          }
        }
      }

      // Estimate IndexedDB usage (this is approximate)
      let indexedDBUsed = 0
      try {
        const lstmModelData = localStorage.getItem("lstm_model_data")
        if (lstmModelData) {
          indexedDBUsed += lstmModelData.length
        }

        // Add gesture model size
        const gestureModel = localStorage.getItem("gestureModel")
        if (gestureModel) {
          indexedDBUsed += gestureModel.length
        }
      } catch (e) {
        console.error("Error estimating IndexedDB usage:", e)
      }

      // Update storage stats
      setStorageStats({
        localStorage: {
          used: localStorageUsed,
          total: 5 * 1024 * 1024, // 5MB
          percentage: (localStorageUsed / (5 * 1024 * 1024)) * 100,
        },
        indexedDB: {
          used: indexedDBUsed,
          total: 50 * 1024 * 1024, // 50MB
          percentage: (indexedDBUsed / (50 * 1024 * 1024)) * 100,
        },
        blob: {
          used: 0, // We don't have a way to check Blob usage directly
          total: 500 * 1024 * 1024, // 500MB
          percentage: 0,
        },
      })
    } catch (error) {
      console.error("Error checking storage stats:", error)
    }
  }

  const checkAllConnections = async () => {
    setIsChecking(true)

    // Check GitHub connection
    await checkGitHubConnection()

    // Check Blob Storage connection
    await checkBlobConnection()

    // Check IndexedDB connection
    await checkIndexedDBConnection()

    setIsChecking(false)
  }

  const checkGitHubConnection = async () => {
    updateServiceStatus("GitHub", "checking", "Checking connection...")

    try {
      // Load GitHub settings
      const settings = localStorage.getItem("githubSettings")
      if (!settings) {
        updateServiceStatus("GitHub", "disconnected", "GitHub settings not configured")
        return
      }

      const { owner, repo, token } = JSON.parse(settings)

      if (!owner || !repo || !token) {
        updateServiceStatus("GitHub", "disconnected", "Missing GitHub configuration (owner, repo, or token)")
        return
      }

      // Test GitHub connection
      const response = await fetch("/api/github-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      })

      if (!response.ok) {
        const data = await response.json()
        updateServiceStatus("GitHub", "disconnected", `GitHub connection failed: ${data.error || "Unknown error"}`)
        return
      }

      const data = await response.json()
      if (data.success) {
        updateServiceStatus("GitHub", "connected", `Connected to GitHub as ${data.user?.login || "user"}`)
      } else {
        updateServiceStatus("GitHub", "disconnected", "GitHub connection failed")
      }
    } catch (error) {
      console.error("Error checking GitHub connection:", error)
      updateServiceStatus(
        "GitHub",
        "disconnected",
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }
  }

  const checkBlobConnection = async () => {
    updateServiceStatus("Blob Storage", "checking", "Checking connection...")

    try {
      // Test Blob connection with a simple request
      const response = await fetch("/api/blob-status", {
        method: "GET",
      })

      if (!response.ok) {
        const data = await response.json()
        updateServiceStatus("Blob Storage", "disconnected", `Blob connection failed: ${data.error || "Unknown error"}`)
        return
      }

      const data = await response.json()
      if (data.success) {
        updateServiceStatus("Blob Storage", "connected", "Connected to Blob Storage")
        setBlobToken("••••••••") // Set token indicator if connection is successful
      } else {
        updateServiceStatus("Blob Storage", "disconnected", "Blob connection failed")
        setBlobToken("")
      }
    } catch (error) {
      console.error("Error checking Blob connection:", error)
      updateServiceStatus(
        "Blob Storage",
        "warning",
        `Could not verify: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
      setBlobToken("")
    }
  }

  const checkIndexedDBConnection = async () => {
    updateServiceStatus("IndexedDB", "checking", "Checking connection...")

    try {
      // Check if IndexedDB is supported
      if (!window.indexedDB) {
        updateServiceStatus("IndexedDB", "disconnected", "IndexedDB not supported in this browser")
        return
      }

      // Try to open a test database
      const request = window.indexedDB.open("test-db", 1)

      request.onerror = (event) => {
        updateServiceStatus("IndexedDB", "disconnected", "Failed to open IndexedDB")
      }

      request.onsuccess = (event) => {
        updateServiceStatus("IndexedDB", "connected", "IndexedDB is available")
        // Close the test database
        request.result.close()
      }
    } catch (error) {
      console.error("Error checking IndexedDB:", error)
      updateServiceStatus(
        "IndexedDB",
        "disconnected",
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }
  }

  const updateServiceStatus = (name: string, status: ServiceStatus["status"], message: string) => {
    setServices((prev) =>
      prev.map((service) =>
        service.name === name ? { ...service, status, message, lastChecked: new Date() } : service,
      ),
    )
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"

    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getStatusIcon = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "disconnected":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case "checking":
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 md:mb-12"
      >
        <div className="flex items-center justify-center mb-4">
          <Image src="/images/gesture-logo.png" alt="Vocal2Gestures Logo" width={60} height={60} className="mr-3" />
          <h2 className="text-2xl md:text-4xl font-bold">System Dashboard</h2>
        </div>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Monitor connections, storage usage, and system status
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {services.map((service) => (
          <Card key={service.name} className="overflow-hidden border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center">
                {service.name === "GitHub" && <Github className="mr-2 h-5 w-5" />}
                {service.name === "Blob Storage" && <HardDrive className="mr-2 h-5 w-5" />}
                {service.name === "IndexedDB" && <Database className="mr-2 h-5 w-5" />}
                <CardTitle>{service.name}</CardTitle>
              </div>
              {getStatusIcon(service.status)}
            </CardHeader>
            <CardContent>
              <p
                className={`text-sm ${
                  service.status === "connected"
                    ? "text-green-600"
                    : service.status === "disconnected"
                      ? "text-red-600"
                      : service.status === "warning"
                        ? "text-yellow-600"
                        : "text-blue-600"
                }`}
              >
                {service.message}
              </p>
              {service.lastChecked && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last checked: {service.lastChecked.toLocaleTimeString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Storage Usage */}
        <Card className="overflow-hidden border-none shadow-lg">
          <CardHeader>
            <CardTitle>Storage Usage</CardTitle>
            <CardDescription>Monitor local and cloud storage utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Local Storage</span>
                  <span className="text-sm text-muted-foreground">
                    {formatBytes(storageStats.localStorage.used)} / {formatBytes(storageStats.localStorage.total)}
                  </span>
                </div>
                <Progress value={storageStats.localStorage.percentage} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">IndexedDB</span>
                  <span className="text-sm text-muted-foreground">
                    {formatBytes(storageStats.indexedDB.used)} / {formatBytes(storageStats.indexedDB.total)}
                  </span>
                </div>
                <Progress value={storageStats.indexedDB.percentage} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Blob Storage</span>
                  <span className="text-sm text-muted-foreground">{blobToken ? "Available" : "Not configured"}</span>
                </div>
                <Progress value={blobToken ? 100 : 0} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Status */}
        <Card className="overflow-hidden border-none shadow-lg">
          <CardHeader>
            <CardTitle>Configuration Status</CardTitle>
            <CardDescription>Current system configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-md">
                <h3 className="text-sm font-medium mb-2">GitHub Configuration</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Owner:</div>
                  <div>{githubSettings.owner || "Not set"}</div>
                  <div className="text-muted-foreground">Repository:</div>
                  <div>{githubSettings.repo || "Not set"}</div>
                  <div className="text-muted-foreground">Branch:</div>
                  <div>{githubSettings.branch || "main"}</div>
                  <div className="text-muted-foreground">Token:</div>
                  <div>{githubSettings.token || "Not set"}</div>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-md">
                <h3 className="text-sm font-medium mb-2">Blob Storage</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Token:</div>
                  <div>{blobToken || "Not set"}</div>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-md">
                <h3 className="text-sm font-medium mb-2">Model Statistics</h3>
                {isLoadingModels ? (
                  <div className="flex justify-center py-2">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Gestures:</div>
                    <div>{modelStats.gestures}</div>
                    <div className="text-muted-foreground">Samples:</div>
                    <div>{modelStats.samples}</div>
                    <div className="text-muted-foreground">Images:</div>
                    <div>{modelStats.images}</div>
                    <div className="text-muted-foreground">Trained Models:</div>
                    <div>{modelStats.models}</div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={checkAllConnections}
          disabled={isChecking}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isChecking ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Checking Connections...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Connections
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
