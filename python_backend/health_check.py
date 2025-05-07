from flask import Blueprint, jsonify
import platform
import psutil
import tensorflow as tf
import mediapipe as mp
import os
import time

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
def health_check():
    """
    Comprehensive health check endpoint for the Python backend
    """
    start_time = time.time()
    
    # Basic system information
    system_info = {
        'python_version': platform.python_version(),
        'platform': platform.platform(),
        'cpu_count': os.cpu_count(),
        'memory_available': psutil.virtual_memory().available / (1024 * 1024),  # MB
        'disk_free': psutil.disk_usage('/').free / (1024 * 1024 * 1024),  # GB
    }
    
    # Check TensorFlow
    tf_status = {
        'version': tf.__version__,
        'gpu_available': len(tf.config.list_physical_devices('GPU')) > 0,
        'devices': [device.name for device in tf.config.list_physical_devices()]
    }
    
    # Check MediaPipe
    mp_status = {
        'version': mp.__version__,
        'holistic_available': hasattr(mp, 'solutions') and hasattr(mp.solutions, 'holistic')
    }
    
    # Check model directories
    model_dirs = os.path.exists('./models')
    
    response_time = time.time() - start_time
    
    return jsonify({
        'status': 'healthy',
        'response_time': response_time,
        'system': system_info,
        'tensorflow': tf_status,
        'mediapipe': mp_status,
        'model_directories': model_dirs
    })
