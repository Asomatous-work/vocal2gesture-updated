"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Mic, Lightbulb, ImageIcon, Volume2, Camera, MessageSquare } from "lucide-react"

export function HowItWorks() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  const speechToSignSteps = [
    {
      icon: <Mic className="h-8 w-8 text-white" />,
      title: "Speak",
      description: "Speak into your device's microphone.",
    },
    {
      icon: <Lightbulb className="h-8 w-8 text-white" />,
      title: "Process",
      description: "Our NLP system recognizes and processes your speech.",
    },
    {
      icon: <ImageIcon className="h-8 w-8 text-white" />,
      title: "Translate",
      description: "Speech is translated into Sign Language visuals.",
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
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
    <section id="how-it-works" ref={ref} className="py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-background -z-10" />

      {/* Animated background shapes */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          animate={{
            rotate: [0, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{
            rotate: { duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
            scale: { duration: 8, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" },
          }}
          className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-purple-200/20 dark:bg-purple-900/10 blur-3xl"
        />
        <motion.div
          animate={{
            rotate: [360, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            rotate: { duration: 25, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
            scale: { duration: 10, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" },
          }}
          className="absolute -bottom-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-pink-200/20 dark:bg-pink-900/10 blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 inline-block mb-4">
            Process
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our dual translation system makes communication seamless in both directions.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Speech to Sign */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="relative"
          >
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2 gradient-text">Speech to Sign</h3>
              <p className="text-muted-foreground">Converting spoken language to sign language</p>
            </div>
            <div className="relative">
              {/* Connection line */}
              <div className="absolute left-[40px] top-[40px] bottom-0 w-0.5 bg-gradient-to-b from-purple-400 to-pink-400 z-0" />

              {/* Steps */}
              <div className="relative z-10 space-y-12">
                {speechToSignSteps.map((step, index) => (
                  <motion.div key={index} variants={itemVariants} className="flex items-start">
                    <motion.div whileHover={{ scale: 1.1 }} className="flex-shrink-0 relative">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                        {step.icon}
                      </div>
                    </motion.div>
                    <div className="ml-6 pt-2">
                      <h4 className="text-xl font-semibold mb-2">{step.title}</h4>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Sign to Speech */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="relative"
          >
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2 gradient-text">Sign Library</h3>
              <p className="text-muted-foreground">Comprehensive collection of sign language visuals</p>
            </div>
            <div className="relative">
              {/* Connection line */}
              <div className="absolute left-[40px] top-[40px] bottom-0 w-0.5 bg-gradient-to-b from-pink-400 to-purple-400 z-0" />

              {/* Steps */}
              <div className="relative z-10 space-y-12">
                {signToSpeechSteps.map((step, index) => (
                  <motion.div key={index} variants={itemVariants} className="flex items-start">
                    <motion.div whileHover={{ scale: 1.1 }} className="flex-shrink-0 relative">
                      <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                        {step.icon}
                      </div>
                    </motion.div>
                    <div className="ml-6 pt-2">
                      <h4 className="text-xl font-semibold mb-2">{step.title}</h4>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
