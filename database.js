const fs = require("fs");
const path = require("path");

const io = require("socket.io")

function nop() {}

class Database {
    constructor(dir = "/") {
        this.ws = null;
        let stat;
        // stat = fs.statSync(path.resolve(dir), {
        //     throwIfNoEntry: false
        // });
        // if (!stat) throw this.error.NotFound(dir);
        // if (!stat.isDirectory()) throw this.error.FileType(dir, "directory");
        // this.root = path.resolve(dir);
    }
    get error() {
        return {
            NotFound: (path) => Error(`${path} does not exist`),
            FileType: (path, type) => Error(`${path} is not of type ${type}`),
            Internal: () => Error(`an internal server error happened`),
            ProxyErr: () => Error(`proxy database should have one parameter inside function call`)
        }
    }
    get online() {
        return !this.ws || !this.ws.disconnected
    }
    setRemote(ws) {
        this.ws = ws;
    }
    get get() {
        let path = "/";
        let handler = {
            get: (_, arg) => {
                path += arg + "/";
                return new Proxy(nop, handler);
            }, apply: (_0, _1, args) => {
                if (args.length == 0) {
                    return new Promise((resolve, reject) => {
                        this.ws.emit("get", path, (haserr, data, err) => {
                            if (haserr) return reject(err);
                            resolve(data);
                        });
                    });
                }
                if (args.length != 1) throw this.error.ProxyErr();
                path += args[0] + "/";
                return new Proxy(nop, handler);
            }
        }
        return new Proxy(nop, handler);
    }
    get set() {
        let path = "/";
        let handler = {
            get: (_, arg) => {
                path += arg + "/";
                return new Proxy(nop, handler);
            }, apply: (_0, _1, args) => {
                if (typeof args[0] != "string") {
                    return new Promise((resolve, reject) => {
                        this.ws.emit("set", path, args[0],
                        (haserr, data, err) => {
                            if (haserr) return reject(err);
                            resolve(data);
                        });
                    });
                }
                if (args.length != 1) throw this.error.ProxyErr();
                path += args[0] + "/";
                return new Proxy(nop, handler);
            }
        }
        return new Proxy(nop, handler);
    }
}

module.exports = new Database("./db");
