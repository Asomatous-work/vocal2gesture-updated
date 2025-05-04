"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Quote } from "lucide-react"

export function Testimonials() {
  const testimonials = [
    {
      quote:
        "Vocal2Gestures has transformed how I communicate with my deaf colleagues. The speech-to-sign feature is incredibly accurate.",
      name: "Priya Sharma",
      role: "Teacher",
      avatar: "/placeholder.svg?height=40&width=40&query=woman portrait",
    },
    {
      quote:
        "As someone who is deaf, this tool has made it so much easier to communicate with people who don't know sign language.",
      name: "Rahul Patel",
      role: "Software Engineer",
      avatar: "/placeholder.svg?height=40&width=40&query=man portrait",
    },
    {
      quote:
        "The Tamil language support is excellent. It's rare to find accessibility tools that work so well with regional languages.",
      name: "Lakshmi Narayanan",
      role: "Community Organizer",
      avatar: "/placeholder.svg?height=40&width=40&query=woman portrait 2",
    },
    {
      quote:
        "I use this daily to communicate with my grandmother who is hard of hearing. It's been a game-changer for our family.",
      name: "Arjun Menon",
      role: "Student",
      avatar: "/placeholder.svg?height=40&width=40&query=young man portrait",
    },
  ]

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Users Say</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Hear from people whose lives have been impacted by Vocal2Gestures.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full border-none shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start mb-4">
                    <Quote className="h-8 w-8 text-purple-400 mr-2 flex-shrink-0" />
                    <p className="text-lg italic">{testimonial.quote}</p>
                  </div>
                  <div className="flex items-center mt-6">
                    <Avatar className="h-10 w-10 mr-4">
                      <AvatarImage src={testimonial.avatar || "/placeholder.svg"} alt={testimonial.name} />
                      <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
