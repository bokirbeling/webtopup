"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noopAuditLogger = exports.InMemoryAuditLogger = void 0;
class InMemoryAuditLogger {
    events = [];
    record(event) {
        this.events.push(event);
    }
    getEvents() {
        return [...this.events];
    }
}
exports.InMemoryAuditLogger = InMemoryAuditLogger;
exports.noopAuditLogger = {
    record: () => { }
};
