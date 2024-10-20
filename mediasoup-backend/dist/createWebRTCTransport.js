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
exports.createWebRTCTransport = void 0;
const mediasoup_config_1 = require("./mediasoup-config");
const createWebRTCTransport = (mediasoupRouter) => __awaiter(void 0, void 0, void 0, function* () {
    const { listenIps, maxIncomeBitrate, initialAvailableOutgoingBitrate } = mediasoup_config_1.mediasoupConfig.mediasoup.webRtcTransport;
    const transport = yield mediasoupRouter.createWebRtcTransport({
        listenIps: listenIps,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: initialAvailableOutgoingBitrate
    });
    if (maxIncomeBitrate) {
        try {
            yield transport.setMaxIncomingBitrate(maxIncomeBitrate);
        }
        catch (err) {
            console.log(err);
        }
    }
    return {
        transport,
        params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters
        }
    };
});
exports.createWebRTCTransport = createWebRTCTransport;
