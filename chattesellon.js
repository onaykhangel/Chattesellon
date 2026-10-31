
/* =====================================
   CHATTESELLON
   SUPABASE PUBLIC MESSAGE BOARD
===================================== */

const SUPABASE_URL = "https://ywxkqpidkgagbnixoegv.supabase.co";
const SUPABASE_KEY = "sb_publishable_uFZC3FMn9y8qSLCpmgpqvw_sKPPrcol";

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const VISITOR_KEY = "chattesellon_visitor_id";

let visitorId = localStorage.getItem(VISITOR_KEY);

if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, visitorId);
}

let posts = [];
let selectedImage = null;
let selectedGif = null;

const emojis = [
    "🤍", "🖤", "💙", "💜", "❤️",
    "♡", "♥", "☆", "★", "✦",
    "✧", "✩", "✪", "✿", "❀",
    "☾", "☽", "☁", "☂", "❄",
    "🌙", "⭐", "🌌", "🪐", "✨",
    "🌸", "🌷", "🦋", "🐈", "🐈‍⬛",
    "🐇", "🕊️", "🍓", "🍰", "🎀",
    "🎧", "🎮", "🎨", "📷", "💌"
];


/* =====================================
   HELPERS
===================================== */

function makeElement(tag, className, text) {
    const el = document.createElement(tag);

    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;

    return el;
}

function validUrl(value) {
    if (!value) return "";

    try {
        const url = new URL(value);

        if (
            url.protocol === "https:" ||
            url.protocol === "http:"
        ) {
            return url.href;
        }
    } catch (error) {}

    return "";
}

function formatDate(date) {
    return new Date(date).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function showError(error) {
    console.error(error);
    alert("Ошибка: " + (error.message || "Не удалось выполнить действие."));
}


/* =====================================
   ELEMENTS
===================================== */

const postForm = document.getElementById("postForm");
const postText = document.getElementById("postText");
const postsContainer = document.getElementById("postsContainer");
const emptyFeed = document.getElementById("emptyFeed");

const imageUpload = document.getElementById("imageUpload");
const imagePreview = document.getElementById("imagePreview");

const emojiPicker = document.getElementById("emojiPicker");
const emojiList = document.getElementById("emojiList");

const gifInputPanel = document.getElementById("gifInputPanel");
const gifUrl = document.getElementById("gifUrl");

const characterCounter =
    document.getElementById("characterCounter");


/* =====================================
   EMOJI PICKER
===================================== */

function insertEmoji(input, emoji) {
    const start = input.selectionStart;
    const end = input.selectionEnd;

    input.value =
        input.value.substring(0, start) +
        emoji +
        input.value.substring(end);

    input.focus();

    const position = start + emoji.length;

    input.setSelectionRange(position, position);
    updateCounter();
}

function createEmojiPicker() {
    emojiList.replaceChildren();

    emojis.forEach(emoji => {
        const button = makeElement("button", "", emoji);
        button.type = "button";

        button.addEventListener("click", () => {
            insertEmoji(postText, emoji);
        });

        emojiList.appendChild(button);
    });
}

document.getElementById("emojiButton")
    .addEventListener("click", () => {
        emojiPicker.hidden = !emojiPicker.hidden;
    });

createEmojiPicker();


/* =====================================
   CHARACTER COUNTER
===================================== */

function updateCounter() {
    characterCounter.textContent =
        postText.value.length + " / 2000";
}

postText.addEventListener("input", updateCounter);


/* =====================================
   IMAGE UPLOAD
===================================== */

imageUpload.addEventListener("change", () => {
    const file = imageUpload.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Выбери файл изображения.");
        imageUpload.value = "";
        return;
    }

    if (file.size > 700 * 1024) {
        alert("Максимальный размер изображения: 700 КБ.");
        imageUpload.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        selectedImage = reader.result;

        imagePreview.replaceChildren();

        const image = makeElement("img");
        image.src = selectedImage;
        image.alt = "Image preview";

        imagePreview.appendChild(image);

        const remove = makeElement("button", "", "✕");
        remove.type = "button";

        remove.addEventListener("click", () => {
            selectedImage = null;
            imageUpload.value = "";
            imagePreview.replaceChildren();
        });

        imagePreview.appendChild(remove);
    };

    reader.readAsDataURL(file);
});


/* =====================================
   GIF
===================================== */

document.getElementById("gifButton")
    .addEventListener("click", () => {
        gifInputPanel.hidden = !gifInputPanel.hidden;
    });

document.getElementById("addGifButton")
    .addEventListener("click", () => {
        const url = validUrl(gifUrl.value.trim());

        if (!url) {
            alert("Введи корректную ссылку на GIF.");
            return;
        }

        selectedGif = url;

        const image = makeElement("img");
        image.src = url;
        image.alt = "GIF preview";
        image.style.maxWidth = "120px";
        image.style.maxHeight = "100px";

        imagePreview.appendChild(image);

        gifInputPanel.hidden = true;
        gifUrl.value = "";
    });


/* =====================================
   LOAD DATA
===================================== */

