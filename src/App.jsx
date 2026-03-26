import { useState, useRef, useEffect } from 'react';
import './App.css';
import GraphVisualizer from './GraphVisualizer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Render markdown-lite: bold (**text**) and newlines
function renderMessage(text) {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        )}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    );
  });
}

function App() {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! Ask me anything about your customers, orders, deliveries, invoices or payments.', isUser: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [focusNodeId, setFocusNodeId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Pre-load graph on mount
  useEffect(() => {
    const loadGraph = async () => {
      try {
        const res = await fetch(`${API_URL}/graph`);
        if (res.ok) {
          const data = await res.json();
          if (data.nodes && data.nodes.length > 0) {
            setChartData(data);
          }
        }
      } catch (e) {
        console.warn('Could not pre-load graph:', e.message);
      }
    };
    loadGraph();
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    const newUserMessage = { id: Date.now(), text: userText, isUser: true };
    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userText }),
      });

      let data = {};
      try { data = await response.json(); } catch (e) {
        data = { error: 'Invalid JSON response from server' };
      }

      if (!response.ok) {
        throw new Error(data.details || data.error || `HTTP Error ${response.status}`);
      }

      const botMessage = {
        id: Date.now() + 1,
        text: data.answer || 'Query executed. See the results below.',
        sql: data.query,
        isUser: false
      };
      setMessages(prev => [...prev, botMessage]);

      if (data.result) {
        if (Array.isArray(data.result)) {
          setChartData(data.result.length > 0 ? data.result : null);
        } else if (data.result.nodes) {
          setChartData(data.result);
        } else {
          setChartData(null);
        }
      }
      // Highlight the queried node in the graph if one was identified
      setFocusNodeId(data.focusNodeId || null);
    } catch (error) {
      console.error('Error communicating with backend:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: error.message || 'An unexpected error occurred.',
        isUser: false
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Graph Section */}
      <div className="graph-section">
        {chartData ? (
          <div style={{ width: '100%', height: '100%', display: 'flex' }}>
            <GraphVisualizer data={chartData} focusNodeId={focusNodeId} />
          </div>
        ) : (
          <div className="graph-placeholder">
            <div className="placeholder-icon">📊</div>
            <h2>Graph Visualization</h2>
            <p>Send a query to explore entity relationships.</p>
          </div>
        )}
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
              <div className="message-content">
                <div className="message-bubble">
                  {renderMessage(msg.text)}
                </div>
                {msg.sql && msg.sql !== 'In-Context Graph Traversal' && (
                  <div className="sql-preview">
                    <code><b>Mode:</b> {msg.sql}</code>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message-wrapper bot">
              <div className="bot-avatar">AI</div>
              <div className="message-content">
                <div className="message-bubble loading-bubble">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-area" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="chat-input"
            placeholder="Ask about customers, orders, invoices..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className="send-button" disabled={!inputValue.trim() || isLoading}>
            {isLoading ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
