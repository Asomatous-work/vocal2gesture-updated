# Vocal2Gestures Python Backend

This is the Python backend for the Vocal2Gestures web application. It provides improved gesture recognition capabilities using Python's powerful machine learning libraries.

## Features

- High-performance hand landmark detection using MediaPipe
- LSTM-based gesture recognition model
- API endpoints for the web application to use
- Shared model storage between Python and JavaScript

## Requirements

- Python 3.8 or higher
- TensorFlow 2.6+
- MediaPipe 0.8.9+
- Flask and Flask-CORS
- OpenCV
- NumPy
- scikit-learn

## Setup

1. Make sure you have Python 3.8+ installed
2. Run the setup script:

\`\`\`bash
python setup.py
\`\`\`

3. Start the server:

\`\`\`bash
python app.py
\`\`\`

4. The server will be available at http://localhost:5000

## API Endpoints

- `/api/health` - Check if the server is running
- `/api/process-frame` - Process a video frame and return hand landmarks
- `/api/recognize-gesture` - Recognize a gesture from landmarks
- `/api/train-model` - Train a new gesture recognition model
- `/api/save-model` - Save the current model
- `/api/load-model` - Load a saved model
- `/api/list-models` - List all saved models
- `/api/collect-sample` - Collect a sample for a gesture

## Integration with Web App

The web application will automatically detect if the Python backend is available and use it for improved performance. If the Python backend is not available, it will fall back to the JavaScript implementation.
\`\`\`

Let's update the app/training/page.tsx to use our new component:
