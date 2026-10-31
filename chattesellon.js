
/* =====================================
   CHATTESELLON
   PUBLIC MESSAGE BOARD
===================================== */

const STORAGE_KEY = "chattesellon_posts";

let posts = [];
let selectedImage = null;
let selectedGif = null;


// =====================================
// STORAGE
// =====================================

function loadPosts() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        posts = saved ? JSON.parse(saved) : [];

        if (!Array.isArray(posts)) {
            posts = [];
        }
    } catch (error) {
        console.error("Could not load posts:", error);
        posts = [];
    }
}

function savePosts() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
        return true;
    } catch (error) {
        alert(
            "Не удалось сохранить публикацию. " +
            "Возможно, закончилось место в хранилище браузера."
        );

        console.error(error);
        return false;
    }
}


// =====================================
// HELPERS
// =====================================

function createId() {
    return Date.now().toString(36) +
        Math.random().toString(36).slice(2, 9);
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

function makeElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}


// =====================================
// EMOJI PICKER
// =====================================

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

const emojiPicker = document.getElementById("emojiPicker");
const emojiList = document.getElementById("emojiList");
const postText = document.getElementById("postText");

function createEmojiPicker() {
    emojis.forEach(emoji => {
        const button = makeElement("button", "", emoji);
        button.type = "button";

        button.addEventListener("click", () => {
            insertEmoji(postText, emoji);
        });

        emojiList.appendChild(button);
    });
}

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

document.getElementById("emojiButton")
    .addEventListener("click", () => {

        emojiPicker.hidden = !emojiPicker.hidden;

    });

createEmojiPicker();


// =====================================
// CHARACTER COUNTER
// =====================================

const characterCounter =
    document.getElementById("characterCounter");

function updateCounter() {
    characterCounter.textContent =
        postText.value.length + " / 2000";
}

postText.addEventListener("input", updateCounter);


// =====================================
// IMAGE UPLOAD
// =====================================

const imageUpload =
    document.getElementById("imageUpload");

const imagePreview =
    document.getElementById("imagePreview");

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

        const removeButton =
            makeElement("button", "", "✕");

        removeButton.type = "button";

        removeButton.addEventListener("click", () => {

            selectedImage = null;
            imageUpload.value = "";
            imagePreview.replaceChildren();

        });

        imagePreview.appendChild(removeButton);
    };

    reader.readAsDataURL(file);

});


// =====================================
// GIF URL
// =====================================

const gifInputPanel =
    document.getElementById("gifInputPanel");

const gifUrl =
    document.getElementById("gifUrl");

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


// =====================================
// CREATE POST
// =====================================

const postForm = document.getElementById("postForm");

postForm.addEventListener("submit", event => {

    event.preventDefault();

    const nickname =
        document.getElementById("nickname")
            .value.trim();

    const avatar =
        validUrl(
            document.getElementById("avatarUrl").value.trim()
        );

    const message = postText.value.trim();

    if (!nickname) {
        alert("Введи никнейм.");
        return;
    }

    if (!message && !selectedImage && !selectedGif) {
        alert("Добавь текст или изображение.");
        return;
    }

    const post = {
        id: createId(),
        nickname: nickname,
        avatar: avatar,
        text: message,
        image: selectedImage,
        gif: selectedGif,
        date: Date.now(),
        likes: 0,
        liked: false,
        replies: []
    };

    posts.unshift(post);

    if (!savePosts()) {
        posts.shift();
        return;
    }

    postForm.reset();

    selectedImage = null;
    selectedGif = null;

    imagePreview.replaceChildren();
    gifInputPanel.hidden = true;
    emojiPicker.hidden = true;

    updateCounter();
    renderPosts();

});


// =====================================
// FIND POST OR REPLY
// =====================================

function findMessage(list, id) {

    for (const item of list) {

        if (item.id === id) {
            return item;
        }

        const found = findMessage(item.replies || [], id);

        if (found) {
            return found;
        }

    }

    return null;
}


// =====================================
// CREATE REPLY FORM
// =====================================

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

    cancel.addEventListener("click", () => {
        form.remove();
    });

    const send = makeElement("button", "", "REPLY ✦");

    send.type = "submit";

    controls.append(cancel, send);

    form.append(nickname, avatar, textarea, controls);

    return form;
}


// =====================================
// RENDER MESSAGE
// =====================================

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


    // MESSAGE TEXT

    if (item.text) {

        const content = makeElement(
            "div",
            "post-content",
            item.text
        );

        wrapper.appendChild(content);

    }


    // IMAGE

    if (item.image) {

        const image = makeElement("img", "post-image");

        image.src = item.image;
        image.alt = "Attached image";
        image.loading = "lazy";

        wrapper.appendChild(image);

    }


    // GIF

    if (item.gif) {

        const gif = makeElement("img", "post-image");

        gif.src = item.gif;
        gif.alt = "GIF";
        gif.loading = "lazy";

        wrapper.appendChild(gif);

    }


    // ACTIONS

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


    // NESTED REPLIES

    if (item.replies && item.replies.length > 0) {

        const repliesContainer =
            makeElement("div", "replies-container");

        item.replies.forEach(reply => {

            repliesContainer.appendChild(
                renderMessage(reply, rootId, true)
            );

        });

        wrapper.appendChild(repliesContainer);

    }

    return wrapper;
}


// =====================================
// RENDER POSTS
// =====================================

const postsContainer =
    document.getElementById("postsContainer");

const emptyFeed =
    document.getElementById("emptyFeed");

function renderPosts() {

    postsContainer.replaceChildren();

    if (posts.length === 0) {

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


// =====================================
// POST SORTING
// =====================================

document.getElementById("sortPosts")
    .addEventListener("change", renderPosts);


// =====================================
// LIKE AND REPLY BUTTONS
// =====================================

postsContainer.addEventListener("click", event => {

    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const messageElement = button.closest("[data-item-id]");

    if (!messageElement) return;

    const id = messageElement.dataset.itemId;

    const item = findMessage(posts, id);

    if (!item) return;


    if (button.dataset.action === "like") {

        item.liked = !item.liked;

        item.likes = Math.max(
            0,
            item.likes + (item.liked ? 1 : -1)
        );

        if (savePosts()) {
            renderPosts();
        }

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


// =====================================
// SEND REPLY
// =====================================

postsContainer.addEventListener("submit", event => {

    const form = event.target.closest(".reply-form");

    if (!form) return;

    event.preventDefault();

    const rootId = form.dataset.rootId;
    const parentId = form.dataset.parentId;

    const nickname =
        form.elements.nickname.value.trim();

    const avatar =
        validUrl(form.elements.avatar.value.trim());

    const message =
        form.elements.message.value.trim();

    if (!nickname || !message) return;

    const rootPost = posts.find(post => post.id === rootId);

    if (!rootPost) return;

    const parent = findMessage([rootPost], parentId);

    if (!parent) return;

    const reply = {
        id: createId(),
        nickname: nickname,
        avatar: avatar,
        text: message,
        date: Date.now(),
        likes: 0,
        liked: false,
        replies: []
    };

    parent.replies.push(reply);

    if (!savePosts()) {
        parent.replies.pop();
        return;
    }

    renderPosts();

});


// =====================================
// START
// =====================================

loadPosts();
renderPosts();
updateCounter();

      
