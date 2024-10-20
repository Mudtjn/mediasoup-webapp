import { WebSocket, WebSocketServer } from "ws";
import { createWorker } from "./worker";
import {
  CONNECT_PRODUCER_TRANSPORT,
  CREATE_PRODUCER_TRANSPORT,
  GET_ROUTER_RTP_CAPABILITIES,
  ROUTER_CAPABILITIES,
} from "./constants";
import { Consumer, Producer, Router, RtpCapabilities, Transport } from "mediasoup/node/lib/types";
import { createWebRTCTransport } from "./createWebRTCTransport";

let mediasoupRouter: Router;
let producerTransport: Transport;
let producer: Producer; 
let consumerTransport: Transport; 
let consumer: Consumer; 

export const WebSocketConnection = async (wss: WebSocketServer) => {
  try {
    mediasoupRouter = await createWorker();
  } catch (err) {
    throw err;
  }

  wss.on("connection", (ws: WebSocket) => {
    ws.on("message", (mes) => {
      const message = mes.toString();
      const jsonValidation = isJsonString(message);
      if (!jsonValidation) {
        ws.send("Please send valid json string");
        return;
      }
      const jsonMessage = JSON.parse(message);
      const eventType = jsonMessage.type;
      broadcast(wss, eventType, jsonMessage); 
      switch (eventType) {
        case GET_ROUTER_RTP_CAPABILITIES:
          onRouterRtpCapabilities(eventType, ws);
          break;
        case CREATE_PRODUCER_TRANSPORT:
          onCreateProducerTransport(jsonMessage, ws);
          break;
        case CONNECT_PRODUCER_TRANSPORT:
          onConnectProducerTransport(jsonMessage, ws);
          break;
        case "produce": 
          onProduce(jsonMessage, ws, wss);
          break; 
        case "createConsumerTransport": 
          onCreateConsumerTransport(jsonMessage, ws); 
        case "connectConsumerTransport": 
          onConnectConsumerTransport(jsonMessage, ws); 
          break; 
        case "onResume": 
          onResume(ws); 
          break; 
        case 'consume':
          onConsume(jsonMessage, ws); 
          break; 
        default:
          break;
      }
    });
  });

  const onCreateConsumerTransport = async (data: any, ws: WebSocket) => {
    try {
      const {transport, params} = await createWebRTCTransport(mediasoupRouter); 
      consumerTransport = transport; 
      send(ws, "consumerTransportCreated", params); 
    } catch(err) {
      console.error("Error creating consumer transport"); 
    }
  }

  const onConnectConsumerTransport = async( data: any, ws: WebSocket) => {
    try {
      const {transportId, dtlsParameters } = data; 
      console.log(data); 
      await consumerTransport.connect({dtlsParameters}); 
      send(ws, 'consumerConnected', 'consumer connected!!!!')
    } catch(err) {
      console.error('error connecting to consumer transport', err); 
    }
  }

  const onResume = async(ws: WebSocket) => {
    await consumer.resume(); 
    send(ws, "resumed", "resumed"); 
  }

  const onConsume = async(event: any, ws: WebSocket) => {
    const res = await createConsumer(producer, event.rtpCapabilities); 
    send(ws, "subsribed", res); 
  }

  const isJsonString = (message: string): boolean => {
    try {
      JSON.parse(message);
    } catch (err) {
      return false;
    }
    return true;
  };

  const onRouterRtpCapabilities = (event: any, ws: WebSocket) => {
    console.log('REQUEST RECIVED'); 

    send(ws, ROUTER_CAPABILITIES, mediasoupRouter.rtpCapabilities);
    // send(ws, ROUTER_CAPABILITIES, mediasoupRouter.rtpCapabilities);
  };

  const onCreateProducerTransport = async (event: any, ws: WebSocket) => {
    console.log("PRODUCER TRANSPORT CALLED");
    try {
      const {transport, params} = await createWebRTCTransport(mediasoupRouter); 
      producerTransport = transport; 
      // broadcast(wss, "producerTransportCreated", params); 
      send(ws, "producerTransportCreated", params); 
    } catch(err){
      console.error("ERROR CREATING TRANSPORT...", err); 
    }

  };

  const onConnectProducerTransport = async(event: any, ws: WebSocket) => {
    console.log('connect producer transport triggered');
    // const data = event.data;
    // console.log(event); 
    const {transportId, dtlsParameters } = event;  
    await producerTransport.connect({ dtlsParameters }); 
    // send(ws, 'producerConnected', ""); 
    // broadcast(wss, 'producerConnected', 'producer connected!!!');
    send(ws, 'producerConnected', 'producer connected!!!'); 
  }

  const onProduce = async (data: any, ws: WebSocket, wss: WebSocketServer) => {
    const {kind, rtpParameters} = data;  
    producer = await producerTransport.produce({kind, rtpParameters}); 

    const resp = {
      id: producer.id
    }
    // broadcast(wss, "produced", resp); 
    send(ws, "produced", resp); 
    broadcast(wss, "newProducer", 'new user'); 
    producer.on('transportclose', ()=>{
        console.log('Producer transport closed'); 
        producer.close(); 
    })
  }

  const send = (ws: WebSocket, type: string, msg: any) => {
    const message = {
      type: type,
      data: msg,
    };

    const resp = JSON.stringify(message);
    ws.send(resp);
  };

  const broadcast = (wss: WebSocketServer, type: string, message: any) => {
    wss.clients.forEach((client: WebSocket) => {
      send(client, type, message); 
    })
  }

  const createConsumer = async (producer: Producer, rtpCapabilities: RtpCapabilities) => {
    if(!mediasoupRouter.canConsume({producerId: producer.id, rtpCapabilities})){
      console.error('cannot consumer'); 
      return; 
    }
    try {
      consumer = await consumerTransport.consume({
        producerId: producer.id, 
        rtpCapabilities, 
        paused: producer.kind === 'video'
      }); 
    } catch(error) {
      console.error(error); 
      return; 
    }

    return {
      producerId: producer.id, 
      consumerId: consumer.id, 
      kind: consumer.kind, 
      rtpParameters: consumer.rtpParameters, 
      type: consumer.type, 
      producerPaused: consumer.producerPaused
    }
  }
};
