const generateTypes = require('./generate-types');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 解析请求体的函数
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    
    // 设置最大请求体大小（可选）
    const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB
    
    req.on('data', chunk => {
      body += chunk.toString();
      
      // 防止过大的请求体
      if (body.length > MAX_BODY_SIZE) {
        req.destroy(); // 销毁连接
        reject(new Error('Request body too large'));
      }
    });
    
    req.on('end', () => {
      try {
        // 尝试解析为JSON，如果失败则返回空对象
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        console.error('Failed to parse request body:', error.message);
        reject(new Error('Invalid JSON body'));
      }
    });
    
    req.on('error', error => {
      console.error('Request error:', error.message);
      reject(error);
    });
  });
}

// 处理GET请求的函数
async function handleGetRequest(req, res) {
  try {
    // 确定文件路径
    let filePath;
    if (req.url === '/') {
      // 根路径返回主页面
      filePath = './html/index.html';
    } else {
      // 对于所有其他GET请求，假设它们在html目录中
      // 确保路径不会重复添加html前缀
      filePath = req.url.startsWith('/html/') ? `.${req.url}` : `./html${req.url}`;
    }
    
    // 安全检查：防止目录遍历攻击
    if (filePath.includes('..')) {
      res.writeHead(403, { 'Content-Type': 'text/html' });
      return res.end('<h1>403 Forbidden</h1>');
    }
    
    // 根据文件扩展名设置正确的Content-Type
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'text/plain';
    
    if (ext === '.html') contentType = 'text/html';
    else if (ext === '.js') contentType = 'application/javascript';
    else if (ext === '.css') contentType = 'text/css';
    else if (ext === '.json') contentType = 'application/json';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    
    // 读取文件内容
    const content = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    // 文件不存在或读取错误
    console.error(`Error serving ${req.url}:`, error.message);
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404 Not Found</h1>');
  }
}

// 处理POST请求的函数
async function handlePostRequest(req, res) {
  try {
    // 解析请求体
    const body = await parseRequestBody(req);
    
    // 从请求体中获取参数
    const { openapiUrl, apiPath } = body;
    
    // 验证必要参数
    if (!openapiUrl) {
      throw new Error('Missing required parameter: openapiUrl');
    }
    
    // 调用类型生成函数
    const types = await generateTypes(openapiUrl, apiPath);
    
    // 确保生成的类型不为空
    if (!types) {
      throw new Error('Failed to generate types: empty result');
    }
    
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      // 'Content-Length': Buffer.byteLength(types) // 添加内容长度头
    });
    res.end(types);
    console.log('Request completed successfully');
  } catch (error) {
    console.error('Error handling POST request:', error.message);
    const errorBody = JSON.stringify({ error: error.message });
    res.writeHead(500, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Content-Length': Buffer.byteLength(errorBody)
    });
    res.end(errorBody);
  }
}

// 创建HTTP服务器
const server = http.createServer(async (req, res) => {
  // 为每个请求设置超时
  req.setTimeout(30000, () => {
    console.log('Request timed out');
    res.writeHead(408, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Request timeout' }));
  });
  
  try {
    if (req.method === 'GET') {
      await handleGetRequest(req, res);
    } else if (req.method === 'POST') {
      await handlePostRequest(req, res);
    } else if (req.method === 'OPTIONS') {
      // 处理预检请求
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400' // 24小时
      });
      res.end();
    } else {
      // 其他请求方法返回405错误
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
    }
  } catch (error) {

    // 检查响应是否已发送
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  } finally {
    // 确保响应被结束（如果还没有）
    if (!res.finished) {
      res.end();
    }
  }
});

// 启动服务器
server.listen(9999, () => {
  console.log('Server running at http://localhost:9999/');
});

// 服务器错误处理
server.on('error', (error) => {
  console.error('Server error:', error);
});

// 请求错误处理
server.on('clientError', (error, socket) => {
  console.error('Client error:', error);
  // 尝试向客户端发送错误响应
  try {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
  } catch (e) {
    // 忽略可能的写入错误
  } finally {
    socket.destroy(); // 确保套接字被销毁
  }
});
