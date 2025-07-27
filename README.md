# MindScope - Mental Wellbeing Assessment Platform

A modern, evidence-based mental health self-assessment platform with personalized insights and recommendations.

## Features

- 🧠 **Evidence-Based Assessment**: Uses validated scales (PHQ-9, GAD-7, DASS-21, WHO-5)
- 🎯 **Personalized Insights**: ML-powered analysis with personalized recommendations
- 🔒 **Privacy-First**: All data processing happens locally or on your server
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- ⚡ **Fast & Modern**: Built with performance and user experience in mind

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js (optional, for advanced frontend development)

### Installation

1. **Clone the repository**
```
git clone <your-repo-url>
cd "MindScope"
```

2. **Set up the backend**
```
cd backend
pip install -r requirements.txt
```

3. **Start the backend server**
```
python app.py
```

4. **Open the frontend**
- Open `frontend/index.html` in your browser
- Or serve with a local server:
  ```
  cd frontend
  python -m http.server 8000
  ```
- Visit `http://localhost:8000`

## Development

### Backend API

The backend provides a REST API with the following endpoints:

- `GET /api/health` - Health check
- `GET /api/questions` - Get assessment questions
- `POST /api/assess` - Process assessment and get results
- `POST /api/feedback` - Submit feedback

### Frontend

The frontend is a single-page application built with vanilla JavaScript. It communicates with the backend API to:

- Load questions dynamically
- Submit assessment responses
- Display personalized results and recommendations

### Adding Questions

Edit `data/questions.json` to add or modify assessment questions. Each question should follow this structure:
```
{
"id": "unique_id",
"text": "Question text",
"category": "anxiety|depression|stress|wellbeing",
"scale": "phq9|gad7|dass21|who5",
"required": true,
"options": [
{"value": 0, "label": "Option 1"},
{"value": 1, "label": "Option 2"}
]
}
```

## Deployment

### Local Development
#### Start backend
```
cd backend
python app.py
```

#### Serve frontend
```
cd frontend
python -m http.server 8000
```

### Production (Docker)
```
docker-compose up -d
```

### Cloud Deployment

The application can be deployed to various platforms:

- **Heroku**: Use the included `Procfile`
- **Vercel**: Deploy frontend as static site, backend as serverless function
- **AWS**: Use Elastic Beanstalk for backend, S3 + CloudFront for frontend
- **DigitalOcean**: Use App Platform for full-stack deployment

## Configuration

Environment variables can be set in a `.env` file:
```
API_HOST=localhost
API_PORT=5000
DEBUG=True
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:5500
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Add tests if applicable
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## License

This project is licensed under the **MIT License**. See the LICENSE file for details.

## Support

If you need help or have questions:

1. Check the documentation
2. Look through existing issues
3. Create a new issue with detailed information

## Disclaimer

>This tool is for informational purposes only and should not replace professional medical advice, diagnosis, or treatment. Always seek the advice of qualified health providers with any questions about mental health conditions.