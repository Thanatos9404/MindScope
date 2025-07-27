/*  MindScope Enhanced - Complete Frontend with User Data & Email Features */

class MindScope {
    constructor() {
        this.apiBaseUrl = 'http://localhost:5000/api';

        // Core state
        this.questionsData = null;
        this.questions = [];
        this.currentIndex = 0;
        this.answers = {};
        this.resultsPayload = null;
        this.assessmentMode = 'full';

        // User demographics
        this.userData = {
            name: '',
            email: '',
            ageRange: '',
            timestamp: null,
            sessionId: this.generateSessionId()
        };

        // Chart management
        this.currentChart = null;
        this.chartType = 'radar';

        // Share data
        this.shareData = null;

        this.init();
    }

    async init() {
        console.log('🚀 Initializing MindScope Enhanced...');
        this.showPage('home');
        await this.loadQuestions();
        this.setupEventListeners();
        this.bindGlobals();
        console.log('✅ MindScope initialized successfully');
    }

    bindGlobals() {
        window.showPage = (page) => this.showPage(page);
        window.goHome = () => this.goHome();
        window.scrollToAssessment = () => this.scrollToAssessment();
        window.previousQuestion = () => this.previousQuestion();
        window.nextQuestion = () => this.nextQuestion();
        window.selectAge = (age) => this.selectAge(age);
        window.proceedToAssessment = () => this.proceedToAssessment();
        window.mindScope = this;
    }

    generateSessionId() {
        return 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
    }

