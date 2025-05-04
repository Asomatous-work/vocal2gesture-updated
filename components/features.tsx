"use client"

import { motion } from "framer-motion"
import { Mic, MessageSquare, Languages, Zap, Globe, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function Features() {
  const features = [
    {
      icon: <Mic className="h-10 w-10 text-purple-600 dark:text-purple-400" />,
      title: "Speech to Sign",
      description: "Convert Tamil or Tanglish speech into Indian Sign Language visuals in real-time.",
    },
    {
      icon: <MessageSquare className="h-10 w-10 text-pink-600 dark:text-pink-400" />,
      title: "Sign to Speech",
      description: "Translate hand gestures into text and speech using advanced camera recognition.",
    },
    {
      icon: <Languages className="h-10 w-10 text-blue-600 dark:text-blue-400" />,
      title: "Multi-language Support",
      description: "Support for Tamil, Tanglish, and Indian Sign Language for inclusive communication.",
    },
    {
      icon: <Zap className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />,
      title: "Real-time Translation",
      description: "Instant processing and translation for seamless conversation flow.",
    },
    {
      icon: <Globe className="h-10 w-10 text-green-600 dark:text-green-400" />,
      title: "Accessible Anywhere",
      description: "Use on any device with a browser, camera, and microphone for maximum accessibility.",
    },
    {
      icon: <Users className="h-10 w-10 text-orange-600 dark:text-orange-400" />,
      title: "Community Focused",
      description: "Built with input from the deaf community to ensure practical, useful translations.",
    },
  ]

  return (
    <section id="features" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features for Seamless Communication</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our platform offers innovative tools to bridge communication gaps between spoken and sign languages.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full border-none shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-background to-muted/50">
                <CardHeader>
                  <div className="mb-4">{feature.icon}</div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
