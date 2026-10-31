
/* =====================================
   CHATTESELLON
   SUPABASE PUBLIC MESSAGE BOARD
===================================== */



alert("CHATTESELLON JS LOADED!");

"use strict";

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
        // 1. Загружаем публикации
        const { data: postData, error: postError } =
            await supabase
                .from("posts")
                .select("*")
                .order("created_at", { ascending: false });

        if (postError) throw postError;

        console.log("POSTS LOADED:", postData);

        posts = (postData || []).map(post => ({
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

        // 2. Сразу отображаем публикации
        renderPosts();

        // 3. Загружаем комментарии отдельно
        const { data: replyData, error: replyError } =
            await supabase
                .from("replies")
                .select("*")
                .order("created_at", { ascending: true });

        if (replyError) {
            console.error("REPLIES ERROR:", replyError);
        } else {
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
        }

        // 4. Загружаем лайки отдельно
        const { data: likeData, error: likeError } =
            await supabase
                .from("likes")
                .select("*");

        if (likeError) {
            console.error("LIKES ERROR:", likeError);
        } else {
            likeData.forEach(like => {
                const post = posts.find(
                    post => post.id === like.post_id
                );

                if (post) {
                    post.likes++;

                    if (like.visitor_id === visitorId) {
                        post.liked = true;
                    }
                }
            });
        }

        // 5. Обновляем ленту с комментариями и лайками
        renderPosts();

    } catch (error) {
        console.error("LOAD POSTS ERROR:", error);

        emptyFeed.hidden = false;

        const message = emptyFeed.querySelector("p");

        if (message) {
            message.textContent =
                "Could not load publications: " + error.message;
        }

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
         
            wrapper.appendChild(actions);

            // Вложенные ответы
            if (item.replies && item.replies.length > 0) {
                const repliesContainer = makeElement(
                    "div",
                    "replies-container"
                );

                item.replies.forEach(reply => {
                    repliesContainer.appendChild(
                        renderMessage(reply, rootId, true)
                    );
                });

                wrapper.appendChild(repliesContainer);
            }

            return wrapper;
        }


        /* =====================================
           RENDER POSTS
        ===================================== */

        function renderPosts() {
            postsContainer.replaceChildren();

            emptyFeed.hidden = posts.length > 0;

            const sortedPosts = [...posts];

            if (sortPosts.value === "oldest") {
                sortedPosts.reverse();
            }

            sortedPosts.forEach(post => {
                postsContainer.appendChild(
                    renderMessage(post, post.id)
                );
            });
        }


        /* =====================================
           LIKE POSTS
        ===================================== */

        async function toggleLike(postId) {
            const post = posts.find(item => item.id === postId);

            if (!post) return;

            try {
                if (post.liked) {
                    const { error } = await supabase
                        .from("likes")
                        .delete()
                        .eq("post_id", postId)
                        .eq("visitor_id", visitorId);

                    if (error) throw error;

                } else {
                    const { error } = await supabase
                        .from("likes")
                        .insert({
                            post_id: postId,
                            visitor_id: visitorId
                        });

                    if (error) throw error;
                }

                await loadPosts();

            } catch (error) {
                showError(error);
            }
        }


        /* =====================================
           REPLY EVENTS
        ===================================== */

        postsContainer.addEventListener("click", event => {
            const button = event.target.closest("button[data-action]");

            if (!button) return;

            const wrapper = button.closest("[data-item-id]");

            if (!wrapper) return;

            const itemId = wrapper.dataset.itemId;

            if (button.dataset.action === "like") {
                const rootPost = posts.find(post =>
                    post.id === itemId
                );

                if (rootPost) {
                    toggleLike(itemId);
                }

                return;
            }

            if (button.dataset.action === "reply") {
                const existingForm = wrapper.querySelector(".reply-form");

                if (existingForm) {
                    existingForm.remove();
                    return;
                }

                const form = createReplyForm(
                    posts.find(post =>
                        post.id === itemId
                    )?.id || findRootPostId(itemId),
                    itemId
                );

                wrapper.appendChild(form);
            }
        });


        function findRootPostId(itemId) {
            for (const post of posts) {
                if (post.id === itemId) return post.id;

                if (findMessage(post.replies, itemId)) {
                    return post.id;
                }
            }

            return null;
        }


        postsContainer.addEventListener("submit", async event => {
            const form = event.target.closest(".reply-form");

            if (!form) return;

            event.preventDefault();

            const nickname = form.elements.nickname.value.trim();
            const avatar = validUrl(form.elements.avatar.value.trim());
            const content = form.elements.message.value.trim();

            if (!nickname || !content) return;

            const sendButton = form.querySelector(
                'button[type="submit"]'
            );

            sendButton.disabled = true;

            try {
                const { error } = await supabase
                    .from("replies")
                    .insert({
                        post_id: form.dataset.rootId,
                        parent_reply_id:
                            form.dataset.parentId === form.dataset.rootId
                                ? null
                                : form.dataset.parentId,
                        nickname,
                        avatar_url: avatar || null,
                        content
                    });

                if (error) throw error;

                await loadPosts();

            } catch (error) {
                showError(error);
                sendButton.disabled = false;
            }
        });


        /* =====================================
           SORTING
        ===================================== */

        sortPosts.addEventListener("change", renderPosts);


        /* =====================================
           START
        ===================================== */

        updateCounter();
        loadPosts();

        setInterval(loadPosts, 10000);

        console.log("CHATTESELLON BOARD INITIALIZED");

    } catch (error) {
        console.error("INITIALIZATION ERROR:", error);
        alert("INITIALIZATION ERROR: " + error.message);
    }
               }
                                            
