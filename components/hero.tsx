"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Mic, MessageSquare } from "lucide-react"
import Link from "next/link"

export function Hero() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  })

  const y = useTransform(scrollYProgress, [0, 1], [0, 200])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 },
    },
  }

  const floatingShapes = [
    { size: 60, x: "10%", y: "20%", delay: 0, duration: 8 },
    { size: 80, x: "70%", y: "15%", delay: 1, duration: 10 },
    { size: 40, x: "25%", y: "60%", delay: 2, duration: 7 },
    { size: 100, x: "80%", y: "60%", delay: 3, duration: 9 },
    { size: 50, x: "40%", y: "80%", delay: 4, duration: 11 },
  ]

  return (
    <section ref={ref} className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 animated-bg -z-10 opacity-10" />

      {/* Floating shapes */}
      {floatingShapes.map((shape, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-3xl"
          style={{ width: shape.size, height: shape.size }}
          initial={{ x: shape.x, y: shape.y }}
          animate={{
            y: [`${Number.parseInt(shape.y as string) - 5}%`, `${Number.parseInt(shape.y as string) + 5}%`],
          }}
          transition={{
            y: {
              duration: shape.duration,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
              ease: "easeInOut",
              delay: shape.delay,
            },
          }}
        />
      ))}

      <motion.div style={{ y, opacity }} className="container mx-auto px-4 z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div variants={itemVariants} className="mb-4 inline-block">
            <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 flex items-center justify-center gap-2 w-fit mx-auto">
              <Sparkles className="h-4 w-4" />
              <span>AI-Powered Sign Language Translation</span>
            </span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Breaking Communication
            <span className="block mt-2 gradient-text">Barriers</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-muted-foreground mb-8 md:mb-10 max-w-2xl mx-auto"
          >
            Bridging the gap between speech and sign language with AI-powered translation. Communicate effortlessly
            across language barriers.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full px-8"
            >
              <Link href="/speech-to-sign">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8 border-2">
              Learn More
            </Button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-16 flex flex-col md:flex-row items-center justify-center gap-8"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3 p-4 rounded-xl glass-card hover-lift"
            >
              <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-3">
                <Mic className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="font-medium">Speech to Sign Translation</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3 p-4 rounded-xl glass-card hover-lift"
            >
              <div className="rounded-full bg-pink-100 dark:bg-pink-900/30 p-3">
                <MessageSquare className="h-6 w-6 text-pink-600 dark:text-pink-400" />
              </div>
              <p className="font-medium">Sign Language Library</p>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
          className="w-6 h-10 rounded-full border-2 border-gray-400 dark:border-gray-600 flex justify-center p-1"
        >
          <motion.div
            animate={{ height: ["20%", "30%", "20%"] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
            className="w-1 bg-gray-400 dark:bg-gray-600 rounded-full"
          />
        </motion.div>
      </motion.div>
    </section>
  )
}
