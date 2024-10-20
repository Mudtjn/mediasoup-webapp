"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediasoupConfig = void 0;
const os_1 = __importDefault(require("os"));
exports.mediasoupConfig = {
    listenIp: '0.0.0.0',
    listenPort: 3016,
    mediasoup: {
        numWorkers: Object.keys(os_1.default.cpus()).length,
        worker: {
            rtcMinPort: 10000,
            rtcMaxPort: 10100,
            logLevel: 'debug',
            logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
        },
        router: {
            mediaCodes: [
                {
                    kind: 'audio',
                    mimeType: 'audio/opus',
                    clockRate: 48000,
                    channels: 2
                },
                {
                    kind: 'video',
                    mimeType: 'video/VP8',
                    clockRate: 90000,
                    parameters: {
                        'x-google-start-bitrate': 1000
                    }
                }
            ]
        },
        // webrtc transport settings
        webRtcTransport: {
            listenIps: [
                {
                    ip: '0.0.0.0',
                    announcedIp: '127.0.0.1' // replace by public ip
                },
            ],
            maxIncomeBitrate: 1500000,
            initialAvailableOutgoingBitrate: 1000000
        },
    }
};
