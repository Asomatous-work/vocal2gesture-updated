#!/usr/bin/env python3
"""
Setup script for the Python backend of Vocal2Gestures
"""
import os
import sys
import subprocess
import platform

def check_python_version():
    """Check if Python version is 3.8+"""
    if sys.version_info < (3, 8):
        print("Error: Python 3.8 or higher is required.")
        sys.exit(1)
    print(f"✓ Python version: {platform.python_version()}")

def install_requirements():
    """Install required packages"""
    print("Installing required packages...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ Requirements installed successfully")
    except subprocess.CalledProcessError:
        print("Error: Failed to install requirements.")
        sys.exit(1)

def create_directories():
    """Create necessary directories"""
    print("Creating directories...")
    os.makedirs("models", exist_ok=True)
    os.makedirs("samples", exist_ok=True)
    print("✓ Directories created")

def test_imports():
    """Test importing required packages"""
    print("Testing imports...")
    try:
        import flask
        import flask_cors
        import numpy
        import cv2
        import mediapipe
        import tensorflow
        import sklearn
        print("✓ All imports successful")
    except ImportError as e:
        print(f"Error: Failed to import {e.name}.")
        sys.exit(1)

def main():
    """Main function"""
    print("Setting up Python backend for Vocal2Gestures...")
    check_python_version()
    install_requirements()
    create_directories()
    test_imports()
    
    print("\nSetup completed successfully!")
    print("\nTo start the server, run:")
    print("  python app.py")
    print("\nThe server will be available at http://localhost:5000")

if __name__ == "__main__":
    main()
