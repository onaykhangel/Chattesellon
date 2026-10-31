
/* =====================================
   CHATTESELLON
   SUPABASE PUBLIC MESSAGE BOARD
===================================== */

"use strict";

alert("CHATTESELLON JS LOADED!");

const SUPABASE_URL = "https://ywxkqpidkgagbnixoegv.supabase.co";
const SUPABASE_KEY = "sb_publishable_uFZC3FMn9y8qSLCpmgpqvw_sKPPrcol";

let supabase;

try {
    if (!window.supabase || !window.supabase.createClient) {
        throw new Error("Supabase library was not loaded!");
    }

    supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );
} catch (error) {
    alert("SUPABASE INIT ERROR: " + error.message);
    throw error;
}


/* =====================================
   ERROR HANDLING
===================================== */

window.addEventListener("error", event => {
    console.error(event.error || event.message);
});

window.addEventListener("unhandledrejection", event => {
    console.error("PROMISE ERROR:", event.reason);
});


/* =====================================
   VISITOR ID
===================================== */

const VISITOR_KEY = "chattesellon_visitor_id";

let visitorId;

try {
    visitorId = localStorage.getItem(VISITOR_KEY);

    if (!visitorId) {
        visitorId = crypto.randomUUID
            ? crypto.randomUUID()
            : "visitor-" + Date.now() + "-" + Math.random();

        localStorage.setItem(VISITOR_KEY, visitorId);
    }
} catch (error) {
    visitorId = "visitor-" + Date.now() + "-" + Math.random();
}


/* =====================================
   STATE
===================================== */

let posts = [];
let selectedImage = null;
let selectedGif = null;
let isLoading = false;


/* =====================================
   EMOJIS
===================================== */

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
   INITIALIZATION
===================================== */

document.addEventListener("DOMContentLoaded", initializeBoard);