    async loadQuestions() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/questions`);
            if (response.ok) {
                this.questionsData = await response.json();
                console.log('📋 Questions loaded:', this.questionsData.total_questions || 0, 'total questions');
            } else {
                throw new Error('Failed to load questions');
            }
        } catch (error) {
            console.warn('⚠️ Backend unavailable, using fallback questions');
            this.questionsData = this.getFallbackQuestions();
        }
    }

    // =================
    // PAGE MANAGEMENT
    // =================

    showPage(pageId) {
        console.log(`📍 Navigating to page: ${pageId}`);

        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            targetPage.classList.add('active');

            if (pageId === 'results') {
                this.initializeResults();
            }

            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);

            console.log(`✅ Successfully navigated to ${pageId} page`);
        } else {
            console.error(`❌ Page ${pageId}-page not found!`);
        }
    }

    goHome() {
        console.log('🏠 Going home with proper scroll');
        this.showPage('home');
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 200);
    }

    scrollToAssessment() {
        console.log('📍 Scrolling to assessment mode selection');
        this.showPage('home');
        setTimeout(() => {
            const assessmentModes = document.querySelector('.assessment-modes');
            if (assessmentModes) {
                assessmentModes.scrollIntoView({ behavior: 'smooth' });
                console.log('✅ Scrolled to assessment modes');
            }
        }, 100);
    }

    // =================
    // USER DATA COLLECTION
    // =================

    async startAssessment(mode = 'full') {
        console.log(`🎯 Starting ${mode} assessment with user info collection`);
        this.assessmentMode = mode;

        // Navigate to user info page first
        this.showPage('user-info');
    }

    selectAge(ageRange) {
        // Update radio button
        document.querySelectorAll('.age-option input[type="radio"]').forEach(radio => {
            radio.checked = radio.value === ageRange;
        });

        // Update visual selection
        document.querySelectorAll('.age-option').forEach(option => {
            option.classList.remove('selected');
        });

        const selectedOption = document.querySelector(`input[value="${ageRange}"]`).closest('.age-option');
        selectedOption.classList.add('selected');

        // Store age range
        this.userData.ageRange = ageRange;

        // Check form completion
        this.checkFormCompletion();

        console.log('📅 Age selected:', ageRange);
    }

    checkFormCompletion() {
        const name = document.getElementById('user-name').value.trim();
        const email = document.getElementById('user-email').value.trim();
        const ageSelected = this.userData.ageRange !== '';

        const proceedBtn = document.getElementById('proceed-btn');

        if (name && email && ageSelected && this.isValidEmail(email)) {
            proceedBtn.disabled = false;
            proceedBtn.classList.add('form-complete');
        } else {
            proceedBtn.disabled = true;
            proceedBtn.classList.remove('form-complete');
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async proceedToAssessment() {
        // Collect form data
        const name = document.getElementById('user-name').value.trim();
        const email = document.getElementById('user-email').value.trim();

        // Validate form
        if (!name || !email || !this.userData.ageRange || !this.isValidEmail(email)) {
            alert('Please fill in all fields with valid information.');
            return;
        }

        // Store user data
        this.userData.name = name;
        this.userData.email = email;
        this.userData.timestamp = new Date().toISOString();

        console.log('👤 User data collected:', this.userData);

        // Save to backend
        await this.saveUserData();

        // Load questions and start assessment
        try {
            const response = await fetch(`${this.apiBaseUrl}/questions?mode=${this.assessmentMode}`);
            if (response.ok) {
                this.questionsData = await response.json();
                this.questions = this.processQuestionsForMode(this.questionsData, this.assessmentMode);
            } else {
                this.questions = this.getFallbackQuestionsArray(this.assessmentMode);
            }
        } catch (error) {
            console.warn('Using fallback questions for', this.assessmentMode);
            this.questions = this.getFallbackQuestionsArray(this.assessmentMode);
        }

        this.currentIndex = 0;
        this.answers = {};

        console.log(`📊 Loaded ${this.questions.length} questions for ${this.assessmentMode} mode`);

        this.showPage('assessment');
        this.updateAssessmentMode();
        this.renderQuestion();
        this.updateProgress();
        this.generateDots();
    }

    async saveUserData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/save-user-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.userData)
            });

            if (response.ok) {
                console.log('✅ User data saved successfully');
            } else {
                console.warn('⚠️ Failed to save user data to backend');
            }
        } catch (error) {
            console.warn('⚠️ Backend unavailable, user data stored locally only');
        }

        // Always store locally as backup
        localStorage.setItem('mindscope-user-data', JSON.stringify(this.userData));
    }

    // =================
    // ASSESSMENT FLOW
    // =================

    processQuestionsForMode(data, mode) {
        let questions = [];

        if (mode === 'quick' && data.quick_questions) {
            questions = data.quick_questions.map(q => ({
                ...q,
                section: q.section_name || 'General',
                options: q.options || []
            }));
        } else if (data.sections) {
            data.sections.forEach(section => {
                section.questions.forEach(question => {
                    const options = data.option_sets?.[question.options_id] || [];
                    questions.push({
                        ...question,
                        options: options,
                        section: section.category
                    });
                });
            });

            if (mode === 'quick') {
                questions = this.selectQuickQuestions(questions, 12);
            }
        }

        return questions;
    }

    selectQuickQuestions(allQuestions, count = 12) {
        const sections = {};
        allQuestions.forEach(q => {
            const section = q.section || 'General';
            if (!sections[section]) sections[section] = [];
            sections[section].push(q);
        });

        const selected = [];
        const sectionsArray = Object.keys(sections);
        const questionsPerSection = Math.floor(count / sectionsArray.length);

        sectionsArray.forEach(sectionName => {
            const sectionQuestions = sections[sectionName];
            const toSelect = Math.min(questionsPerSection, sectionQuestions.length);
            for (let i = 0; i < toSelect; i++) {
                selected.push(sectionQuestions[i]);
            }
        });

        while (selected.length < count && selected.length < allQuestions.length) {
            const remaining = allQuestions.filter(q => !selected.includes(q));
            if (remaining.length > 0) {
                selected.push(remaining[Math.floor(Math.random() * remaining.length)]);
            } else {
                break;
            }
        }

        return selected.slice(0, count);
    }

    updateAssessmentMode() {
        const badge = document.getElementById('assessment-mode-badge');
        const modeText = document.getElementById('mode-text');
        const totalQuestions = document.getElementById('total-questions');

        if (badge && modeText) {
            if (this.assessmentMode === 'quick') {
                modeText.textContent = '⚡ Quick Check-in';
                badge.style.background = 'var(--gradient-success)';
            } else {
                modeText.textContent = '🧠 Complete Assessment';
                badge.style.background = 'var(--gradient-primary)';
            }
        }

        if (totalQuestions) {
            totalQuestions.textContent = this.questions.length;
        }
    }

    renderQuestion() {
        const question = this.questions[this.currentIndex];
        if (!question) {
            console.error('No question found at index', this.currentIndex);
            return;
        }

        console.log(`Rendering question ${this.currentIndex + 1}: ${question.text.substring(0, 50)}...`);

        const sectionEl = document.getElementById('question-section');
        if (sectionEl) {
            sectionEl.textContent = question.section || 'Assessment';
        }

        const questionText = document.getElementById('question-text');
        if (questionText) {
            questionText.textContent = question.text;
        }

        const currentQuestion = document.getElementById('current-question');
        if (currentQuestion) {
            currentQuestion.textContent = this.currentIndex + 1;
        }

        this.renderAnswerOptions(question);
        this.updateNavigationState();
        this.updateEstimatedTime();
    }

    renderAnswerOptions(question) {
        const optionsContainer = document.getElementById('answer-options');
        if (!optionsContainer) return;

        optionsContainer.innerHTML = '';

        if (!question.options || question.options.length === 0) {
            console.error('No options found for question:', question.id);
            optionsContainer.innerHTML = '<p>Error: No options available for this question.</p>';
            return;
        }

        question.options.forEach((option) => {
            const button = document.createElement('button');
            button.className = 'answer-option';
            button.dataset.value = option.value;

            const emoji = option.emoji ? `${option.emoji} ` : '';
            button.innerHTML = `${emoji}${option.label}`;

            if (this.answers[question.id] === option.value) {
                button.classList.add('selected');
            }

            button.addEventListener('click', () => {
                this.selectAnswer(question.id, option.value, button);
            });

            optionsContainer.appendChild(button);
        });
    }

    selectAnswer(questionId, value, buttonElement) {
        this.answers[questionId] = value;

        document.querySelectorAll('.answer-option').forEach(btn => {
            btn.classList.remove('selected');
        });
        buttonElement.classList.add('selected');

        this.updateDots();

        console.log(`Answer selected: ${questionId} = ${value}`);

        setTimeout(() => {
            if (this.currentIndex < this.questions.length - 1) {
                this.nextQuestion();
            } else {
                this.completeAssessment();
            }
        }, 600);
    }

    nextQuestion() {
        if (this.currentIndex < this.questions.length - 1) {
            this.currentIndex++;
            this.renderQuestion();
            this.updateProgress();
            this.updateDots();
        }
    }

    previousQuestion() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.renderQuestion();
            this.updateProgress();
            this.updateDots();
        }
    }

    updateProgress() {
        const progress = ((this.currentIndex + 1) / this.questions.length) * 100;

        const progressFill = document.getElementById('progress-fill');
        const progressPercent = document.getElementById('progress-percent');

        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }

        if (progressPercent) {
            progressPercent.textContent = Math.round(progress);
        }
    }

    updateEstimatedTime() {
        const remaining = this.questions.length - this.currentIndex - 1;
        const timePerQuestion = this.assessmentMode === 'quick' ? 30 : 45;
        const estimatedMinutes = Math.ceil((remaining * timePerQuestion) / 60);

        const timeEl = document.getElementById('estimated-time');
        if (timeEl) {
            timeEl.textContent = Math.max(0, estimatedMinutes);
        }
    }

    generateDots() {
        const dotsContainer = document.getElementById('question-dots');
        if (!dotsContainer) return;

        dotsContainer.innerHTML = '';

        this.questions.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.className = 'dot';
            if (index === this.currentIndex) {
                dot.classList.add('active');
            }
            dotsContainer.appendChild(dot);
        });

        this.updateDots();
    }

    updateDots() {
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentIndex);
            dot.classList.toggle('completed',
                index < this.currentIndex ||
                this.answers[this.questions[index]?.id] !== undefined
            );
        });
    }

    updateNavigationState() {
        const prevBtn = document.getElementById('prev-btn');
        if (prevBtn) {
            prevBtn.disabled = this.currentIndex === 0;
        }
    }

    // =================
    // ASSESSMENT COMPLETION
    // =================

    async completeAssessment() {
        console.log('🎉 Assessment completed!');
        this.showLoadingState();

        try {
            const assessmentData = {
                user_data: this.userData,
                answers: this.answers,
                mode: this.assessmentMode,
                timestamp: new Date().toISOString(),
                session_id: this.userData.sessionId
            };

            const response = await fetch(`${this.apiBaseUrl}/assess`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assessmentData)
            });

            if (response.ok) {
                this.resultsPayload = await response.json();
                console.log('✅ Results received from backend:', this.resultsPayload);
            } else {
                throw new Error('Assessment failed');
            }
        } catch (error) {
            console.warn('Using fallback results');
            this.resultsPayload = this.generateFallbackResults();
        }

        // Include user data in results
        this.resultsPayload.user_data = this.userData;

        localStorage.setItem('mindscope-results', JSON.stringify(this.resultsPayload));
        this.showPage('results');
    }

    showLoadingState() {
        const questionCard = document.querySelector('.question-card');
        if (questionCard) {
            questionCard.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <div>
                        <h3>Analyzing your responses...</h3>
                        <p>Generating personalized insights just for you</p>
                    </div>
                </div>`;
        }
    }

    generateFallbackResults() {
        console.log('📊 Generating fallback results from answers:', this.answers);

        const scoreGroups = {
            depression: { total: 0, count: 0, questions: [] },
            anxiety: { total: 0, count: 0, questions: [] },
            stress: { total: 0, count: 0, questions: [] },
            wellbeing: { total: 0, count: 0, questions: [] }
        };

        Object.entries(this.answers).forEach(([questionId, value]) => {
            if (questionId.startsWith('phq_')) {
                scoreGroups.depression.total += value;
                scoreGroups.depression.count++;
                scoreGroups.depression.questions.push(questionId);
            } else if (questionId.startsWith('gad_')) {
                scoreGroups.anxiety.total += value;
                scoreGroups.anxiety.count++;
                scoreGroups.anxiety.questions.push(questionId);
            } else if (questionId.startsWith('dass_')) {
                scoreGroups.stress.total += value;
                scoreGroups.stress.count++;
                scoreGroups.stress.questions.push(questionId);
            } else if (questionId.startsWith('who_') || questionId.startsWith('sleep_')) {
                scoreGroups.wellbeing.total += value;
                scoreGroups.wellbeing.count++;
                scoreGroups.wellbeing.questions.push(questionId);
            }
        });

        const results = {};
        const categoryMappings = {
            depression: { name: 'Mood & Energy', maxScore: 3 },
            anxiety: { name: 'Anxiety Level', maxScore: 3 },
            stress: { name: 'Stress Management', maxScore: 3 },
            wellbeing: { name: 'Overall Wellbeing', maxScore: 5 }
        };

        Object.entries(scoreGroups).forEach(([category, data]) => {
            const mapping = categoryMappings[category];
            let score, level, description;

            if (data.count > 0) {
                const average = data.total / data.count;
                const percentage = (average / mapping.maxScore) * 100;

                if (category === 'wellbeing') {
                    score = Math.round(percentage);
                    if (percentage >= 80) {
                        level = 'High Well-being';
                        description = 'Excellent! You demonstrate strong wellbeing in this area.';
                    } else if (percentage >= 60) {
                        level = 'Moderate Well-being';
                        description = 'Your wellbeing shows room for growth and improvement.';
                    } else {
                        level = 'Low Well-being';
                        description = 'There are opportunities to enhance your wellbeing through positive changes.';
                    }
                } else {
                    score = Math.round(100 - percentage);
                    if (percentage <= 20) {
                        level = 'Low Concern';
                        description = 'Your responses suggest this area is well-managed. Keep up the good work!';
                    } else if (percentage <= 50) {
                        level = 'Mild to Moderate Concern';
                        description = 'Some areas may benefit from attention and self-care practices.';
                    } else {
                        level = 'High Concern';
                        description = 'This area shows signs that may benefit from professional support.';
                    }
                }
            } else {
                score = 75;
                level = 'Moderate Well-being';
                description = 'No specific data available for this category.';
            }

            const targetKey = `${category.charAt(0).toUpperCase() + category.slice(1)}_Category`;
            results[targetKey] = {
                name: mapping.name,
                level: level,
                score: score,
                confidence: 85,
                description: description,
                population_percentile: Math.min(95, Math.max(5, score + Math.floor(Math.random() * 20) - 10)),
                questions_answered: data.count
            };
        });

        const recommendations = this.generateRecommendations(results);
        const overallScore = this.calculateOverallScore(results);
        const chartData = this.generateChartData(results);

        return {
            results: results,
            recommendations: recommendations,
            overall_score: overallScore,
            assessment_mode: this.assessmentMode,
            timestamp: new Date().toISOString(),
            answers_count: Object.keys(this.answers).length,
            chart_data: chartData
        };
    }

    generateChartData(results) {
        const labels = [];
        const scores = [];
        const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

        Object.values(results).forEach((result, index) => {
            labels.push(result.name);
            scores.push(result.score);
        });

        return {
            radar: {
                labels: labels,
                datasets: [{
                    label: 'Your Scores',
                    data: scores,
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    borderColor: '#6366F1',
                    borderWidth: 3,
                    pointBackgroundColor: '#6366F1',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            donut: {
                labels: labels,
                datasets: [{
                    data: scores,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 3,
                    borderColor: '#1A1A2E',
                    hoverBorderWidth: 4
                }]
            },
            bar: {
                labels: labels,
                datasets: [{
                    label: 'Wellness Scores',
                    data: scores,
                    backgroundColor: colors.slice(0, labels.length),
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: colors.slice(0, labels.length)
                }]
            }
        };
    }

    generateRecommendations(results) {
        const recommendations = [];

        Object.entries(results).forEach(([category, result]) => {
            if (result.level.includes('High Concern')) {
                recommendations.push({
                    icon: '👩‍⚕️',
                    title: 'Consider Professional Support',
                    description: `Your ${result.name.toLowerCase()} responses suggest you might benefit from speaking with a mental health professional.`
                });
            } else if (result.level.includes('Moderate')) {
                recommendations.push({
                    icon: '🧘‍♀️',
                    title: 'Practice Self-Care',
                    description: `Focus on ${result.name.toLowerCase()} through mindfulness, exercise, and healthy routines.`
                });
            }
        });

        if (recommendations.length < 3) {
            recommendations.push({
                icon: '🏃‍♂️',
                title: 'Stay Active',
                description: 'Regular physical activity can significantly boost mood and energy levels.'
            });
            recommendations.push({
                icon: '💬',
                title: 'Connect with Others',
                description: 'Maintain social connections and don\'t hesitate to reach out for support.'
            });
        }

        return recommendations.slice(0, 3);
    }

    calculateOverallScore(results) {
        const scores = Object.values(results).map(r => r.score);
        return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    }

    // =================
    // RESULTS PAGE WITH CHARTS
    // =================

    initializeResults() {
        console.log('🎯 Initializing results page...');

        if (!this.resultsPayload) {
            const cached = localStorage.getItem('mindscope-results');
            if (cached) {
                this.resultsPayload = JSON.parse(cached);
                console.log('📊 Loaded cached results:', this.resultsPayload);
            } else {
                console.error('❌ No results found!');
                this.resultsPayload = this.generateFallbackResults();
            }
        }

        setTimeout(() => {
            this.renderResults();
            this.renderChart();
            this.animateResults();
            this.forceDisplayResults();
        }, 100);
    }

    forceDisplayResults() {
        console.log('🔧 Forcing results display...');

        const resultsGrid = document.getElementById('results-grid');
        if (resultsGrid) {
            resultsGrid.style.display = 'grid';
            resultsGrid.style.visibility = 'visible';
            resultsGrid.style.opacity = '1';
            console.log('✅ Results grid forced visible');
        }

        const recommendations = document.getElementById('recommendations');
        if (recommendations) {
            recommendations.style.display = 'block';
            recommendations.style.visibility = 'visible';
            recommendations.style.opacity = '1';
            console.log('✅ Recommendations forced visible');
        }

        document.querySelectorAll('.result-card').forEach((card, index) => {
            card.style.display = 'flex';
            card.style.visibility = 'visible';
            card.style.opacity = '1';
            card.style.animationDelay = `${index * 0.15}s`;
        });

        document.querySelectorAll('.recommendation-card').forEach((card, index) => {
            card.style.display = 'flex';
            card.style.visibility = 'visible';
            card.style.opacity = '1';
            card.style.animationDelay = `${0.6 + index * 0.2}s`;
        });

        console.log('✅ All results elements forced visible');
    }

    renderResults() {
        const { results, recommendations, overall_score } = this.resultsPayload;

        console.log('🎨 Rendering results:', { results, recommendations, overall_score });

        const scoreEl = document.getElementById('overall-score');
        if (scoreEl) {
            scoreEl.textContent = Math.round(overall_score || 75);
        }

        const resultsGrid = document.getElementById('results-grid');
        if (resultsGrid && results) {
            resultsGrid.innerHTML = '';

            Object.entries(results).forEach(([key, result], index) => {
                const card = this.createResultCard(key, result, index);
                resultsGrid.appendChild(card);
            });

            console.log(`✅ Rendered ${Object.keys(results).length} result cards`);
        }

        const recsContainer = document.getElementById('recommendations');
        if (recsContainer && recommendations) {
            recsContainer.innerHTML = `
                <h2>Your Personalized Action Plan</h2>
                <div class="recommendations-grid">
                    ${recommendations.map(rec => `
                        <div class="recommendation-card">
                            <div class="recommendation-icon">${rec.icon}</div>
                            <h4>${rec.title}</h4>
                            <p>${rec.description}</p>
                        </div>
                    `).join('')}
                </div>
            `;

            console.log(`✅ Rendered ${recommendations.length} recommendations`);
        }
    }

    renderChart(type = 'radar') {
        this.chartType = type;

        if (this.currentChart) {
            this.currentChart.destroy();
        }

        const canvas = document.getElementById('results-chart');
        if (!canvas || !this.resultsPayload?.chart_data) {
            console.log('📊 No chart canvas or data found');
            return;
        }

        const ctx = canvas.getContext('2d');
        const chartData = this.resultsPayload.chart_data[type];

        if (!chartData) {
            console.error('No chart data for type:', type);
            return;
        }

        const config = this.getChartConfig(type, chartData);
        this.currentChart = new Chart(ctx, config);

        document.querySelectorAll('.chart-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        const targetTab = document.querySelector(`[onclick*="${type}"]`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        console.log(`📊 Rendered ${type} chart successfully`);
    }

    getChartConfig(type, data) {
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 14,
                            family: 'Inter'
                        },
                        color: '#FFFFFF'
                    }
                }
            }
        };

        switch (type) {
            case 'radar':
                return {
                    type: 'radar',
                    data: data,
                    options: {
                        ...commonOptions,
                        scales: {
                            r: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                    stepSize: 20,
                                    color: '#6B7280',
                                    font: { size: 12 }
                                },
                                grid: {
                                    color: '#374151'
                                },
                                angleLines: {
                                    color: '#374151'
                                },
                                pointLabels: {
                                    color: '#FFFFFF',
                                    font: {
                                        size: 14,
                                        weight: 'bold'
                                    }
                                }
                            }
                        }
                    }
                };

            case 'donut':
                return {
                    type: 'doughnut',
                    data: data,
                    options: {
                        ...commonOptions,
                        cutout: '60%',
                        plugins: {
                            ...commonOptions.plugins,
                            tooltip: {
                                callbacks: {
                                    label: (context) => `${context.label}: ${context.parsed}%`
                                }
                            }
                        }
                    }
                };

            case 'bar':
                return {
                    type: 'bar',
                    data: data,
                    options: {
                        ...commonOptions,
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                    stepSize: 20,
                                    color: '#6B7280'
                                },
                                grid: {
                                    color: '#374151'
                                }
                            },
                            x: {
                                ticks: {
                                    color: '#FFFFFF'
                                },
                                grid: {
                                    color: '#374151'
                                }
                            }
                        }
                    }
                };

            default:
                return { type: 'radar', data: data, options: commonOptions };
        }
    }

    switchChart(type) {
        console.log(`📊 Switching to ${type} chart`);
        this.renderChart(type);
    }

    createResultCard(key, result, index) {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.style.animationDelay = `${index * 0.15}s`;

        const levelClass = this.getLevelClass(result.level);

        card.innerHTML = `
            <div class="result-header">
                <h3>${result.name}</h3>
                <div class="result-score ${levelClass}">${result.level}</div>
            </div>
            <div class="result-bar">
                <div class="result-fill" data-width="${result.score}%"></div>
            </div>
            <p class="result-description">${result.description}</p>
            <div class="result-stats">
                <small>
                    Confidence: ${result.confidence}% | 
                    Percentile: ${result.population_percentile}% | 
                    Questions: ${result.questions_answered || 'N/A'}
                </small>
            </div>
        `;

        return card;
    }

    getLevelClass(level) {
        const l = (level || '').toLowerCase();
        if (l.includes('high') && !l.includes('well')) return 'high';
        if (l.includes('moderate') || l.includes('mild')) return 'moderate';
        return 'low';
    }

    animateResults() {
        setTimeout(() => {
            document.querySelectorAll('.result-fill').forEach((bar, index) => {
                setTimeout(() => {
                    const width = bar.dataset.width;
                    bar.style.width = width;
                    console.log(`Animating bar ${index + 1} to ${width}`);
                }, index * 300);
            });
        }, 500);
    }

    // =================
    // EMAIL FUNCTIONALITY
    // =================

    async emailResults() {
        console.log('📧 Preparing to email results...');

        if (!this.userData.email) {
            alert('No email address found. Please retake the assessment.');
            return;
        }

        const button = document.querySelector('[onclick*="emailResults"]');
        const originalText = button.innerHTML;

        try {
            button.innerHTML = '<div class="spinner" style="width:16px;height:16px;margin-right:8px;"></div>Sending Email...';
            button.disabled = true;

            const emailData = {
                user_data: this.userData,
                results: this.resultsPayload,
                email_type: 'results'
            };

            const response = await fetch(`${this.apiBaseUrl}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(emailData)
            });

            if (response.ok) {
                const result = await response.json();
                this.showEmailSuccess(button, originalText);
                console.log('✅ Email sent successfully:', result);
            } else {
                throw new Error('Email sending failed');
            }

        } catch (error) {
            console.error('❌ Email sending failed:', error);
            this.showEmailError(button, originalText);
        }
    }

    showEmailSuccess(button, originalText) {
        button.innerHTML = '✅ Email Sent!';
        button.style.background = 'var(--gradient-success)';

        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '';
            button.disabled = false;
        }, 3000);
    }

    showEmailError(button, originalText) {
        button.innerHTML = '❌ Email Failed';
        button.style.background = 'var(--danger)';

        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '';
            button.disabled = false;
        }, 3000);

        alert('Failed to send email. Please try downloading the PDF instead.');
    }

    // =================
    // PDF EXPORT
    // =================

    async exportPDF() {
        console.log('📄 Generating branded PDF report...');

        try {
            const button = document.querySelector('[onclick*="exportPDF"]');
            const originalText = button.innerHTML;
            button.innerHTML = '<div class="spinner" style="width:16px;height:16px;margin-right:8px;"></div>Generating PDF...';
            button.disabled = true;

            if (typeof window.jspdf === 'undefined') {
                throw new Error('jsPDF library not loaded');
            }

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');

            await this.addPDFHeader(pdf);
            let yPos = await this.addPDFOverallScore(pdf, 50);
            yPos = await this.addPDFResultsBreakdown(pdf, yPos + 10);
            yPos = await this.addPDFRecommendations(pdf, yPos + 10);
            await this.addPDFChart(pdf, yPos + 10);
            this.addPDFFooter(pdf);

            const timestamp = new Date().toISOString().split('T')[0];
            const mode = this.assessmentMode === 'quick' ? 'Quick' : 'Complete';
            const filename = `MindScope_${mode}_Report_${timestamp}.pdf`;

            pdf.save(filename);
            this.showPDFSuccess(button, originalText);

            console.log('✅ PDF exported successfully:', filename);

        } catch (error) {
            console.error('❌ PDF export failed:', error);
            this.showPDFError();
        }
    }

    addPDFHeader(pdf) {
        pdf.setFillColor(99, 102, 241);
        pdf.rect(0, 0, 210, 45, 'F');

        pdf.setFillColor(26, 26, 46, 0.8);
        pdf.rect(0, 0, 210, 45, 'F');

        pdf.setFillColor(255, 255, 255);
        pdf.circle(25, 22, 10, 'F');
        pdf.setFillColor(99, 102, 241);
        pdf.circle(25, 22, 8, 'F');

        pdf.setDrawColor(255, 255, 255);
        pdf.setLineWidth(1.5);
        pdf.line(20, 22, 23, 25);
        pdf.line(23, 25, 30, 18);

        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(28);
        pdf.text('MindScope', 45, 20);

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Mental Wellness Assessment Report', 45, 28);

        const mode = this.assessmentMode === 'quick' ? 'Quick Check-in' : 'Complete Assessment';
        pdf.setFontSize(10);
        pdf.text(`${mode} • Generated by AI`, 45, 35);

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Kolkata'
        });
        const timeStr = now.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Kolkata'
        });

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.text(`Generated on: ${dateStr} at ${timeStr} IST`, 150, 35);

        return Promise.resolve();
    }

    async addPDFOverallScore(pdf, yPos) {
        const overallScore = this.resultsPayload?.overall_score || 75;

        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.text('Overall Wellness Score', 20, yPos);

        pdf.setFillColor(99, 102, 241);
        pdf.circle(40, yPos + 20, 15, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(24);
        const scoreText = Math.round(overallScore).toString();
        const textWidth = pdf.getTextWidth(scoreText);
        pdf.text(scoreText, 40 - (textWidth/2), yPos + 24);

        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);

        let interpretation = '';
        if (overallScore >= 80) {
            interpretation = 'Excellent overall mental wellness. You demonstrate strong coping skills and positive wellbeing.';
        } else if (overallScore >= 60) {
            interpretation = 'Good mental wellness with some areas for growth. Consider the recommendations below.';
        } else if (overallScore >= 40) {
            interpretation = 'Moderate wellness level. Focus on the suggested strategies for improvement.';
        } else {
            interpretation = 'Areas of concern identified. Consider speaking with a mental health professional.';
        }

        const lines = pdf.splitTextToSize(interpretation, 140);
        pdf.text(lines, 65, yPos + 15);

        return yPos + 45;
    }

    async addPDFResultsBreakdown(pdf, yPos) {
        const results = this.resultsPayload?.results || {};

        if (yPos > 220) {
            pdf.addPage();
            yPos = 20;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text('Detailed Assessment Results', 20, yPos);
        yPos += 10;

        Object.entries(results).forEach(([key, result], index) => {
            if (yPos > 250) {
                pdf.addPage();
                yPos = 20;
            }

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.text(result.name, 20, yPos);

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.text(`${result.score}% - ${result.level}`, 120, yPos);

            pdf.setFillColor(240, 240, 240);
            pdf.rect(20, yPos + 3, 80, 4, 'F');

            const fillWidth = (80 * result.score / 100);
            if (result.level.includes('High') && !result.level.includes('Well')) {
                pdf.setFillColor(239, 68, 68);
            } else if (result.level.includes('Moderate')) {
                pdf.setFillColor(245, 158, 11);
            } else {
                pdf.setFillColor(16, 185, 129);
            }
            pdf.rect(20, yPos + 3, fillWidth, 4, 'F');

            pdf.setFontSize(9);
            pdf.setTextColor(80, 80, 80);
            const descLines = pdf.splitTextToSize(result.description, 170);
            pdf.text(descLines, 20, yPos + 12);

            yPos += 22 + (descLines.length * 3);
            pdf.setTextColor(0, 0, 0);
        });

        return yPos;
    }

    async addPDFRecommendations(pdf, yPos) {
        const recommendations = this.resultsPayload?.recommendations || [];

        if (yPos > 200) {
            pdf.addPage();
            yPos = 20;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text('Personalized Recommendations', 20, yPos);
        yPos += 15;

        recommendations.forEach((rec, index) => {
            if (yPos > 240) {
                pdf.addPage();
                yPos = 20;
            }

            pdf.setFillColor(99, 102, 241);
            pdf.circle(25, yPos + 2, 4, 'F');

            pdf.setTextColor(255, 255, 255);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.text((index + 1).toString(), 23, yPos + 4);

            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.text(rec.title, 35, yPos + 4);

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(60, 60, 60);
            const descLines = pdf.splitTextToSize(rec.description, 160);
            pdf.text(descLines, 35, yPos + 12);

            yPos += 20 + (descLines.length * 3);
            pdf.setTextColor(0, 0, 0);
        });

        return yPos;
    }

    async addPDFChart(pdf, yPos) {
        try {
            const canvas = document.getElementById('results-chart');
            if (!canvas || !this.currentChart) {
                return yPos;
            }

            if (yPos > 180) {
                pdf.addPage();
                yPos = 20;
            }

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.text('Visual Results Summary', 20, yPos);
            yPos += 10;

            const chartImage = canvas.toDataURL('image/png', 0.8);
            pdf.addImage(chartImage, 'PNG', 20, yPos, 120, 80);

            return yPos + 90;
        } catch (error) {
            console.warn('Could not add chart to PDF:', error);
            return yPos;
        }
    }

    addPDFFooter(pdf) {
        const pageCount = pdf.internal.getNumberOfPages();

        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);

            pdf.setFillColor(248, 250, 252);
            pdf.rect(0, 285, 210, 12, 'F');

            pdf.setTextColor(100, 100, 100);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);

            pdf.text('This report is for informational purposes only and should not replace professional medical advice.', 20, 290);
            pdf.text('Visit mindscope-by-yt.vercel.app for more resources', 20, 294);
            pdf.text(`Page ${i} of ${pageCount}`, 180, 294);
        }
    }

    showPDFSuccess(button, originalText) {
        button.innerHTML = '✅ PDF Downloaded!';
        button.style.background = 'var(--gradient-success)';

        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '';
            button.disabled = false;
        }, 3000);
    }

    showPDFError() {
        const button = document.querySelector('[onclick*="exportPDF"]');
        const originalText = button.innerHTML;

        button.innerHTML = '❌ Export Failed';
        button.style.background = 'var(--danger)';

        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '';
            button.disabled = false;
        }, 3000);

        alert('PDF export failed. Please try again or check your browser compatibility.');
    }

    // =================
    // SOCIAL SHARING
    // =================

    async shareResults() {
        console.log('🔗 Preparing social sharing...');

        try {
            this.shareData = await this.generateShareData();
            this.updateShareModal();
            this.showShareModal();

        } catch (error) {
            console.error('Share preparation failed:', error);
            alert('Unable to prepare sharing. Please try again.');
        }
    }

    async generateShareData() {
        const overallScore = this.resultsPayload?.overall_score || 75;
        const mode = this.assessmentMode === 'quick' ? 'Quick' : 'Complete';
        const timestamp = new Date().toISOString();

        const insights = this.generateShareableInsights();
        const shareId = this.generateShareId();

        let shareUrl = `${window.location.origin}/#shared-${shareId}`;

        try {
            const response = await fetch(`${this.apiBaseUrl}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    share_id: shareId,
                    overall_score: overallScore,
                    assessment_mode: this.assessmentMode,
                    timestamp: timestamp,
                    insights: insights
                })
            });

            if (response.ok) {
                const data = await response.json();
                shareUrl = data.share_url || shareUrl;
            }
        } catch (error) {
            console.warn('Backend share creation failed, using client-side sharing');
        }

        const socialTexts = {
            twitter: `I just completed a ${mode.toLowerCase()} mental wellness assessment on MindScope! 🧠✨\n\n${insights.summary}\n\nTake yours: ${shareUrl} #MentalHealth #Wellness`,

            linkedin: `I recently took a comprehensive mental wellness assessment that provided valuable insights into my wellbeing. 🌟\n\n${insights.detailed}\n\nMental health awareness is crucial for all of us. Check out MindScope: ${shareUrl}\n\n#MentalHealthAwareness #Wellness #SelfCare`,

            whatsapp: `Hey! I just used MindScope for a mental wellness check-in 🧠\n\n${insights.casual}\n\nYou should try it too: ${shareUrl}`,

            generic: `I completed a mental wellness assessment on MindScope and gained valuable insights! ${shareUrl}`
        };

        return {
            shareId,
            shareUrl,
            overallScore,
            mode,
            timestamp,
            socialTexts,
            insights
        };
    }

    generateShareableInsights() {
        const results = this.resultsPayload?.results || {};
        const overallScore = this.resultsPayload?.overall_score || 75;

        const scores = Object.values(results).map(r => ({ name: r.name, score: r.score, level: r.level }));
        const strongest = scores.reduce((prev, current) => (prev.score > current.score) ? prev : current);
        const growthArea = scores.reduce((prev, current) => (prev.score < current.score) ? prev : current);

        const insights = {
            summary: `My wellness score: ${Math.round(overallScore)}%. Strongest area: ${strongest.name}. Working on: ${growthArea.name}.`,

            detailed: `Key findings:\n• Overall wellness score: ${Math.round(overallScore)}%\n• Strongest area: ${strongest.name} (${strongest.score}%)\n• Growth opportunity: ${growthArea.name}\n• Personalized recommendations provided`,

            casual: `Got my wellness score: ${Math.round(overallScore)}%! 📊\nDoing great with ${strongest.name}, and focusing on ${growthArea.name}. The insights were really helpful! 💪`
        };

        return insights;
    }

    generateShareId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `${timestamp}-${random}`;
    }

    updateShareModal() {
        const shareInput = document.getElementById('share-link-input');
        if (shareInput && this.shareData) {
            shareInput.value = this.shareData.shareUrl;
            shareInput.placeholder = 'Your shareable link is ready!';
        }
    }

    showShareModal() {
        const modal = document.getElementById('share-modal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeShareModal() {
        const modal = document.getElementById('share-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    shareToTwitter() {
        if (!this.shareData) return;

        const text = encodeURIComponent(this.shareData.socialTexts.twitter);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${text}`;

        this.openShareWindow(twitterUrl, 'Twitter');
    }

    shareToLinkedIn() {
        if (!this.shareData) return;

        const url = encodeURIComponent(this.shareData.shareUrl);
        const text = encodeURIComponent(this.shareData.socialTexts.linkedin);
        const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`;

        this.openShareWindow(linkedInUrl, 'LinkedIn');
    }

    shareToWhatsApp() {
        if (!this.shareData) return;

        const text = encodeURIComponent(this.shareData.socialTexts.whatsapp);
        const whatsappUrl = `https://wa.me/?text=${text}`;

        this.openShareWindow(whatsappUrl, 'WhatsApp');
    }

    shareToFacebook() {
        if (!this.shareData) return;

        const url = encodeURIComponent(this.shareData.shareUrl);
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;

        this.openShareWindow(facebookUrl, 'Facebook');
    }

    openShareWindow(url, platform) {
        const width = 600;
        const height = 400;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;

        window.open(
            url,
            `share-${platform.toLowerCase()}`,
            `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );

        console.log(`📱 Shared to ${platform}`);
    }

    async copyShareLink() {
        if (!this.shareData) return;

        try {
            await navigator.clipboard.writeText(this.shareData.shareUrl);

            const button = document.querySelector('.share-btn.copy');
            if (button) {
                const originalContent = button.innerHTML;
                button.innerHTML = '<span>✅</span> Copied!';
                button.style.background = 'var(--gradient-success)';
                button.style.color = 'white';

                setTimeout(() => {
                    button.innerHTML = originalContent;
                    button.style.background = '';
                    button.style.color = '';
                }, 2000);
            }

            console.log('📋 Share link copied to clipboard');

        } catch (error) {
            console.error('Failed to copy link:', error);

            const shareInput = document.getElementById('share-link-input');
            if (shareInput) {
                shareInput.select();
                shareInput.setSelectionRange(0, 99999);

                try {
                    document.execCommand('copy');
                    alert('Link copied to clipboard!');
                } catch (fallbackError) {
                    alert('Please manually copy the link from the text field.');
                }
            }
        }
    }

    async shareNative() {
        if (!this.shareData) return;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My MindScope Mental Wellness Report',
                    text: this.shareData.socialTexts.generic,
                    url: this.shareData.shareUrl
                });

                console.log('📱 Native sharing successful');
            } catch (error) {
                console.log('Native sharing cancelled or failed:', error);
            }
        } else {
            this.copyShareLink();
        }
    }

    // =================
    // FALLBACK DATA
    // =================

    // Replace the getFallbackQuestions method in your script.js
    getFallbackQuestions() {
        return {
            title: "Mental Health Assessment",
            mode: "full",
            total_questions: 35,
            sections: [
                {
                    category: "Depression & Mood",
                    questions: [
                        { id: "phq_1", text: "Little interest or pleasure in doing things?", options_id: "spectrum_0_3" },
                        { id: "phq_2", text: "Feeling down, depressed, or hopeless?", options_id: "spectrum_0_3" },
                        { id: "phq_3", text: "Trouble falling or staying asleep, or sleeping too much?", options_id: "spectrum_0_3" },
                        { id: "phq_4", text: "Feeling tired or having little energy?", options_id: "spectrum_0_3" },
                        { id: "phq_5", text: "Poor appetite or overeating?", options_id: "spectrum_0_3" },
                        { id: "phq_6", text: "Feeling bad about yourself or that you are a failure?", options_id: "spectrum_0_3" },
                        { id: "phq_7", text: "Trouble concentrating on things, such as reading or watching TV?", options_id: "spectrum_0_3" },
                        { id: "phq_8", text: "Moving or speaking so slowly that other people could have noticed?", options_id: "spectrum_0_3" },
                        { id: "phq_9", text: "Thoughts that you would be better off dead, or of hurting yourself?", options_id: "spectrum_0_3" }
                    ]
                },
                {
                    category: "Anxiety",
                    questions: [
                        { id: "gad_1", text: "Feeling nervous, anxious, or on edge?", options_id: "spectrum_0_3" },
                        { id: "gad_2", text: "Not being able to stop or control worrying?", options_id: "spectrum_0_3" },
                        { id: "gad_3", text: "Worrying too much about different things?", options_id: "spectrum_0_3" },
                        { id: "gad_4", text: "Trouble relaxing?", options_id: "spectrum_0_3" },
                        { id: "gad_5", text: "Being so restless that it's hard to sit still?", options_id: "spectrum_0_3" },
                        { id: "gad_6", text: "Becoming easily annoyed or irritable?", options_id: "spectrum_0_3" },
                        { id: "gad_7", text: "Feeling afraid, as if something awful might happen?", options_id: "spectrum_0_3" }
                    ]
                },
                {
                    category: "Stress & Coping",
                    questions: [
                        { id: "stress_1", text: "I have been upset because of something that happened unexpectedly?", options_id: "stress_0_4" },
                        { id: "stress_2", text: "I have felt that I was unable to control the important things in my life?", options_id: "stress_0_4" },
                        { id: "stress_3", text: "I have felt nervous and stressed?", options_id: "stress_0_4" },
                        { id: "stress_4", text: "I have felt confident about my ability to handle my personal problems?", options_id: "stress_0_4" },
                        { id: "stress_5", text: "I have felt that things were going my way?", options_id: "stress_0_4" },
                        { id: "stress_6", text: "I have found that I could not cope with all the things I had to do?", options_id: "stress_0_4" }
                    ]
                },
                {
                    category: "Sleep & Energy",
                    questions: [
                        { id: "sleep_1", text: "Do you typically get enough hours of sleep?", options_id: "sleep_yes_no" },
                        { id: "sleep_2", text: "How often do you have trouble falling asleep?", options_id: "frequency_0_4" },
                        { id: "sleep_3", text: "How often do you wake up during the night?", options_id: "frequency_0_4" },
                        { id: "sleep_4", text: "How refreshed do you feel when you wake up?", options_id: "refreshed_0_4" },
                        { id: "energy_1", text: "How would you rate your overall energy levels?", options_id: "energy_0_4" }
                    ]
                },
                {
                    category: "Wellbeing & Social",
                    questions: [
                        { id: "who_1", text: "I have felt cheerful and in good spirits?", options_id: "wellbeing_0_5" },
                        { id: "who_2", text: "I have felt calm and relaxed?", options_id: "wellbeing_0_5" },
                        { id: "who_3", text: "I have felt active and vigorous?", options_id: "wellbeing_0_5" },
                        { id: "who_4", text: "I woke up feeling fresh and rested?", options_id: "wellbeing_0_5" },
                        { id: "who_5", text: "My daily life has been filled with things that interest me?", options_id: "wellbeing_0_5" },
                        { id: "social_1", text: "How satisfied are you with your relationships?", options_id: "satisfaction_0_4" },
                        { id: "social_2", text: "How often do you feel lonely?", options_id: "frequency_0_4" },
                        { id: "social_3", text: "Do you feel you have adequate social support?", options_id: "support_0_4" }
                    ]
                }
            ],
            option_sets: {
                spectrum_0_3: [
                    { label: "Not at all", value: 0, emoji: "😌" },
                    { label: "Several days", value: 1, emoji: "🌊" },
                    { label: "More than half the days", value: 2, emoji: "🌪️" },
                    { label: "Nearly every day", value: 3, emoji: "🚨" }
                ],
                wellbeing_0_5: [
                    { label: "All of the time", value: 5, emoji: "🌟" },
                    { label: "Most of the time", value: 4, emoji: "😊" },
                    { label: "More than half of the time", value: 3, emoji: "⚖️" },
                    { label: "Less than half of the time", value: 2, emoji: "☁️" },
                    { label: "Some of the time", value: 1, emoji: "🌑" },
                    { label: "At no time", value: 0, emoji: "😔" }
                ],
                stress_0_4: [
                    { label: "Never", value: 0, emoji: "🧘" },
                    { label: "Almost never", value: 1, emoji: "😌" },
                    { label: "Sometimes", value: 2, emoji: "😐" },
                    { label: "Fairly often", value: 3, emoji: "😰" },
                    { label: "Very often", value: 4, emoji: "🤯" }
                ],
                frequency_0_4: [
                    { label: "Never", value: 0, emoji: "✅" },
                    { label: "Rarely", value: 1, emoji: "🔹" },
                    { label: "Sometimes", value: 2, emoji: "🔸" },
                    { label: "Often", value: 3, emoji: "🔶" },
                    { label: "Always", value: 4, emoji: "🔴" }
                ],
                sleep_yes_no: [
                    { label: "Yes, always enough", value: 5, emoji: "😴" },
                    { label: "Usually enough", value: 4, emoji: "🛌" },
                    { label: "Sometimes enough", value: 3, emoji: "😪" },
                    { label: "Rarely enough", value: 2, emoji: "😴" },
                    { label: "Never enough", value: 1, emoji: "🥱" }
                ],
                refreshed_0_4: [
                    { label: "Very refreshed", value: 4, emoji: "🌅" },
                    { label: "Somewhat refreshed", value: 3, emoji: "☀️" },
                    { label: "Neutral", value: 2, emoji: "😐" },
                    { label: "Somewhat tired", value: 1, emoji: "😪" },
                    { label: "Very tired", value: 0, emoji: "😵" }
                ],
                energy_0_4: [
                    { label: "Very high energy", value: 4, emoji: "⚡" },
                    { label: "Good energy", value: 3, emoji: "💪" },
                    { label: "Moderate energy", value: 2, emoji: "🔋" },
                    { label: "Low energy", value: 1, emoji: "🪫" },
                    { label: "Very low energy", value: 0, emoji: "😴" }
                ],
                satisfaction_0_4: [
                    { label: "Very satisfied", value: 4, emoji: "🥰" },
                    { label: "Satisfied", value: 3, emoji: "😊" },
                    { label: "Neutral", value: 2, emoji: "😐" },
                    { label: "Dissatisfied", value: 1, emoji: "😕" },
                    { label: "Very dissatisfied", value: 0, emoji: "😢" }
                ],
                support_0_4: [
                    { label: "Excellent support", value: 4, emoji: "🤗" },
                    { label: "Good support", value: 3, emoji: "👥" },
                    { label: "Adequate support", value: 2, emoji: "🤝" },
                    { label: "Limited support", value: 1, emoji: "🙋" },
                    { label: "No support", value: 0, emoji: "😞" }
                ]
            },
            quick_questions: [
                { id: "phq_1", text: "Little interest or pleasure in doing things?", options: [
                    { label: "Not at all", value: 0, emoji: "😌" },
                    { label: "Several days", value: 1, emoji: "🌊" },
                    { label: "More than half the days", value: 2, emoji: "🌪️" },
                    { label: "Nearly every day", value: 3, emoji: "🚨" }
                ], section_name: "Mood" },
                { id: "gad_1", text: "Feeling nervous, anxious, or on edge?", options: [
                    { label: "Not at all", value: 0, emoji: "😌" },
                    { label: "Several days", value: 1, emoji: "🌊" },
                    { label: "More than half the days", value: 2, emoji: "🌪️" },
                    { label: "Nearly every day", value: 3, emoji: "🚨" }
                ], section_name: "Anxiety" },
                { id: "stress_1", text: "I have felt nervous and stressed?", options: [
                    { label: "Never", value: 0, emoji: "🧘" },
                    { label: "Almost never", value: 1, emoji: "😌" },
                    { label: "Sometimes", value: 2, emoji: "😐" },
                    { label: "Fairly often", value: 3, emoji: "😰" },
                    { label: "Very often", value: 4, emoji: "🤯" }
                ], section_name: "Stress" },
                { id: "sleep_1", text: "Do you typically get enough hours of sleep?", options: [
                    { label: "Yes, always enough", value: 5, emoji: "😴" },
                    { label: "Usually enough", value: 4, emoji: "🛌" },
                    { label: "Sometimes enough", value: 3, emoji: "😪" },
                    { label: "Rarely enough", value: 2, emoji: "😴" },
                    { label: "Never enough", value: 1, emoji: "🥱" }
                ], section_name: "Sleep" },
                { id: "who_1", text: "I have felt cheerful and in good spirits?", options: [
                    { label: "All of the time", value: 5, emoji: "🌟" },
                    { label: "Most of the time", value: 4, emoji: "😊" },
                    { label: "More than half of the time", value: 3, emoji: "⚖️" },
                    { label: "Less than half of the time", value: 2, emoji: "☁️" },
                    { label: "Some of the time", value: 1, emoji: "🌑" },
                    { label: "At no time", value: 0, emoji: "😔" }
                ], section_name: "Wellbeing" },
                { id: "who_2", text: "I have felt calm and relaxed?", options: [
                    { label: "All of the time", value: 5, emoji: "🌟" },
                    { label: "Most of the time", value: 4, emoji: "😊" },
                    { label: "More than half of the time", value: 3, emoji: "⚖️" },
                    { label: "Less than half of the time", value: 2, emoji: "☁️" },
                    { label: "Some of the time", value: 1, emoji: "🌑" },
                    { label: "At no time", value: 0, emoji: "😔" }
                ], section_name: "Wellbeing" },
                { id: "social_1", text: "How satisfied are you with your relationships?", options: [
                    { label: "Very satisfied", value: 4, emoji: "🥰" },
                    { label: "Satisfied", value: 3, emoji: "😊" },
                    { label: "Neutral", value: 2, emoji: "😐" },
                    { label: "Dissatisfied", value: 1, emoji: "😕" },
                    { label: "Very dissatisfied", value: 0, emoji: "😢" }
                ], section_name: "Social" },
                { id: "energy_1", text: "How would you rate your overall energy levels?", options: [
                    { label: "Very high energy", value: 4, emoji: "⚡" },
                    { label: "Good energy", value: 3, emoji: "💪" },
                    { label: "Moderate energy", value: 2, emoji: "🔋" },
                    { label: "Low energy", value: 1, emoji: "🪫" },
                    { label: "Very low energy", value: 0, emoji: "😴" }
                ], section_name: "Energy" },
                { id: "gad_4", text: "Trouble relaxing?", options: [
                    { label: "Not at all", value: 0, emoji: "😌" },
                    { label: "Several days", value: 1, emoji: "🌊" },
                    { label: "More than half the days", value: 2, emoji: "🌪️" },
                    { label: "Nearly every day", value: 3, emoji: "🚨" }
                ], section_name: "Anxiety" },
                { id: "phq_3", text: "Trouble falling or staying asleep, or sleeping too much?", options: [
                    { label: "Not at all", value: 0, emoji: "😌" },
                    { label: "Several days", value: 1, emoji: "🌊" },
                    { label: "More than half the days", value: 2, emoji: "🌪️" },
                    { label: "Nearly every day", value: 3, emoji: "🚨" }
                ], section_name: "Sleep" },
                { id: "stress_2", text: "I have felt that I was unable to control the important things in my life?", options: [
                    { label: "Never", value: 0, emoji: "🧘" },
                    { label: "Almost never", value: 1, emoji: "😌" },
                    { label: "Sometimes", value: 2, emoji: "😐" },
                    { label: "Fairly often", value: 3, emoji: "😰" },
                    { label: "Very often", value: 4, emoji: "🤯" }
                ], section_name: "Control" },
                { id: "who_3", text: "I have felt active and vigorous?", options: [
                    { label: "All of the time", value: 5, emoji: "🌟" },
                    { label: "Most of the time", value: 4, emoji: "😊" },
                    { label: "More than half of the time", value: 3, emoji: "⚖️" },
                    { label: "Less than half of the time", value: 2, emoji: "☁️" },
                    { label: "Some of the time", value: 1, emoji: "🌑" },
                    { label: "At no time", value: 0, emoji: "😔" }
                ], section_name: "Wellbeing" }
            ]
        };
    }

    getFallbackQuestionsArray(mode) {
        const data = this.getFallbackQuestions();
        return this.processQuestionsForMode(data, mode);
    }

    setupEventListeners() {
        // Form validation listeners
        document.addEventListener('input', (e) => {
            if (e.target.id === 'user-name' || e.target.id === 'user-email') {
                this.checkFormCompletion();
            }
        });

        // Keyboard navigation for assessment
        document.addEventListener('keydown', (e) => {
            const activePage = document.querySelector('.page.active')?.id;
            if (activePage !== 'assessment-page') return;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousQuestion();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextQuestion();
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                    e.preventDefault();
                    const optionIndex = parseInt(e.key) - 1;
                    const options = document.querySelectorAll('.answer-option');
                    if (options[optionIndex]) {
                        options[optionIndex].click();
                    }
                    break;
            }
        });
    }
}

// Initialize MindScope when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.mindScope = new MindScope();
    console.log('🎉 MindScope Enhanced is ready!');
});
