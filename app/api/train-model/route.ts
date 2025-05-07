import { NextResponse } from "next/server"
import { trainModelWithTensorflow } from "@/lib/tensorflow-processing"

export async function POST(request: Request) {
  try {
    const trainingData = await request.json()

    if (!trainingData || !trainingData.gestures) {
      return NextResponse.json({ error: "Invalid training data" }, { status: 400 })
    }

    // Train the model using TensorFlow.js
    const result = await trainModelWithTensorflow(trainingData)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error training model:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
