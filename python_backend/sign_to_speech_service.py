import os
import json
import numpy as np
import cv2
import mediapipe as mp
import tensorflow as tf
from tensorflow.keras.models import load_model
import time
import base64
from io import BytesIO
from PIL import Image

class SignToSpeechService:
    def __init__(self):
        self.models_dir = os.path.join(os.path.dirname(__file__), 'models')
        self.data_dir = os.path.join(os.path.dirname(__file__), 'data')
        
        # Create directories if they don't exist
        os.makedirs(self.models_dir, exist_ok=True)
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Initialize MediaPipe
        self.mp_holistic = mp.solutions.holistic
        self.mp_drawing = mp.solutions.drawing_utils
        
        # Initialize model variables
        self.current_model = None
        self.model_classes = []
        self.model_config = {}
        
        # Try to load the default model if available
        self.load_default_model()
    
    def load_default_model(self):
        """Try to load the default model if available"""
        default_model_path = os.path.join(self.models_dir, 'default_model')
        if os.path.exists(default_model_path):
            try:
                self.load_model('default_model')
                print(f"Loaded default model with {len(self.model_classes)} classes")
                return True
            except Exception as e:
                print(f"Failed to load default model: {e}")
        return False
    
    def process_frame(self, image_data):
        """Process a single frame and extract hand landmarks"""
        # Decode base64 image
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        img_bytes = base64.b64decode(image_data)
        img_array = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe
        with self.mp_holistic.Holistic(
            static_image_mode=False,
            model_complexity=2,
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
        
        # Prepare response
        response = {
            'landmarks': landmarks,
            'handDetected': bool(results.left_hand_landmarks or results.right_hand_landmarks)
        }
        
        # If a model is loaded, perform prediction
        if self.current_model is not None and (results.left_hand_landmarks or results.right_hand_landmarks):
            try:
                # Preprocess landmarks for model input
                processed_landmarks = self.preprocess_landmarks(landmarks)
                
                # Make prediction
                prediction = self.current_model.predict(processed_landmarks)
                
                # Get the predicted class and confidence
                predicted_class_idx = np.argmax(prediction[0])
                confidence = float(prediction[0][predicted_class_idx])
                
                # Add prediction to response
                if confidence > 0.5 and predicted_class_idx < len(self.model_classes):
                    response['prediction'] = {
                        'gesture': self.model_classes[predicted_class_idx],
                        'confidence': confidence
                    }
            except Exception as e:
                print(f"Prediction error: {e}")
        
        return response
    
    def preprocess_landmarks(self, landmarks):
        """Preprocess landmarks for model input"""
        # Extract hand landmarks
        left_hand = landmarks.get('leftHand', [])
        right_hand = landmarks.get('rightHand', [])
        
        # Use the hand that is detected, prefer right hand if both are detected
        hand_landmarks = right_hand if right_hand else left_hand
        
        if not hand_landmarks:
            # Return zeros if no hand is detected
            return np.zeros((1, 30, 63))
        
        # Flatten landmarks to [x, y, z] format
        flattened = []
        for point in hand_landmarks:
            flattened.extend([point['x'], point['y'], point['z']])
        
        # Pad or truncate to expected length
        expected_length = 63  # 21 landmarks * 3 coordinates
        if len(flattened) < expected_length:
            flattened.extend([0] * (expected_length - len(flattened)))
        elif len(flattened) > expected_length:
            flattened = flattened[:expected_length]
        
        # Reshape for model input (assuming LSTM model with 30 time steps)
        # For a single frame, repeat the landmarks to fill the time steps
        sequence = np.array([flattened] * 30)
        
        # Add batch dimension
        return np.expand_dims(sequence, axis=0)
    
    def load_model(self, model_id):
        """Load a saved model"""
        model_path = os.path.join(self.models_dir, model_id)
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model {model_id} not found")
        
        # Load model config
        config_path = os.path.join(model_path, 'config.json')
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                self.model_config = json.load(f)
                self.model_classes = self.model_config.get('classes', [])
        
        # Load the TensorFlow model
        model_file = os.path.join(model_path, 'model.h5')
        self.current_model = load_model(model_file)
        
        return True
    
    def save_model(self, model_name, model, classes, config=None):
        """Save a model"""
        timestamp = int(time.time())
        model_id = f"{model_name}_{timestamp}"
        model_path = os.path.join(self.models_dir, model_id)
        
        # Create model directory
        os.makedirs(model_path, exist_ok=True)
        
        # Save model
        model_file = os.path.join(model_path, 'model.h5')
        model.save(model_file)
        
        # Save config
        config_data = config or {}
        config_data.update({
            'name': model_name,
            'id': model_id,
            'timestamp': timestamp,
            'classes': classes
        })
        
        config_path = os.path.join(model_path, 'config.json')
        with open(config_path, 'w') as f:
            json.dump(config_data, f)
        
        return model_id
    
    def list_models(self):
        """List all saved models"""
        models = []
        
        for model_id in os.listdir(self.models_dir):
            model_path = os.path.join(self.models_dir, model_id)
            
            if os.path.isdir(model_path):
                config_path = os.path.join(model_path, 'config.json')
                
                if os.path.exists(config_path):
                    try:
                        with open(config_path, 'r') as f:
                            config = json.load(f)
                            models.append(config)
                    except Exception as e:
                        print(f"Error loading model config {model_id}: {e}")
        
        # Sort by timestamp (newest first)
        models.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
        
        return models
    
    def recognize_sign(self, image_data, confidence_threshold=0.5):
        """Recognize a sign from an image"""
        if not self.current_model:
            return {'error': 'No model loaded'}
        
        # Process the frame
        result = self.process_frame(image_data)
        
        if 'prediction' in result and result['prediction']['confidence'] >= confidence_threshold:
            return {
                'recognized': True,
                'gesture': result['prediction']['gesture'],
                'confidence': result['prediction']['confidence']
            }
        
        return {
            'recognized': False
        }
    
    def translate_sign_to_speech(self, image_data, confidence_threshold=0.5):
        """Translate a sign to speech text"""
        recognition_result = self.recognize_sign(image_data, confidence_threshold)
        
        if recognition_result.get('recognized'):
            return {
                'success': True,
                'text': recognition_result['gesture'],
                'confidence': recognition_result['confidence']
            }
        
        return {
            'success': False,
            'message': 'No sign recognized'
        }

# Create a singleton instance
sign_to_speech_service = SignToSpeechService()
