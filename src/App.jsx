import { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! Try saying 'hi' to see me respond from the backend.", isUser: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newUserMessage = {
      id: Date.now(),
      text: inputValue.trim(),
      isUser: true
    };

    setMessages([...messages, newUserMessage]);
    setInputValue('');

    // Call the backend API
    try {
      const response = await fetch('http://localhost:3001/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: inputValue.trim() }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch(e) {
        data = { error: 'Invalid JSON response from server' };
      }

      if (!response.ok) {
        throw new Error(data.details || data.error || `HTTP Error ${response.status}`);
      }

      const botMessage = {
        id: Date.now() + 1,
        text: data.answer || "Success! But no answer was provided.",
        sql: data.generatedSql,
        isUser: false
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error communicating with backend:", error);
      const errorMessage = {
        id: Date.now() + 1,
        text: `Error connecting to backend: ${error.message}`,
        isUser: false
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  return (
    <div className="app-container">
      {/* Graph Section Placeholder */}
      <div className="graph-section">
        <div className="graph-placeholder">
          <div className="placeholder-icon">📊</div>
          <h2>Graph Visualization</h2>
          <p>Graph content will be rendered here...</p>
        </div>
      </div>

      {/* Chat Section */}
      <div className="chat-section">
        <div className="chat-header">
          <div className="header-status"></div>
          <h2>AI Assistant</h2>
        </div>
        
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-wrapper ${msg.isUser ? 'user' : 'bot'}`}>
              {!msg.isUser && <div className="bot-avatar">AI</div>}
              <div className="message-content" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div className="message-bubble">
                  {msg.text}
                </div>
                {msg.sql && (
                  <div className="sql-preview" style={{ fontSize: '0.8rem', opacity: 0.7, background: 'rgba(0,0,0,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                    <code><b>SQL:</b> {msg.sql}</code>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-area" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="chat-input"
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" className="send-button" disabled={!inputValue.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
