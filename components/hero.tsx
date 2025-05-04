"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowRight, MessageSquare, Mic } from "lucide-react"

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-background dark:to-gray-900 -z-10" />

      {/* Animated shapes */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-purple-300/20 to-pink-300/20 dark:from-purple-900/20 dark:to-pink-900/20"
            style={{
              width: `${Math.random() * 300 + 50}px`,
              height: `${Math.random() * 300 + 50}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 1.2, 1],
              opacity: [0, 0.5, 0.3],
            }}
            transition={{
              duration: 5,
              delay: i * 0.5,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Breaking Communication Barriers with{" "}
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
                Vocal2Gestures
              </span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <p className="text-lg md:text-xl text-muted-foreground mb-8 md:mb-10">
              Bridging the gap between speech and sign language with AI-powered translation. Communicate effortlessly
              across language barriers in Tamil, Tanglish, and Indian Sign Language.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              onClick={() => (window.location.href = "/training")}
            >
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-16 flex flex-col md:flex-row items-center justify-center gap-8"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-3">
                <Mic className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="font-medium">Speech to Sign Translation</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-pink-100 dark:bg-pink-900/30 p-3">
                <MessageSquare className="h-6 w-6 text-pink-600 dark:text-pink-400" />
              </div>
              <p className="font-medium">Sign to Speech Translation</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
