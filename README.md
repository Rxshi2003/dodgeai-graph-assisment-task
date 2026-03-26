# 🚀 DodgeAI Graph System — Frontend

## 📌 Overview

This is the frontend application of the DodgeAI Graph-Based Query System. It provides an interactive chat interface where users can input natural language queries, which are processed by the backend using an LLM and graph-based database system.

🔗 **Backend Repository:**
https://github.com/Rxshi2003/dodgeai-graph-assisment-task-backend

---

## 🏗️ Architecture Decisions

### 1. Component-Based Design

* Built using **React.js**
* Modular structure:

  * Chat UI
  * Message components
  * API service layer

### 2. Separation of Concerns

* UI handles only:

  * User input
  * Displaying responses
* Business logic handled entirely in backend

### 3. API Communication

* REST API used for communication
* Axios/Fetch used to send queries to backend

### 4. Deployment Strategy

* Hosted on **Vercel**
* Environment variables used for backend URL

---

## 🧠 LLM Interaction Flow (Frontend Perspective)

1. User enters query in chat UI
2. Query is sent to backend API (`/query`)
3. Backend processes using LLM + database
4. Response displayed dynamically

---

## 🛡️ Guardrails (Frontend Level)

* Input validation (prevent empty queries)
* Basic sanitization before sending requests
* Error handling:

  * API failures
  * Timeout handling
* Loading states for better UX

---

## ⚙️ Setup Instructions

```bash
git clone https://github.com/Rxshi2003/dodgeai-graph-assisment-task.git
cd dodgeai-graph-assisment-task
npm install
npm start
```

---

## 🌐 Environment Variables

Create `.env` file:

```env
VITE_BACKEND_URL=https://your-backend-url
```

---

## 🚀 Deployment

* Push code to GitHub
* Connect repo to Vercel
* Add environment variable
* Deploy

---

## 📌 Key Features

* Chat-based interface
* Real-time query responses
* Clean and responsive UI
* Backend-integrated intelligent querying

---

## 📷 Future Improvements

* Chat history persistence
* Streaming responses
* Authentication system
* UI enhancements

---
