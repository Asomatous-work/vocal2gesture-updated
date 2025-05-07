import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check if Blob token is configured - only use server-side variable
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN

    if (!blobToken) {
      return NextResponse.json({
        success: false,
        error: "Blob token not configured",
      })
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Blob storage is configured",
    })
  } catch (error) {
    console.error("Error checking blob status:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check Blob status: " + (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 },
    )
  }
}
