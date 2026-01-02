const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class AIAssistantService {
  async sendMessage(message) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/ai-assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async getSuggestions() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/ai-assistant/suggestions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return { suggestions: [] };
    }
  }

  // Predefined responses for common queries (fallback)
  getLocalResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return {
        response: "Hello! I'm your HR Assistant. I can help you with leave requests, payroll information, attendance, and more. What would you like to know?",
        data: null
      };
    }
    
    if (lowerMessage.includes('help')) {
      return {
        response: "I can assist you with:\n• Leave balance and requests\n• Payroll and salary information\n• Attendance records\n• Job openings\n• Company announcements\n• Performance reviews\n• Learning courses\n\nJust ask me anything!",
        data: null
      };
    }
    
    if (lowerMessage.includes('thank')) {
      return {
        response: "You're welcome! Feel free to ask me anything else about HR policies, your employment details, or company information.",
        data: null
      };
    }
    
    return {
      response: "I understand you're asking about something, but I need to connect to the server to give you accurate, real-time information. Please make sure you're connected to the internet and try again.",
      data: null
    };
  }

  // Format response for better display
  formatResponse(response) {
    if (!response || !response.response) {
      return "I'm sorry, I couldn't process your request right now. Please try again.";
    }

    let formattedResponse = response.response;

    // Add data context if available
    if (response.data) {
      // Add visual indicators for different types of data
      if (response.data.leave_balances) {
        formattedResponse += "\n\n💼 You can apply for leave through the Leave section in your dashboard.";
      }
      
      if (response.data.net_salary || response.data.total_ctc) {
        formattedResponse += "\n\n💰 View detailed payslips in the Payroll section.";
      }
      
      if (response.data.check_in || response.data.check_out) {
        formattedResponse += "\n\n⏰ Manage attendance in the Attendance section.";
      }
      
      if (response.data.jobs && response.data.jobs.length > 0) {
        formattedResponse += "\n\n🔍 View full job details in the Recruitment section.";
      }
    }

    return formattedResponse;
  }

  // Get contextual quick replies based on the response
  getQuickReplies(response) {
    const quickReplies = [];
    
    if (!response || !response.data) {
      return [
        "What's my leave balance?",
        "Show my attendance",
        "Any announcements?",
        "Help"
      ];
    }

    if (response.data.leave_balances) {
      quickReplies.push("Apply for leave", "Leave policy");
    }
    
    if (response.data.net_salary || response.data.total_ctc) {
      quickReplies.push("PF details", "Tax information");
    }
    
    if (response.data.jobs) {
      quickReplies.push("Application process", "Job requirements");
    }
    
    if (response.data.assets) {
      quickReplies.push("Asset policy", "Report issue");
    }

    // Default quick replies if none specific
    if (quickReplies.length === 0) {
      quickReplies.push("What else can you help with?", "Company policies");
    }

    return quickReplies;
  }

  // Check if message needs real-time data
  needsRealTimeData(message) {
    const realTimeKeywords = [
      'balance', 'salary', 'attendance', 'today', 'current', 'latest', 
      'recent', 'status', 'my', 'how many', 'show', 'what is'
    ];
    
    return realTimeKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }
}

export default new AIAssistantService();