#!/usr/bin/env python3
from models import MentalHealthModel
from config import Config
import argparse

def main():
    parser = argparse.ArgumentParser(description='Train MindScope mental health models (integrated datasets)')
    parser.add_argument('--main', default='mental_health_data.csv', help='Path to main training data CSV')
    parser.add_argument('--student', default='Student_Mental_health.csv', help='Path to Kaggle student CSV')
    args = parser.parse_args()

    model = MentalHealthModel()
    ok = model.train_models(
        main_csv_path=Config.DATA_DIR / args.main,
        student_csv_path=Config.DATA_DIR / args.student)
    print("✅ Training completed" if ok else "❌ Training failed")

if __name__ == '__main__':
    main()
