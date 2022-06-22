const { createHash, randomBytes, createHmac } = require("crypto");

function validateToken(db) {
    /**
     * @param {string} token
     * @returns {Promise<string>} promise resolving with user id
     */
    return (token) => {
        return new Promise(async (resolve, reject) => {
            if (!token) return reject();
            let id = token.split(".")[0];
            if (id.length != 24) return reject();
            id = Buffer.from(id.split("").reverse().join(""), "base64").toString();
            let user = await db.get.users(id)().catch(reject);
            if (user?.token == generateHash(token)) resolve(id);
            else reject();
        });
    }
}

/**
 * @param {string} data to hash
 * @returns {string} hashed data
 */
function generateHash(data, salt) {
    let hash;
    if (salt) hash = createHmac("sha512", salt)
    else hash = createHash("sha512")
    return hash.update(data).digest("hex");
}

let chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";

/**
 * @param {string} id
 */
function generateToken(id) {
    let r = Array.from(randomBytes(96))
        .map(x => chars.charAt(~~(x/4)))
        .join("");
    return Buffer.from(id).toString("base64").split("").reverse().join("") + "." + r;
}

let counter = 0;
let last = 0;

function generateID(custom) {
    let epoch = new Date("2021 GMT").getTime();
    let now = custom ? custom : Date.now();
    let time = (now - epoch).toString(2);
    let machine = parseInt(process.env.ID || 0).toString(2);
    time == last ? counter++ : counter = 0;
    last = time;
    let increment = (counter).toString(2);
    let id = parseInt(
        "0".repeat(43-time.length) + time +
        "0".repeat(9-machine.length) + machine +
        "0".repeat(8-increment.length) + increment, 2
    ).toString();
    return "0".repeat(18 - id.length) + id;
}

module.exports = (db) => {
    return {
        validateToken: validateToken(db),
        generateHash,
        generateID,
        generateToken
    }
}
