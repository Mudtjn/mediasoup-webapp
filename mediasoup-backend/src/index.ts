import { WebSocketServer } from 'ws'; 
import express  from 'express';
import cors from 'cors'; 
import http from 'http'; 
import { WebSocketConnection } from './ws';

const PORT = 8080; 
const app = express(); 
app.use(express.json()); 
app.use(cors()); 
const server = http.createServer(app); 

const wss = new WebSocketServer({server: server}); 

WebSocketConnection(wss); 

server.listen(PORT, ()=>{
    console.log(`Server listening on port ${PORT}...`); 
})


