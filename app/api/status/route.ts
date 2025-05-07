import { NextResponse } from "next/server"

export async function GET() {
  try {
    // This is a simple status endpoint to check if the API is available
    return NextResponse.json({
      status: "available",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in status endpoint:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
