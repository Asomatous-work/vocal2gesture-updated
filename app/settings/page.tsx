"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageContainer } from "@/components/page-container"
import { ImageUploader } from "@/components/image-uploader"
import { AnimationTrainer } from "@/components/animation-trainer"
import { ServerStatus } from "@/components/server-status"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("image-uploader")

  return (
    <PageContainer title="Settings" subtitle="Configure and manage your sign language system">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="image-uploader">Image Uploader</TabsTrigger>
          <TabsTrigger value="animation-trainer">Animation Trainer</TabsTrigger>
          <TabsTrigger value="server-status">Server Status</TabsTrigger>
        </TabsList>

        <TabsContent value="image-uploader" className="mt-6">
          <ImageUploader />
        </TabsContent>

        <TabsContent value="animation-trainer" className="mt-6">
          <AnimationTrainer />
        </TabsContent>

        <TabsContent value="server-status" className="mt-6">
          <ServerStatus />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
