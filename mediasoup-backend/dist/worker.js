"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.createWorker = void 0;
const mediasoup = __importStar(require("mediasoup"));
const mediasoup_config_1 = require("./mediasoup-config");
const worker = [];
let nextMediaSoupWorkerIndx = 0;
const createWorker = () => __awaiter(void 0, void 0, void 0, function* () {
    const worker = yield mediasoup.createWorker({
        logLevel: mediasoup_config_1.mediasoupConfig.mediasoup.worker.logLevel,
        logTags: mediasoup_config_1.mediasoupConfig.mediasoup.worker.logTags,
        rtcMinPort: mediasoup_config_1.mediasoupConfig.mediasoup.worker.rtcMinPort,
        rtcMaxPort: mediasoup_config_1.mediasoupConfig.mediasoup.worker.rtcMaxPort
    });
    worker.on('died', () => {
        console.error(`mediasoup worker died, exiting in 2 seconds... ${worker.pid}`);
        setTimeout(() => {
            process.exit(1);
        }, 2000);
    });
    const mediasoupRouter = yield worker.createRouter({
        mediaCodecs: mediasoup_config_1.mediasoupConfig.mediasoup.router.mediaCodes
    });
    return mediasoupRouter;
});
exports.createWorker = createWorker;
