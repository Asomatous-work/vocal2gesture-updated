"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Github, Save, Download, RefreshCw } from "lucide-react"
import { modelManager } from "@/lib/model-manager"

export function ModelGitHubManager() {
  const [owner, setOwner] = useState("")
  const [repo, setRepo] = useState("")
  const [branch, setBranch] = useState("main")
  const [token, setToken] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Load GitHub settings from localStorage on component mount
  useEffect(() => {
    try {
      const settings = localStorage.getItem("githubSettings")
      if (settings) {
        const config = JSON.parse(settings)
        setOwner(config.owner || "")
        setRepo(config.repo || "")
        setBranch(config.branch || "main")
        setToken(config.token || "")
      }
    } catch (error) {
      console.error("Error loading GitHub settings:", error)
    }
  }, [])

  const saveSettings = () => {
    if (!owner || !repo) {
      toast({
        title: "Missing Information",
        description: "Please enter both owner/organization and repository name.",
        variant: "destructive",
      })
      return
    }

    try {
      // Save GitHub settings
      const config = { owner, repo, branch, token }
      modelManager.initGitHub(config)

      toast({
        title: "Settings Saved",
        description: "GitHub settings have been saved successfully.",
      })
    } catch (error) {
      console.error("Error saving GitHub settings:", error)
      toast({
        title: "Save Error",
        description: "There was an error saving your GitHub settings.",
        variant: "destructive",
      })
    }
  }

  const saveToGitHub = async () => {
    if (!owner || !repo) {
      toast({
        title: "Missing Information",
        description: "Please enter both owner/organization and repository name.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      // Save GitHub settings first
      saveSettings()

      // Save model to GitHub
      const saved = await modelManager.saveToGitHub()

      if (saved) {
        toast({
          title: "Save Successful",
          description: "Your model has been saved to GitHub.",
        })
      } else {
        throw new Error("Failed to save to GitHub")
      }
    } catch (error) {
      console.error("GitHub save error:", error)
      toast({
        title: "Save Error",
        description: "There was an error saving your model to GitHub.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const loadFromGitHub = async () => {
    if (!owner || !repo) {
      toast({
        title: "Missing Information",
        description: "Please enter both owner/organization and repository name.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Save GitHub settings first
      saveSettings()

      // Load model from GitHub
      const loaded = await modelManager.loadFromGitHub()

      if (loaded) {
        toast({
          title: "Load Successful",
          description: "Your model has been loaded from GitHub.",
        })
      } else {
        throw new Error("Failed to load from GitHub")
      }
    } catch (error) {
      console.error("GitHub load error:", error)
      toast({
        title: "Load Error",
        description: "There was an error loading your model from GitHub.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Github className="mr-2 h-5 w-5" />
          GitHub Integration
        </CardTitle>
        <CardDescription>Save and load your models from GitHub for cross-device usage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="owner">Owner/Organization</Label>
            <Input
              id="owner"
              placeholder="e.g., username or organization"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repo">Repository Name</Label>
            <Input
              id="repo"
              placeholder="e.g., vocal2gestures"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch">Branch</Label>
            <Input id="branch" placeholder="e.g., main" value={branch} onChange={(e) => setBranch(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="token">Personal Access Token (Optional)</Label>
            <Input
              id="token"
              type="password"
              placeholder="For private repositories"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2">
        <Button onClick={saveSettings} className="w-full sm:w-auto">
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
        <Button onClick={saveToGitHub} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Github className="mr-2 h-4 w-4" />
              Save to GitHub
            </>
          )}
        </Button>
        <Button onClick={loadFromGitHub} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Load from GitHub
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
