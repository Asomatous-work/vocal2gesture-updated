"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Mic, MessageSquare, Languages, Zap, Globe, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function Features() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  const features = [
    {
      icon: <Mic className="h-10 w-10 text-purple-600 dark:text-purple-400" />,
      title: "Speech to Sign",
      description: "Convert speech into Indian Sign Language visuals in real-time.",
    },
    {
      icon: <MessageSquare className="h-10 w-10 text-pink-600 dark:text-pink-400" />,
      title: "Sign Library",
      description: "Access a comprehensive library of sign language images and animations.",
    },
    {
      icon: <Languages className="h-10 w-10 text-blue-600 dark:text-blue-400" />,
      title: "Multi-language Support",
      description: "Support for multiple languages for inclusive communication.",
    },
    {
      icon: <Zap className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />,
      title: "Real-time Translation",
      description: "Instant processing and translation for seamless conversation flow.",
    },
    {
      icon: <Globe className="h-10 w-10 text-green-600 dark:text-green-400" />,
      title: "Accessible Anywhere",
      description: "Use on any device with a browser, camera, and microphone.",
    },
    {
      icon: <Users className="h-10 w-10 text-orange-600 dark:text-orange-400" />,
      title: "Community Focused",
      description: "Built with input from the deaf community to ensure practical translations.",
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  return (
    <section id="features" ref={ref} className="py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 inline-block mb-4">
            Features
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features for Seamless Communication</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our platform offers innovative tools to bridge communication gaps between spoken and sign languages.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants} className="h-full">
              <Card className="h-full border-none shadow-lg hover-lift overflow-hidden glass-card">
                <CardContent className="p-6">
                  <div className="rounded-full w-14 h-14 flex items-center justify-center bg-white dark:bg-gray-800 shadow-md mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
