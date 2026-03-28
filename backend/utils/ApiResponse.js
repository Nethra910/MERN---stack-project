// ✅ Standardized API response class
class ApiResponse {
  constructor(statusCode, message, data = null) {
    this.success = statusCode < 400; // ✅ Auto-determine success based on status code
    this.statusCode = statusCode;
    this.message = message;
    
    // ✅ Only include data if it's not null
    if (data !== null) {
      this.data = data;
    }
  }
}

export default ApiResponse;