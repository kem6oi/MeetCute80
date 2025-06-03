import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { FaArrowLeft, FaPaperPlane } from 'react-icons/fa';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();
  
  // Fetch conversations on component mount
  useEffect(() => {
    fetchConversations();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps
  
  // If userId param exists, fetch or create that conversation
  useEffect(() => {
    const initializeConversation = async () => {
      if (userId) {
        try {
          // First try to find existing conversation
          const conversation = conversations.find(c => c.user_id === parseInt(userId));
          if (conversation) {
            setActiveConversation(conversation);
            fetchMessages(conversation.user_id);
          } else {
            // If no existing conversation, check if we can use user profile info from Match component
            const storedUserInfo = sessionStorage.getItem(`match_user_${userId}`);
            
            if (storedUserInfo) {
              // Use stored user info to create a new conversation
              const userInfo = JSON.parse(storedUserInfo);
              console.log('Using stored match data:', userInfo);
              
              const newConversation = {
                user_id: parseInt(userId),
                first_name: userInfo.firstName,
                last_name: userInfo.lastName,
                last_message: null,
                unread_count: 0
              };
              
              console.log('Created new conversation:', newConversation);
              setActiveConversation(newConversation);
              setMessages([]); // Clear any existing messages
              setError(null); // Clear any existing errors
            } else {
              // If no stored info, create a default conversation with just the ID
              console.log('No stored match data, creating minimal conversation');
              const newConversation = {
                user_id: parseInt(userId),
                first_name: 'User',
                last_name: '#' + userId,
                last_message: null,
                unread_count: 0
              };
              
              setActiveConversation(newConversation);
              setMessages([]); // Clear any existing messages
              setError(null); // Clear any existing errors
            }
          }
        } catch (err) {
          console.error('Error initializing conversation:', err);
          setError('Could not load conversation');
        }
      }
    };

    if (userId) {
      initializeConversation();
    }
  }, [userId, conversations]);  // eslint-disable-line react-hooks/exhaustive-deps
  
  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/messages/conversations');
      console.log('Raw conversations data:', response.data);
      
      // Process conversations to ensure they're uniquely identified
      const processedConversations = response.data.map(conv => {
        // Make sure conversation has a last_message
        if (!conv.last_message) {
          conv.last_message = 'No messages yet';
        }
        return conv;
      });
      
      setConversations(processedConversations);
      
      // If userId is provided, we'll handle it in the other useEffect
      // If no userId and we have conversations, select the first one
      if (!userId && processedConversations.length > 0) {
        setActiveConversation(processedConversations[0]);
        fetchMessages(processedConversations[0].user_id);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load your conversations');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMessages = async (recipientId) => {
    try {
      const response = await api.get(`/api/messages/conversation?recipientId=${recipientId}`);
      console.log('Raw message data:', response.data);
      
      // Sort messages by created_at to ensure proper chronological order
      const sortedMessages = response.data.sort((a, b) => {
        return new Date(a.created_at) - new Date(b.created_at);
      });
      
      // Ensure messages have proper IDs for React keys
      const messagesWithIds = sortedMessages.map((msg, index) => {
        // If message has no id, give it a stable unique identifier
        if (!msg.id) {
          // Create a stable ID based on content and timestamps if available
          msg.id = `msg-${index}-${msg.created_at || Date.now()}-${msg.sender_id || 'unknown'}`;
        }
        return msg;
      });
      
      console.log('Processed messages:', messagesWithIds);
      setMessages(messagesWithIds);
      
      // Mark messages as read
      await api.put('/api/messages/read', { senderId: recipientId });
      
      // Update unread count in conversations list
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.user_id === recipientId ? { ...conv, unread_count: 0 } : conv
        )
      );
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    }
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeConversation) return;
    
    try {
      console.log('Sending message to:', activeConversation.user_id);
      const response = await api.post('/api/messages/send', {
        recipientId: activeConversation.user_id,
        content: newMessage.trim()
      });
      
      console.log('Send message response:', response.data);
      
      // Add the new message to the UI
      setMessages(prev => [...prev, response.data]);
      
      // Clear the input
      setNewMessage('');
      
      // Update or create conversation in the list
      const existingConversation = conversations.find(conv => conv.user_id === activeConversation.user_id);
      let updatedConversations;
      
      if (existingConversation) {
        // Update existing conversation
        updatedConversations = conversations.map(conv => {
          if (conv.user_id === activeConversation.user_id) {
            return {
              ...conv,
              last_message: newMessage.trim()
            };
          }
          return conv;
        });
      } else {
        // Add new conversation to the list
        updatedConversations = [
          {
            ...activeConversation,
            last_message: newMessage.trim()
          },
          ...conversations
        ];
      }
      
      setConversations(updatedConversations);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };
  
  const selectConversation = (conversation) => {
    setActiveConversation(conversation);
    fetchMessages(conversation.user_id);
    navigate(`/messages/${conversation.user_id}`);
  };
  
  if (loading && conversations.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  return (
    <div className="pt-16">
      {/* Desktop view - split screen */}
      <div className="hidden md:flex h-[calc(100vh-4rem)] bg-gray-100">
        {/* Conversations sidebar */}
        <div className="w-1/3 lg:w-1/4 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
          
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No conversations yet
            </div>
          ) : (
            <div>
              {conversations.map(conversation => (
                <div 
                  key={`conv-${conversation.user_id}`}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                    activeConversation && activeConversation.user_id === conversation.user_id 
                      ? 'bg-gray-100' 
                      : ''
                  }`}
                  onClick={() => selectConversation(conversation)}
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold mr-3">
                      {conversation.first_name ? conversation.first_name[0] : '?'}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h3 className="font-medium">
                          {conversation.first_name} {conversation.last_name}
                        </h3>
                        {conversation.unread_count > 0 && (
                          <span className="bg-[var(--primary)] text-white text-xs rounded-full px-2 py-1">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm truncate">
                        {conversation.last_message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b bg-white flex items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold mr-3">
                  {activeConversation.first_name ? activeConversation.first_name[0] : '?'}
                </div>
                
                <h2 className="font-medium">
                  {activeConversation.first_name} {activeConversation.last_name}
                </h2>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                {messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    No messages yet. Say hello!
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div 
                      key={`desktop-msg-${message.id || index}`}
                      className={`max-w-[75%] rounded-lg p-3 mb-2 ${
                        message.sender_id === currentUser.id
                          ? 'bg-[var(--primary)] text-white ml-auto rounded-br-none'
                          : 'bg-gray-200 mr-auto rounded-bl-none'
                      }`}
                    >
                      {message.content}
                      <div className="text-xs mt-1 opacity-50">
                        {new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Message input */}
              <div className="p-4 border-t bg-white">
                <form onSubmit={handleSendMessage} className="flex">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 border rounded-l-lg px-4 py-2 focus:outline-none focus:border-[var(--primary)]"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-[var(--primary)] text-white px-4 py-2 rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaPaperPlane />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile view - only show active conversation or list */}
      <div className="md:hidden flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-white flex items-center">
              <button 
                onClick={() => {
                  setActiveConversation(null);
                  navigate('/messages');
                }}
                className="p-2 rounded-full hover:bg-gray-100 mr-2"
              >
                <FaArrowLeft />
              </button>
              
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold mr-3">
                {activeConversation.first_name ? activeConversation.first_name[0] : '?'}
              </div>
              
              <h2 className="font-medium">
                {activeConversation.first_name} {activeConversation.last_name}
              </h2>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  No messages yet. Say hello!
                </div>
              ) : (
                messages.map((message, index) => (
                  <div 
                    key={`mobile-msg-${message.id || index}`}
                    className={`max-w-[75%] rounded-lg p-3 mb-2 ${
                      message.sender_id === currentUser.id
                        ? 'bg-[var(--primary)] text-white ml-auto rounded-br-none'
                        : 'bg-gray-200 mr-auto rounded-bl-none'
                    }`}
                  >
                    {message.content}
                    <div className="text-xs mt-1 opacity-50">
                      {new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Message input */}
            <div className="p-4 border-t bg-white">
              <form onSubmit={handleSendMessage} className="flex">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border rounded-l-lg px-4 py-2 focus:outline-none focus:border-[var(--primary)]"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-[var(--primary)] text-white px-4 py-2 rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaPaperPlane />
                </button>
              </form>
            </div>
          </>
        ) : (
          // On mobile, without active conversation, show the conversation list expanded
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 border-b">
              <h1 className="text-xl font-bold">Messages</h1>
            </div>
            
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No conversations yet
              </div>
            ) : (
              conversations.map(conversation => (
                <div 
                  key={`mobile-conv-${conversation.user_id}`}
                  className="p-4 border-b hover:bg-gray-50 active:bg-gray-100"
                  onClick={() => selectConversation(conversation)}
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold mr-3">
                      {conversation.first_name ? conversation.first_name[0] : '?'}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h3 className="font-medium">
                          {conversation.first_name} {conversation.last_name}
                        </h3>
                        {conversation.unread_count > 0 && (
                          <span className="bg-[var(--primary)] text-white text-xs rounded-full px-2 py-1">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm truncate">
                        {conversation.last_message}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      {/* Error display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default Messages;
