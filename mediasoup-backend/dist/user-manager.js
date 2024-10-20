"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserManager = void 0;
const uuid_1 = require("uuid");
class UserManager {
    constructor() {
        this.users = new Map();
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new UserManager();
        }
        return this.instance;
    }
    getUserId(ws) {
        let id = this.users.get(ws);
        if (!id) {
            id = (0, uuid_1.v4)();
            this.users.set(ws, id);
        }
        return id;
    }
    removeUser(ws) {
    }
}
exports.UserManager = UserManager;
