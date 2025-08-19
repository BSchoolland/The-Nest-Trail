import { useState, useEffect, useRef, useMemo } from 'react';
import { sendMessage, startGame, fetchStats, getInventory, resetGame } from '../api/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChatBackground from '../components/ChatBackground';

const emojiMap = {
  "Laptops": "💻",
  "Coffee": "☕️",
  "Gas": "⛽️",
  "Spare Tires": "🛞",
  "Laptop Chargers": "🔋",
  "Money": "💰"
};

function ChatTestPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const didStart = useRef(false);
    
    // game stats state
    const [stats, setStats] = useState({
        elapsedMinutes: 0,
        currentLocation: 'Loading...'
    });
    const [statsLoading, setStatsLoading] = useState(false);
    
    // placeholder game stats state
    const [money, setMoney] = useState(null);
    
    const [inventory, setInventory] = useState([]); // State to hold inventory items
    // eslint-disable-next-line no-unused-vars
    const [inventoryLoading, setInventoryLoading] = useState(false); // Loading state for inventory

    // Memoize ReactMarkdown components to prevent recreation on every render
    const markdownComponents = useMemo(() => ({
        code: ({ inline, children, ...props }) =>
            inline ? (
                <code className="inline-code" {...props}>{children}</code>
            ) : (
                <pre className="code-block"><code {...props}>{children}</code></pre>
            ),
        h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
        h2: ({ children }) => <h2 className="markdown-h2">{children}</h2>,
        h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
        ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
        ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
        p: ({ children }) => <p className="markdown-p">{children}</p>,
        blockquote: ({ children }) => <blockquote className="markdown-blockquote">{children}</blockquote>,
        table: ({ children }) => <table className="markdown-table">{children}</table>,
        th: ({ children }) => <th className="markdown-th">{children}</th>,
        td: ({ children }) => <td className="markdown-td">{children}</td>,
    }), []);

    // Fetch stats from backend
    const fetchGameStats = async (showLoading = false) => {
        if (showLoading) {
            setStatsLoading(true);
        }
        try {
            const statsData = await fetchStats();
            setStats(statsData);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            if (showLoading) {
                setStatsLoading(false);
            }
        }
    };

    const start = async () => {
        setLoading(true);
        try {
                const response = await startGame();
                const botMessage = { text: response, sender: 'bot' };
                setMessages(prev => [...prev, botMessage]);
            } catch (error) {
                console.error('Error sending message:', error);
                const errorMessage = { text: 'Error: Failed to get response', sender: 'bot' };
                setMessages(prev => [...prev, errorMessage]);
            } finally {
                setLoading(false);
            }
    }

    // Start the game on initial component load
    useEffect(() => {
        // Start the game by prompting the LLM
        if (didStart.current) return;
        didStart.current = true;
        start();
    }, []);

    // fetch inventory items and update state everytime inventory changes
    useEffect(() => {
        let firstLoad = true;
        // Fetch inventory items
        const fetchInventory = async () => {
            if (firstLoad) setInventoryLoading(true);
            try {
                const response = await getInventory();
                const items = response.items;
                setInventory(items);
                setMoney(response.money);
            } catch (error) {
                console.error('Error fetching inventory:', error);
            } finally {
                if (firstLoad) {
                    setInventoryLoading(false);
                    firstLoad = false;
                }
            }
        };
        fetchInventory();
        // refresh every few seconds to keep inventory updated
        const intervalId = setInterval(fetchInventory, 5000);
        return () => clearInterval(intervalId);
    }, []);

    // Periodically fetch stats to keep them updated
    useEffect(() => {
        const intervalId = setInterval(() => {
            fetchGameStats(); // Don't show loading for periodic updates
        }, 5000); // Update every 5 seconds
        return () => clearInterval(intervalId);
    }, []);

    const formatTime = (totalMinutes) => {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}`;
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = { text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await sendMessage(input);
            const botMessage = { text: response, sender: 'bot' };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = { text: 'Error: Failed to get response', sender: 'bot' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleReset = async () => {
        try {
            await resetGame();
        } catch (error) {
            console.error('Error resetting game:', error);
        } finally {
            console.log("Reloading page now...");
            window.location.reload();
        }
    };

    return (
        <div className="chat-page">
            <ChatBackground />
            <div className="chat-layout">
                {/* Left Column - Map and Inventory */}
                <div className="map-column">
                <div className="map-container stats-container">
                        <h3 className="map-title">Game Stats</h3>
                        <div className="inventory-list">
                            <div className="inventory-item">
                                <span className="item-emoji">⏱️</span>
                                <span className="item-name">Time Elapsed — {formatTime(stats.elapsedMinutes)}</span>
                            </div>
                            <div className="inventory-item">
                                <span className="item-emoji">📍</span>
                                <span className="item-name">Current Location — {stats.currentLocation}</span>
                            </div>
                            {statsLoading && (
                                <div className="inventory-item">
                                    <span className="item-emoji">🔄</span>
                                    <span className="item-name">Loading stats...</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="inventory-container inventory-container--tall">
                        <h3 className="inventory-title">Inventory</h3>
                        <div className="inventory-list">
                            {inventoryLoading ? (
                                <div className="inventory-loading">Loading inventory...</div>
                            ) : inventory.length > 0 ? (
                                <>
                                    <div className="inventory-item">
                                        <div className="item-name-container">
                                            <span className="item-emoji">{emojiMap['Money']}</span>
                                            <span className="item-name">Money</span>
                                    </div>
                                    <span className="item-amount">{money}</span>
                                    </div>
                                    {inventory.map((item, index) => (
                                        <div key={index} className="inventory-item">
                                            <div className="item-name-container">
                                                <span className="item-emoji">{emojiMap[item.name] || '📦'}</span>
                                                <span className="item-name">{item.name}</span>
                                            </div>
                                            <span className="item-amount">{item.count}</span>
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <div className="inventory-empty">No items in inventory</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Chat */}
                <div className="chat-container">
                    <h1 className="chat-title">
                        The NEST Trail
                    </h1>
                    
                    <div className="chat-messages-container">
                        {messages.length === 0 && (
                            <div className="empty-state">
                                Starting your journey through The NEST Trail...
                            </div>
                        )}
                        {messages.map((msg, index) => (
                            <div key={index} className={`message-wrapper ${msg.sender === 'user' ? 'user-message' : 'bot-message'}`}>
                                <div className={`message-bubble ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                                    <div className="message-sender">
                                        {msg.sender === 'user' ? 'You' : 'NEST AI'}
                                    </div>
                                    <div className="message-content">
                                        {msg.sender === 'bot' ? (
                                            <ReactMarkdown 
                                                remarkPlugins={[remarkGfm]}
                                                components={markdownComponents}
                                            >
                                                {msg.text}
                                            </ReactMarkdown>
                                        ) : (
                                            msg.text
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="message-wrapper bot-message">
                                <div className="message-bubble bot-bubble loading-bubble">
                                    <div className="message-sender">
                                        NEST AI
                                    </div>
                                    <div className="message-content">
                                        <div className="typing-indicator">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-container">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type your response..."
                            className="chat-input"
                            disabled={loading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                            className="send-button"
                        >
                            Send
                        </button>
                        <button
                            onClick={async () => {
                                const confirmed = window.confirm("Are you sure you want to reset the game? This action cannot be undone.");
                                if (confirmed) {
                                    await handleReset();
                                }
                            }}
                            disabled={loading}
                            className="send-button reset-button"
                        >
                            Reset Game
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChatTestPage;