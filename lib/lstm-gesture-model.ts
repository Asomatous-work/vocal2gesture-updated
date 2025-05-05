import * as tf from "@tensorflow/tfjs"

export interface LSTMModelConfig {
  sequenceLength: number
  numFeatures: number
  numClasses: number
  hiddenUnits: number
  learningRate: number
}

export class LSTMGestureModel {
  private model: tf.LayersModel | null = null
  private config: LSTMModelConfig
  private isTraining = false
  private gestureClasses: string[] = []
  private normalizer: tf.LayersModel | null = null

  constructor(config: LSTMModelConfig) {
    this.config = {
      sequenceLength: 30, // Default sequence length
      numFeatures: 63, // 21 landmarks x 3 coordinates (x, y, z)
      numClasses: 0,
      hiddenUnits: 64,
      learningRate: 0.001,
      ...config,
    }
  }

  // Build the LSTM model architecture
  public buildModel(numClasses: number): tf.LayersModel {
    // Update the number of classes
    this.config.numClasses = numClasses

    // Create a sequential model
    const model = tf.sequential()

    // Add LSTM layers
    model.add(
      tf.layers.lstm({
        units: this.config.hiddenUnits,
        returnSequences: true,
        inputShape: [this.config.sequenceLength, this.config.numFeatures],
        activation: "relu",
      }),
    )

    model.add(tf.layers.dropout({ rate: 0.2 }))

    model.add(
      tf.layers.lstm({
        units: this.config.hiddenUnits,
        returnSequences: false,
        activation: "relu",
      }),
    )

    model.add(tf.layers.dropout({ rate: 0.2 }))

    // Add dense layers
    model.add(
      tf.layers.dense({
        units: this.config.hiddenUnits / 2,
        activation: "relu",
      }),
    )

    model.add(tf.layers.dropout({ rate: 0.2 }))

    // Output layer with softmax activation for classification
    model.add(
      tf.layers.dense({
        units: numClasses,
        activation: "softmax",
      }),
    )

    // Compile the model
    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"],
    })

    this.model = model
    return model
  }

  // Build a normalizer model to standardize input data
  public buildNormalizer(): tf.LayersModel {
    const normalizer = tf.sequential()
    normalizer.add(
      tf.layers.dense({
        units: this.config.numFeatures,
        inputShape: [this.config.numFeatures],
        activation: "linear",
      }),
    )

    normalizer.compile({
      optimizer: tf.train.adam(0.001),
      loss: "meanSquaredError",
    })

    this.normalizer = normalizer
    return normalizer
  }

  // Preprocess landmarks data for the LSTM model
  public preprocessLandmarks(landmarks: any[]): tf.Tensor {
    // Extract hand landmarks and flatten them
    const processedData: number[][] = []

    for (const frame of landmarks) {
      const frameData: number[] = []

      // Process right hand landmarks if available
      if (frame.rightHand && frame.rightHand.length > 0) {
        for (const point of frame.rightHand) {
          frameData.push(point.x, point.y, point.z || 0)
        }
      } else if (frame.leftHand && frame.leftHand.length > 0) {
        // Use left hand if right hand is not available
        for (const point of frame.leftHand) {
          frameData.push(point.x, point.y, point.z || 0)
        }
      } else {
        // If no hand landmarks, fill with zeros
        for (let i = 0; i < 21; i++) {
          frameData.push(0, 0, 0)
        }
      }

      processedData.push(frameData)
    }

    // Pad or truncate to the required sequence length
    while (processedData.length < this.config.sequenceLength) {
      processedData.push(Array(this.config.numFeatures).fill(0))
    }

    if (processedData.length > this.config.sequenceLength) {
      processedData.splice(this.config.sequenceLength)
    }

    // Convert to tensor
    return tf.tensor3d([processedData])
  }

  // Train the normalizer with sample data
  public async trainNormalizer(samples: any[]): Promise<void> {
    if (!this.normalizer) {
      this.buildNormalizer()
    }

    // Extract features from samples
    const flattenedSamples: number[][] = []

    for (const sample of samples) {
      for (const frame of sample) {
        const frameData: number[] = []

        if (frame.rightHand && frame.rightHand.length > 0) {
          for (const point of frame.rightHand) {
            frameData.push(point.x, point.y, point.z || 0)
          }
        } else if (frame.leftHand && frame.leftHand.length > 0) {
          for (const point of frame.leftHand) {
            frameData.push(point.x, point.y, point.z || 0)
          }
        } else {
          for (let i = 0; i < 21; i++) {
            frameData.push(0, 0, 0)
          }
        }

        if (frameData.length > 0) {
          flattenedSamples.push(frameData)
        }
      }
    }

    // If no valid samples, return early
    if (flattenedSamples.length === 0) {
      console.warn("No valid samples for normalizer training")
      return
    }

    // Create input and output tensors (output is the same as input for normalization)
    // Explicitly provide the shape for tensor2d
    const inputTensor = tf.tensor2d(flattenedSamples, [flattenedSamples.length, this.config.numFeatures])

    // Train the normalizer
    await this.normalizer!.fit(inputTensor, inputTensor, {
      epochs: 10,
      batchSize: 32,
      shuffle: true,
    })

    inputTensor.dispose()
  }

  // Normalize input data using the trained normalizer
  public normalize(input: tf.Tensor): tf.Tensor {
    if (!this.normalizer) {
      return input
    }

    return this.normalizer.predict(input) as tf.Tensor
  }

  // Train the LSTM model with the provided data
  public async train(
    trainingData: any[],
    labels: string[],
    callbacks: {
      onEpochEnd?: (epoch: number, logs: tf.Logs) => void
      onTrainEnd?: () => void
    } = {},
  ): Promise<tf.History> {
    if (this.isTraining) {
      throw new Error("Model is already training")
    }

    // Validate input data
    if (trainingData.length === 0 || labels.length === 0) {
      throw new Error("Empty training data or labels")
    }

    if (trainingData.length !== labels.length) {
      throw new Error("Number of training samples must match number of labels")
    }

    this.isTraining = true

    try {
      // Get unique classes
      this.gestureClasses = Array.from(new Set(labels))
      const numClasses = this.gestureClasses.length

      // Build model if not already built
      if (!this.model) {
        this.buildModel(numClasses)
      }

      // Prepare training data
      const xs: tf.Tensor[] = []
      const ys: number[] = []

      for (let i = 0; i < trainingData.length; i++) {
        try {
          const processedData = this.preprocessLandmarks(trainingData[i])
          xs.push(processedData)

          // Convert label to index
          const labelIndex = this.gestureClasses.indexOf(labels[i])
          ys.push(labelIndex)
        } catch (error) {
          console.error(`Error processing training sample ${i}:`, error)
          // Skip this sample
        }
      }

      // Check if we have any valid samples
      if (xs.length === 0) {
        throw new Error("No valid training samples after preprocessing")
      }

      // Concatenate all tensors
      const xsTensor = tf.concat(xs, 0)

      // Convert labels to one-hot encoding with explicit shape
      const ysTensor = tf.oneHot(tf.tensor1d(ys, "int32"), numClasses)

      // Train the model
      const history = await this.model!.fit(xsTensor, ysTensor, {
        epochs: 50,
        batchSize: 16,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: callbacks.onEpochEnd,
          onTrainEnd: callbacks.onTrainEnd,
        },
      })

      // Clean up tensors
      xsTensor.dispose()
      ysTensor.dispose()

      return history
    } finally {
      this.isTraining = false
    }
  }

  // Predict the gesture class for the given landmarks
  public predict(landmarks: any[]): { label: string; confidence: number } {
    if (!this.model || this.gestureClasses.length === 0) {
      throw new Error("Model not trained yet")
    }

    // Preprocess the landmarks
    const processedData = this.preprocessLandmarks(landmarks)

    // Make prediction
    const prediction = this.model.predict(processedData) as tf.Tensor

    // Get the index with the highest probability
    const predictionData = prediction.dataSync()
    let maxIndex = 0
    let maxProb = predictionData[0]

    for (let i = 1; i < predictionData.length; i++) {
      if (predictionData[i] > maxProb) {
        maxProb = predictionData[i]
        maxIndex = i
      }
    }

    // Clean up tensors
    processedData.dispose()
    prediction.dispose()

    return {
      label: this.gestureClasses[maxIndex],
      confidence: maxProb,
    }
  }

  // Save the model to localStorage
  public async saveToLocalStorage(modelId: string): Promise<void> {
    if (!this.model) {
      throw new Error("No model to save")
    }

    // Save model architecture and weights
    const modelJSON = this.model.toJSON()
    localStorage.setItem(`lstm_model_${modelId}_architecture`, JSON.stringify(modelJSON))

    // Save model weights
    const weights = await this.model.getWeights()
    const weightData: { [key: string]: any } = {}

    for (let i = 0; i < weights.length; i++) {
      const weightName = `weight_${i}`
      weightData[weightName] = Array.from(weights[i].dataSync())
    }

    localStorage.setItem(`lstm_model_${modelId}_weights`, JSON.stringify(weightData))

    // Save gesture classes
    localStorage.setItem(`lstm_model_${modelId}_classes`, JSON.stringify(this.gestureClasses))

    // Save model config
    localStorage.setItem(`lstm_model_${modelId}_config`, JSON.stringify(this.config))

    // If normalizer exists, save it too
    if (this.normalizer) {
      const normalizerJSON = this.normalizer.toJSON()
      localStorage.setItem(`lstm_model_${modelId}_normalizer`, JSON.stringify(normalizerJSON))
    }
  }

  // Load the model from localStorage
  public async loadFromLocalStorage(modelId: string): Promise<boolean> {
    try {
      // Load model architecture
      const modelJSON = localStorage.getItem(`lstm_model_${modelId}_architecture`)
      if (!modelJSON) {
        return false
      }

      // Load model weights
      const weightDataJSON = localStorage.getItem(`lstm_model_${modelId}_weights`)
      if (!weightDataJSON) {
        return false
      }

      // Load gesture classes
      const classesJSON = localStorage.getItem(`lstm_model_${modelId}_classes`)
      if (!classesJSON) {
        return false
      }

      // Load model config
      const configJSON = localStorage.getItem(`lstm_model_${modelId}_config`)
      if (configJSON) {
        this.config = JSON.parse(configJSON)
      }

      // Parse the data
      const modelArchitecture = JSON.parse(modelJSON)
      const weightData = JSON.parse(weightDataJSON)
      this.gestureClasses = JSON.parse(classesJSON)

      // Load the model
      this.model = await tf.models.modelFromJSON(modelArchitecture)

      // Set the weights
      const weights: tf.Tensor[] = []
      for (let i = 0; i < Object.keys(weightData).length; i++) {
        const weightName = `weight_${i}`
        const weightArray = weightData[weightName]
        const shape = this.model.getWeights()[i].shape
        const weight = tf.tensor(weightArray, shape)
        weights.push(weight)
      }

      this.model.setWeights(weights)

      // Load normalizer if it exists
      const normalizerJSON = localStorage.getItem(`lstm_model_${modelId}_normalizer`)
      if (normalizerJSON) {
        this.normalizer = await tf.models.modelFromJSON(JSON.parse(normalizerJSON))
      }

      return true
    } catch (error) {
      console.error("Error loading model from localStorage:", error)
      return false
    }
  }

  // Export the model to a JSON format suitable for GitHub storage
  public async exportForGitHub(): Promise<{
    model: any
    weights: any
    classes: string[]
    config: LSTMModelConfig
    normalizer?: any
  }> {
    if (!this.model) {
      throw new Error("No model to export")
    }

    // Export model architecture
    const modelJSON = this.model.toJSON()

    // Export model weights
    const weights = await this.model.getWeights()
    const weightData: { [key: string]: any } = {}

    for (let i = 0; i < weights.length; i++) {
      const weightName = `weight_${i}`
      weightData[weightName] = Array.from(weights[i].dataSync())
    }

    // Export normalizer if it exists
    let normalizerJSON = null
    if (this.normalizer) {
      normalizerJSON = this.normalizer.toJSON()
    }

    return {
      model: modelJSON,
      weights: weightData,
      classes: this.gestureClasses,
      config: this.config,
      normalizer: normalizerJSON,
    }
  }

  // Import the model from a GitHub JSON format
  public async importFromGitHub(data: {
    model: any
    weights: any
    classes: string[]
    config: LSTMModelConfig
    normalizer?: any
  }): Promise<boolean> {
    try {
      // Import model config
      this.config = data.config

      // Import gesture classes
      this.gestureClasses = data.classes

      // Import model
      this.model = await tf.models.modelFromJSON(data.model)

      // Import weights
      const weights: tf.Tensor[] = []
      for (let i = 0; i < Object.keys(data.weights).length; i++) {
        const weightName = `weight_${i}`
        const weightArray = data.weights[weightName]
        const shape = this.model.getWeights()[i].shape
        const weight = tf.tensor(weightArray, shape)
        weights.push(weight)
      }

      this.model.setWeights(weights)

      // Import normalizer if it exists
      if (data.normalizer) {
        this.normalizer = await tf.models.modelFromJSON(data.normalizer)
      }

      return true
    } catch (error) {
      console.error("Error importing model from GitHub:", error)
      return false
    }
  }

  // Dispose of tensors to free memory
  public dispose(): void {
    if (this.model) {
      this.model.dispose()
    }

    if (this.normalizer) {
      this.normalizer.dispose()
    }
  }
}
