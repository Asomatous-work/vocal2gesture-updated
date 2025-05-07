import { NextResponse } from "next/server"
import { processFrameWithTensorflow } from "@/lib/tensorflow-processing"

export async function POST(request: Request) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    // Process the image using TensorFlow.js
    const result = await processFrameWithTensorflow(image)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error processing frame:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