async function loadPosts() {
    const { data: postData, error: postError } =
        await supabase
            .from("posts")
            .select("*")
            .order("created_at", { ascending: false });

    if (postError) {
        showError(postError);
        return;
    }

    const { data: replyData, error: replyError } =
        await supabase
            .from("replies")
            .select("*")
            .order("created_at", { ascending: true });

    if (replyError) {
        showError(replyError);
        return;
    }

    const { data: likeData, error: likeError } =
        await supabase
            .from("likes")
            .select("*");

    if (likeError) {
        showError(likeError);
        return;
    }

    const repliesById = new Map();

    replyData.forEach(reply => {
        repliesById.set(reply.id, {
            ...reply,
            text: reply.content,
            avatar: reply.avatar_url,
            date: reply.created_at,
            likes: 0,
            liked: false,
            replies: []
        });
    });

    posts = postData.map(post => ({
        ...post,
        text: post.content,
        avatar: post.avatar_url,
        image: post.image_url,
        gif: post.gif_url,
        date: post.created_at,
        likes: 0,
        liked: false,
        replies: []
    }));

    const postMap = new Map(posts.map(post => [post.id, post]));

    replyData.forEach(reply => {
        const item = repliesById.get(reply.id);

        if (reply.parent_reply_id) {
            const parent = repliesById.get(reply.parent_reply_id);

            if (parent) parent.replies.push(item);
        } else {
            const root = postMap.get(reply.post_id);

            if (root) root.replies.push(item);
        }
    });

    likeData.forEach(like => {
        const post = postMap.get(like.post_id);

        if (post) {
            post.likes++;

            if (like.visitor_id === visitorId) {
                post.liked = true;
            }
        }
    });

    renderPosts();
}


/* =====================================
   CREATE POST
===================================== */

postForm.addEventListener("submit", async event => {
    event.preventDefault();

    const nickname =
        document.getElementById("nickname").value.trim();

    const avatar =
        validUrl(document.getElementById("avatarUrl").value.trim());

    const message = postText.value.trim();

    if (!nickname || nickname.length > 30) {
        alert("Никнейм должен содержать от 1 до 30 символов.");
        return;
    }

    if (!message && !selectedImage && !selectedGif) {
        alert("Добавь текст или изображение.");
        return;
    }

    try {
    alert("startin' sendin'!");

    const { data, error } = await supabase
        .from("posts")
        .insert({
            nickname: nickname,
            avatar_url: avatar || null,
            content: message,
            image_url: selectedImage,
            gif_url: selectedGif
        })
        .select();

    if (error) {
        alert("SUPABASE ERROR: " + error.message);
        console.error(error);
        return;
    }

    alert("MESSENGE SAVED!");

    postForm.reset();
    selectedImage = null;
    selectedGif = null;

    imagePreview.replaceChildren();
    gifInputPanel.hidden = true;
    emojiPicker.hidden = true;

    updateCounter();
    await loadPosts();

} catch (error) {
    alert("JAVASCRIPT ERROR: " + error.message);
    }

    postForm.reset();

    selectedImage = null;
    selectedGif = null;

    imagePreview.replaceChildren();
    gifInputPanel.hidden = true;
    emojiPicker.hidden = true;

    updateCounter();
    await loadPosts();
});


/* =====================================
   FIND MESSAGE
===================================== */

function findMessage(list, id) {
    for (const item of list) {
        if (item.id === id) return item;

        const found = findMessage(item.replies || [], id);

        if (found) return found;
    }

    return null;
}


/* =====================================
   REPLY FORM
===================================== */

function createReplyForm(rootId, parentId) {
    const form = makeElement("form", "reply-form");

    form.dataset.rootId = rootId;
    form.dataset.parentId = parentId;

    const nickname = makeElement("input");
    nickname.type = "text";
    nickname.placeholder = "Your nickname...";
    nickname.maxLength = 30;
    nickname.required = true;
    nickname.name = "nickname";

    const avatar = makeElement("input");
    avatar.type = "url";
    avatar.placeholder = "Avatar URL (optional)";
    avatar.name = "avatar";

    const textarea = makeElement("textarea");
    textarea.placeholder = "Write a reply...";
    textarea.maxLength = 2000;
    textarea.required = true;
    textarea.name = "message";

    const controls = makeElement("div", "reply-form-controls");

    const cancel = makeElement("button", "", "CANCEL");
    cancel.type = "button";

    cancel.addEventListener("click", () => form.remove());

    const send = makeElement("button", "", "REPLY ✦");
    send.type = "submit";

    controls.append(cancel, send);
    form.append(nickname, avatar, textarea, controls);

    return form;
}


/* =====================================
   RENDER MESSAGE
===================================== */

