import os
import json
import time
import uuid
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential, Model, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout, Bidirectional, Input, Conv1D, MaxPooling1D, Flatten, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from tensorflow.keras.regularizers import l2
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split

class AdvancedGestureRecognizer:
    def __init__(self):
        self.model = None
        self.label_encoder = LabelEncoder()
        self.scaler = StandardScaler()
        self.samples = {}  # {gesture_name: [sample1, sample2, ...]}
        self.sequence_length = 30
        self.feature_count = 63  # 21 landmarks x 3 coordinates
        self.models_dir = os.path.join(os.path.dirname(__file__), 'models')
        self.samples_dir = os.path.join(os.path.dirname(__file__), 'samples')
        self.best_model_path = os.path.join(self.models_dir, 'best_model.h5')
        
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
        """Extract features from landmarks sequence with improved feature engineering"""
        features = []
        
        for frame in landmarks_sequence:
            frame_features = []
            
            # Process right hand if available
            if 'rightHand' in frame and frame['rightHand']:
                # Extract basic coordinates
                for point in frame['rightHand']:
                    frame_features.extend([point['x'], point['y'], point['z']])
                
                # Add derived features - hand velocity if we have multiple frames
                if len(features) > 0:
                    prev_hand = []
                    for point in frame['rightHand']:
                        prev_hand.extend([point['x'], point['y'], point['z']])
                    
                    # Calculate velocity features (difference between current and previous frame)
                    velocity_features = [curr - prev for curr, prev in zip(frame_features, prev_hand)]
                    frame_features.extend(velocity_features[:30])  # Add first 10 landmark velocities
            else:
                # Fill with zeros if no right hand
                frame_features.extend([0] * 63)
                # Add zeros for velocity features too
                frame_features.extend([0] * 30)
            
            # If we don't have enough features, pad with zeros
            if len(frame_features) < self.feature_count + 30:  # Basic + velocity features
                frame_features.extend([0] * (self.feature_count + 30 - len(frame_features)))
            
            # If we have too many features, truncate
            frame_features = frame_features[:self.feature_count + 30]
            
            features.append(frame_features)
        
        # Ensure we have the right sequence length
        if len(features) < self.sequence_length:
            # Pad with zeros
            features.extend([[0] * (self.feature_count + 30)] * (self.sequence_length - len(features)))
        
        # If we have too many frames, truncate
        features = features[:self.sequence_length]
        
        return np.array(features)
    
    def _prepare_training_data(self):
        """Prepare training data from samples with data augmentation"""
        X = []
        y = []
        
        for gesture_name, samples in self.samples.items():
            for sample in samples:
                # Original sample
                features = self._extract_features(sample)
                X.append(features)
                y.append(gesture_name)
                
                # Data augmentation: Add noise
                noisy_features = features + np.random.normal(0, 0.01, features.shape)
                X.append(noisy_features)
                y.append(gesture_name)
                
                # Data augmentation: Time warping (speed up)
                if len(sample) >= self.sequence_length:
                    # Take every other frame to simulate faster movement
                    warped_sample = sample[::2]
                    # Repeat the last frame to maintain sequence length
                    warped_sample = warped_sample + [warped_sample[-1]] * (len(sample) - len(warped_sample))
                    warped_features = self._extract_features(warped_sample)
                    X.append(warped_features)
                    y.append(gesture_name)
        
        # Convert labels to integers
        self.label_encoder.fit(y)
        y_encoded = self.label_encoder.transform(y)
        
        # Normalize features
        X_array = np.array(X)
        # Reshape for normalization
        original_shape = X_array.shape
        X_reshaped = X_array.reshape(-1, X_array.shape[-1])
        X_normalized = self.scaler.fit_transform(X_reshaped)
        X_array = X_normalized.reshape(original_shape)
        
        return X_array, np.array(y_encoded)
    
    def _build_lstm_model(self, num_classes):
        """Build an advanced bidirectional LSTM model"""
        model = Sequential([
            Bidirectional(LSTM(128, return_sequences=True, activation='tanh', 
                              recurrent_dropout=0.2, kernel_regularizer=l2(0.001)),
                         input_shape=(self.sequence_length, self.feature_count + 30)),
            BatchNormalization(),
            Dropout(0.3),
            Bidirectional(LSTM(256, return_sequences=True, activation='tanh', recurrent_dropout=0.2)),
            BatchNormalization(),
            Dropout(0.3),
            Bidirectional(LSTM(128, return_sequences=False, activation='tanh')),
            BatchNormalization(),
            Dropout(0.3),
            Dense(128, activation='relu', kernel_regularizer=l2(0.001)),
            BatchNormalization(),
            Dropout(0.3),
            Dense(num_classes, activation='softmax')
        ])
        
        return model
    
    def _build_cnn_lstm_model(self, num_classes):
        """Build a CNN-LSTM hybrid model for better feature extraction"""
        model = Sequential([
            # CNN layers for spatial feature extraction
            Conv1D(filters=64, kernel_size=3, activation='relu', 
                  input_shape=(self.sequence_length, self.feature_count + 30)),
            BatchNormalization(),
            MaxPooling1D(pool_size=2),
            Dropout(0.2),
            
            Conv1D(filters=128, kernel_size=3, activation='relu'),
            BatchNormalization(),
            MaxPooling1D(pool_size=2),
            Dropout(0.2),
            
            # LSTM layers for temporal dynamics
            Bidirectional(LSTM(128, return_sequences=True, activation='tanh')),
            Dropout(0.3),
            Bidirectional(LSTM(64, return_sequences=False, activation='tanh')),
            Dropout(0.3),
            
            # Dense layers for classification
            Dense(128, activation='relu', kernel_regularizer=l2(0.001)),
            BatchNormalization(),
            Dropout(0.3),
            Dense(num_classes, activation='softmax')
        ])
        
        return model
    
    def train(self, gestures=None, epochs=100, learning_rate=0.001, model_type='cnn_lstm', batch_size=32):
        """Train the model with the collected samples using advanced techniques"""
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
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, stratify=y)
        
        # Build the model based on selected type
        num_classes = len(self.label_encoder.classes_)
        if model_type == 'lstm':
            self.model = self._build_lstm_model(num_classes)
        else:  # default to cnn_lstm
            self.model = self._build_cnn_lstm_model(num_classes)
        
        # Compile the model
        self.model.compile(
            optimizer=Adam(learning_rate=learning_rate),
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        # Define callbacks for better training
        callbacks = [
            EarlyStopping(
                monitor='val_loss',
                patience=15,
                restore_best_weights=True,
                verbose=1
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=5,
                min_lr=1e-6,
                verbose=1
            ),
            ModelCheckpoint(
                filepath=self.best_model_path,
                monitor='val_accuracy',
                save_best_only=True,
                verbose=1
            )
        ]
        
        # Train the model
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=1
        )
        
        # Load the best model
        if os.path.exists(self.best_model_path):
            self.model = load_model(self.best_model_path)
        
        # Get the final metrics
        final_loss = min(history.history['val_loss'])
        final_accuracy = max(history.history['val_accuracy'])
        
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
            },
            'model_type': model_type,
            'classes': self.label_encoder.classes_.tolist()
        }
    
    def predict(self, landmarks, confidence_threshold=0.7):
        """Predict the gesture from landmarks with confidence scores"""
        if not self.model:
            raise ValueError("No model has been trained or loaded")
        
        # Extract features
        features = self._extract_features([landmarks])
        
        # Normalize features
        features_reshaped = features.reshape(-1, features.shape[-1])
        features_normalized = self.scaler.transform(features_reshaped)
        features = features_normalized.reshape(features.shape)
        
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
        
        # Save the label encoder and scaler
        encoder_path = os.path.join(self.models_dir, f"{model_id}_encoder.json")
        with open(encoder_path, 'w') as f:
            json.dump({
                'classes': self.label_encoder.classes_.tolist()
            }, f)
        
        # Save the scaler
        scaler_mean = self.scaler.mean_.tolist() if hasattr(self.scaler, 'mean_') else []
        scaler_scale = self.scaler.scale_.tolist() if hasattr(self.scaler, 'scale_') else []
        
        scaler_path = os.path.join(self.models_dir, f"{model_id}_scaler.json")
        with open(scaler_path, 'w') as f:
            json.dump({
                'mean': scaler_mean,
                'scale': scaler_scale
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
                'feature_count': self.feature_count + 30,  # Include velocity features
                'architecture': self.model.to_json()
            }, f)
        
        return model_id
    
    def load_model(self, model_id):
        """Load a model from disk"""
        model_path = os.path.join(self.models_dir, f"{model_id}.h5")
        encoder_path = os.path.join(self.models_dir, f"{model_id}_encoder.json")
        scaler_path = os.path.join(self.models_dir, f"{model_id}_scaler.json")
        
        if not os.path.exists(model_path) or not os.path.exists(encoder_path):
            return False
        
        # Load the Keras model
        self.model = load_model(model_path)
        
        # Load the label encoder
        with open(encoder_path, 'r') as f:
            encoder_data = json.load(f)
            self.label_encoder.classes_ = np.array(encoder_data['classes'])
        
        # Load the scaler if available
        if os.path.exists(scaler_path):
            with open(scaler_path, 'r') as f:
                scaler_data = json.load(f)
                self.scaler = StandardScaler()
                if 'mean' in scaler_data and scaler_data['mean']:
                    self.scaler.mean_ = np.array(scaler_data['mean'])
                if 'scale' in scaler_data and scaler_data['scale']:
                    self.scaler.scale_ = np.array(scaler_data['scale'])
        
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
    
    def evaluate_model(self, test_data=None):
        """Evaluate the model on test data or using cross-validation"""
        if not self.model:
            raise ValueError("No model has been trained or loaded")
        
        if test_data:
            # Use provided test data
            X_test = []
            y_test = []
            
            for item in test_data:
                features = self._extract_features(item['landmarks'])
                X_test.append(features)
                y_test.append(item['label'])
            
            X_test = np.array(X_test)
            y_test_encoded = self.label_encoder.transform(y_test)
            
            # Normalize features
            X_test_reshaped = X_test.reshape(-1, X_test.shape[-1])
            X_test_normalized = self.scaler.transform(X_test_reshaped)
            X_test = X_test_normalized.reshape(X_test.shape)
            
            # Evaluate
            loss, accuracy = self.model.evaluate(X_test, y_test_encoded)
            
            # Get per-class metrics
            y_pred = self.model.predict(X_test)
            y_pred_classes = np.argmax(y_pred, axis=1)
            
            # Calculate confusion matrix
            from sklearn.metrics import confusion_matrix, classification_report
            cm = confusion_matrix(y_test_encoded, y_pred_classes)
            report = classification_report(y_test_encoded, y_pred_classes, 
                                          target_names=self.label_encoder.classes_, output_dict=True)
            
            return {
                'accuracy': accuracy,
                'loss': loss,
                'confusion_matrix': cm.tolist(),
                'classification_report': report
            }
        else:
            # Use cross-validation on existing data
            X, y = self._prepare_training_data()
            
            from sklearn.model_selection import KFold
            kf = KFold(n_splits=5, shuffle=True, random_state=42)
            
            accuracies = []
            losses = []
            
            for train_index, test_index in kf.split(X):
                X_train, X_test = X[train_index], X[test_index]
                y_train, y_test = y[train_index], y[test_index]
                
                # Create a new model for each fold
                num_classes = len(self.label_encoder.classes_)
                model = self._build_cnn_lstm_model(num_classes)
                model.compile(
                    optimizer=Adam(learning_rate=0.001),
                    loss='sparse_categorical_crossentropy',
                    metrics=['accuracy']
                )
                
                # Train on this fold
                model.fit(X_train, y_train, epochs=10, batch_size=32, verbose=0)
                
                # Evaluate on this fold
                loss, accuracy = model.evaluate(X_test, y_test, verbose=0)
                accuracies.append(accuracy)
                losses.append(loss)
            
            return {
                'cross_val_accuracy': np.mean(accuracies),
                'cross_val_loss': np.mean(losses),
                'accuracy_std': np.std(accuracies),
                'folds': len(accuracies)
            }
