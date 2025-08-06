// WebSocketClient.js

let WebSocket;
if (typeof window !== 'undefined') {
  // 浏览器环境
  WebSocket = window.WebSocket;
} else {
  // Node.js 环境
  WebSocket = require('ws');
}

class WebSocketClient {
   constructor(url, options = {}) {
    this.url = url;
    this.socket = null;
    this.connected = false;
    this.reqCallbacks = new Map(); // 存储请求回调
    this.subCallbacks = new Map(); // 存储订阅回调
    this.reqId = 0; // 请求序号
    
    // 配置选项
    this.options = {
      autoReconnect: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: Infinity,
      ...options
    };
    
    this.reconnectAttempts = 0;
    
    // 自动连接
    
  }
  
  // 连接WebSocket服务器
  async connect() {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      return;
    }
    this.connectionPromise = new Promise((resolve, reject) => {
	    this.socket = new WebSocket(this.url);
	    
	    this.socket.onopen = () => {
	      this.connected = true;
	      this.reconnectAttempts = 0;
	      console.log('WebSocket连接已建立');
	      
	      // 重新发送所有待处理的订阅
	      this.subCallbacks.forEach((callback, reqId) => {
          const { event } = callback;
          this._sendRequest("SUB", reqId, event);
	      });
	      resolve();
	    };
	    
	    this.socket.onmessage = (event) => {
	      try {
            const data = JSON.parse(event.data);
            this._handleMessage(data);
	      } catch (error) {
          console.error('解析WebSocket消息失败:', error);
	      }
	    };
	    
	    this.socket.onclose = (event) => {
	      this.connected = false;
        
        if (event.code == 1000) return ;

	      console.log(`WebSocket连接已关闭 (代码: ${event.code}, 原因: ${event.reason})`);
	      
	      // 清除所有请求回调
	      this.reqCallbacks.forEach((callback, reqId) => {
            if (callback.onClose) {
              callback.onClose(event);
            }
	      });
	      this.reqCallbacks.clear();
	      
	      // 自动重连逻辑
	      if (this.options.autoReconnect && 
		      this.reconnectAttempts < this.options.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})...`);
		        setTimeout(() => this.connect().catch(error => {}), this.options.reconnectInterval);
	      }
	      reject("onclose");
	    };
	    
	    this.socket.onerror = (error) => {
	      console.error('WebSocket错误:', error);
	      reject("onerror");
	    };
	  
    });
    return this.connectionPromise;
  }
  // 处理接收到的消息
  _handleMessage(data) {
    // 检查是否有请求ID
    if (data[1] && typeof data[1] === 'string') {
      const reqId = data[1];
      
      // 检查是否有对应的请求回调
      if (this.reqCallbacks.has(reqId)) {
        const callback = this.reqCallbacks.get(reqId);
        callback(data);
        this.reqCallbacks.delete(reqId);
        return;
      }
      
      // 检查是否有对应的订阅回调
      if (this.subCallbacks.has(reqId)) {
        const callback = this.subCallbacks.get(reqId);
        callback(data);
        return;
      }
    }
    
    console.log('未处理的WebSocket消息:', data);
  }
  
  // 生成唯一的请求ID
  _generateReqId() {
    return `r${this.reqId++}-${Date.now()}`;
  }
  
  // 发送请求
  _sendRequest(type, reqId, event) {
    if (!this.connected) {
      console.warn('WebSocket未连接，消息将排队等待连接');
      return false;
    }
    
    try {
      const message = JSON.stringify([
        type,
        reqId,
        event,
      ]);
      
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('发送WebSocket消息失败:', error);
      return false;
    }
  }
  
  // 发布消息
  publish(event, callback) {
    const reqId = this._generateReqId();
    const sent = this._sendRequest("PUB", reqId, event);
    if (sent && callback) {
      // 添加发布完成回调
      this.reqCallbacks.set(reqId, (response) => {
        callback(response);
      });
    }
    
    return reqId;
  }
  
  // 订阅主题
  subscribe(event, callback) {
    
    if (Array.isArray(event)) {
 
      event.forEach(subEvent => {
        let reqIds = []
        const reqId = this._generateReqId();
        const sent = this._sendRequest("SUB", reqId, subEvent);
        reqIds.push(reqIds)
        if (sent) {
          // 存储每个子事件的回调（可根据需求决定是否共享同一个callback）
          this.subCallbacks.set(reqId, callback);
    
        }
        return reqIds;
      });
    } else {
      const reqId = this._generateReqId();
      const sent = this._sendRequest("SUB", reqId, event);
    
      if (sent) {
        // 存储订阅回调
        this.subCallbacks.set(reqId, callback);
      }
      return reqId;
    }  

    
    
  }
  
  // 取消订阅
  unsubscribe(reqId) {
    if (this.subCallbacks.has(reqId)) {
      // 发送取消订阅请求
      const callback = this.subCallbacks.get(reqId);
      this._sendRequest("UNSUB", reqId, {});
      
      // 删除回调
      this.subCallbacks.delete(reqId);
      return true;
    }
    return false;
  }
  
  // 关闭连接
  close(code = 1000, reason = '正常关闭') {
    if (this.socket) {
      // 清除所有回调
      this.reqCallbacks.clear();
      this.subCallbacks.clear();
      
      // 关闭连接
      this.socket.close(code, reason);
      this.socket = null;
      this.connected = false;
    }
  }
}

module.exports = { 
    WebSocketClient
}
