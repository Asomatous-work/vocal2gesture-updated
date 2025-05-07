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
  private normalizer: Normalizer | null = null
  private config: LSTMModelConfig
  private classes: string[] = []

  constructor(config: LSTMModelConfig) {
    this.config = config
  }

  public async initialize(): Promise<boolean> {
    try {
      this.model = this.buildModel()
      return true
    } catch (error) {
      console.error("Error initializing LSTM Gesture Model:", error)
      return false
    }
  }

  private buildModel(): tf.LayersModel {
    const model = tf.sequential()

    model.add(
      tf.layers.lstm({
        units: this.config.hiddenUnits,
        returnSequences: false,
        inputShape: [this.config.sequenceLength, this.config.numFeatures],
        activation: "relu",
      }),
    )

    model.add(
      tf.layers.dense({
        units: this.config.numClasses,
        activation: "softmax",
      }),
    )

    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"],
    })

    return model
  }

  public async train(trainingData: any[][], labels: string[], callbacks?: any): Promise<tf.History> {
    if (!this.model || !this.normalizer) {
      throw new Error("Model not initialized")
    }

    // Convert labels to one-hot encoded tensors
    const oneHotLabels = this.oneHotEncode(labels)

    // Prepare training data
    const xs = tf.tensor3d(trainingData.map((sequence) => this.normalizer!.normalize(sequence)))
    const ys = tf.tensor2d(oneHotLabels)

    try {
      const history = await this.model.fit(xs, ys, {
        epochs: 50,
        batchSize: 16,
        validationSplit: 0.1,
        callbacks: callbacks,
      })

      return history
    } catch (error) {
      console.error("Error training model:", error)
      throw error
    } finally {
      xs.dispose()
      ys.dispose()
    }
  }

  public predict(input: any): { label: string; confidence: number } {
    if (!this.model || !this.normalizer) {
      throw new Error("Model not initialized")
    }

    const normalizedInput = this.normalizer.normalize(input)
    const inputTensor = tf.tensor3d([normalizedInput])

    const prediction = this.model.predict(inputTensor) as tf.Tensor
    const values = prediction.dataSync()
    const labelIndex = Array.from(values).indexOf(Math.max(...values))
    const confidence = values[labelIndex]

    inputTensor.dispose()
    prediction.dispose()

    return { label: this.classes[labelIndex], confidence }
  }

  public async saveToLocalStorage(modelName: string): Promise<void> {
    if (!this.model) {
      throw new Error("Model not initialized")
    }

    await this.model.save(`localstorage://${modelName}`)
  }

  public async loadFromLocalStorage(modelName: string): Promise<boolean> {
    try {
      this.model = await tf.loadLayersModel(`localstorage://${modelName}`)

      // Extract class names from model metadata
      const modelInfo = localStorage.getItem(`tensorflowjs_models/localstorage://${modelName}/model_metadata`)
      if (modelInfo) {
        const metadata = JSON.parse(modelInfo)
        this.classes = metadata.user_defined_metadata.classes
        this.config.numClasses = this.classes.length
        this.model.summary()
      }

      return true
    } catch (error) {
      console.error("Error loading model:", error)
      return false
    }
  }

  public async exportForGitHub(): Promise<any> {
    if (!this.model) {
      throw new Error("Model not initialized")
    }

    const modelJson = this.model.toJSON()
    return {
      modelJson: modelJson,
      classes: this.classes,
    }
  }

  public async trainNormalizer(trainingData: any[][]): Promise<void> {
    this.normalizer = new Normalizer()
    this.normalizer.train(trainingData)
    this.classes = [...new Set(trainingData.map((_, index) => String(index)))]
    this.config.numClasses = this.classes.length
    this.model = this.buildModel()
  }

  private oneHotEncode(labels: string[]): number[][] {
    const numClasses = this.classes.length
    return labels.map((label) => {
      const index = this.classes.indexOf(label)
      const oneHot = new Array(numClasses).fill(0)
      oneHot[index] = 1
      return oneHot
    })
  }

  public dispose(): void {
    if (this.model) {
      this.model.dispose()
      this.model = null
    }
  }
}

class Normalizer {
  private means: number[] = []
  private stds: number[] = []

  public train(data: any[][]): void {
    const numFeatures = data[0][0].length
    this.means = new Array(numFeatures).fill(0)
    this.stds = new Array(numFeatures).fill(0)

    // Calculate means
    for (let i = 0; i < numFeatures; i++) {
      this.means[i] =
        data.reduce((sum, sequence) => sum + sequence.reduce((s, point) => s + point[i], 0), 0) /
        (data.length * data[0].length)
    }

    // Calculate standard deviations
    for (let i = 0; i < numFeatures; i++) {
      this.stds[i] = Math.sqrt(
        data.reduce(
          (sum, sequence) => sum + sequence.reduce((s, point) => s + Math.pow(point[i] - this.means[i], 2), 0),
          0,
        ) /
          (data.length * data[0].length),
      )
    }
  }

  public normalize(sequence: any[]): any[] {
    return sequence.map((point) => {
      return point.map((value: number, i: number) => {
        if (this.stds[i] === 0) {
          return 0 // To avoid NaN, return 0 if std is 0
        }
        return (value - this.means[i]) / this.stds[i]
      })
    })
  }
}
