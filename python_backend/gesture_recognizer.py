import os
import json
import time
import uuid
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import Callback
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split

class GestureRecognizer:
    def __init__(self):
        self.model = None
        self.label_encoder = LabelEncoder()
        self.samples = {}  # {gesture_name: [sample1, sample2, ...]}
        self.sequence_length = 30
        self.feature_count = 63  # 21 landmarks x 3 coordinates
        self.models_dir = os.path.join(os.path.dirname(__file__), 'models')
        self.samples_dir = os.path.join(os.path.dirname(__file__), 'samples')
        
        # Create directories if they don't exist
        os.makedirs(self.models_dir, exist_ok=True)
        os.makedirs(self.samples_dir, exist_ok=True)
        
        # Try to load existing samples
        self._load_samples()
    
    def _load_samples(self):
        """Load existing samples from disk"""
        try:
            sample_files = [f for f in os.listdir(self.samples_dir) if f.endswith('.json')]
            for file in sample_files:
                with open(os.path.join(self.samples_dir, file), 'r') as f:
                    data = json.load(f)
                    gesture_name = data['gestureName']
                    frames = data['frames']
                    
                    if gesture_name not in self.samples:
                        self.samples[gesture_name] = []
                    
                    self.samples[gesture_name].append(frames)
        except Exception as e:
            print(f"Error loading samples: {e}")
    
    def add_sample(self, gesture_name, frames):
        """Add a new sample for a gesture"""
        if gesture_name not in self.samples:
            self.samples[gesture_name] = []
        
        self.samples[gesture_name].append(frames)
        
        # Save the sample to disk
        sample_id = str(uuid.uuid4())
        sample_data = {
            'id': sample_id,
            'gestureName': gesture_name,
            'frames': frames,
            'timestamp': time.time()
        }
        
        with open(os.path.join(self.samples_dir, f"{sample_id}.json"), 'w') as f:
            json.dump(sample_data, f)
        
        return sample_id
    
    def _extract_features(self, landmarks_sequence):
        """Extract features from landmarks sequence"""
        features = []
        
        for frame in landmarks_sequence:
            frame_features = []
            
            # Process right hand if available
            if 'rightHand' in frame and frame['rightHand']:
                for point in frame['rightHand']:
                    frame_features.extend([point['x'], point['y'], point['z']])
            else:
                # Fill with zeros if no right hand
                frame_features.extend([0] * 63)
            
            # If we don't have enough features, pad with zeros
            if len(frame_features) < self.feature_count:
                frame_features.extend([0] * (self.feature_count - len(frame_features)))
            
            # If we have too many features, truncate
            frame_features = frame_features[:self.feature_count]
            
            features.append(frame_features)
        
        # Ensure we have the right sequence length
        if len(features) < self.sequence_length:
            # Pad with zeros
            features.extend([[0] * self.feature_count] * (self.sequence_length - len(features)))
        
        # If we have too many frames, truncate
        features = features[:self.sequence_length]
        
        return np.array(features)
    
    def _prepare_training_data(self):
        """Prepare training data from samples"""
        X = []
        y = []
        
        for gesture_name, samples in self.samples.items():
            for sample in samples:
                features = self._extract_features(sample)
                X.append(features)
                y.append(gesture_name)
        
        # Convert labels to integers
        self.label_encoder.fit(y)
        y_encoded = self.label_encoder.transform(y)
        
        return np.array(X), np.array(y_encoded)
    
    def _build_model(self, num_classes):
        """Build the LSTM model"""
        model = Sequential([
            LSTM(64, return_sequences=True, activation='relu', input_shape=(self.sequence_length, self.feature_count)),
            Dropout(0.2),
            LSTM(128, return_sequences=True, activation='relu'),
            Dropout(0.2),
            LSTM(64, return_sequences=False, activation='relu'),
            Dropout(0.2),
            Dense(64, activation='relu'),
            Dense(num_classes, activation='softmax')
        ])
        
        return model
    
    def train(self, gestures=None, epochs=50, learning_rate=0.001):
        """Train the model with the collected samples"""
        # If gestures are provided, add them to our samples
        if gestures:
            for gesture in gestures:
                name = gesture['name']
                landmarks = gesture['landmarks']
                
                # Convert to our format if needed
                if not isinstance(landmarks[0], dict):
                    # Assuming landmarks is a list of frames, each with leftHand, rightHand, etc.
                    self.add_sample(name, landmarks)
        
        # Prepare training data
        X, y = self._prepare_training_data()
        
        if len(X) == 0:
            raise ValueError("No training data available")
        
        # Split into training and validation sets
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2)
        
        # Build the model
        num_classes = len(self.label_encoder.classes_)
        self.model = self._build_model(num_classes)
        
        # Compile the model
        self.model.compile(
            optimizer=Adam(learning_rate=learning_rate),
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        # Train the model
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=16
        )
        
        # Get the final metrics
        final_loss = history.history['val_loss'][-1]
        final_accuracy = history.history['val_accuracy'][-1]
        
        # Save the model
        model_id = f"model_{int(time.time())}"
        self.save_model(model_id)
        
        return {
            'model_id': model_id,
            'accuracy': final_accuracy,
            'loss': final_loss,
            'history': {
                'loss': history.history['loss'],
                'accuracy': history.history['accuracy'],
                'val_loss': history.history['val_loss'],
                'val_accuracy': history.history['val_accuracy']
            }
        }
    
    def predict(self, landmarks, confidence_threshold=0.7):
        """Predict the gesture from landmarks"""
        if not self.model:
            raise ValueError("No model has been trained or loaded")
        
        # Extract features
        features = self._extract_features([landmarks])
        features = np.expand_dims(features, axis=0)
        
        # Make prediction
        predictions = self.model.predict(features)[0]
        
        # Get the top predictions
        top_indices = np.argsort(predictions)[::-1]
        
        results = []
        for i in top_indices:
            confidence = float(predictions[i])
            if confidence >= confidence_threshold:
                results.append({
                    'gesture': self.label_encoder.inverse_transform([i])[0],
                    'confidence': confidence
                })
        
        return results
    
    def save_model(self, name):
        """Save the model to disk"""
        if not self.model:
            raise ValueError("No model to save")
        
        # Create a unique ID for the model
        model_id = f"{name}_{int(time.time())}"
        model_path = os.path.join(self.models_dir, f"{model_id}.h5")
        
        # Save the Keras model
        self.model.save(model_path)
        
        # Save the label encoder
        encoder_path = os.path.join(self.models_dir, f"{model_id}_encoder.json")
        with open(encoder_path, 'w') as f:
            json.dump({
                'classes': self.label_encoder.classes_.tolist()
            }, f)
        
        # Save metadata
        metadata_path = os.path.join(self.models_dir, f"{model_id}_metadata.json")
        with open(metadata_path, 'w') as f:
            json.dump({
                'id': model_id,
                'name': name,
                'timestamp': time.time(),
                'classes': self.label_encoder.classes_.tolist(),
                'sequence_length': self.sequence_length,
                'feature_count': self.feature_count
            }, f)
        
        return model_id
    
    def load_model(self, model_id):
        """Load a model from disk"""
        model_path = os.path.join(self.models_dir, f"{model_id}.h5")
        encoder_path = os.path.join(self.models_dir, f"{model_id}_encoder.json")
        
        if not os.path.exists(model_path) or not os.path.exists(encoder_path):
            return False
        
        # Load the Keras model
        self.model = load_model(model_path)
        
        # Load the label encoder
        with open(encoder_path, 'r') as f:
            encoder_data = json.load(f)
            self.label_encoder.classes_ = np.array(encoder_data['classes'])
        
        return True
    
    def list_models(self):
        """List all saved models"""
        models = []
        
        metadata_files = [f for f in os.listdir(self.models_dir) if f.endswith('_metadata.json')]
        for file in metadata_files:
            with open(os.path.join(self.models_dir, file), 'r') as f:
                metadata = json.load(f)
                models.append({
                    'id': metadata['id'],
                    'name': metadata['name'],
                    'timestamp': metadata['timestamp'],
                    'classes': metadata['classes']
                })
        
        return models
