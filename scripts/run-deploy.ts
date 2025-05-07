import { deployProject } from "./deploy"

// Parse command line arguments
const args = process.argv.slice(2)
const options: any = {}

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--")) {
    const key = args[i].slice(2)
    const value = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "true"
    options[key] = value
    if (value !== "true") i++
  }
}

// Run the deployment with provided options
deployProject({
  deploymentType: options.type as any,
  backendPlatform: options.backendPlatform as any,
  frontendPlatform: options.frontendPlatform as any,
  backendUrl: options.backendUrl,
}).catch((error) => {
  console.error("Deployment failed:", error)
  process.exit(1)
})
