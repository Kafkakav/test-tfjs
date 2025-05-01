const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 初始化 Express 應用
const app = express();

// 設定靜態文件目錄 (指向 /docs 文件夾)
const parentDir = path.resolve(__dirname, '..');
const docsPath = path.join(parentDir, 'docs');
app.use(express.static(docsPath));
app.use('/test-tfjs', express.static(docsPath));


// 設定根路徑 / 指向 /docs/index.html
app.get('/', (req, res) => {
  console.log("load index.html");
  res.sendFile(path.join(docsPath, 'index.html'));
});

// 讀取 SSL 憑證
const privateKey = fs.readFileSync(path.join(__dirname, 'certs/server.key'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, 'certs/server.crt'), 'utf8');
const credentials = { key: privateKey, cert: certificate };

// 建立 HTTPS 伺服器
const httpsServer = https.createServer(credentials, app);

// 啟動伺服器
const HOST = '192.168.16.115';
const PORT = 9443;
httpsServer.listen(PORT, HOST, () => {
  console.log(`HTTPS server running on port ${PORT}`);
  console.log(`Document root: ${docsPath}`);
  console.log(`Access at: https://${HOST}:${PORT}/`);
});

// 错误处理
httpsServer.on('error', (error) => {
  if (error.code === 'EACCES') {
    console.error(`Error: Requires root privileges for port ${PORT}`);
    console.error('Try: sudo node server.js or use a port above 1024');
  } else if (error.code === 'EADDRINUSE') {
    console.error(`Error: Port ${PORT} is already in use`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});