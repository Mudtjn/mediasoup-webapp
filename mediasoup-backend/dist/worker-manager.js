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
exports.WorkerManager = void 0;
const mediasoup_config_1 = require("./mediasoup-config");
const mediasoup_1 = require("mediasoup");
class WorkerManager {
    constructor() {
        this.createWorkerAndRouter();
    }
    createWorkerAndRouter() {
        return __awaiter(this, void 0, void 0, function* () {
            this.worker = yield (0, mediasoup_1.createWorker)(mediasoup_config_1.workerSettings);
            this.router = yield this.worker.createRouter({ mediaCodecs: mediasoup_config_1.mediaCodecs });
        });
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new WorkerManager();
        }
        return this.instance;
    }
}
exports.WorkerManager = WorkerManager;
