"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Progress,
  Alert,
  AlertDescription,
  AlertTitle,
  ScrollArea,
  useToast,
} from "@/components/ui"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { pythonBackendService } from "@/lib/python-backend-service"
import {
  Brain,
  Server,
  Save,
  BarChart,
  Settings,
  Layers,
  Cpu,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react"

interface AdvancedModelTrainerProps {
  gestures?: any[]
  onModelTrained?: (modelId: string) => void
}

export function AdvancedModelTrainer({ gestures = [], onModelTrained }: AdvancedModelTrainerProps) {
  const [isTraining, setIsTraining] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [pythonBackendAvailable, setPythonBackendAvailable] = useState(false)
  const [trainingOptions, setTrainingOptions] = useState<any>(null)
  const [selectedModelType, setSelectedModelType] = useState("cnn_lstm")
  const [epochs, setEpochs] = useState(100)
  const [learningRate, setLearningRate] = useState(0.001)
  const [batchSize, setBatchSize] = useState(32)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [currentEpoch, setCurrentEpoch] = useState(0)
  const [modelAccuracy, setModelAccuracy] = useState(0)
  const [modelLoss, setModelLoss] = useState(0)
  const [trainedModelId, setTrainedModelId] = useState<string | null>(null)
  const [evaluationResults, setEvaluationResults] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("training")
  const [modelName, setModelName] = useState(`Model_${new Date().toLocaleDateString()}`)
  const [pythonModels, setPythonModels] = useState<any[]>([])
  const [selectedPythonModel, setSelectedPythonModel] = useState("")

  const { toast } = useToast()

  useEffect(() => {
    const initialize = async () => {
      try {
        const available = await pythonBackendService.checkAvailability()
        setPythonBackendAvailable(available)

        if (available) {
          addLog("success", "Connected to Python backend successfully")
          const options = await pythonBackendService.getTrainingOptions()
          setTrainingOptions(options)
          if (options) {
            setEpochs(options.defaultEpochs || 100)
            setLearningRate(options.defaultLearningRate || 0.001)
            setBatchSize(options.defaultBatchSize || 32)
            setSelectedModelType(options.modelTypes?.[0] || "cnn_lstm")
          }
          const modelsResponse = await pythonBackendService.listModels()
          if (modelsResponse.models) {
            setPythonModels(modelsResponse.models)
            addLog("info", `Found ${modelsResponse.models.length} existing models`)
          }
        } else {
          addLog("error", "Python backend is not available. Please start the Python server.")
        }
      } catch (error: any) {
        console.error("Error initializing:", error)
        addLog("error", `Initialization error: ${error.message}`)
      }
    }
    initialize()
  }, [])

  const addLog = (type: "info" | "success" | "error" | "warning" | "epoch", message: string) => {
    setLogs((prevLogs) => [...prevLogs, { id: Date.now() + Math.random(), type, message, timestamp: new Date() }])
  }

  const formatTimestamp = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })

  const getLogTypeIcon = (type: string) => {
    const icons: any = {
      info: <Info className="h-4 w-4 text-blue-500" />,
      success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      error: <AlertCircle className="h-4 w-4 text-red-500" />,
      warning: <AlertCircle className="h-4 w-4 text-yellow-500" />,
      epoch: <RefreshCw className="h-4 w-4 text-purple-500" />,
    }
    return icons[type] || <Info className="h-4 w-4" />
  }

  const trainModel = async () => {
    if (!pythonBackendAvailable) {
      toast({
        title: "Python Backend Not Available",
        description: "Please start the Python backend server first.",
        variant: "destructive",
      })
      return
    }
    if (gestures.length === 0) {
      toast({
        title: "No Gestures Available",
        description: "Please collect gesture samples first.",
        variant: "destructive",
      })
      return
    }

    setIsTraining(true)
    setTrainingProgress(0)
    setCurrentEpoch(0)
    setModelAccuracy(0)
    setModelLoss(0)
    setTrainedModelId(null)

    addLog("info", `Starting advanced model training with ${gestures.length} gestures`)
    addLog(
      "info",
      `Model type: ${selectedModelType}, Epochs: ${epochs}, Learning rate: ${learningRate}, Batch size: ${batchSize}`,
    )

    try {
      const progressInterval = setInterval(() => {
        setCurrentEpoch((prev) => {
          if (prev < epochs) {
            const newEpoch = prev + 1
            setTrainingProgress((newEpoch / epochs) * 100)
            return newEpoch
          }
          return prev
        })
      }, 1000)

      const result = await pythonBackendService.trainModel(gestures, epochs, learningRate, selectedModelType, batchSize)
      clearInterval(progressInterval)

      if (result.success) {
        setTrainedModelId(result.modelId)
        setModelAccuracy(result.accuracy * 100)
        setModelLoss(result.loss)
        setTrainingProgress(100)
        setCurrentEpoch(epochs)

        addLog("success", `Model trained successfully with ${result.accuracy * 100}% accuracy`)
        toast({ title: "Training Complete", description: `Model trained with ${result.accuracy * 100}% accuracy` })

        const modelsResponse = await pythonBackendService.listModels()
        if (modelsResponse.models) setPythonModels(modelsResponse.models)

        if (onModelTrained) onModelTrained(result.modelId)
      }
    } catch (error: any) {
      console.error("Training error:", error)
      addLog("error", `Training error: ${error.message}`)
      toast({ title: "Training Error", description: error.message, variant: "destructive" })
    } finally {
      setIsTraining(false)
    }
  }

  const saveModel = async () => {
    if (!trainedModelId) {
      toast({ title: "No Model Available", description: "Please train a model first.", variant: "destructive" })
      return
    }
    setIsSaving(true)
    try {
      const result = await pythonBackendService.saveModel(modelName)
      if (result.success) {
        addLog("success", `Model saved successfully with ID: ${result.modelId}`)
        toast({ title: "Model Saved", description: `Model saved as \"${modelName}\"` })
        const modelsResponse = await pythonBackendService.listModels()
        if (modelsResponse.models) setPythonModels(modelsResponse.models)
      }
    } catch (error: any) {
      console.error("Save error:", error)
      addLog("error", `Save error: ${error.message}`)
      toast({ title: "Save Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const evaluateModel = async () => {
    if (!trainedModelId && !selectedPythonModel) {
      toast({
        title: "No Model Selected",
        description: "Please train a model or select an existing one.",
        variant: "destructive",
      })
      return
    }
    setIsEvaluating(true)
    try {
      if (selectedPythonModel && selectedPythonModel !== trainedModelId) {
        addLog("info", `Loading model ${selectedPythonModel} for evaluation...`)
        await pythonBackendService.loadModel(selectedPythonModel)
      }
      addLog("info", "Evaluating model using cross-validation...")
      const result = await pythonBackendService.evaluateModel()
      if (result.success) {
        setEvaluationResults(result.evaluation)
        if (result.evaluation.cross_val_accuracy) {
          addLog("success", `Cross-validation accuracy: ${result.evaluation.cross_val_accuracy * 100}%`)
        } else if (result.evaluation.accuracy) {
          addLog("success", `Test accuracy: ${result.evaluation.accuracy * 100}%`)
        }
        toast({ title: "Evaluation Complete", description: "Model evaluation completed successfully." })
        setActiveTab("evaluation")
      }
    } catch (error: any) {
      console.error("Evaluation error:", error)
      addLog("error", `Evaluation error: ${error.message}`)
      toast({ title: "Evaluation Error", description: error.message, variant: "destructive" })
    } finally {
      setIsEvaluating(false)
    }
  }

  const loadModel = async (modelId: string) => {
    try {
      addLog("info", `Loading model ${modelId}...`)
      const result = await pythonBackendService.loadModel(modelId)
      if (result.success) {
        setSelectedPythonModel(modelId)
        setTrainedModelId(modelId)
        addLog("success", `Model ${modelId} loaded successfully`)
        toast({ title: "Model Loaded", description: `Model ${modelId} loaded successfully` })
      }
    } catch (error: any) {
      console.error("Load error:", error)
      addLog("error", `Load error: ${error.message}`)
      toast({ title: "Load Error", description: error.message, variant: "destructive" })
    }
  }

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-purple-600" />
          Advanced Model Trainer
        </CardTitle>
        <CardDescription>
          Train high-accuracy sign language recognition models with Python
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {!pythonBackendAvailable ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Python Backend Not Available</AlertTitle>
            <AlertDescription>
              Please start the Python backend server to use advanced model training.
              <div className="mt-2">
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Navigate to the <code className="bg-muted px-1 py-0.5 rounded">python_backend</code> directory</li>
                  <li>Run <code className="bg-muted px-1 py-0.5 rounded">python app.py</code></li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Training Configuration */}
            <div className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="training" className="flex items-center gap-1">
                    <Layers className="h-4 w-4" />
                    Training
                  </TabsTrigger>
                  <TabsTrigger value="models" className="flex items-center gap-1">
                    <Brain className="h-4 w-4" />
                    Models
                  </TabsTrigger>
                  <TabsTrigger value="evaluation" className="flex items-center gap-1">
                    <BarChart className="h-4 w-4" />
                    Evaluation
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex items-center gap-1">
                    <Settings className="h-4 w-4" />
                    Settings
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="training" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Model Architecture</Label>
                    <Select value={selectedModelType} onValueChange={setSelectedModelType} disabled={isTraining}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select model type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cnn_lstm">CNN-LSTM (Recommended)</SelectItem>
                        <SelectItem value="lstm">Bidirectional LSTM</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {selectedModelType === "cnn_lstm" 
                        ? "CNN-LSTM combines convolutional layers for spatial features with LSTM for temporal dynamics."
                        : "Bidirectional LSTM processes sequences in both directions for better context understanding."}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Training Epochs</Label>
                      <span className="text-sm font-medium">{epochs}</span>
                    </div>
                    <Slider
                      value={[epochs]}
                      min={20}
                      max={200}
                      step={10}
                      onValueChange={(value) => setEpochs(value[0])}
                      disabled={isTraining}
                    />
                    <p className="text-xs text-muted-foreground">
                      More epochs can improve accuracy but take longer to train. Early stopping will prevent overfitting.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Learning Rate</Label>
                      <span className="text-sm font-medium">{learningRate}</span>
                    </div>
                    <Slider
                      value={[learningRate * 10000]}
                      min={1}
                      max={100}
                      step={1}
                      onValueChange={(value) => setLearningRate(value[0] / 10000)}
                      disabled={isTraining}
                    />
                    <p className="text-xs text-muted-foreground">
                      Controls how quickly the model adapts to the problem. Lower values are more stable but train slower.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Batch Size</Label>
                      <span className="text-sm font-medium">{batchSize}</span>
                    </div>
                    <Slider
                      value={[batchSize]}
                      min={8}
                      max={64}
                      step={8}
                      onValueChange={(value) => setBatchSize(value[0])}
                      disabled={isTraining}
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of samples processed before model update. Larger batches use more memory but train faster.
                    </p>
                  </div>
                  
                  {(isTraining || trainingProgress > 0) && (
                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between">
                        <span>Training Progress</span>
                        <span>
                          {currentEpoch}/{epochs} epochs
                        </span>
                      </div>
                      <Progress value={trainingProgress} className="h-2" />
                      
                      {modelAccuracy > 0 && (
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div className="bg-background rounded-md p-2">
                            <div className="text-xs text-muted-foreground">Loss</div>
                            <div className="font-mono font-medium">{modelLoss.toFixed(4)}</div>
                          </div>
                          <div className="bg-background rounded-md p-2">
                            <div className="text-xs text-muted-foreground">Accuracy</div>
                            <div className="font-mono font-medium">{modelAccuracy.toFixed(2)}%</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-4 mt-4">
                    <Button
                      onClick={trainModel}
                      disabled={isTraining || !pythonBackendAvailable || gestures.length === 0}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 flex-1"
                    >
                      {isTraining ? (
                        <>
                          <LoadingSpinner className="mr-2" size="sm" />
                          Training...
                        </>
                      ) : (
                        <>
                          <Brain className="mr-2 h-4 w-4" />
                          Train Model
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={evaluateModel}
                      disabled={isEvaluating || (!trainedModelId && !selectedPythonModel) || !pythonBackendAvailable}
                      variant="outline"
                      className="flex-1"
                    >
                      {isEvaluating ? (
                        <>
                          <LoadingSpinner className="mr-2" size="sm" />
                          Evaluating...
                        </>
                      ) : (
                        <>
                          <BarChart className="mr-2 h-4 w-4" />
                          Evaluate
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="models" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Model Name</Label>
                    <Input
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="Enter model name"
                      disabled={isSaving}
                    />
                  </div>
                  
                  <Button
                    onClick={saveModel}
                    disabled={isSaving || !trainedModelId || !pythonBackendAvailable}
                    className="w-full"
                  >
                    {isSaving ? (
                      <>
                        <LoadingSpinner className="mr-2" size="sm" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Current Model
                      </>
                    )}
                  </Button>
                  
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Available Models</h3>
                    {pythonModels.length > 0 ? (
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                          {pythonModels.map((model) => (
                            <div
                              key={model.id}
                              className={`p-2 rounded-md cursor-pointer ${
                                selectedPythonModel === model.id
                                  ? "bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500"
                                  : "bg-background hover:bg-muted"
                              }`}
                              onClick={() => loadModel(model.id)}
                            >
                              <div className="flex justify-between">
                                <span className="font-medium">{model.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(model.timestamp * 1000).toLocaleString()}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {model.classes.length} gestures: {model.classes.join(", ")}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center text-muted-foreground p-4 bg-muted/30 rounded-md">
                        No models available
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="evaluation" className="space-y-4">
                  {evaluationResults ? (
                    <div className="space-y-4">
                      <div className="bg-background rounded-lg p-4">
                        <h3 className="text-lg font-medium mb-2">Model Performance</h3>
                        
                        {evaluationResults.cross_val_accuracy ? (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Cross-Validation Accuracy</span>
                              <span className="font-medium">{(evaluationResults.cross_val_accuracy * 100).toFixed(2)}%</span>
                            </div>
                            <Progress 
                              value={evaluationResults.cross_val_accuracy * 100} 
                              className="h-2" 
                            />
                            
                            <div className="flex justify-between mt-2">
                              <span>Cross-Validation Loss</span>
                              <span className="font-medium">{evaluationResults.cross_val_loss.toFixed(4)}</span>
                            </div>
                            
                            <div className="text-xs text-muted-foreground mt-2">
                              Results from {evaluationResults.folds}-fold cross-validation
                            </div>
                          </div>
                        ) : evaluationResults.accuracy ? (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Test Accuracy</span>
                              <span className="font-medium">{(evaluationResults.accuracy * 100).toFixed(2)}%</span>
                            </div>
                            <Progress 
                              value={evaluationResults.accuracy * 100} 
                              className="h-2" 
                            />
                            
                            <div className="flex justify-between mt-2">
                              <span>Test Loss</span>
                              <span className="font-medium">{evaluationResults.loss.toFixed(4)}</span>
                            </div>
                            
                            <div className="text-xs text-muted-foreground mt-2">
                              Results from evaluation on test dataset
                            </div>
                          </div>\
                        )}
                      </div>
                      
                      {evaluationResults.classification_report && (
                        <div className="bg-background rounded-lg p-4">
                          <h3 className="text-lg font-medium mb-2">Per-Class Performance</h3>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead>
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gesture</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precision</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recall</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">F1-Score</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {Object.entries(evaluationResults.classification_report)
                                  .filter(([key]) => !['accuracy', 'macro avg', 'weighted avg'].includes(key))
                                  .map(([className, metrics]: [string, any]) => (
                                    <tr key={className}>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{className}</td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm">{(metrics.precision * 100).toFixed(1)}%</td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm">{(metrics.recall * 100).toFixed(1)}%</td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm">{(metrics['f1-score'] * 100).toFixed(1)}%</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      
                      {evaluationResults.confusion_matrix && (
                        <div className="bg-background rounded-lg p-4">
                          <h3 className="text-lg font-medium mb-2">Confusion Matrix</h3>
                          <div className="text-xs text-muted-foreground mb-2">
                            Shows predicted vs actual gesture classifications
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <tbody>
                                {evaluationResults.confusion_matrix.map((row: number[], rowIndex: number) => (
                                  <tr key={`row-${rowIndex}`}>
                                    {row.map((cell: number, cellIndex: number) => (
                                      <td 
                                        key={`cell-${rowIndex}-${cellIndex}`}
                                        className={`px-4 py-2 text-center ${
                                          rowIndex === cellIndex 
                                            ? 'bg-green-100 dark:bg-green-900/30' 
                                            : cell > 0 
                                              ? 'bg-red-100 dark:bg-red-900/30' 
                                              : ''
                                        }`}
                                      >
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <div className="text-muted-foreground mb-4">
                        No evaluation results available. Train and evaluate a model first.
                      </div>
                      <Button 
                        onClick={() => setActiveTab("training")}
                        variant="outline"
                      >
                        Go to Training
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="settings" className="space-y-4">
                  <div className="bg-background rounded-lg p-4">
                    <h3 className="text-lg font-medium mb-4">Advanced Settings</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Data Augmentation</Label>
                          <p className="text-sm text-muted-foreground">
                            Generate additional training samples with noise and time warping
                          </p>
                        </div>
                        <Switch checked={true} disabled />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Early Stopping</Label>
                          <p className="text-sm text-muted-foreground">
                            Stop training when validation loss stops improving
                          </p>
                        </div>
                        <Switch checked={true} disabled />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Learning Rate Reduction</Label>
                          <p className="text-sm text-muted-foreground">
                            Reduce learning rate when training plateaus
                          </p>
                        </div>
                        <Switch checked={true} disabled />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Model Checkpointing</Label>
                          <p className="text-sm text-muted-foreground">
                            Save the best model during training
                          </p>
                        </div>
                        <Switch checked={true} disabled />
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        These advanced settings are enabled by default in the Python backend for optimal performance.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-background rounded-lg p-4">
                    <div className="flex items-center">
                      <Server className="h-5 w-5 mr-2 text-green-500" />
                      <h3 className="text-lg font-medium">Python Backend Status</h3>
                    </div>
                    
                    <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/30 rounded-md">
                      <p className="text-sm text-green-800 dark:text-green-300">
                        Connected to Python backend at http://localhost:5000
                      </p>
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">System Information</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-muted/30 p-2 rounded-md">
                          <span className="text-muted-foreground">TensorFlow:</span> {trainingOptions?.tensorflowVersion || "2.x"}
                        </div>
                        <div className="bg-muted/30 p-2 rounded-md">
                          <span className="text-muted-foreground">MediaPipe:</span> {trainingOptions?.mediapipeVersion || "0.10.x"}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Logs */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Training Logs</h3>
              <div className="bg-gray-950 text-gray-200 font-mono text-sm rounded-md">
                <ScrollArea className="h-[400px]">
                  <div className="p-4 space-y-1">
                    {logs.length === 0 ? (
                      <div className="text-gray-500 italic">Training logs will appear here...</div>
                    ) : (
                      logs.map((log) => (
                        <div key={`log-${log.id}`} className="flex">
                          <span className="text-gray-500 mr-2">[{formatTimestamp(log.timestamp)}]</span>
                          <span
                            className={`flex items-center gap-1
                              ${log.type === "info" && "text-blue-400"}
                              ${log.type === "success" && "text-green-400"}
                              ${log.type === "error" && "text-red-400"}
                              ${log.type === "warning" && "text-yellow-400"}
                              ${log.type === "epoch" && "text-purple-400"}
                            `}
                          >
                            {getLogTypeIcon(log.type)} {log.message}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
              
              <div className="bg-background rounded-lg p-4">
                <h3 className="text-lg font-medium mb-2">Training Data Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Gestures:</span>
                    <span className="font-medium">{gestures.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Samples:</span>
                    <span className="font-medium">{gestures.reduce((sum, g) => sum + (g.samples || 1), 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>With Data Augmentation:</span>
                    <span className="font-medium">{gestures.reduce((sum, g) => sum + (g.samples || 1), 0) * 3} samples</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-muted/30 p-4">
        <div className="w-full flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center">
              <Cpu className="h-4 w-4 mr-1 text-purple-500" />
              Using Python-powered ML backend
            </div>
          </div>
          <div className="text-sm">
            {trainedModelId ? `Current model: ${trainedModelId}` : "No model trained"}
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
