"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { modelManager } from "@/lib/model-manager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { RefreshCw, Upload, Download, Github, Database, Save } from "lucide-react"

export function ModelGitHubManager() {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("local")
  const [githubOwner, setGithubOwner] = useState("")
  const [githubRepo, setGithubRepo] = useState("")
  const [githubToken, setGithubToken] = useState("")
  const [githubBranch, setGithubBranch] = useState("main")
  const [consolidationProgress, setConsolidationProgress] = useState(0)
  const [isConsolidating, setIsConsolidating] = useState(false)
  const [modelStats, setModelStats] = useState({
    totalGestures: 0,
    totalSamples: 0,
    lastUpdated: "",
  })
  const { toast } = useToast()

  // Load saved GitHub settings
  useEffect(() => {
    const savedSettings = localStorage.getItem("githubSettings")
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      setGithubOwner(settings.owner || "")
      setGithubRepo(settings.repo || "")
      setGithubBranch(settings.branch || "main")
      // Don't load token from localStorage for security reasons
    }

    // Load model stats
    updateModelStats()
  }, [])

  // Update model statistics
  const updateModelStats = () => {
    const model = modelManager.getConsolidatedModel()
    if (model) {
      const totalGestures = model.gestures.length
      const totalSamples = model.gestures.reduce((sum, gesture) => sum + gesture.samples, 0)
      const lastUpdated = model.metadata.lastUpdated || model.metadata.timestamp

      setModelStats({
        totalGestures,
        totalSamples,
        lastUpdated: new Date(lastUpdated).toLocaleString(),
      })
    }
  }

  // Save GitHub settings
  const saveGitHubSettings = () => {
    if (!githubOwner || !githubRepo) {
      toast({
        title: "Missing Information",
        description: "Please provide both owner and repository name.",
        variant: "destructive",
      })
      return
    }

    // Save settings to localStorage (except token)
    localStorage.setItem(
      "githubSettings",
      JSON.stringify({
        owner: githubOwner,
        repo: githubRepo,
        branch: githubBranch,
      }),
    )

    // Initialize GitHub integration
    const success = modelManager.initGitHub({
      owner: githubOwner,
      repo: githubRepo,
      token: githubToken,
      branch: githubBranch,
    })

    if (success) {
      toast({
        title: "GitHub Settings Saved",
        description: "Your GitHub settings have been saved successfully.",
      })
    } else {
      toast({
        title: "GitHub Initialization Failed",
        description: "Failed to initialize GitHub integration. Please check your settings.",
        variant: "destructive",
      })
    }
  }

  // Consolidate models
  const handleConsolidateModels = async () => {
    setIsConsolidating(true)
    setConsolidationProgress(10)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setConsolidationProgress((prev) => {
          const newProgress = prev + 10
          return newProgress < 90 ? newProgress : prev
        })
      }, 300)

      const success = await modelManager.consolidateModels()

      clearInterval(progressInterval)
      setConsolidationProgress(100)

      if (success) {
        toast({
          title: "Models Consolidated",
          description: "All models have been successfully consolidated into one file.",
        })
        updateModelStats()
      } else {
        toast({
          title: "Consolidation Failed",
          description: "Failed to consolidate models. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error consolidating models:", error)
      toast({
        title: "Consolidation Error",
        description: "An error occurred while consolidating models.",
        variant: "destructive",
      })
    } finally {
      setTimeout(() => {
        setIsConsolidating(false)
        setConsolidationProgress(0)
      }, 1000)
    }
  }

  // Save to GitHub
  const handleSaveToGitHub = async () => {
    setIsLoading(true)

    try {
      const success = await modelManager.saveToGitHub()

      if (success) {
        toast({
          title: "Saved to GitHub",
          description: "Your models have been successfully saved to GitHub.",
        })
      } else {
        toast({
          title: "Save Failed",
          description: "Failed to save models to GitHub. Please check your settings and try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving to GitHub:", error)
      toast({
        title: "GitHub Error",
        description: "An error occurred while saving to GitHub.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load from GitHub
  const handleLoadFromGitHub = async () => {
    setIsLoading(true)

    try {
      const success = await modelManager.loadFromGitHub()

      if (success) {
        toast({
          title: "Loaded from GitHub",
          description: "Your models have been successfully loaded from GitHub.",
        })
        updateModelStats()
      } else {
        toast({
          title: "Load Failed",
          description: "Failed to load models from GitHub. Please check your settings and try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading from GitHub:", error)
      toast({
        title: "GitHub Error",
        description: "An error occurred while loading from GitHub.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="local">
            <Database className="mr-2 h-4 w-4" />
            Local Models
          </TabsTrigger>
          <TabsTrigger value="github">
            <Github className="mr-2 h-4 w-4" />
            GitHub Integration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="local" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Local Model Management</CardTitle>
              <CardDescription>Consolidate and manage your locally stored models</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Consolidated Model Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Gestures</p>
                    <p className="text-2xl font-bold">{modelStats.totalGestures}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Samples</p>
                    <p className="text-2xl font-bold">{modelStats.totalSamples}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="text-sm">{modelStats.lastUpdated || "Never"}</p>
                  </div>
                </div>
              </div>

              <div>
                <Button
                  onClick={handleConsolidateModels}
                  disabled={isConsolidating}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isConsolidating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Consolidating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Consolidate All Models
                    </>
                  )}
                </Button>

                {isConsolidating && (
                  <div className="mt-2">
                    <Progress value={consolidationProgress} className="h-2" />
                    <p className="text-xs text-center mt-1 text-muted-foreground">{consolidationProgress}% Complete</p>
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                <p>
                  Consolidating models will combine all your separately trained models into a single file for easier
                  management and sharing. This process preserves all your gestures and samples.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="github" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>GitHub Integration</CardTitle>
              <CardDescription>Store and retrieve your models from GitHub</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="github-owner">Repository Owner</Label>
                  <Input
                    id="github-owner"
                    placeholder="e.g., username"
                    value={githubOwner}
                    onChange={(e) => setGithubOwner(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github-repo">Repository Name</Label>
                  <Input
                    id="github-repo"
                    placeholder="e.g., gesture-models"
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="github-token">
                    Personal Access Token <span className="text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input
                    id="github-token"
                    type="password"
                    placeholder="For private repositories"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github-branch">Branch</Label>
                  <Input
                    id="github-branch"
                    placeholder="e.g., main"
                    value={githubBranch}
                    onChange={(e) => setGithubBranch(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={saveGitHubSettings} className="w-full">
                <Github className="mr-2 h-4 w-4" />
                Save GitHub Settings
              </Button>

              <div className="flex gap-4">
                <Button
                  onClick={handleSaveToGitHub}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isLoading ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Save to GitHub
                </Button>
                <Button onClick={handleLoadFromGitHub} disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Load from GitHub
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>
                  GitHub integration allows you to store your models in a repository for backup and sharing. The models
                  will be organized with one file per gesture for easier management.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
