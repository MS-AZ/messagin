const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cookies = require("cookie-parser");

const app = express();
const server = createServer(app);
const ws = new Server(server);

// const { default: helmet } = require("helmet");
const db = require("./database");
const { validateToken, generateID } = require("./auth")(db);
const respond = require("./respond");

const cwd = process.cwd();

app.use(cookies());
// app.use(helmet({
//     contentSecurityPolicy: false
// }));



app.use("/assets", express.static("assets"));
app.get("/avatars/:id", async (req, res) => {
    let avatar = await db.get.avatars(req.params.id)().catch(()=>{});
    if (!avatar) return respond(res, 404);
    res.send(avatar);
});

app.get("/", async (req, res) => {
    let id = await validateToken(req.cookies.access_token).catch(()=>{});
    console.log(id);
    if (!id) res.sendFile(`${cwd}/public/login.html`);
    else res.sendFile(`${cwd}/public/index.html`);
});
app.get("/script.js", (req, res) => {
    res.sendFile(`${cwd}/public/script.js`);
});
app.get("/style.css", (req, res) => {
    res.sendFile(`${cwd}/public/style.css`);
});
app.get("/*", (req, res) => {
    res.sendFile(`${cwd}/public/404.html`);
});

ws.on("connection", async socket => {
    console.log("connection");
    // console.log(getCookie("access_token", socket.request.headers.cookie));
    let id = await validateToken(
        getCookie("access_token", socket.request.headers.cookie)
    ).catch(() => {
        if (socket.handshake.auth.data
            && socket.handshake.auth.signature
            && require("crypto").verify(
            "sha256",
            Buffer.from(socket.handshake.auth.data),
            {
                key: process.env.KEY,
                padding: require("crypto").constants.RSA_PKCS1_PSS_PADDING,
            },
            Buffer.from(socket.handshake.auth.signature, "base64")
        )) return db.setRemote(socket);
        console.log("invalid token");
        socket.disconnect();
        return;
    });
    if (!id) return;
    // socket.on("message", (data) => {
    //     console.log(data);
    // });
    let user = await db.get.users(id)();
    delete user.token;
    delete user.password;
    user.id = id;
    socket.emit("userinfo", user);
    socket.on("chatinfo", async (chatid, callback) => {
        let chat = await db.get.chats(chatid)().catch(()=>{});
        chat.id = chatid;
        callback(chat);
    });
    socket.on("message", async (chat, message) => {
        if (!user.chats.includes(chat)) return;
        let mid = generateID();
        let data = {
            content: message,
            author: user.id
        };
        let broadcast = await db.set.chats(chat)
            .messages(mid)(data).catch(()=>{});
        broadcast.author = {
            username: user.username,
            color: user.color,
            avatar: user.avatar,
            id: user.id
        }
        ws.in(chat).emit("message", chat, broadcast);
    });
    socket.onAny(async (name, callback) => {
        if (!name.startsWith("chat-")) return;
        let chatid = name.substring(5);
        socket.join(chatid);
        let messages = await db.get.chats(chatid).messages().catch(()=>{});
        if (!messages?.length) return callback(null);
        let res = [];
        console.log(messages);
        messages.forEach(async (message, _, a) => {
            let author = await db.get.users(message.author)().catch(()=>{});
            message.author = {
                username: author.username,
                id: author.id,
                avatar: author.avatar,
                color: author.color
            };
            res.push(message);
            if (res.length == a.length) 
                callback(res.sort((a, b) => BigInt(a.id) > BigInt(b.id)));
        });
    });
});

function getCookie(name, cookies) {
    name += "=";
    if (!cookies) return
    for (let c of cookies.split(";")) {
        c = c.trim();
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return;
}

server.listen(5050, () => {
    console.log(`App listening on port ${server.address().port}`)
});
