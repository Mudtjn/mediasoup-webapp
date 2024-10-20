"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketConnection = void 0;
const worker_1 = require("./worker");
const constants_1 = require("./constants");
const createWebRTCTransport_1 = require("./createWebRTCTransport");
let mediasoupRouter;
let producerTransport;
let producer;
let consumerTransport;
let consumer;
const WebSocketConnection = (wss) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        mediasoupRouter = yield (0, worker_1.createWorker)();
    }
    catch (err) {
        throw err;
    }
    wss.on("connection", (ws) => {
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
                case constants_1.GET_ROUTER_RTP_CAPABILITIES:
                    onRouterRtpCapabilities(eventType, ws);
                    break;
                case constants_1.CREATE_PRODUCER_TRANSPORT:
                    onCreateProducerTransport(jsonMessage, ws);
                    break;
                case constants_1.CONNECT_PRODUCER_TRANSPORT:
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
    const onCreateConsumerTransport = (data, ws) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { transport, params } = yield (0, createWebRTCTransport_1.createWebRTCTransport)(mediasoupRouter);
            consumerTransport = transport;
            send(ws, "consumerTransportCreated", params);
        }
        catch (err) {
            console.error("Error creating consumer transport");
        }
    });
    const onConnectConsumerTransport = (data, ws) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { transportId, dtlsParameters } = data;
            console.log(data);
            yield consumerTransport.connect({ dtlsParameters });
            send(ws, 'consumerConnected', 'consumer connected!!!!');
        }
        catch (err) {
            console.error('error connecting to consumer transport', err);
        }
    });
    const onResume = (ws) => __awaiter(void 0, void 0, void 0, function* () {
        yield consumer.resume();
        send(ws, "resumed", "resumed");
    });
    const onConsume = (event, ws) => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield createConsumer(producer, event.rtpCapabilities);
        send(ws, "subsribed", res);
    });
    const isJsonString = (message) => {
        try {
            JSON.parse(message);
        }
        catch (err) {
            return false;
        }
        return true;
    };
    const onRouterRtpCapabilities = (event, ws) => {
        console.log('REQUEST RECIVED');
        send(ws, constants_1.ROUTER_CAPABILITIES, mediasoupRouter.rtpCapabilities);
        // send(ws, ROUTER_CAPABILITIES, mediasoupRouter.rtpCapabilities);
    };
    const onCreateProducerTransport = (event, ws) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("PRODUCER TRANSPORT CALLED");
        try {
            const { transport, params } = yield (0, createWebRTCTransport_1.createWebRTCTransport)(mediasoupRouter);
            producerTransport = transport;
            // broadcast(wss, "producerTransportCreated", params); 
            send(ws, "producerTransportCreated", params);
        }
        catch (err) {
            console.error("ERROR CREATING TRANSPORT...", err);
        }
    });
    const onConnectProducerTransport = (event, ws) => __awaiter(void 0, void 0, void 0, function* () {
        console.log('connect producer transport triggered');
        // const data = event.data;
        // console.log(event); 
        const { transportId, dtlsParameters } = event;
        yield producerTransport.connect({ dtlsParameters });
        // send(ws, 'producerConnected', ""); 
        // broadcast(wss, 'producerConnected', 'producer connected!!!');
        send(ws, 'producerConnected', 'producer connected!!!');
    });
    const onProduce = (data, ws, wss) => __awaiter(void 0, void 0, void 0, function* () {
        const { kind, rtpParameters } = data;
        producer = yield producerTransport.produce({ kind, rtpParameters });
        const resp = {
            id: producer.id
        };
        // broadcast(wss, "produced", resp); 
        send(ws, "produced", resp);
        broadcast(wss, "newProducer", 'new user');
        producer.on('transportclose', () => {
            console.log('Producer transport closed');
            producer.close();
        });
    });
    const send = (ws, type, msg) => {
        const message = {
            type: type,
            data: msg,
        };
        const resp = JSON.stringify(message);
        ws.send(resp);
    };
    const broadcast = (wss, type, message) => {
        wss.clients.forEach((client) => {
            send(client, type, message);
        });
    };
    const createConsumer = (producer, rtpCapabilities) => __awaiter(void 0, void 0, void 0, function* () {
        if (!mediasoupRouter.canConsume({ producerId: producer.id, rtpCapabilities })) {
            console.error('cannot consumer');
            return;
        }
        try {
            consumer = yield consumerTransport.consume({
                producerId: producer.id,
                rtpCapabilities,
                paused: producer.kind === 'video'
            });
        }
        catch (error) {
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
        };
    });
});
exports.WebSocketConnection = WebSocketConnection;
