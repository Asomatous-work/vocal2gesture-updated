from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import numpy as np
import base64
import cv2
import mediapipe as mp
from advanced_gesture_recognizer import AdvancedGestureRecognizer
import tensorflow as tf
import time
from sign_to_speech_service import sign_to_speech_service

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize MediaPipe
mp_holistic = mp.solutions.holistic
mp_drawing = mp.solutions.drawing_utils

# Initialize the gesture recognizer
gesture_recognizer = AdvancedGestureRecognizer()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({
        'status': 'ok',
        'tensorflow_version': tf.__version__,
        'mediapipe_version': mp.__version__
    })

@app.route('/api/process-frame', methods=['POST'])
def process_frame():
    """Process a single video frame and return hand landmarks"""
    if 'image' not in request.json:
        return jsonify({'error': 'No image data provided'}), 400
    
    try:
        # Decode base64 image
        encoded_data = request.json['image'].split(',')[1] if ',' in request.json['image'] else request.json['image']
        nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe
        with mp_holistic.Holistic(
            static_image_mode=False,
            model_complexity=2,  # Use higher complexity for better accuracy
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        ) as holistic:
            results = holistic.process(img)
        
        # Extract landmarks
        landmarks = {}
        
        if results.left_hand_landmarks:
            landmarks['leftHand'] = [
                {'x': point.x, 'y': point.y, 'z': point.z} 
                for point in results.left_hand_landmarks.landmark
            ]
        
        if results.right_hand_landmarks:
            landmarks['rightHand'] = [
                {'x': point.x, 'y': point.y, 'z': point.z} 
                for point in results.right_hand_landmarks.landmark
            ]
            
        if results.pose_landmarks:
            landmarks['pose'] = [
                {'x': point.x, 'y': point.y, 'z': point.z} 
                for point in results.pose_landmarks.landmark
            ]
        
        # Return the landmarks
        return jsonify({
            'landmarks': landmarks,
            'handDetected': bool(results.left_hand_landmarks or results.right_hand_landmarks)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/recognize-gesture', methods=['POST'])
def recognize_gesture():
    """Recognize a gesture from landmarks"""
    if 'landmarks' not in request.json:
        return jsonify({'error': 'No landmarks provided'}), 400
    
    try:
        landmarks = request.json['landmarks']
        confidence_threshold = request.json.get('confidenceThreshold', 0.7)
        
        # Use the gesture recognizer to predict
        predictions = gesture_recognizer.predict(landmarks, confidence_threshold)
        
        return jsonify({
            'predictions': predictions
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/train-model', methods=['POST'])
def train_model():
    """Train a new gesture recognition model with advanced options"""
    if 'gestures' not in request.json:
        return jsonify({'error': 'No gesture data provided'}), 400
    
    try:
        gestures = request.json['gestures']
        epochs = request.json.get('epochs', 100)  # Default to more epochs
        learning_rate = request.json.get('learningRate', 0.001)
        model_type = request.json.get('modelType', 'cnn_lstm')  # Default to CNN-LSTM
        batch_size = request.json.get('batchSize', 32)
        
        # Train the model
        training_result = gesture_recognizer.train(
            gestures, 
            epochs=epochs, 
            learning_rate=learning_rate,
            model_type=model_type,
            batch_size=batch_size
        )
        
        return jsonify({
            'success': True,
            'modelId': training_result['model_id'],
            'accuracy': training_result['accuracy'],
            'loss': training_result['loss'],
            'modelType': training_result['model_type'],
            'classes': training_result['classes']
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save-model', methods=['POST'])
def save_model():
    """Save the current model"""
    try:
        model_name = request.json.get('name', f'model_{int(time.time())}')
        model_id = gesture_recognizer.save_model(model_name)
        
        return jsonify({
            'success': True,
            'modelId': model_id
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/load-model', methods=['POST'])
def load_model():
    """Load a saved model"""
    if 'modelId' not in request.json:
        return jsonify({'error': 'No model ID provided'}), 400
    
    try:
        model_id = request.json['modelId']
        success = gesture_recognizer.load_model(model_id)
        
        return jsonify({
            'success': success
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/list-models', methods=['GET'])
def list_models():
    """List all saved models"""
    try:
        models = gesture_recognizer.list_models()
        
        return jsonify({
            'models': models
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/collect-sample', methods=['POST'])
def collect_sample():
    """Collect a sample for a gesture"""
    if 'frames' not in request.json or 'gestureName' not in request.json:
        return jsonify({'error': 'Missing required data'}), 400
    
    try:
        frames = request.json['frames']
        gesture_name = request.json['gestureName']
        
        # Add the sample to the gesture recognizer
        sample_id = gesture_recognizer.add_sample(gesture_name, frames)
        
        return jsonify({
            'success': True,
            'sampleId': sample_id
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/evaluate-model', methods=['POST'])
def evaluate_model():
    """Evaluate the current model"""
    try:
        test_data = request.json.get('testData', None)
        
        # Evaluate the model
        evaluation_result = gesture_recognizer.evaluate_model(test_data)
        
        return jsonify({
            'success': True,
            'evaluation': evaluation_result
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/training-options', methods=['GET'])
def get_training_options():
    """Get available training options"""
    return jsonify({
        'modelTypes': ['lstm', 'cnn_lstm'],
        'defaultEpochs': 100,
        'defaultLearningRate': 0.001,
        'defaultBatchSize': 32,
        'features': {
            'dataAugmentation': True,
            'earlyStoppingEnabled': True,
            'learningRateReductionEnabled': True,
            'modelCheckpointEnabled': True
        }
    })

@app.route('/api/sign-to-speech/recognize', methods=['POST'])
def recognize_sign():
    """Recognize a sign from an image"""
    if 'image' not in request.json:
        return jsonify({'error': 'No image data provided'}), 400
    
    try:
        image_data = request.json['image']
        confidence_threshold = request.json.get('confidenceThreshold', 0.5)
        
        result = sign_to_speech_service.recognize_sign(image_data, confidence_threshold)
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sign-to-speech/translate', methods=['POST'])
def translate_sign():
    """Translate a sign to speech text"""
    if 'image' not in request.json:
        return jsonify({'error': 'No image data provided'}), 400
    
    try:
        image_data = request.json['image']
        confidence_threshold = request.json.get('confidenceThreshold', 0.5)
        
        result = sign_to_speech_service.translate_sign_to_speech(image_data, confidence_threshold)
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sign-to-speech/models', methods=['GET'])
def list_sign_models():
    """List all sign language models"""
    try:
        models = sign_to_speech_service.list_models()
        return jsonify({'models': models})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sign-to-speech/load-model', methods=['POST'])
def load_sign_model():
    """Load a sign language model"""
    if 'modelId' not in request.json:
        return jsonify({'error': 'No model ID provided'}), 400
    
    try:
        model_id = request.json['modelId']
        success = sign_to_speech_service.load_model(model_id)
        
        return jsonify({
            'success': success
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
