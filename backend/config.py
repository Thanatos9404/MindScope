import os
from pathlib import Path


class Config:
    # Base directories
    BASE_DIR = Path(__file__).parent.parent
    DATA_DIR = BASE_DIR / "data"
    MODELS_DIR = BASE_DIR / "models"

    # API Configuration
    API_HOST = os.getenv('API_HOST', 'localhost')
    API_PORT = int(os.getenv('API_PORT', 5000))
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

    # CORS settings
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:8000,http://127.0.0.1:8000').split(',')

    # Questions file
    QUESTIONS_FILE = DATA_DIR / "questions.json"

    # Ensure directories exist
    DATA_DIR.mkdir(exist_ok=True)
    MODELS_DIR.mkdir(exist_ok=True)

    # Debug: Print the path
    print(f"Looking for questions at: {QUESTIONS_FILE}")