function renderMessage(item, rootId, isReply = false) {
    const wrapper = makeElement(
        "article",
        isReply ? "reply" : "post"
    );

    wrapper.dataset.itemId = item.id;

    const header = makeElement("div", "post-header");

    if (item.avatar) {
        const avatar = makeElement("img", "post-avatar");
        avatar.src = item.avatar;
        avatar.alt = item.nickname;

        avatar.addEventListener("error", () => {
            avatar.replaceWith(
                makeElement("div", "post-avatar", "✦")
            );
        });

        header.appendChild(avatar);
    } else {
        header.appendChild(
            makeElement("div", "post-avatar", "✦")
        );
    }

    const authorInfo = makeElement("div");

    authorInfo.appendChild(
        makeElement("div", "post-author", item.nickname)
    );

    authorInfo.appendChild(
        makeElement("div", "post-date", formatDate(item.date))
    );

    header.appendChild(authorInfo);
    wrapper.appendChild(header);

    if (item.text) {
        wrapper.appendChild(
            makeElement("div", "post-content", item.text)
        );
    }

    if (item.image) {
        const image = makeElement("img", "post-image");
        image.src = item.image;
        image.alt = "Attached image";
        image.loading = "lazy";
        wrapper.appendChild(image);
    }

    if (item.gif) {
        const gif = makeElement("img", "post-image");
        gif.src = item.gif;
        gif.alt = "GIF";
        gif.loading = "lazy";
        wrapper.appendChild(gif);
    }

    const actions = makeElement("div", "post-actions");

    const likeButton = makeElement(
        "button",
        "like-button",
        (item.liked ? "♥ " : "♡ ") + item.likes
    );

    likeButton.type = "button";
    likeButton.dataset.action = "like";

    const replyButton = makeElement(
        "button",
        "reply-button",
        "↩ Reply"
    );

    replyButton.type = "button";
    replyButton.dataset.action = "reply";

    actions.append(likeButton, replyButton);
    wrapper.appendChild(actions);

    if (item.replies && item.replies.length) {
        const container = makeElement("div", "replies-container");

        item.replies.forEach(reply => {
            container.appendChild(
                renderMessage(reply, rootId, true)
            );
        });

        wrapper.appendChild(container);
    }

    return wrapper;
}


/* =====================================
   RENDER POSTS
===================================== */

function renderPosts() {
    postsContainer.replaceChildren();

    if (!posts.length) {
        postsContainer.appendChild(emptyFeed);
        emptyFeed.hidden = false;
        return;
    }

    emptyFeed.hidden = true;

    const sortedPosts = [...posts];

    const sort = document.getElementById("sortPosts").value;

    if (sort === "oldest") {
        sortedPosts.reverse();
    }

    sortedPosts.forEach(post => {
        postsContainer.appendChild(
            renderMessage(post, post.id)
        );
    });
}


/* =====================================
   SORTING
===================================== */

document.getElementById("sortPosts")
    .addEventListener("change", renderPosts);


/* =====================================
   LIKE AND REPLY BUTTONS
===================================== */

postsContainer.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const messageElement = button.closest("[data-item-id]");

    if (!messageElement) return;

    const id = messageElement.dataset.itemId;
    const item = findMessage(posts, id);

    if (!item) return;

    if (button.dataset.action === "like") {
        if (item.id !== id || !posts.some(post => post.id === id)) {
            alert("Пока лайки доступны только для публикаций.");
            return;
        }

        button.disabled = true;

        let result;

        if (item.liked) {
            result = await supabase
                .from("likes")
                .delete()
                .eq("post_id", id)
                .eq("visitor_id", visitorId);
        } else {
            result = await supabase
                .from("likes")
                .insert({
                    post_id: id,
                    visitor_id: visitorId
                });
        }

        button.disabled = false;

        if (result.error) {
            showError(result.error);
            return;
        }

        await loadPosts();
    }

    if (button.dataset.action === "reply") {
        const existing =
            messageElement.querySelector(":scope > .reply-form");

        if (existing) {
            existing.remove();
            return;
        }

        const rootPost = posts.find(post =>
            findMessage([post], id)
        );

        if (!rootPost) return;

        const form = createReplyForm(rootPost.id, id);

        messageElement.appendChild(form);
        form.querySelector("input").focus();
    }
});


/* =====================================
   SEND REPLY
===================================== */

postsContainer.addEventListener("submit", async event => {
    const form = event.target.closest(".reply-form");

    if (!form) return;

    event.preventDefault();

    const rootId = form.dataset.rootId;
    const parentId = form.dataset.parentId;

    const nickname = form.elements.nickname.value.trim();

    const avatar = validUrl(
        form.elements.avatar.value.trim()
    );

    const message = form.elements.message.value.trim();

    if (!nickname || nickname.length > 30 || !message) {
        alert("Проверь никнейм и текст ответа.");
        return;
    }

    const { error } = await supabase
        .from("replies")
        .insert({
            post_id: rootId,
            parent_reply_id:
                parentId === rootId ? null : parentId,
            nickname: nickname,
            avatar_url: avatar || null,
            content: message
        });

    if (error) {
        showError(error);
        return;
    }

    await loadPosts();
});


/* =====================================
   START
===================================== */

loadPosts();
updateCounter();

setInterval(() => {
    loadPosts();
}, 10000);
       
