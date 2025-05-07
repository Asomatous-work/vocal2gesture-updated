"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RefreshCw, Github, Check, AlertTriangle } from "lucide-react"
import { modelManager } from "@/lib/model-manager"

interface GitHubIntegrationPanelProps {
  onTokenSaved?: (success: boolean) => void
}

export function GitHubIntegrationPanel({ onTokenSaved }: GitHubIntegrationPanelProps) {
  const [githubToken, setGithubToken] = useState<string>("")
  const [githubOwner, setGithubOwner] = useState<string>("Asomatous-work")
  const [githubRepo, setGithubRepo] = useState<string>("vocal2gesture-updated")
  const [githubBranch, setGithubBranch] = useState<string>("main")
  const [isSaving, setIsSaving] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const { toast } = useToast()

  // Check if GitHub is already configured
  useEffect(() => {
    try {
      const settings = localStorage.getItem("githubSettings")
      if (settings) {
        const config = JSON.parse(settings)
        if (config.owner) setGithubOwner(config.owner)
        if (config.repo) setGithubRepo(config.repo)
        if (config.branch) setGithubBranch(config.branch)
        if (config.token) {
          // Don't show the actual token, just indicate it's set
          setIsConfigured(true)
        }
      }
    } catch (error) {
      console.error("Error loading GitHub settings:", error)
    }
  }, [])

  const validateAndSaveToken = async () => {
    if (!githubToken) {
      setTokenError("GitHub token is required")
      return
    }

    if (!githubOwner || !githubRepo) {
      setTokenError("Owner and repository name are required")
      return
    }

    setTokenError(null)
    setIsValidating(true)
    setIsSaving(true)

    try {
      // Validate the token with GitHub API
      const response = await fetch("/api/github-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: githubToken,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to validate GitHub token")
      }

      // Save to model manager
      modelManager.initGitHub({
        owner: githubOwner,
        repo: githubRepo,
        branch: githubBranch || "main",
        token: githubToken,
      })

      setIsConfigured(true)
      toast({
        title: "GitHub Integration Configured",
        description: "Your GitHub settings have been saved successfully.",
      })

      // Notify parent component if callback provided
      if (onTokenSaved) {
        onTokenSaved(true)
      }

      // Clear the token field for security
      setTimeout(() => {
        setGithubToken("")
      }, 1000)
    } catch (error) {
      console.error("Error saving GitHub token:", error)
      setTokenError(error.message || "Failed to validate GitHub token")
      toast({
        title: "GitHub Configuration Error",
        description: error.message || "There was an error configuring GitHub integration.",
        variant: "destructive",
      })

      // Notify parent component if callback provided
      if (onTokenSaved) {
        onTokenSaved(false)
      }
    } finally {
      setIsValidating(false)
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-none shadow-md bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <CardHeader>
        <div className="flex items-center">
          <Github className="mr-2 h-5 w-5" />
          <div>
            <CardTitle>GitHub Integration</CardTitle>
            <CardDescription>Configure GitHub for cross-device model storage</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConfigured && (
          <Alert variant="success">
            <Check className="h-4 w-4" />
            <AlertTitle>GitHub Configured</AlertTitle>
            <AlertDescription>
              GitHub integration is set up and ready to use. Your models will be saved to{" "}
              <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                {githubOwner}/{githubRepo}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {tokenError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>{tokenError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="githubOwner">Owner/Organization</Label>
          <Input
            id="githubOwner"
            placeholder="e.g., username or organization"
            value={githubOwner}
            onChange={(e) => setGithubOwner(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="githubRepo">Repository Name</Label>
          <Input
            id="githubRepo"
            placeholder="e.g., vocal2gestures"
            value={githubRepo}
            onChange={(e) => setGithubRepo(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="githubBranch">Branch</Label>
          <Input
            id="githubBranch"
            placeholder="e.g., main"
            value={githubBranch}
            onChange={(e) => setGithubBranch(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="githubToken">Personal Access Token</Label>
          <Input
            id="githubToken"
            type="password"
            placeholder="GitHub personal access token with repo scope"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
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

        <Button
          onClick={validateAndSaveToken}
          disabled={isSaving || isValidating || !githubToken || !githubOwner || !githubRepo}
          className="w-full"
        >
          {isSaving || isValidating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              {isValidating ? "Validating..." : "Saving..."}
            </>
          ) : (
            <>
              <Github className="mr-2 h-4 w-4" />
              {isConfigured ? "Update GitHub Configuration" : "Configure GitHub Integration"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
