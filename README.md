# Dockerized Stock Sentiment API

A production-grade, containerized Node.js/Express API designed to aggregate real-time stock news and perform sentiment analysis (Bullish/Bearish classification) using a local Hugging Face NLP model. It employs a resilient MongoDB caching architecture to optimize external API rates and minimize machine learning inference costs.

---

## 🚀 Key Features

*   **Financial NLP Sentiment Engine**: Leverages a pre-trained **FinBERT** model (specifically trained for financial news) via Hugging Face ONNX local pipelines (`@xenova/transformers`). Running locally eliminates dependencies on external paid API keys.
*   **Dual Caching & Limit Controls**: Uses MongoDB to cache processed sentiment scores (1-hour cache TTL) and client requests (15 requests/minute IP-based rate limiting) using automatic database-level TTL indexes.
*   **Resilient Architecture (Degraded Mode)**: Fallback logic catches database connection errors. If MongoDB is offline, the server continues working in degraded mode rather than crashing. If the ML pipeline crashes, it seamlessly falls back to a regex-based keyword sentiment engine.
*   **Modular Enterprise Folder Structure**: Fully decoupled controllers, middlewares, models, configurations, and service wrappers.
*   **Multi-Stage Docker Blueprint**: Multi-stage lightweight builds combined with Docker Compose, startup healthcheck synchronization, and persistent volumes for caching model files.

---

## 🛠️ Technology Stack

*   **Runtime**: Node.js (ESM)
*   **Framework**: Express.js
*   **AI Engine**: Hugging Face ONNX Runtime (`@xenova/transformers`)
*   **Database**: MongoDB & Mongoose
*   **Containerization**: Docker & Docker Compose

---

## 📁 Repository Structure

```
dockerized-stock-sentiment-api/
├── src/
│   ├── app.js                    # Express Server Config & Routing
│   ├── config/
│   │   └── db.js                 # MongoDB Connection Handler
│   ├── controllers/
│   │   └── sentimentController.js # API Endpoints & Orchestration
│   ├── middleware/
│   │   └── cacheMiddleware.js    # Caching & Rate Limit Middeleware
│   ├── models/
│   │   └── cacheModel.js         # MongoDB Sentiment/Limit Schema
│   └── services/
│       ├── newsService.js        # Finnhub API & Mock news Service
│       └── sentimentService.js   # FinBERT NLP Inference Engine
├── ARCHITECTURE.md               # Detailed System Architecture Map
├── Dockerfile                    # Multi-stage Docker setup
├── docker-compose.yml            # Multi-container orchestration
├── package.json                  # Dependencies & Scripts
├── test-sentiment.js             # Local ML pipeline testing script
└── .env.example                  # Template env configurations
```

---

## ⚙️ Quick Start

### Prerequisites
Make sure you have Node.js (v18+) or Docker installed.

### Option 1: Run Locally (Bare-Metal Node.js)
If MongoDB is not running on your host system, the API will run in **degraded mode** (caching and rate limits will be bypassed, but news and AI calculations will work fully).

1. Clone or download the codebase.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the API at `http://localhost:5000/api/sentiment/AAPL`. 
   *(Note: The very first request will download the FinBERT model to your local machine, which takes around 15–30 seconds. Subsequent requests take under 50ms).*

---

### Option 2: Run with Docker (Recommended)
Docker Compose will orchestrate the API container and a MongoDB service container, automatically linking them together. A named volume is mounted to persist the ML model across restarts.

1. Start all containers in the background:
   ```bash
   docker compose up -d --build
   ```
2. Monitor progress (specifically the initial FinBERT download progress):
   ```bash
   docker compose logs -f api
   ```
3. Access the endpoints locally:
   *   Health Check: `GET http://localhost:5000/health`
   *   Ticker Sentiment: `GET http://localhost:5000/api/sentiment/AAPL`

---

## 🔌 API Documentation

### Get Stock Sentiment
Fetches stock news for a given ticker, classifies headlines with AI, and returns aggregate market signals.

*   **Endpoint**: `/api/sentiment/:symbol`
*   **Method**: `GET`
*   **Params**: `symbol` (e.g. `AAPL`, `TSLA`, `NVDA`)
*   **Response Headers**:
  - `X-Cache`: `MISS` (first compute) or `HIT` (served from MongoDB cache)
  - `X-RateLimit-Limit`: `15` (requests permitted per minute)
  - `X-RateLimit-Remaining`: Remaining quota
*   **Success Response (200 OK)**:
```json
{
  "success": true,
  "symbol": "AAPL",
  "articlesCount": 3,
  "sentimentSummary": {
    "status": "success",
    "overallSentiment": "BULLISH",
    "bullishPercent": 67,
    "bearishPercent": 0,
    "neutralPercent": 33,
    "averageScore": 0.5843
  },
  "articles": [
    {
      "id": 1,
      "headline": "AAPL Outperforms Market Expectations in Quarterly Report",
      "summary": "Analysts raising targets following a strong performance in key sectors.",
      "source": "FinTech News",
      "url": "https://example.com/news/1",
      "datetime": 1717325010,
      "sentiment": {
        "label": "POSITIVE",
        "score": 0.8872
      }
    },
    ...
  ]
}
```

---

## ⚖️ License
This project is open-source and available under the [MIT License](LICENSE).
