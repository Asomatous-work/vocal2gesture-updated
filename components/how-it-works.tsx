"use client"

import { motion } from "framer-motion"
import { Mic, Lightbulb, ImageIcon, Volume2, Camera, MessageSquare } from "lucide-react"

export function HowItWorks() {
  const speechToSignSteps = [
    {
      icon: <Mic className="h-8 w-8 text-white" />,
      title: "Speak",
      description: "Speak in Tamil or Tanglish into your device's microphone.",
    },
    {
      icon: <Lightbulb className="h-8 w-8 text-white" />,
      title: "Process",
      description: "Our NLP system recognizes and processes your speech.",
    },
    {
      icon: <ImageIcon className="h-8 w-8 text-white" />,
      title: "Translate",
      description: "Speech is translated into Indian Sign Language visuals.",
    },
  ]

  const signToSpeechSteps = [
    {
      icon: <Camera className="h-8 w-8 text-white" />,
      title: "Capture",
      description: "Your device's camera captures hand gestures and movements.",
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-white" />,
      title: "Recognize",
      description: "AI identifies sign language gestures using hand landmarks.",
    },
    {
      icon: <Volume2 className="h-8 w-8 text-white" />,
      title: "Speak",
      description: "Signs are converted to text and spoken aloud.",
    },
  ]

  return (
    <section
      id="how-it-works"
      className="py-20 bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-background dark:to-gray-900"
    >
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our dual translation system makes communication seamless in both directions.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Speech to Sign */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">Speech to Sign</h3>
              <p className="text-muted-foreground">Converting spoken language to sign language</p>
            </div>
            <div className="relative">
              {/* Connection line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-400 to-pink-400 -translate-x-1/2 z-0" />

              {/* Steps */}
              <div className="relative z-10 space-y-12">
                {speechToSignSteps.map((step, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0 relative">
                      <div className="absolute w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        {step.icon}
                      </div>
                    </div>
                    <div className="ml-16">
                      <h4 className="text-xl font-semibold mb-2">{step.title}</h4>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Sign to Speech */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">Sign to Speech</h3>
              <p className="text-muted-foreground">Converting sign language to spoken language</p>
            </div>
            <div className="relative">
              {/* Connection line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-pink-400 to-purple-400 -translate-x-1/2 z-0" />

              {/* Steps */}
              <div className="relative z-10 space-y-12">
                {signToSpeechSteps.map((step, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0 relative">
                      <div className="absolute w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                        {step.icon}
                      </div>
                    </div>
                    <div className="ml-16">
                      <h4 className="text-xl font-semibold mb-2">{step.title}</h4>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
