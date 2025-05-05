"use client"

import { useState } from "react"
import { ModelGitHubManager } from "@/components/model-github-manager"
import { GestureSlideShower } from "@/components/gesture-slide-shower"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Database, Github, ImageIcon } from "lucide-react"

export default function ModelManagementPage() {
  const [activeTab, setActiveTab] = useState("models")

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Model Management</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Consolidate, manage, and share your gesture recognition models
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="models">
            <Database className="mr-2 h-4 w-4" />
            Model Management
          </TabsTrigger>
          <TabsTrigger value="github">
            <Github className="mr-2 h-4 w-4" />
            GitHub Integration
          </TabsTrigger>
          <TabsTrigger value="slideshow">
            <ImageIcon className="mr-2 h-4 w-4" />
            Gesture Slideshow
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="mt-4">
          <ModelGitHubManager />
        </TabsContent>

        <TabsContent value="github" className="mt-4">
          <ModelGitHubManager />
        </TabsContent>

        <TabsContent value="slideshow" className="mt-4">
          <GestureSlideShower autoPlay={true} interval={3000} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
