import * as mediasoup from 'mediasoup';
import { AppData, Router, Worker, WorkerLogLevel, WorkerLogTag } from 'mediasoup/node/lib/types';
import { mediasoupConfig } from './mediasoup-config';

const worker: Array<{worker: Worker, router: Router}> = []
let nextMediaSoupWorkerIndx = 0; 

export const createWorker = async (): Promise<Router<AppData>> => {
    const worker = await mediasoup.createWorker({
        logLevel: mediasoupConfig.mediasoup.worker.logLevel as WorkerLogLevel,
        logTags: mediasoupConfig.mediasoup.worker.logTags as WorkerLogTag[], 
        rtcMinPort: mediasoupConfig.mediasoup.worker.rtcMinPort, 
        rtcMaxPort: mediasoupConfig.mediasoup.worker.rtcMaxPort 
    }); 

    worker.on('died', () => {
        console.error(`mediasoup worker died, exiting in 2 seconds... ${worker.pid}`); 
        setTimeout(() => {
            process.exit(1)
        }, 2000); 
    })

    const mediasoupRouter = await worker.createRouter({
        mediaCodecs: mediasoupConfig.mediasoup.router.mediaCodes
    })
    return mediasoupRouter; 
}