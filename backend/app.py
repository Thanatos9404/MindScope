from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import json
import os
import io
import base64
from datetime import datetime
from pathlib import Path
import uuid
import random

from config import Config
from models import MentalHealthModel, RecommendationEngine

app = Flask(__name__)
CORS(app, origins=Config.CORS_ORIGINS)

# Initialize models
mental_health_model = MentalHealthModel()
recommendation_engine = RecommendationEngine()


def load_questions():
    """Load questions from JSON file"""
    try:
        print(f"Loading questions from: {Config.QUESTIONS_FILE}")
        with open(Config.QUESTIONS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"Successfully loaded questions data")
            return data
    except FileNotFoundError:
        print(f"Questions file not found: {Config.QUESTIONS_FILE}")
        return {"error": "Questions file not found"}
    except Exception as e:
        print(f"Error loading questions: {e}")
        return {"error": str(e)}


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '2.0.0',
        'features': ['quick_assessment', 'charts', 'pdf_export', 'social_sharing']
    })


@app.route('/api/questions', methods=['GET'])
def get_questions():
    """Get assessment questions with mode support"""
    try:
        mode = request.args.get('mode', 'full')  # 'full' or 'quick'
        questions_data = load_questions()

        if 'error' in questions_data:
            return jsonify(questions_data), 500

        # If quick mode, select subset of questions
        if mode == 'quick':
            # Flatten questions first
            all_questions = []
            if 'sections' in questions_data:
                for section in questions_data['sections']:
                    for question in section['questions']:
                        question['section_name'] = section['category']
                        all_questions.append(question)

            # Select balanced quick questions (12 questions)
            quick_questions = select_quick_questions(all_questions, questions_data.get('option_sets', {}))

            # Rebuild structure for quick mode
            questions_data['mode'] = 'quick'
            questions_data['total_questions'] = len(quick_questions)
            questions_data['quick_questions'] = quick_questions
        else:
            questions_data['mode'] = 'full'
            # Count total questions
            total = sum(len(section['questions']) for section in questions_data.get('sections', []))
            questions_data['total_questions'] = total

        return jsonify(questions_data)
    except Exception as e:
        print(f"Error in get_questions: {e}")
        return jsonify({'error': str(e)}), 500


