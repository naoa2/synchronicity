const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- 計測画面（HTML/JS）の定義 ---
const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Response Tester</title>
    <style>
        body { text-align: center; font-family: sans-serif; background: #f0f2f5; margin: 0; padding: 20px; }
        #box { 
            width: 100%; max-width: 400px; height: 300px; background: #ff4757; color: white; 
            display: flex; align-items: center; justify-content: center; font-size: 24px;
            border-radius: 20px; margin: 20px auto; cursor: pointer; user-select: none;
            transition: background 0.1s;
        }
        .rank-list { max-width: 400px; margin: 0 auto; padding: 0; }
        .rank-item { background: white; padding: 10px; margin: 5px 0; border-radius: 8px; list-style: none; display: flex; justify-content: space-between; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <h1>反応速度計測ツール</h1>
    <div id="box">クリックして開始</div>
    <h3>リアルタイム・ランキング</h3>
    <ul id="rankList" class="rank-list"></ul>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const box = document.getElementById('box');
        const rankList = document.getElementById('rankList');
        let startTime;
        let timer;

        function startWait() {
            box.style.background = '#ff4757';
            box.innerText = '待機中... (赤)';
            const delay = Math.random() * 3000 + 2000;
            timer = setTimeout(() => {
                box.style.background = '#2ed573';
                box.innerText = '今だ！！';
                startTime = performance.now();
            }, delay);
        }

        box.onclick = () => {
            if (box.innerText === 'クリックして開始' || box.style.background.includes('rgb(33, 150, 243)')) {
                startWait();
            } else if (box.style.background.includes('rgb(46, 213, 115)')) {
                const score = ((performance.now() - startTime) / 1000).toFixed(3);
                socket.emit('submit_score', { score: score });
                box.style.background = '#2196F3';
                box.innerText = score + '秒！ (次へ)';
            } else if (box.innerText.includes('待機中')) {
                clearTimeout(timer);
                box.innerText = '早すぎます！再開';
                box.style.background = '#ffa502';
            }
        };

        socket.on('update_rankings', (data) => {
            rankList.innerHTML = data.map((item, index) => 
                \`<li class="rank-item"><span>\${index + 1}位</span> <span>\${item.score} 秒</span></li>\`
            ).join('');
        });
    </script>
</body>
</html>
`;

app.get('/', (req, res) => res.send(html));

// --- サーバー側の処理 ---
let rankings = [];
io.on('connection', (socket) => {
    socket.emit('update_rankings', rankings);
    socket.on('submit_score', (data) => {
        rankings.push(data);
        rankings.sort((a, b) => a.score - b.score);
        rankings = rankings.slice(0, 10);
        io.emit('update_rankings', rankings);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server on \${PORT}`));
