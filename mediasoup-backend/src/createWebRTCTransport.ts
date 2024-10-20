import { Router } from "mediasoup/node/lib/types";
import { mediasoupConfig } from "./mediasoup-config";
import { IceParameters } from "mediasoup/node/lib/fbs/web-rtc-transport";

export const createWebRTCTransport = async (mediasoupRouter: Router) => {
    const {listenIps, maxIncomeBitrate, initialAvailableOutgoingBitrate} = mediasoupConfig.mediasoup.webRtcTransport; 
    const transport = await mediasoupRouter.createWebRtcTransport({
        listenIps: listenIps, 
        enableUdp: true, 
        enableTcp: true, 
        preferUdp: true, 
        initialAvailableOutgoingBitrate: initialAvailableOutgoingBitrate
    });
    if(maxIncomeBitrate) {
        try {
            await transport.setMaxIncomingBitrate(maxIncomeBitrate); 
        } catch(err) {
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
    }
}
