const input = document.querySelector("textarea");
const chats = document.querySelector("#chats");
const userinfo = document.querySelector("#userinfo");
const username = document.querySelector("#username");
const useravatar = document.querySelector("#avatar");
const contextmenu = document.querySelector("#contextmenu");
const messagescont = document.querySelector("#messages-scroller");

let user;
let lastauthor = "";
let currentchat = "";
let currentgroup = null;

let socket = io();

socket.on("connect", () => {
    console.log("socket connected");
});
socket.on("disconnect", () => {
    console.log("socket disconnected");
});
socket.on("userinfo", data => {
    user = data;
    document.body.setAttribute("style", `--user-color: ${formatColor(data.color)}`);
    console.log(data);
    username.innerHTML = data.username;
    useravatar.src = `/avatars/${user.avatar}`;
    useravatar.srcset = `/avatars/${user.avatar}, /assets/avatar.svg`;
    chats.innerHTML = "";
    data.chats.forEach(chat => {
        socket.emit("chatinfo", chat, info => {
            console.log(info);
            let el = document.createElement("div");
            el.innerHTML = info.name;
            el.setAttribute("data-id", info.id);
            el.className = "chat";
            el.onclick = () => {
                loadChat(info.id);
                el.classList.add("active");
                input.setAttribute("placeholder", `Message #${info.name}`);
            }
            chats.appendChild(el);
        });
    });
});
socket.on("message", (chat, message) => {
    if (chat != currentchat) return;
    loadMessage(message);
})

function loadChat(chatid) {
    if (chatid == currentchat) return;
    document.querySelector(".chat.active")?.classList?.remove("active");
    messagescont.innerHTML = "";
    currentchat = chatid;
    lastauthor = "";
    socket.emit(`chat-${chatid}`, messages => {
        console.log(messages);
        messages.forEach(message => {
            loadMessage(message);
        });
    });
}

function loadMessage(data) {
    if (data.author.id != lastauthor) {
        let grid = document.createElement("div");
        grid.className = "messagegroup";
        grid.setAttribute("style", `--author: ${
            formatColor(data.author.color)
        }`);
        let left = document.createElement("div");
        left.className = "left";
        let avatar = new Image();
        avatar.src = `/avatars/${data.author.avatar}`;
        avatar.className = "avatar";
        left.appendChild(avatar);
        grid.appendChild(left);
        let center = document.createElement("div");
        center.className = "center";
        let author = document.createElement("div");
        author.className = "author";
        author.setAttribute("data-id", data.author.id);
        author.innerText = data.author.username;
        grid.appendChild(author);
        let message = document.createElement("div");
        message.className = "message";
        message.innerText = data.content;
        center.appendChild(message);
        grid.appendChild(center);
        // messagescont.insertAdjacentElement("afterbegin", grid);
        messagescont.appendChild(grid);
        lastauthor = data.author.id;
    } else {
        let all = document.querySelectorAll(".messagegroup");
        let grid = all[all.length - 1];
        let center = grid.querySelector(".center");
        let message = document.createElement("div");
        message.className = "message";
        message.innerText = data.content;
        // center.insertAdjacentElement("afterbegin", message);
        center.appendChild(message);
    }
    return;
}

function formatColor(color) {
    let colorstr = color.toString(16);
    return "#" + "0".repeat(6-colorstr.length) + colorstr;
}


let contextmenuactive = false;
oncontextmenu = (e) => {
    e.preventDefault();
    if (contextmenuactive) destroyContext();
    contextmenuactive = true;
    let context = [];
    if (target(e, userinfo)) context.push({
        label: "Copy username",
        action: () => copyToClipboard(user?.username)
    });
    if (target(e, useravatar)) context.push({
        label: "Copy avatar ID",
        action: () => copyToClipboard(user?.avatar)
    }); else if (target(e, userinfo)) context.push({
        label: "Copy user ID",
        action: () => copyToClipboard(user?.id)
    })
    if (e.target.classList.contains("chat")) context.push({
        label: "Copy chat ID",
        action: () => copyToClipboard(e.target.getAttribute("data-id"))
    });
    setContext(context);
    contextmenu.style.display = "block";
    contextmenu.style.left = e.pageX + "px";
    contextmenu.style.top = e.pageY + "px";
}
onclick = destroyContext;

function copyToClipboard(text) {
    if (window.clipboardData?.setData) {
        return window.clipboardData.setData("Text", text);
    } else if (navigator.clipboard) {
        return navigator.clipboard.writeText(text);
    } else if (document.queryCommandSupported?.("copy")) {
        let textarea = document.createElement("textarea");
        textarea.textContent = text;
        textarea.style.position = "fixed";
        textarea.style.zIndex = "-1";
        document.body.appendChild(textarea);
        textarea.select();
        try {
            return document.execCommand("copy");
        } catch {} finally {
            textarea.remove();
        }
    }
}
function setContext(context) {
    if (!context.length) {
        let span = document.createElement("span");
        span.innerHTML = "(empty)";
        contextmenu.appendChild(span);
    } else {
        context.forEach(el => {
            let div = document.createElement("div");
            div.innerHTML = el.label;
            div.onclick = () => {
                el.action();
                destroyContext();
            };
            contextmenu.appendChild(div);
        });
    }
}
function destroyContext(e) {
    if (!contextmenuactive) return;
    if (target(e, contextmenu)) return;
    contextmenu.innerHTML = "";
    contextmenu.style.display = "";
    contextmenuactive = false;
}
function target(event, element) {
    return event?.path?.includes?.(element)
        || event?.composedPath?.includes?.(element);
}

input.addEventListener("keydown", e => {
    let sel = { start: input.selectionStart, end: input.selectionEnd };
    if (e.key == "Enter" && !e.shiftKey && input.value.trim()) {
        send(input.value);
        input.value = "";
    } else if (e.key == "i" && e.ctrlKey) {
        let result = wrap("*", input.value, sel.start, sel.end);
        input.value = result.text;
        input.setSelectionRange(result.start, result.end);
    } else if (e.key == "s" && e.ctrlKey) {
        let result = wrap("||", input.value, sel.start, sel.end);
        input.value = result.text;
        input.setSelectionRange(result.start, result.end);
    } else if (e.key == "b" && e.ctrlKey) {
        let result = wrap("**", input.value, sel.start, sel.end);
        input.value = result.text;
        input.setSelectionRange(result.start, result.end);
    } else if (e.key == "u" && e.ctrlKey) {
        let result = wrap("__", input.value, sel.start, sel.end);
        input.value = result.text;
        input.setSelectionRange(result.start, result.end);
    } else return;
    e.preventDefault();
})
input.addEventListener("input", e => {
    input.style.height = input.value.split("\n").length + 1 + "rem";
});

function send(message) {
    socket.emit("message", currentchat, message);
}

function wrap(decorator, text, start, end) {
    let newend = end;
    let selection = text.substring(start, end);
    if (selection.startsWith(decorator) && selection.endsWith(decorator)) {
        selection = selection.substring(decorator.length, selection.length - decorator.length);
        newend -= decorator.length*2
    } else {
        selection = decorator + selection + decorator;
        newend += decorator.length*2;
    }
    return {
        text: text.substring(0, start) + selection + text.substring(end),
        start: start,
        end: newend
    }
}
