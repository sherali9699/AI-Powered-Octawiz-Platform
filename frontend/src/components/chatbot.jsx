import React, { useState, useEffect, useRef } from 'react';

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: input,
        })
      });

      const data = await res.json();
      console.log('Response from backend:', data);
      if (data?.response) {
        const formattedContent = data.response.replace(/(\d+\.\s+.*?)(?=\s*\d+\.|$)/g, '$1\n');
        const botMessage = { role: 'bot', content: formattedContent };
        setMessages(prev => [...prev, botMessage]);
        console.log('Bot response:', data.response);
      } else {
        setMessages(prev => [...prev, { role: 'bot', content: 'No response from assistant.' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot-container">
      <button className="chatbot-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        💬 Lets Chat
      </button>

      {isOpen && (
        <div className="chatbot-modal">
          <div className="chatbot-header">Need Help?</div>

          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chatbot-msg chatbot-msg-${msg.role}`.trim()}>
                {msg.content.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            ))}
            {loading && (
              <div className="chatbot-msg chatbot-msg-bot loading">
                <span className="loading-dots">
                  <span className="dot">.</span>
                  <span className="dot">.</span>
                  <span className="dot">.</span>
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chatbot-input-row" onSubmit={sendMessage}>
            <input
              className="chatbot-input"
              type="text"
              placeholder="Ask your question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button className="btn" type="submit" disabled={loading}>Send</button>
          </form>
        </div>
      )}
    </div>
  );
}
















// import React, { useState, useEffect, useRef } from 'react';
// // import { v4 as uuidv4 } from 'uuid'; // Uncomment when session_id backend logic is ready

// export default function ChatBot() {
//   const [isOpen, setIsOpen] = useState(false);
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState('');
//   const [loading, setLoading] = useState(false);
//   const messagesEndRef = useRef(null);

//   // Persist session ID if needed later
//   // useEffect(() => {
//   //   const storedSession = localStorage.getItem('octowize_chat_session');
//   //   if (!storedSession) {
//   //     const newSession = uuidv4();
//   //     localStorage.setItem('octowize_chat_session', newSession);
//   //   }
//   // }, []);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   const sendMessage = async (e) => {
//     e.preventDefault();
//     if (!input.trim()) return;

//     const userMessage = { role: 'user', content: input };
//     setMessages(prev => [...prev, userMessage]);
//     setInput('');
//     setLoading(true);

//     try {
//       const res = await fetch('http://127.0.0.1:8000/api/ask', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           query: input,
//           // session_id: localStorage.getItem('octowize_chat_session')
//         })
//       });

//       const data = await res.json();
//       console.log('Response from backend:', data);
//       if (data?.response) {
//         const botMessage = { role: 'bot', content: data.response };
//         setMessages(prev => [...prev, botMessage]);
//         console.log('Bot response:', data.response);
//       } else {
//         setMessages(prev => [...prev, { role: 'bot', content: 'No response from assistant.' }]);
//       }
//     } catch (error) {
//       setMessages(prev => [...prev, { role: 'bot', content: 'Something went wrong. Please try again.' }]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="chatbot-container">
//       <button className="chatbot-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
//         💬 Lets Chat
//       </button>
//       {/* <button className="chatbot-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
//         Lets Chat
//       </button> */}

//       {isOpen && (
//         <div className="chatbot-modal">
//           <div className="chatbot-header">Need Help?</div>

//           <div className="chatbot-messages">
//             {messages.map((msg, idx) => (
//               <div key={idx} className={`chatbot-msg chatbot-msg-${msg.role}`.trim()}>
//                 {msg.content}
//               </div>
//             ))}
//             <div ref={messagesEndRef} />
//           </div>

//           <form className="chatbot-input-row" onSubmit={sendMessage}>
//             <input
//               className="chatbot-input"
//               type="text"
//               placeholder="Ask your question..."
//               value={input}
//               onChange={(e) => setInput(e.target.value)}
//               disabled={loading}
//             />
//             <button className="btn" type="submit" disabled={loading}>Send</button>
//           </form>
//         </div>
//       )}
//     </div>
//   );
// } 