function initializeBoard() {
    try {
        const postForm = document.getElementById("postForm");
        const postText = document.getElementById("postText");
        const postsContainer = document.getElementById("postsContainer");
        const emptyFeed = document.getElementById("emptyFeed");

        const imageUpload = document.getElementById("imageUpload");
        const imagePreview = document.getElementById("imagePreview");

        const emojiPicker = document.getElementById("emojiPicker");
        const emojiList = document.getElementById("emojiList");
        const emojiButton = document.getElementById("emojiButton");

        const gifInputPanel = document.getElementById("gifInputPanel");
        const gifUrl = document.getElementById("gifUrl");
        const gifButton = document.getElementById("gifButton");
        const addGifButton = document.getElementById("addGifButton");

        const characterCounter = document.getElementById("characterCounter");
        const sortPosts = document.getElementById("sortPosts");

        const nicknameInput = document.getElementById("nickname");
        const avatarInput = document.getElementById("avatarUrl");

        const requiredElements = {
            postForm,
            postText,
            postsContainer,
            emptyFeed,
            imageUpload,
            imagePreview,
            emojiPicker,
            emojiList,
            emojiButton,
            gifInputPanel,
            gifUrl,
            gifButton,
            addGifButton,
            characterCounter,
            sortPosts,
            nicknameInput,
            avatarInput
        };

        for (const [name, element] of Object.entries(requiredElements)) {
            if (!element) {
                throw new Error("HTML ELEMENT NOT FOUND: " + name);
            }
        }

        console.log("CHATTESELLON: ALL HTML ELEMENTS FOUND");

        /* =====================================
           HELPERS
        ===================================== */

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

            alert(
                "ERROR: " +
                (error.message || String(error))
            );
        }


        /* =====================================
           CHARACTER COUNTER
        ===================================== */

        function updateCounter() {
            characterCounter.textContent =
                postText.value.length + " / 2000";
        }

        postText.addEventListener("input", updateCounter);


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

        emojiButton.addEventListener("click", () => {
            emojiPicker.hidden = !emojiPicker.hidden;
        });

        createEmojiPicker();


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
                selectedGif = null;

                gifUrl.value = "";

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

            reader.onerror = () => {
                alert("Could not read image.");
            };

            reader.readAsDataURL(file);
        });


        /* =====================================
           GIF
        ===================================== */

        gifButton.addEventListener("click", () => {
            gifInputPanel.hidden = !gifInputPanel.hidden;
        });

        addGifButton.addEventListener("click", () => {
            const url = validUrl(gifUrl.value.trim());

            if (!url) {
                alert("Введи корректную ссылку на GIF.");
                return;
            }

            selectedGif = url;
            selectedImage = null;

            imageUpload.value = "";

            imagePreview.replaceChildren();

            const image = makeElement("img");
            image.src = url;
            image.alt = "GIF preview";

            image.style.maxWidth = "120px";
            image.style.maxHeight = "100px";

            imagePreview.appendChild(image);

            const remove = makeElement("button", "", "✕");

            remove.type = "button";

            remove.addEventListener("click", () => {
                selectedGif = null;
                imagePreview.replaceChildren();
            });

            imagePreview.appendChild(remove);

            gifInputPanel.hidden = true;
            gifUrl.value = "";
        });


        /* =====================================
           LOAD POSTS
        ===================================== */

        async function loadPosts() {
            if (isLoading) return;

            isLoading = true;

            try {
                const { data: postData, error: postError } =
                    await supabase
                        .from("posts")
                        .select("*")
                        .order("created_at", { ascending: false });

                if (postError) throw postError;

                const { data: replyData, error: replyError } =
                    await supabase
                        .from("replies")
                        .select("*")
                        .order("created_at", { ascending: true });

                if (replyError) throw replyError;

                const { data: likeData, error: likeError } =
                    await supabase
                        .from("likes")
                        .select("*");

                if (likeError) throw likeError;

                const replyMap = new Map();

                replyData.forEach(reply => {
                    replyMap.set(reply.id, {
                        ...reply,
                        text: reply.content,
                        avatar: reply.avatar_url,
                        date: reply.created_at,
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

                const postMap = new Map(
                    posts.map(post => [post.id, post])
                );

                replyData.forEach(reply => {
                    const item = replyMap.get(reply.id);

                    if (reply.parent_reply_id) {
                        const parent = replyMap.get(reply.parent_reply_id);

                        if (parent) {
                            parent.replies.push(item);
                        }
                    } else {
                        const root = postMap.get(reply.post_id);

                        if (root) {
                            root.replies.push(item);
                        }
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

            } catch (error) {
                console.error("LOAD POSTS ERROR:", error);
                emptyFeed.hidden = false;
                emptyFeed.querySelector("p").textContent =
                    "Could not load publications: " + error.message;

            } finally {
                isLoading = false;
            }
        }


        /* =====================================
           CREATE POST
        ===================================== */

        postForm.addEventListener("submit", async event => {
            event.preventDefault();

            alert("SUBMIT EVENT RECEIVED!");

            const nickname = nicknameInput.value.trim();
            const avatar = validUrl(avatarInput.value.trim());
            const message = postText.value.trim();

            if (!nickname || nickname.length > 30) {
                alert("Неверный никнейм!");
                return;
            }

            if (!message && !selectedImage && !selectedGif) {
                alert("Добавь текст или изображение!");
                return;
            }

            const publishButton =
                postForm.querySelector(".publish-button");

            publishButton.disabled = true;
            publishButton.textContent = "PUBLISHING...";

            try {
                const { error } = await supabase
                    .from("posts")
                    .insert({
                        nickname: nickname,
                        avatar_url: avatar || null,
                        content: message,
                        image_url: selectedImage,
                        gif_url: selectedGif
                    });

                if (error) throw error;

                alert("POST SAVED!");

                postForm.reset();

                selectedImage = null;
                selectedGif = null;

                imagePreview.replaceChildren();
                gifInputPanel.hidden = true;
                emojiPicker.hidden = true;

                updateCounter();

                await loadPosts();

            } catch (error) {
                showError(error);

            } finally {
                publishButton.disabled = false;
                publishButton.textContent = "PUBLISH ✦";
            }
        });


        /* =====================================
           FIND MESSAGE
        ===================================== */

        function findMessage(list, id) {
            for (const item of list) {
                if (item.id === id) return item;

                const found = findMessage(
                    item.replies || [],
                    id
                );

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

            const controls = makeElement(
                "div",
                "reply-form-controls"
            );

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

            if (validUrl(item.avatar)) {
                const avatar = makeElement("img", "post-avatar");

                avatar.src = item.avatar;
                avatar.alt = item.nickname || "Avatar";

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
                makeElement(
                    "div",
                    "post-author",
                    item.nickname || "Anonymous"
                )
            );

            authorInfo.appendChild(
                makeElement(
                    "div",
                    "post-date",
                    formatDate(item.date)
                )
            );

            header.appendChild(authorInfo);
            wrapper.appendChild(header);

            if (item.text) {
                wrapper.appendChild(
                    makeElement("div", "post-content", item.text)
                );
            }

            if (validUrl(item.image)) {
                const image = makeElement("img", "post-image");

                image.src = item.image;
                image.alt = "Attached image";
                image.loading = "lazy";

                wrapper.appendChild(image);
            }

            if (validUrl(item.gif)) {
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
                (item.liked ? "♥ " : "♡ ") + (item.likes || 0)
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
            wrappe
