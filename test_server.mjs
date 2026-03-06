import http from 'http';
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Hello');
});
server.listen(3000, '0.0.0.0', () => {
    console.log('Server running properly on', server.address());
});
