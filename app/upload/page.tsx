import { SignImageUploader } from "@/components/sign-image-uploader"
import { BackButton } from "@/components/back-button"

export default function UploadPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <BackButton />
      </div>
      <SignImageUploader />
    </div>
  )
}
