"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageUploader } from "@/components/image-uploader"
import { ServerStatus } from "@/components/server-status"
import { BackButton } from "@/components/back-button"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("images")

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <BackButton />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center mb-4">
          <Image src="/images/gesture-logo.png" alt="Vocal2Gestures Logo" width={60} height={60} className="mr-3" />
          <h2 className="text-3xl md:text-4xl font-bold">Settings & Management</h2>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Manage your sign language images, animations, and check server status
        </p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full max-w-md mx-auto grid grid-cols-3">
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="animations">Animations</TabsTrigger>
          <TabsTrigger value="server">Server</TabsTrigger>
        </TabsList>

        <TabsContent value="images" className="mt-6">
          <ImageUploader />
        </TabsContent>

        <TabsContent value="animations" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Animation & Gesture Training</CardTitle>
              <CardDescription>Train sign language animations and gestures for use in the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/animation-training" className="block">
                  <Card className="h-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <CardHeader>
                      <CardTitle>Animation Trainer</CardTitle>
                      <CardDescription>Record sign language animations for use in Speak to Sign</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>

                <Link href="/training" className="block">
                  <Card className="h-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <CardHeader>
                      <CardTitle>Gesture Trainer</CardTitle>
                      <CardDescription>Train gesture recognition models for Sign to Speech</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="server" className="mt-6">
          <ServerStatus />
        </TabsContent>
      </Tabs>
    </div>
  )
}
