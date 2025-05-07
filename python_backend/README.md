# Python Backend for Sign Language Processing

This directory contains the Python backend services for sign language processing, recognition, and translation.

## Setup Instructions

1. Make sure you have Python 3.8+ installed on your system
2. Install the required packages:

\`\`\`bash
pip install -r requirements.txt
\`\`\`

3. Start the server:

\`\`\`bash
python app.py
\`\`\`

The server will run on http://localhost:5000 by default.

## Features

- Hand landmark detection using MediaPipe
- Sign language recognition with TensorFlow
- Model training and evaluation
- Sign-to-speech translation

## API Endpoints

### Health Check
- `GET /api/health` - Check if the server is running

### Frame Processing
- `POST /api/process-frame` - Process a video frame and extract hand landmarks

### Gesture Recognition
- `POST /api/recognize-gesture` - Recognize a gesture from landmarks

### Model Management
- `POST /api/train-model` - Train a new gesture recognition model
- `POST /api/save-model` - Save the current model
- `POST /api/load-model` - Load a saved model
- `GET /api/list-models` - List all saved models

### Sign-to-Speech
- `POST /api/sign-to-speech/recognize` - Recognize a sign from an image
- `POST /api/sign-to-speech/translate` - Translate a sign to speech text
- `GET /api/sign-to-speech/models` - List all sign language models
- `POST /api/sign-to-speech/load-model` - Load a sign language model

## Model Training

The backend supports training different types of models:
- LSTM (Long Short-Term Memory)
- CNN-LSTM (Convolutional Neural Network + LSTM)

Training parameters can be customized:
- Number of epochs
- Learning rate
- Batch size
- Model architecture

## Troubleshooting

If you encounter any issues:

1. Make sure all required packages are installed
2. Check that the correct versions are being used
3. Look for error messages in the console
4. Ensure the frontend is configured to connect to the correct URL