def select_quick_questions(all_questions, option_sets, num_questions=12):
    """Select balanced questions for quick assessment"""
    try:
        # Group by section for balanced selection
        sections = {}
        for q in all_questions:
            section = q.get('section_name', 'general')
            if section not in sections:
                sections[section] = []
            sections[section].append(q)

        selected = []
        questions_per_section = max(1, num_questions // len(sections))

        # Select from each section
        for section_name, section_questions in sections.items():
            sample_size = min(questions_per_section, len(section_questions))
            section_sample = random.sample(section_questions, sample_size)
            selected.extend(section_sample)

        # If we need more questions, randomly select from remaining
        if len(selected) < num_questions:
            remaining = [q for q in all_questions if q not in selected]
            if remaining:
                additional_needed = num_questions - len(selected)
                additional = random.sample(remaining, min(additional_needed, len(remaining)))
                selected.extend(additional)

        # Add option data to each question
        for question in selected:
            if 'options_id' in question and question['options_id'] in option_sets:
                question['options'] = option_sets[question['options_id']]

        return selected[:num_questions]

    except Exception as e:
        print(f"Error selecting quick questions: {e}")
        return all_questions[:num_questions]


@app.route('/api/assess', methods=['POST'])
def assess_mental_health():
    """Process mental health assessment with enhanced features"""
    try:
        data = request.get_json()

        if not data or 'answers' not in data:
            return jsonify({'error': 'No answers provided'}), 400

        answers = data['answers']
        timestamp = data.get('timestamp', datetime.now().isoformat())
        assessment_mode = data.get('mode', 'full')

        print(f"Processing {assessment_mode} assessment with {len(answers)} answers")

        # Load questions for context
        questions_data = load_questions()

        # Get predictions from enhanced model
        predictions = mental_health_model.predict_from_answers(answers, questions_data, assessment_mode)

        # Get personalized recommendations
        recommendations = recommendation_engine.get_recommendations(predictions, limit=4)

        # Format results for frontend
        results = {}
        for target, prediction in predictions.items():
            # Map to user-friendly names
            display_names = {
                'Depression_Category': 'Mood & Energy',
                'Anxiety_Category': 'Anxiety Level',
                'Stress_Category': 'Stress Management',
                'Wellbeing_Category': 'Overall Wellbeing',
                'Overall_Wellbeing_Category': 'General Health'
            }

            category_level = prediction['category']
            confidence = prediction['confidence']

            # Calculate percentage for visualization
            level_mapping = {
                'Low Concern': 20, 'Low Well-being': 25,
                'Mild to Moderate Concern': 55, 'Moderate Well-being': 60,
                'High Concern': 85, 'High Well-being': 90,
                'Good Well-being': 80
            }

            percentage = level_mapping.get(category_level, 50)

            # Enhanced descriptions
            descriptions = {
                'Low Concern': 'Your responses suggest this area is well-managed. Keep up the good work!',
                'Mild to Moderate Concern': 'Some areas may benefit from attention and self-care practices.',
                'High Concern': 'This area shows signs that may benefit from professional support or focused attention.',
                'Low Well-being': 'There are opportunities to enhance your wellbeing in this area through small, positive changes.',
                'Moderate Well-being': 'Your wellbeing shows room for growth. Consider exploring new wellness practices.',
                'High Well-being': 'Excellent! You demonstrate strong wellbeing in this area.',
                'Good Well-being': 'You show positive wellbeing patterns. Continue nurturing this strength.'
            }

            description = descriptions.get(category_level, 'Assessment completed successfully.')

            # Add population comparison (simulated for now)
            population_percentile = min(95, max(5, percentage + random.randint(-15, 15)))

            results[target] = {
                'name': display_names.get(target, target.replace('_', ' ').title()),
                'level': category_level,
                'score': percentage,
                'confidence': round(confidence * 100, 1),
                'description': description,
                'population_percentile': population_percentile,
                'assessment_mode': assessment_mode
            }

        # Generate unique assessment ID
        assessment_id = str(uuid.uuid4())[:8]

        # Save assessment data
        save_assessment_data(answers, predictions, timestamp, assessment_id, assessment_mode)

        # Calculate overall wellness score
        overall_score = calculate_overall_wellness_score(results)

        response = {
            'results': results,
            'recommendations': recommendations,
            'overall_score': overall_score,
            'assessment_mode': assessment_mode,
            'timestamp': timestamp,
            'assessment_id': assessment_id,
            'chart_data': generate_chart_data(results)
        }

        return jsonify(response)

    except Exception as e:
        print(f"Assessment error: {e}")
        return jsonify({'error': 'Assessment processing failed', 'details': str(e)}), 500


def calculate_overall_wellness_score(results):
    """Calculate overall wellness score from individual results"""
    total_score = 0
    count = 0

    for target, result in results.items():
        score = result['score']
        # Weight wellbeing categories positively, concerns negatively
        if 'wellbeing' in target.lower() or 'Well-being' in result['level']:
            total_score += score
        else:
            total_score += (100 - score)  # Invert concern scores
        count += 1

    overall = total_score / count if count > 0 else 50
    return min(100, max(0, overall))


def generate_chart_data(results):
    """Generate data for different chart types"""
    labels = []
    scores = []
    colors = []

    color_mapping = {
        'Mood & Energy': '#6366F1',
        'Anxiety Level': '#10B981',
        'Stress Management': '#F59E0B',
        'Overall Wellbeing': '#EF4444',
        'General Health': '#8B5CF6'
    }

    for target, result in results.items():
        labels.append(result['name'])
        scores.append(result['score'])
        colors.append(color_mapping.get(result['name'], '#6B7280'))

    return {
        'radar': {
            'labels': labels,
            'datasets': [{
                'label': 'Your Scores',
                'data': scores,
                'backgroundColor': 'rgba(99, 102, 241, 0.2)',
                'borderColor': '#6366F1',
                'borderWidth': 2
            }]
        },
        'donut': {
            'labels': labels,
            'datasets': [{
                'data': scores,
                'backgroundColor': colors,
                'borderWidth': 2,
                'borderColor': '#FFFFFF'
            }]
        },
        'bar': {
            'labels': labels,
            'datasets': [{
                'label': 'Wellness Scores',
                'data': scores,
                'backgroundColor': colors,
                'borderRadius': 8
            }]
        }
    }


@app.route('/api/share', methods=['POST'])
def create_share_link():
    """Create shareable link for results"""
    try:
        data = request.get_json()
        assessment_id = data.get('assessment_id')

        if not assessment_id:
            return jsonify({'error': 'Assessment ID required'}), 400

        # Create share data (without sensitive details)
        share_data = {
            'id': assessment_id,
            'timestamp': data.get('timestamp'),
            'overall_score': data.get('overall_score'),
            'assessment_mode': data.get('assessment_mode', 'full'),
            'message': 'I just completed a mental health check-in with MindScope!'
        }

        # Save share data
        share_file = Config.DATA_DIR / "shared_results.jsonl"
        with open(share_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(share_data) + '\n')

        # Generate share URL (adjust domain for production)
        share_url = f"http://localhost:8000/share/{assessment_id}"

        return jsonify({
            'share_url': share_url,
            'social_text': f"I just took a mental wellness check-in and learned valuable insights about my wellbeing! Take yours at MindScope 🧠✨ {share_url}",
            'assessment_id': assessment_id
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/upload', methods=['POST'])
def upload_dataset():
    """Admin endpoint for uploading new datasets"""
    try:
        # Simple password protection (enhance for production)
        password = request.headers.get('X-Admin-Password')
        if password != 'mindscope2024':  # Change this!
            return jsonify({'error': 'Unauthorized'}), 401

        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not file.filename.endswith('.csv'):
            return jsonify({'error': 'Only CSV files allowed'}), 400

        # Save uploaded file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"uploaded_data_{timestamp}.csv"
        filepath = Config.DATA_DIR / filename

        file.save(filepath)

        return jsonify({
            'status': 'success',
            'message': 'Dataset uploaded successfully',
            'filename': filename,
            'path': str(filepath)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def save_assessment_data(answers, predictions, timestamp, assessment_id, mode):
    """Save assessment data for analytics"""
    try:
        data_file = Config.DATA_DIR / "user_assessments.jsonl"

        assessment_record = {
            'id': assessment_id,
            'timestamp': timestamp,
            'mode': mode,
            'answers': answers,
            'predictions': {k: {
                'category': v['category'],
                'confidence': v['confidence']
            } for k, v in predictions.items()},
            'question_count': len(answers)
        }

        with open(data_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(assessment_record) + '\n')

    except Exception as e:
        print(f"Error saving assessment data: {e}")


@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    """Enhanced feedback submission"""
    try:
        data = request.get_json()

        feedback_file = Config.DATA_DIR / "feedback.jsonl"

        feedback_record = {
            'timestamp': datetime.now().isoformat(),
            'assessment_id': data.get('assessment_id'),
            'feedback': data.get('feedback'),
            'rating': data.get('rating'),
            'feature_suggestions': data.get('feature_suggestions', []),
            'user_type': data.get('user_type', 'general')  # student, professional, etc.
        }

        with open(feedback_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(feedback_record) + '\n')

        return jsonify({
            'status': 'success',
            'message': 'Thank you for your feedback! It helps us improve MindScope.'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("🚀 Starting MindScope Enhanced Backend")
    print(f"📊 Data directory: {Config.DATA_DIR}")
    print(f"🤖 Models directory: {Config.MODELS_DIR}")
    app.run(
        host=Config.API_HOST,
        port=Config.API_PORT,
        debug=Config.DEBUG
    )
