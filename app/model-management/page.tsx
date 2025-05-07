"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Github, Save, Trash2, RefreshCw, Upload, Download, AlertTriangle } from "lucide-react"
import { modelManager } from "@/lib/model-manager"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton-loader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ModelManagementPage() {
  const [owner, setOwner] = useState("")
  const [repo, setRepo] = useState("")
  const [branch, setBranch] = useState("main")
  const [token, setToken] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [gestures, setGestures] = useState<{ name: string; samples: number }[]>([])
  const [signImages, setSignImages] = useState<{ word: string; url: string }[]>([])
  // Add a loading state for model management operations
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { toast } = useToast()

  // Load settings and models on component mount
  // Update the useEffect to include initialization state
  useEffect(() => {
    try {
      setIsInitializing(true)
      setError(null)

      // Load GitHub settings
      const settings = localStorage.getItem("githubSettings")
      if (settings) {
        const parsedSettings = JSON.parse(settings)
        setOwner(parsedSettings.owner || "")
        setRepo(parsedSettings.repo || "")
        setBranch(parsedSettings.branch || "main")
        setToken(parsedSettings.token || "")
      }

      // Load models
      const gestureModels = modelManager.getGestures()
      setGestures(
        gestureModels.map((g) => ({
          name: g.name,
          samples: g.samples,
        })),
      )

      // Load sign images
      const images = modelManager.getSignImages()
      setSignImages(images)
    } catch (error) {
      console.error("Error loading settings:", error)
      setError("Failed to load settings and models. Please try refreshing the page.")
    } finally {
      setIsInitializing(false)
    }
  }, [])

  // Save GitHub settings
  const saveSettings = async () => {
    if (!owner || !repo) {
      toast({
        title: "Missing Information",
        description: "Please enter both owner and repository name.",
        variant: "destructive",
      })
      return
    }

    if (!token) {
      toast({
        title: "Missing Token",
        description: "A GitHub token is required for API access.",
        variant: "destructive",
      })
      return
    }

    setError(null)
    setIsSaving(true)

    try {
      // Save to localStorage and initialize GitHub integration
      const settings = { owner, repo, branch: branch || "main", token }
      await modelManager.initGitHub(settings)

      toast({
        title: "Settings Saved",
        description: "GitHub settings have been saved successfully.",
      })
    } catch (error: any) {
      console.error("Error saving settings:", error)
      setError(error.message || "Failed to save GitHub settings")
      toast({
        title: "Save Error",
        description: error.message || "There was an error saving your settings.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Save models to GitHub
  const saveToGitHub = async () => {
    if (!owner || !repo || !token) {
      toast({
        title: "Missing GitHub Settings",
        description: "Please configure your GitHub settings with owner, repository name, and token.",
        variant: "destructive",
      })
      return
    }

    setError(null)
    setIsSaving(true)

    try {
      // Make sure GitHub settings are up to date
      await modelManager.initGitHub({ owner, repo, branch: branch || "main", token })

      // Save to GitHub
      await modelManager.saveToGitHub()

      toast({
        title: "Save Successful",
        description: "Your models have been saved to GitHub.",
      })
    } catch (error: any) {
      console.error("GitHub save error:", error)
      setError(error.message || "Failed to save to GitHub")
      toast({
        title: "Save Error",
        description: error.message || "There was an error saving to GitHub.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Load models from GitHub
  const loadFromGitHub = async () => {
    if (!owner || !repo || !token) {
      toast({
        title: "Missing GitHub Settings",
        description: "Please configure your GitHub settings with owner, repository name, and token.",
        variant: "destructive",
      })
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      // Make sure GitHub settings are up to date
      await modelManager.initGitHub({ owner, repo, branch: branch || "main", token })

      // Load from GitHub
      await modelManager.loadFromGitHub()

      // Refresh the UI with loaded data
      const gestureModels = modelManager.getGestures()
      setGestures(
        gestureModels.map((g) => ({
          name: g.name,
          samples: g.samples,
        })),
      )

      const images = modelManager.getSignImages()
      setSignImages(images)

      toast({
        title: "Load Successful",
        description: "Your models have been loaded from GitHub.",
      })
    } catch (error: any) {
      console.error("GitHub load error:", error)
      setError(error.message || "Failed to load from GitHub")
      toast({
        title: "Load Error",
        description: error.message || "There was an error loading from GitHub.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Delete all models
  const deleteAllModels = () => {
    if (!confirm("Are you sure you want to delete all models? This cannot be undone.")) {
      return
    }

    setIsDeleting(true)

    try {
      const success = modelManager.clearAll()

      if (success) {
        setGestures([])
        setSignImages([])

        toast({
          title: "Models Deleted",
          description: "All models have been deleted successfully.",
        })
      } else {
        throw new Error("Failed to delete models")
      }
    } catch (error: any) {
      console.error("Delete error:", error)
      setError(error.message || "Failed to delete models")
      toast({
        title: "Delete Error",
        description: "There was an error deleting your models.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
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
          <h2 className="text-2xl md:text-4xl font-bold">Model Management</h2>
        </div>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Manage your gesture models and sign language images with GitHub integration
        </p>
      </motion.div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Add loading state for when the page is initializing */}
      {isInitializing ? (
        // Show skeleton loading UI
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <Skeleton className="h-[400px] w-full rounded-lg" />
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      ) : (
        // Render the actual content
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* GitHub Settings */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
              <CardHeader>
                <div className="flex items-center">
                  <Github className="mr-2 h-5 w-5" />
                  <CardTitle>GitHub Integration</CardTitle>
                </div>
                <CardDescription>Configure GitHub repository for cross-device model storage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="owner">Repository Owner</Label>
                    <Input
                      id="owner"
                      placeholder="e.g., your-username"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="repo">Repository Name</Label>
                    <Input
                      id="repo"
                      placeholder="e.g., vocal2gestures-models"
                      value={repo}
                      onChange={(e) => setRepo(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="branch">Branch (Optional)</Label>
                    <Input id="branch" placeholder="main" value={branch} onChange={(e) => setBranch(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="token">GitHub Token (Required)</Label>
                    <Input
                      id="token"
                      type="password"
                      placeholder="GitHub personal access token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Create a token with 'repo' scope at{" "}
                      <a
                        href="https://github.com/settings/tokens/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        github.com/settings/tokens/new
                      </a>
                    </p>
                  </div>

                  <Button onClick={saveSettings} className="w-full" disabled={isSaving}>
                    {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isSaving ? "Saving..." : "Save Settings"}
                  </Button>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <Button onClick={saveToGitHub} variant="outline" disabled={isSaving}>
                      {isSaving ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {isSaving ? "Saving..." : "Save to GitHub"}
                    </Button>

                    <Button onClick={loadFromGitHub} variant="outline" disabled={isLoading}>
                      {isLoading ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      {isLoading ? "Loading..." : "Load from GitHub"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Model Summary */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
              <CardHeader>
                <CardTitle>Model Summary</CardTitle>
                <CardDescription>Overview of your trained gesture models and sign images</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Update the gesture models section to show loading state during operations */}
                  <div>
                    <h3 className="text-lg font-medium mb-2">Gesture Models</h3>
                    {isLoading || isSaving ? (
                      // Loading state
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <Skeleton key={index} className="h-10 w-full rounded-md" />
                        ))}
                      </div>
                    ) : gestures.length > 0 ? (
                      // Normal state with data
                      <div className="bg-background rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="font-medium">Gesture Name</div>
                          <div className="font-medium">Samples</div>
                        </div>
                        <div className="mt-2 space-y-2">
                          {gestures.map((gesture, index) => (
                            <div
                              key={index}
                              className="grid grid-cols-2 gap-2 py-1 border-t border-gray-100 dark:border-gray-800"
                            >
                              <div>{gesture.name}</div>
                              <div>{gesture.samples}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      // Empty state
                      <p className="text-muted-foreground">No gesture models available</p>
                    )}
                  </div>

                  {/* Update the sign images section with loading states */}
                  <div>
                    <h3 className="text-lg font-medium mb-2">Sign Language Images</h3>
                    {isLoading || isSaving ? (
                      // Loading state for sign images
                      <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <Skeleton key={index} className="aspect-square rounded-md" />
                        ))}
                      </div>
                    ) : signImages.length > 0 ? (
                      // Normal state with images
                      <div className="grid grid-cols-3 gap-2">
                        {signImages.map((image, index) => (
                          <div key={index} className="aspect-square rounded-md overflow-hidden bg-muted relative group">
                            <img
                              src={image.url || "/placeholder.svg"}
                              alt={image.word}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <p className="text-white font-medium text-center px-2">{image.word}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Empty state
                      <p className="text-muted-foreground">No sign language images available</p>
                    )}
                  </div>

                  {/* Delete All */}
                  <Button
                    onClick={deleteAllModels}
                    variant="destructive"
                    className="w-full"
                    disabled={isDeleting || (gestures.length === 0 && signImages.length === 0)}
                  >
                    {isDeleting ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    {isDeleting ? "Deleting..." : "Delete All Models"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  )
}
