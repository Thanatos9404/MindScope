/*  MindScope Enhanced - FIXED All Navigation & Display Issues */

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

        // Chart management
        this.currentChart = null;
        this.chartType = 'radar';

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
        window.goHome = () => this.goHome(); // NEW: Fixed home navigation
        window.scrollToAssessment = () => this.scrollToAssessment();
        window.previousQuestion = () => this.previousQuestion();
        window.nextQuestion = () => this.nextQuestion();
        window.mindScope = this;
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
    // FIXED PAGE MANAGEMENT
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

            // FIXED: Always scroll to top properly
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);

            console.log(`✅ Successfully navigated to ${pageId} page`);
        } else {
            console.error(`❌ Page ${pageId}-page not found!`);
        }
    }

    // NEW: Fixed home navigation method
    goHome() {
        console.log('🏠 Going home with proper scroll');
        this.showPage('home');
        // Force scroll to top
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

    async startAssessment(mode = 'full') {
        console.log(`🎯 Starting ${mode} assessment`);
        this.assessmentMode = mode;

        try {
            const response = await fetch(`${this.apiBaseUrl}/questions?mode=${mode}`);
            if (response.ok) {
                this.questionsData = await response.json();
                this.questions = this.processQuestionsForMode(this.questionsData, mode);
            } else {
                this.questions = this.getFallbackQuestionsArray(mode);
            }
        } catch (error) {
            console.warn('Using fallback questions for', mode);
            this.questions = this.getFallbackQuestionsArray(mode);
        }

        this.currentIndex = 0;
        this.answers = {};

        console.log(`📊 Loaded ${this.questions.length} questions for ${mode} mode`);

        this.showPage('assessment');
        this.updateAssessmentMode();
        this.renderQuestion();
        this.updateProgress();
        this.generateDots();
    }

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

    async completeAssessment() {
        console.log('🎉 Assessment completed!');
        this.showLoadingState();

        try {
            const response = await fetch(`${this.apiBaseUrl}/assess`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answers: this.answers,
                    mode: this.assessmentMode,
                    timestamp: new Date().toISOString()
                })
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
    // ENHANCED RESULTS PAGE WITH FORCED DISPLAY
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

        // FIXED: Force display with timeout to ensure DOM is ready
        setTimeout(() => {
            this.renderResults();
            this.renderChart();
            this.animateResults();
            this.forceDisplayResults(); // NEW: Force display method
        }, 100);
    }

    // NEW: Force display method
    forceDisplayResults() {
        console.log('🔧 Forcing results display...');

        // Force show results grid
        const resultsGrid = document.getElementById('results-grid');
        if (resultsGrid) {
            resultsGrid.style.display = 'grid';
            resultsGrid.style.visibility = 'visible';
            resultsGrid.style.opacity = '1';
            console.log('✅ Results grid forced visible');
        }

        // Force show recommendations
        const recommendations = document.getElementById('recommendations');
        if (recommendations) {
            recommendations.style.display = 'block';
            recommendations.style.visibility = 'visible';
            recommendations.style.opacity = '1';
            console.log('✅ Recommendations forced visible');
        }

        // Force show all result cards
        document.querySelectorAll('.result-card').forEach((card, index) => {
            card.style.display = 'flex';
            card.style.visibility = 'visible';
            card.style.opacity = '1';
            card.style.animationDelay = `${index * 0.15}s`;
        });

        // Force show all recommendation cards
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

    getFallbackQuestions() {
        return {
            title: "Mental Health Check-in",
            mode: "full",
            total_questions: 6,
            sections: [
                {
                    category: "Mind & Mood",
                    questions: [
                        { id: "phq_1", text: "Little interest or pleasure in doing things?", options_id: "spectrum_0_3" },
                        { id: "gad_1", text: "Feeling nervous, anxious, or on edge?", options_id: "spectrum_0_3" },
                        { id: "phq_2", text: "Feeling down, depressed, or hopeless?", options_id: "spectrum_0_3" }
                    ]
                },
                {
                    category: "Wellbeing",
                    questions: [
                        { id: "who_1", text: "I have felt cheerful and in good spirits?", options_id: "wellbeing_0_5" },
                        { id: "who_2", text: "I have felt calm and relaxed?", options_id: "wellbeing_0_5" },
                        { id: "who_3", text: "I have felt active and vigorous?", options_id: "wellbeing_0_5" }
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
                    { label: "At no time", value: 0, emoji: "🌑" }
                ]
            }
        };
    }

    getFallbackQuestionsArray(mode) {
        const data = this.getFallbackQuestions();
        return this.processQuestionsForMode(data, mode);
    }

    setupEventListeners() {
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

    exportPDF() {
        console.log('📄 PDF export functionality coming soon...');
        alert('PDF export feature will be available soon!');
    }

    shareResults() {
        console.log('🔗 Share results functionality coming soon...');
        alert('Share feature will be available soon!');
    }
}

// Initialize MindScope when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.mindScope = new MindScope();
    console.log('🎉 MindScope Enhanced is ready!');
});
