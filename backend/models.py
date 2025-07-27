import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib
import json
from datetime import datetime
from pathlib import Path
from config import Config


class MentalHealthModel:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.label_encoders = {}
        self.feature_names = []
        self.target_columns = [
            'Depression_Category',
            'Anxiety_Category',
            'Stress_Category',
            'Wellbeing_Category',
            'Overall_Wellbeing_Category'
        ]

    def load_and_prepare_data(self, main_csv_path, student_csv_path=None):
        """Load and prepare training data from both datasets"""
        try:
            # Load main dataset
            df_main = pd.read_csv(main_csv_path)
            print(f"Loaded main dataset: {len(df_main)} samples, {len(df_main.columns)} features")

            # Load student dataset if provided
            if student_csv_path and Path(student_csv_path).exists():
                df_student = pd.read_csv(student_csv_path)
                print(f"Loaded student dataset: {len(df_student)} samples")

                # Process student data for validation
                self.process_student_data(df_student)

            # Identify feature columns (exclude target columns and derived scores)
            exclude_cols = [
                'Depression_Category', 'Anxiety_Category', 'Stress_Category',
                'Wellbeing_Category', 'Overall_Wellbeing_Category',
                'phq_score', 'gad_score', 'dass_s_score_raw', 'dass_s_score_interpreted',
                'who_score_raw', 'who_score_interpreted', 'coping_score',
                'clinical_consistency_score'
            ]

            feature_cols = [col for col in df_main.columns if col not in exclude_cols]
            self.feature_names = feature_cols

            X = df_main[feature_cols]
            y_dict = {target: df_main[target] for target in self.target_columns if target in df_main.columns}

            print(f"Features: {len(feature_cols)} columns")
            print(f"Targets: {list(y_dict.keys())}")

            return X, y_dict

        except Exception as e:
            print(f"Error loading data: {e}")
            return None, None

    def process_student_data(self, df_student):
        """Process student dataset for validation"""
        try:
            # Convert categorical to numeric
            df_student['Depression_Binary'] = df_student['Do you have Depression?'].apply(
                lambda x: 1 if str(x).lower().startswith('y') else 0
            )
            df_student['Anxiety_Binary'] = df_student['Do you have Anxiety?'].apply(
                lambda x: 1 if str(x).lower().startswith('y') else 0
            )
            df_student['PanicAttack_Binary'] = df_student['Do you have Panic attack?'].apply(
                lambda x: 1 if str(x).lower().startswith('y') else 0
            )

            # Store for later validation
            self.student_validation_data = df_student

            print("Student data processed for validation:")
            print(
                f"- Depression: {df_student['Depression_Binary'].sum()}/{len(df_student)} ({df_student['Depression_Binary'].mean():.2%})")
            print(
                f"- Anxiety: {df_student['Anxiety_Binary'].sum()}/{len(df_student)} ({df_student['Anxiety_Binary'].mean():.2%})")
            print(
                f"- Panic: {df_student['PanicAttack_Binary'].sum()}/{len(df_student)} ({df_student['PanicAttack_Binary'].mean():.2%})")

        except Exception as e:
            print(f"Error processing student data: {e}")

    def train_models(self, main_csv_path=None, student_csv_path=None):
        """Train models on the provided datasets"""
        if main_csv_path is None:
            main_csv_path = Config.DATA_DIR / "mental_health_data.csv"

        if student_csv_path is None:
            student_csv_path = Config.DATA_DIR / "Student_Mental_health.csv"

        X, y_dict = self.load_and_prepare_data(main_csv_path, student_csv_path)
        if X is None:
            return False

        # Split data
        X_train, X_test, y_train_dict, y_test_dict = self.train_test_split_multiple(X, y_dict)

        # Scale features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        print("\n🚀 Training enhanced models...")

        # Store training metrics
        self.training_metrics = {}

        for target in self.target_columns:
            if target not in y_dict:
                continue

            print(f"\n📊 Training {target} model...")

            # Encode labels
            le = LabelEncoder()
            y_train_encoded = le.fit_transform(y_train_dict[target])
            y_test_encoded = le.transform(y_test_dict[target])

            # Train enhanced model
            model = RandomForestClassifier(
                n_estimators=150,  # Increased for better performance
                max_depth=15,
                min_samples_split=3,
                min_samples_leaf=1,
                random_state=42,
                class_weight='balanced'  # Handle class imbalance
            )

            model.fit(X_train_scaled, y_train_encoded)

            # Evaluate
            y_pred = model.predict(X_test_scaled)
            accuracy = accuracy_score(y_test_encoded, y_pred)

            # Cross-validation
            cv_scores = cross_val_score(model, X_train_scaled, y_train_encoded, cv=5)

            # Store metrics
            self.training_metrics[target] = {
                'accuracy': accuracy,
                'cv_mean': cv_scores.mean(),
                'cv_std': cv_scores.std(),
                'classes': le.classes_.tolist()
            }

            print(f"✅ {target}:")
            print(f"   Accuracy: {accuracy:.3f}")
            print(f"   CV Score: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")
            print(f"   Classes: {le.classes_}")

            # Store model and encoder
            self.models[target] = model
            self.label_encoders[target] = le

        # Save models
        self.save_models()
        print("\n✅ Models trained and saved successfully!")

        # Print overall performance summary
        self.print_performance_summary()

        return True

    def print_performance_summary(self):
        """Print overall model performance summary"""
        print("\n📈 TRAINING SUMMARY")
        print("=" * 50)

        for target, metrics in self.training_metrics.items():
            display_name = target.replace('_Category', '').replace('_', ' ')
            print(
                f"{display_name:20} | ACC: {metrics['accuracy']:.3f} | CV: {metrics['cv_mean']:.3f}±{metrics['cv_std']:.3f}")

        avg_accuracy = np.mean([m['accuracy'] for m in self.training_metrics.values()])
        avg_cv = np.mean([m['cv_mean'] for m in self.training_metrics.values()])

        print("-" * 50)
        print(f"{'AVERAGE':20} | ACC: {avg_accuracy:.3f} | CV: {avg_cv:.3f}")
        print("=" * 50)

    def train_test_split_multiple(self, X, y_dict, test_size=0.2, random_state=42):
        """Split data for multiple targets consistently"""
        # Use the first target for consistent splitting
        first_target = list(y_dict.keys())[0]
        X_train, X_test, _, _ = train_test_split(
            X, y_dict[first_target],
            test_size=test_size,
            random_state=random_state,
            stratify=y_dict[first_target]
        )

        # Get corresponding y splits
        train_idx = X_train.index
        test_idx = X_test.index

        y_train_dict = {target: y[train_idx] for target, y in y_dict.items()}
        y_test_dict = {target: y[test_idx] for target, y in y_dict.items()}

        return X_train, X_test, y_train_dict, y_test_dict

    def predict_from_answers(self, answers, questions_data, assessment_mode='full'):
        """Predict categories from user answers with assessment mode support"""
        try:
            # Load models if not already loaded
            if not self.models:
                self.load_models()

            # Create feature vector from answers
            features = self.create_feature_vector_from_answers(answers, questions_data)

            if features is None:
                return self._get_fallback_predictions(answers, questions_data)

            # Scale features
            if hasattr(self, 'scaler') and self.scaler:
                features_scaled = self.scaler.transform(features.reshape(1, -1))
            else:
                features_scaled = features.reshape(1, -1)

            predictions = {}

            # Make predictions for each target
            for target in self.target_columns:
                if target in self.models:
                    model = self.models[target]
                    label_encoder = self.label_encoders.get(target)

                    pred = model.predict(features_scaled)[0]
                    prob = model.predict_proba(features_scaled)[0]

                    if label_encoder:
                        pred_label = label_encoder.inverse_transform([pred])[0]
                        probabilities = {
                            label_encoder.classes_[i]: float(prob[i])
                            for i in range(len(prob))
                        }
                    else:
                        pred_label = pred
                        probabilities = {}

                    # Adjust confidence based on assessment mode
                    confidence = float(max(prob))
                    if assessment_mode == 'quick':
                        confidence *= 0.85  # Slightly lower confidence for quick assessments

                    predictions[target] = {
                        'category': pred_label,
                        'confidence': confidence,
                        'probabilities': probabilities,
                        'assessment_mode': assessment_mode
                    }

            return predictions

        except Exception as e:
            print(f"Prediction error: {e}")
            return self._get_fallback_predictions(answers, questions_data)

    def create_feature_vector_from_answers(self, answers, questions_data):
        """Create feature vector matching training data structure"""
        try:
            # Initialize feature vector with zeros
            if not self.feature_names:
                return None

            features = np.zeros(len(self.feature_names))

            # Map answers to feature positions
            for i, feature_name in enumerate(self.feature_names):
                if feature_name in answers:
                    features[i] = answers[feature_name]

            return features

        except Exception as e:
            print(f"Error creating feature vector: {e}")
            return None

    def get_quick_assessment_questions(self, questions, num_questions=12):
        """Select balanced questions for quick assessment"""
        try:
            # Group questions by category/domain
            categories = {}
            for q in questions:
                cat = q.get('section', 'general')
                if cat not in categories:
                    categories[cat] = []
                categories[cat].append(q)

            # Select questions proportionally from each category
            selected = []
            questions_per_cat = max(1, num_questions // len(categories))

            for cat, cat_questions in categories.items():
                # Randomly sample from this category
                sample_size = min(questions_per_cat, len(cat_questions))
                selected.extend(np.random.choice(cat_questions, sample_size, replace=False))

            # If we need more questions, add randomly from remaining
            if len(selected) < num_questions:
                remaining = [q for q in questions if q not in selected]
                additional_needed = num_questions - len(selected)
                if remaining:
                    additional = np.random.choice(remaining,
                                                  min(additional_needed, len(remaining)),
                                                  replace=False)
                    selected.extend(additional)

            return selected[:num_questions]

        except Exception as e:
            print(f"Error selecting quick questions: {e}")
            return questions[:num_questions]  # Fallback to first N questions

    def _get_fallback_predictions(self, answers, questions_data):
        """Enhanced fallback rule-based predictions"""
        # Calculate basic scores from different question types
        phq_questions = [f'phq_{i}' for i in range(1, 10)]
        gad_questions = [f'gad_{i}' for i in range(1, 8)]
        dass_questions = [f'dass_s_{i}' for i in range(1, 8)]
        who_questions = [f'who_{i}' for i in range(1, 6)]
        coping_questions = [f'coping_{i}' for i in range(1, 4)]

        phq_score = sum([answers.get(q, 0) for q in phq_questions])
        gad_score = sum([answers.get(q, 0) for q in gad_questions])
        dass_score = sum([answers.get(q, 0) for q in dass_questions])
        who_score = sum([answers.get(q, 3) for q in who_questions])  # Default to middle
        coping_score = sum([answers.get(q, 0) for q in coping_questions])

        # Enhanced categorization thresholds
        def categorize_symptoms(score, max_score, thresholds):
            if score <= thresholds[0]:
                return 'Low Concern'
            elif score <= thresholds[1]:
                return 'Mild to Moderate Concern'
            else:
                return 'High Concern'

        def categorize_wellbeing(score, max_score=25):
            percentage = (score / max_score) * 100
            if percentage >= 75:
                return 'High Well-being'
            elif percentage >= 50:
                return 'Moderate Well-being'
            else:
                return 'Low Well-being'

        # Calculate overall wellbeing based on multiple factors
        total_negative = phq_score + gad_score + dass_score + coping_score
        total_positive = who_score

        overall_ratio = total_positive / max(1, total_negative + total_positive)

        if overall_ratio > 0.6:
            overall_wellbeing = 'High Well-being'
        elif overall_ratio > 0.4:
            overall_wellbeing = 'Moderate Well-being'
        else:
            overall_wellbeing = 'Low Well-being'

        predictions = {
            'Depression_Category': {
                'category': categorize_symptoms(phq_score, 27, [5, 10]),
                'confidence': 0.75,
                'probabilities': {},
                'assessment_mode': 'fallback'
            },
            'Anxiety_Category': {
                'category': categorize_symptoms(gad_score, 21, [5, 10]),
                'confidence': 0.75,
                'probabilities': {},
                'assessment_mode': 'fallback'
            },
            'Stress_Category': {
                'category': categorize_symptoms(dass_score, 21, [8, 13]),
                'confidence': 0.75,
                'probabilities': {},
                'assessment_mode': 'fallback'
            },
            'Wellbeing_Category': {
                'category': categorize_wellbeing(who_score),
                'confidence': 0.75,
                'probabilities': {},
                'assessment_mode': 'fallback'
            },
            'Overall_Wellbeing_Category': {
                'category': overall_wellbeing,
                'confidence': 0.70,
                'probabilities': {},
                'assessment_mode': 'fallback'
            }
        }

        return predictions

    def load_models(self):
        """Load trained models"""
        try:
            models_dir = Config.MODELS_DIR

            # Load scaler
            scaler_path = models_dir / "scaler.joblib"
            if scaler_path.exists():
                self.scaler = joblib.load(scaler_path)

            # Load models and label encoders
            for target in self.target_columns:
                model_path = models_dir / f"{target}_model.joblib"
                encoder_path = models_dir / f"{target}_label_encoder.joblib"

                if model_path.exists():
                    self.models[target] = joblib.load(model_path)

                if encoder_path.exists():
                    self.label_encoders[target] = joblib.load(encoder_path)

            # Load metadata
            metadata_path = models_dir / "model_metadata.json"
            if metadata_path.exists():
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                    self.feature_names = metadata.get('feature_names', [])

        except Exception as e:
            print(f"Model loading error: {e}")

    def save_models(self):
        """Save trained models with enhanced metadata"""
        try:
            models_dir = Config.MODELS_DIR
            models_dir.mkdir(exist_ok=True)

            # Save scaler
            if hasattr(self, 'scaler') and self.scaler:
                joblib.dump(self.scaler, models_dir / "scaler.joblib")

            # Save models and label encoders
            for target in self.target_columns:
                if target in self.models:
                    joblib.dump(self.models[target], models_dir / f"{target}_model.joblib")

                if target in self.label_encoders:
                    joblib.dump(self.label_encoders[target], models_dir / f"{target}_label_encoder.joblib")

            # Save enhanced metadata
            metadata = {
                'feature_names': self.feature_names,
                'target_columns': self.target_columns,
                'training_metrics': getattr(self, 'training_metrics', {}),
                'timestamp': datetime.now().isoformat(),
                'model_version': '2.0',
                'student_data_integrated': hasattr(self, 'student_validation_data')
            }

            with open(models_dir / "model_metadata.json", 'w') as f:
                json.dump(metadata, f, indent=2)

            print(f"💾 Models saved to {models_dir}")

        except Exception as e:
            print(f"Model saving error: {e}")


class RecommendationEngine:
    def __init__(self):
        self.recommendations_db = {
            'High Concern': [
                {
                    'icon': '👩‍⚕️',
                    'title': 'Consider Professional Support',
                    'description': 'Your responses suggest you might benefit from speaking with a mental health professional. This is a positive step toward better wellbeing.',
                    'category': 'professional',
                    'urgency': 'high',
                    'link': '/resources#professional-help'
                },
                {
                    'icon': '🧘‍♀️',
                    'title': 'Daily Mindfulness Practice',
                    'description': 'Try 10-15 minutes of daily meditation, deep breathing, or mindfulness exercises to help manage stress and improve emotional regulation.',
                    'category': 'self_help',
                    'urgency': 'medium',
                    'link': '/resources#mindfulness'
                },
                {
                    'icon': '📞',
                    'title': 'Crisis Resources Available',
                    'description': 'If you\'re in crisis, remember that help is available 24/7. You don\'t have to face this alone.',
                    'category': 'crisis',
                    'urgency': 'high',
                    'link': '/resources#crisis'
                }
            ],
            'Mild to Moderate Concern': [
                {
                    'icon': '💬',
                    'title': 'Connect with Others',
                    'description': 'Reach out to trusted friends, family, or support groups. Social connection is a powerful factor in mental wellbeing.',
                    'category': 'social',
                    'urgency': 'medium',
                    'link': '/resources#social-support'
                },
                {
                    'icon': '🏃‍♂️',
                    'title': 'Regular Physical Activity',
                    'description': 'Engage in 30 minutes of physical activity most days. Exercise can significantly boost mood, energy, and overall mental health.',
                    'category': 'lifestyle',
                    'urgency': 'medium',
                    'link': '/resources#exercise'
                },
                {
                    'icon': '📚',
                    'title': 'Self-Help Resources',
                    'description': 'Explore evidence-based self-help resources, apps, or workbooks designed for managing stress, anxiety, or mood.',
                    'category': 'self_help',
                    'urgency': 'low',
                    'link': '/resources#self-help'
                }
            ],
            'Low Concern': [
                {
                    'icon': '✅',
                    'title': 'Maintain Current Strategies',
                    'description': 'Your mental health appears well-managed. Continue practicing the self-care strategies that are working for you.',
                    'category': 'maintenance',
                    'urgency': 'low',
                    'link': '/resources#maintenance'
                },
                {
                    'icon': '🌱',
                    'title': 'Build Resilience',
                    'description': 'Consider building on your strong foundation with resilience practices like gratitude, goal-setting, or new hobbies.',
                    'category': 'growth',
                    'urgency': 'low',
                    'link': '/resources#resilience'
                }
            ],
            'High Well-being': [
                {
                    'icon': '🌟',
                    'title': 'Share Your Journey',
                    'description': 'Consider helping others by sharing strategies that work for your mental health or volunteering in your community.',
                    'category': 'community',
                    'urgency': 'low',
                    'link': '/resources#community'
                },
                {
                    'icon': '💚',
                    'title': 'Maintain & Inspire',
                    'description': 'Keep up the excellent work with your mental health practices. You\'re an inspiration to others on their wellness journey.',
                    'category': 'celebration',
                    'urgency': 'low',
                    'link': '/resources#celebration'
                }
            ],
            'Moderate Well-being': [
                {
                    'icon': '⚖️',
                    'title': 'Find Balance',
                    'description': 'Focus on finding balance in different areas of your life. Small, consistent changes can lead to meaningful improvements.',
                    'category': 'balance',
                    'urgency': 'medium',
                    'link': '/resources#balance'
                }
            ],
            'Low Well-being': [
                {
                    'icon': '🌅',
                    'title': 'Start Small',
                    'description': 'Begin with small, manageable steps toward better wellbeing. Every positive action counts toward your mental health journey.',
                    'category': 'starter',
                    'urgency': 'medium',
                    'link': '/resources#getting-started'
                }
            ]
        }

    def get_recommendations(self, predictions, limit=3):
        """Get personalized recommendations based on predictions"""
        recommendations = []

        # Collect recommendations from all prediction categories
        for target, result in predictions.items():
            category_level = result['category']
            confidence = result['confidence']
            assessment_mode = result.get('assessment_mode', 'full')

            # Get recommendations for this category level
            category_recs = self.recommendations_db.get(category_level, [])

            for rec in category_recs:
                rec_copy = rec.copy()
                rec_copy['source_category'] = target
                rec_copy['confidence'] = confidence
                rec_copy['assessment_mode'] = assessment_mode
                recommendations.append(rec_copy)

        # Remove duplicates and sort by urgency and confidence
        unique_recs = []
        seen_titles = set()

        for rec in recommendations:
            if rec['title'] not in seen_titles:
                unique_recs.append(rec)
                seen_titles.add(rec['title'])

        # Sort by urgency (high first) and confidence
        urgency_order = {'high': 3, 'medium': 2, 'low': 1}
        unique_recs.sort(
            key=lambda x: (urgency_order.get(x['urgency'], 0), x['confidence']),
            reverse=True
        )

        return unique_recs[:limit]
