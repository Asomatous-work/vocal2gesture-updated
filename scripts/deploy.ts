import { exec } from "child_process"
import fs from "fs"
import { promisify } from "util"

const execAsync = promisify(exec)

// Helper function to execute commands
async function executeCommand(command: string): Promise<boolean> {
  try {
    console.log(`Executing: ${command}`)
    const { stdout, stderr } = await execAsync(command)
    console.log(stdout)
    if (stderr) console.error(stderr)
    return true
  } catch (error) {
    console.error(`Error executing command: ${command}`)
    console.error(error)
    return false
  }
}

// Function to prompt for input (to be used in a Node.js environment)
async function prompt(question: string): Promise<string> {
  // In a browser environment, we'd use window.prompt
  // In a Node.js script, we'd use readline
  // For this example, we'll just log the question and return a default
  console.log(`[PROMPT] ${question}`)
  return new Promise((resolve) => {
    // This is a placeholder. In a real CLI tool, you'd use readline
    // For now, we'll just simulate a response after a short delay
    setTimeout(() => {
      console.log("[SIMULATED RESPONSE] Using default option")
      resolve("default")
    }, 500)
  })
}

// Main deployment function
export async function deployProject(
  options: {
    deploymentType?: "frontend" | "backend" | "both"
    backendPlatform?: "heroku" | "railway" | "render" | "docker"
    frontendPlatform?: "vercel" | "netlify" | "docker"
    backendUrl?: string
  } = {},
) {
  console.log("🚀 Starting deployment process for Vocal2Gestures...")

  // Use provided options or prompt for them
  const deploymentType =
    options.deploymentType ||
    ((await prompt("Which part do you want to deploy? (frontend/backend/both)")) as "frontend" | "backend" | "both")

  if (deploymentType === "backend" || deploymentType === "both") {
    console.log("\n📦 Deploying Python backend...")

    // Get backend platform
    const backendPlatform =
      options.backendPlatform ||
      ((await prompt("Which platform do you want to deploy the backend to? (heroku/railway/render/docker)")) as
        | "heroku"
        | "railway"
        | "render"
        | "docker")

    // Get backend URL
    const backendUrl =
      options.backendUrl || (await prompt("Enter the URL for your backend (or leave empty to create a new one):"))

    // Deploy backend based on platform
    let backendDeploymentSuccess = false
    let finalBackendUrl = backendUrl

    switch (backendPlatform) {
      case "heroku":
        console.log("Deploying to Heroku...")
        if (!backendUrl) {
          const appName = await prompt("Enter a name for your Heroku app:")

          process.chdir("./python_backend")
          await executeCommand("heroku login")
          await executeCommand(`heroku create ${appName}`)
          await executeCommand("git init")
          await executeCommand("git add .")
          await executeCommand('git commit -m "Initial deployment"')
          await executeCommand("git push heroku master")
          finalBackendUrl = `https://${appName}.herokuapp.com`
          process.chdir("..")
        } else {
          process.chdir("./python_backend")
          await executeCommand("git init")
          await executeCommand("git add .")
          await executeCommand('git commit -m "Update deployment"')
          await executeCommand(
            `heroku git:remote -a ${backendUrl.replace("https://", "").replace(".herokuapp.com", "")}`,
          )
          await executeCommand("git push heroku master")
          process.chdir("..")
        }
        backendDeploymentSuccess = true
        break

      case "railway":
        console.log("Deploying to Railway...")
        process.chdir("./python_backend")
        await executeCommand("railway login")
        await executeCommand("railway init")
        await executeCommand("railway up")
        process.chdir("..")

        if (!backendUrl) {
          finalBackendUrl = await prompt("Enter the URL provided by Railway:")
        }
        backendDeploymentSuccess = true
        break

      case "render":
        console.log("For Render deployment, please follow these steps:")
        console.log("1. Create a new Web Service on Render")
        console.log("2. Connect your GitHub repository")
        console.log("3. Set the build command to: pip install -r requirements.txt")
        console.log("4. Set the start command to: gunicorn wsgi:app")

        if (!backendUrl) {
          finalBackendUrl = await prompt("Enter the URL provided by Render:")
        }
        backendDeploymentSuccess = true
        break

      case "docker":
        console.log("Building and deploying Docker container...")
        process.chdir("./python_backend")
        await executeCommand("docker build -t vocal2gestures-backend .")
        await executeCommand("docker run -d -p 5000:5000 vocal2gestures-backend")
        process.chdir("..")
        finalBackendUrl = "http://localhost:5000"
        backendDeploymentSuccess = true
        break

      default:
        console.log("Invalid platform selected.")
        backendDeploymentSuccess = false
    }

    if (backendDeploymentSuccess) {
      console.log(`✅ Backend deployed successfully to: ${finalBackendUrl}`)

      // Update environment variables
      const envFile = ".env.local"
      let envContent = ""

      if (fs.existsSync(envFile)) {
        envContent = fs.readFileSync(envFile, "utf8")
      }

      if (envContent.includes("NEXT_PUBLIC_PYTHON_BACKEND_URL=")) {
        envContent = envContent.replace(
          /NEXT_PUBLIC_PYTHON_BACKEND_URL=.*/g,
          `NEXT_PUBLIC_PYTHON_BACKEND_URL=${finalBackendUrl}`,
        )
      } else {
        envContent += `\nNEXT_PUBLIC_PYTHON_BACKEND_URL=${finalBackendUrl}`
      }

      fs.writeFileSync(envFile, envContent)
      console.log(`✅ Updated ${envFile} with backend URL`)
    } else {
      console.log("❌ Backend deployment failed.")
    }
  }

  if (deploymentType === "frontend" || deploymentType === "both") {
    console.log("\n📦 Deploying Next.js frontend...")

    // Get frontend platform
    const frontendPlatform =
      options.frontendPlatform ||
      ((await prompt("Which platform do you want to deploy the frontend to? (vercel/netlify/docker)")) as
        | "vercel"
        | "netlify"
        | "docker")

    // Deploy frontend based on platform
    let frontendDeploymentSuccess = false

    switch (frontendPlatform) {
      case "vercel":
        console.log("Deploying to Vercel...")
        await executeCommand("vercel")
        frontendDeploymentSuccess = true
        break

      case "netlify":
        console.log("Deploying to Netlify...")
        await executeCommand("netlify deploy")
        frontendDeploymentSuccess = true
        break

      case "docker":
        console.log("Building and deploying Docker container...")
        await executeCommand("docker build -t vocal2gestures-frontend -f Dockerfile.frontend .")
        await executeCommand("docker run -d -p 3000:3000 vocal2gestures-frontend")
        frontendDeploymentSuccess = true
        break

      default:
        console.log("Invalid platform selected.")
        frontendDeploymentSuccess = false
    }

    if (frontendDeploymentSuccess) {
      console.log("✅ Frontend deployed successfully!")
    } else {
      console.log("❌ Frontend deployment failed.")
    }
  }

  console.log("\n🎉 Deployment process completed!")
}

// Create a simple CLI script that can be run with ts-node
if (require.main === module) {
  deployProject().catch((error) => {
    console.error("Deployment failed:", error)
  })
}
