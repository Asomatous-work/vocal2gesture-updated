"use client"

import { useState } from "react"
import { AnimationRecorder } from "@/components/animation-recorder"
import { BackButton } from "@/components/back-button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EnhancedSignSlideshow } from "@/components/enhanced-sign-slideshow"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { modelManager } from "@/lib/model-manager"
import type { AnimationData } from "@/lib/animation-data"

export default function AnimationRecorderPage() {
  const [savedAnimations, setSavedAnimations] = useState<AnimationData[]>([])
  const [activeTab, setActiveTab] = useState("record")
  const { toast } = useToast()

  const handleAnimationSaved = (animation: AnimationData) => {
    setSavedAnimations((prev) => {
      // Check if animation already exists
      const exists = prev.some((a) => a.word === animation.word)
      if (exists) {
        // Replace existing animation
        return prev.map((a) => (a.word === animation.word ? animation : a))
      }
      // Add new animation
      return [...prev, animation]
    })

    // Switch to the preview tab
    setActiveTab("preview")

    toast({
      title: "Animation Saved",
      description: `Animation for "${animation.word}" is now available for preview.`,
    })
  }

  const loadSavedAnimations = () => {
    const animations = modelManager.getAnimations()
    setSavedAnimations(animations)

    toast({
      title: animations.length > 0 ? "Animations Loaded" : "No Animations Found",
      description:
        animations.length > 0
          ? `Loaded ${animations.length} animations from storage.`
          : "No saved animations were found. Record some animations first.",
    })
  }

  return (
    <main className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex items-center mb-6">
        <BackButton />
        <h1 className="text-3xl font-bold ml-4">Animation Recorder</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
          <TabsTrigger value="record">Record Animation</TabsTrigger>
          <TabsTrigger value="preview">Preview Animations</TabsTrigger>
        </TabsList>

        <TabsContent value="record" className="space-y-6">
          <AnimationRecorder onAnimationSaved={handleAnimationSaved} />
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Saved Animations</CardTitle>
              <CardDescription>Preview your recorded sign language animations</CardDescription>
            </CardHeader>
            <CardContent>
              {savedAnimations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No animations have been saved yet. Record some animations first or load existing ones.
                  </p>
                  <Button onClick={loadSavedAnimations} className="mt-4">
                    Load Saved Animations
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p>Showing {savedAnimations.length} saved animations</p>
                    <Button onClick={loadSavedAnimations} variant="outline" size="sm">
                      Refresh
                    </Button>
                  </div>

                  <EnhancedSignSlideshow
                    words={savedAnimations.map((a) => a.word)}
                    showControls={true}
                    autoPlay={false}
                    showAnimations={true}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}
