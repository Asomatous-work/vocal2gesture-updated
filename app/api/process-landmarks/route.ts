import { NextResponse } from "next/server"
import { processLandmarksWithTensorflow } from "@/lib/tensorflow-processing"

export async function POST(request: Request) {
  try {
    const { landmarks } = await request.json()

    if (!landmarks) {
      return NextResponse.json({ error: "No landmarks provided" }, { status: 400 })
    }

    // Process the landmarks using TensorFlow.js
    const result = await processLandmarksWithTensorflow(landmarks)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error processing landmarks:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
