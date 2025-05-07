from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import numpy as np
from sign_to_speech_service import SignToSpeechService
from gesture_recognizer import GestureRecognizer
from advanced_gesture_recognizer import AdvancedGestureRecognizer
from health_check import health_bp

app = Flask(__name__)
CORS(app)

# Register blueprints
app.register_blueprint(health_bp)

# Initialize services
sign_to_speech_service = SignToSpeechService()
gesture_recognizer = GestureRecognizer()
advanced_recognizer = AdvancedGestureRecognizer()

@app.route('/status', methods=['GET'])
def status():
    """
    Check if the server is running
    """
    return jsonify({
        'status': 'ok',
        'message': 'Python backend is running'
    })

@app.route('/process-landmarks', methods=['POST'])
def process_landmarks():
    """
    Process hand landmarks for sign language recognition
    """
    data = request.json
    landmarks = data.get('landmarks')
    
    if not landmarks:
        return jsonify({
            'error': 'No landmarks provided'
        }), 400
    
    result = sign_to_speech_service.process_landmarks(landmarks)
    return jsonify(result)

@app.route('/process-frame', methods=['POST'])
def process_frame():
    """
    Process video frame for sign language recognition
    """
    data = request.json
    image_data = data.get('image')
    
    if not image_data:
        return jsonify({
            'error': 'No image data provided'
        }), 400
    
    result = sign_to_speech_service.process_frame(image_data)
    return jsonify(result)

@app.route('/train-model', methods=['POST'])
def train_model():
    """
    Train a model with the provided data
    """
    data = request.json
    
    if not data:
        return jsonify({
            'error': 'No training data provided'
        }), 400
    
    # Use advanced recognizer for training
    result = advanced_recognizer.train_model(data)
    return jsonify(result)

@app.route('/evaluate-model', methods=['POST'])
def evaluate_model():
    """
    Evaluate a model with the provided data
    """
    data = request.json
    
    if not data:
        return jsonify({
            'error': 'No evaluation data provided'
        }), 400
    
    # Use advanced recognizer for evaluation
    result = advanced_recognizer.evaluate_model(data)
    return jsonify(result)

@app.route('/predict', methods=['POST'])
def predict():
    """
    Make a prediction with the trained model
    """
    data = request.json
    
    if not data:
        return jsonify({
            'error': 'No prediction data provided'
        }), 400
    
    # Use advanced recognizer for prediction
    result = advanced_recognizer.predict(data)
    return jsonify(result)

@app.route('/save-model', methods=['POST'])
def save_model():
    """
    Save the trained model
    """
    data = request.json
    
    if not data:
        return jsonify({
            'error': 'No model data provided'
        }), 400
    
    model_name = data.get('model_name', 'default_model')
    
    # Use advanced recognizer to save the model
    result = advanced_recognizer.save_model(model_name)
    return jsonify(result)

@app.route('/load-model', methods=['POST'])
def load_model():
    """
    Load a trained model
    """
    data = request.json
    
    if not data:
        return jsonify({
            'error': 'No model data provided'
        }), 400
    
    model_name = data.get('model_name')
    
    if not model_name:
        return jsonify({
            'error': 'No model name provided'
        }), 400
    
    # Use advanced recognizer to load the model
    result = advanced_recognizer.load_model(model_name)
    return jsonify(result)

@app.route('/list-models', methods=['GET'])
def list_models():
    """
    List all available models
    """
    # Use advanced recognizer to list models
    result = advanced_recognizer.list_models()
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
