/* =====================================
   CHATTESELLON — PUBLIC MESSAGE BOARD
===================================== */

"use strict";

<div id="bg-container"></div>
  <script>
    const container = document.getElementById('bg-container');
    const symbols = ['*','+'];
    
    if (container) {
      for (let i = 0; i < 60; i++) {
        const span = document.createElement('span');
        span.className = 'falling-symbol';
        span.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        span.style.left = Math.random() * 100 + 'vw';
        span.style.animationDuration = (Math.random() * 7 + 3) + 's';
        span.style.animationDelay = (Math.random() * 5) + 's';
        span.style.fontSize = (Math.random() * 20 + 10) + 'px';
        container.appendChild(span);
      }
    }
    </script>

const SUPABASE_URL = "https://ywxkqpidkgagbnixoegv.supabase.co";
const SUPABASE_KEY = "sb_publishable_uFZC3FMn9y8qSLCpmgpqvw_sKPPrcol";

if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase library not loaded!");
} else {

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const VISITOR_KEY = "chattesellon_visitor_id";
let visitorId;
try {
    visitorId = localStorage.getItem(VISITOR_KEY);
    if (!visitorId) {
        visitorId = crypto.randomUUID ? crypto.randomUUID() : ("visitor-" + Date.now() + "-" + Math.random());
        localStorage.setItem(VISITOR_KEY, visitorId);
    }
} catch (e) {
    visitorId = "visitor-" + Date.now() + "-" + Math.random();
}

let posts = [];
let selectedImage = null;
let selectedGif = null;
let isLoading = false;

const EMOJIS = [
    "🤍","🖤","💙","💜","❤️","♡","♥","☆","★","✦",
    "✧","✩","✪","✿","❀","☾","☽","☁","☂","❄",
    "🌙","⭐","🌌","🪐","✨","🌸","🌷","🦋","🐈","🐈‍⬛",
    "🐇","🕊️","🍓","🍰","🎀","🎧","🎮","🎨","📷","💌"
];

function $(id) { return document.getElementById(id); }

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
        if (url.protocol === "https:" || url.protocol === "http:") return url.href;
    } catch (e) {}
    return "";
}

function formatDate(date) {
    return new Date(date).toLocaleString("ru-RU", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

function showError(error) {
    console.error(error);
    alert("ERROR: " + (error && error.message ? error.message : error));
}

document.addEventListener("DOMContentLoaded", function () {
    try {
        const el = {
            postForm: $("postForm"),
            postText: $("postText"),
            postsContainer: $("postsContainer"),
            emptyFeed: $("emptyFeed"),
            imageUpload: $("imageUpload"),
            imagePreview: $("imagePreview"),
            emojiPicker: $("emojiPicker"),
            emojiList: $("emojiList"),
            emojiButton: $("emojiButton"),
            gifInputPanel: $("gifInputPanel"),
            gifUrl: $("gifUrl"),
            gifButton: $("gifButton"),
            addGifButton: $("addGifButton"),
            characterCounter: $("characterCounter"),
            sortPosts: $("sortPosts"),
            nicknameInput: $("nickname"),
            avatarInput: $("avatarUrl")
        };

        for (const name in el) {
            if (!el[name]) throw new Error("HTML ELEMENT NOT FOUND: " + name);
        }

        /* ========= CHARACTER COUNTER ========= */
        function updateCounter() {
            el.characterCounter.textContent = el.postText.value.length + " / 2000";
        }
        el.postText.addEventListener("input", updateCounter);

        /* ========= EMOJI ========= */
        function insertEmoji(emoji) {
            const start = el.postText.selectionStart;
            const end = el.postText.selectionEnd;
            el.postText.value = el.postText.value.substring(0, start) + emoji + el.postText.value.substring(end);
            el.postText.focus();
            const pos = start + emoji.length;
            el.postText.setSelectionRange(pos, pos);
            updateCounter();
        }

        el.emojiList.replaceChildren();
        EMOJIS.forEach(function (emoji) {
            const btn = makeElement("button", "", emoji);
            btn.type = "button";
            btn.addEventListener("click", function () { insertEmoji(emoji); });
            el.emojiList.appendChild(btn);
        });

        el.emojiButton.addEventListener("click", function () {
            el.emojiPicker.hidden = !el.emojiPicker.hidden;
        });

        /* ========= IMAGE ========= */
        function renderImagePreview(src, onRemove) {
            el.imagePreview.replaceChildren();
            const img = makeElement("img");
            img.src = src;
            img.alt = "Preview";
            el.imagePreview.appendChild(img);

            const remove = makeElement("button", "", "✕");
            remove.type = "button";
            remove.addEventListener("click", function () {
                onRemove();
                el.imagePreview.replaceChildren();
            });
            el.imagePreview.appendChild(remove);
        }

        el.imageUpload.addEventListener("change", function () {
            const file = el.imageUpload.files[0];
            if (!file) return;
            if (!file.type.startsWith("image/")) {
                alert("Выбери файл изображения.");
                el.imageUpload.value = "";
                return;
            }
            if (file.size > 700 * 1024) {
                alert("Максимальный размер изображения: 700 КБ.");
                el.imageUpload.value = "";
                return;
            }
            const reader = new FileReader();
            reader.onload = function () {
                selectedImage = reader.result;
                selectedGif = null;
                el.gifUrl.value = "";
                renderImagePreview(selectedImage, function () {
                    selectedImage = null;
                    el.imageUpload.value = "";
                });
            };
            reader.onerror = function () { alert("Could not read image."); };
            reader.readAsDataURL(file);
        });

        /* ========= GIF ========= */
        el.gifButton.addEventListener("click", function () {
            el.gifInputPanel.hidden = !el.gifInputPanel.hidden;
        });

        el.addGifButton.addEventListener("click", function () {
            const url = validUrl(el.gifUrl.value.trim());
            if (!url) {
                alert("Введи корректную ссылку на GIF.");
                return;
            }
            selectedGif = url;
            selectedImage = null;
            el.imageUpload.value = "";
            renderImagePreview(url, function () { selectedGif = null; });
            el.gifInputPanel.hidden = true;
            el.gifUrl.value = "";
        });

        /* ========= LOAD ========= */
        async function loadPosts() {
            if (isLoading) return;
            isLoading = true;

            try {
                const res = await supabase.from("posts").select("*").order("created_at", { ascending: false });
                if (res.error) throw res.error;

                posts = (res.data || []).map(function (p) {
                    return {
                        id: p.id,
                        nickname: p.nickname,
                        avatar: p.avatar_url,
                        text: p.content,
                        image: p.image_url,
                        gif: p.gif_url,
                        date: p.created_at,
                        likes: 0,
                        liked: false,
                        replies: []
                    };
                });

                const replyRes = await supabase.from("replies").select("*").order("created_at", { ascending: true });
                if (replyRes.error) {
                    console.error("REPLIES ERROR:", replyRes.error);
                } else {
                    const replyMap = new Map();
                    (replyRes.data || []).forEach(function (r) {
                        replyMap.set(r.id, {
                            id: r.id,
                            nickname: r.nickname,
                            avatar: r.avatar_url,
                            text: r.content,
                            date: r.created_at,
                            parent_reply_id: r.parent_reply_id,
                            post_id: r.post_id,
                            replies: []
                        });
                    });
                    const postMap = new Map(posts.map(function (p) { return [p.id, p]; }));
                    (replyRes.data || []).forEach(function (r) {
                        const item = replyMap.get(r.id);
                        if (r.parent_reply_id) {
                            const parent = replyMap.get(r.parent_reply_id);
                            if (parent) parent.replies.push(item);
                        } else {
                            const root = postMap.get(r.post_id);
                            if (root) root.replies.push(item);
                        }
                    });
                }

                const likeRes = await supabase.from("likes").select("*");
                if (likeRes.error) {
                    console.error("LIKES ERROR:", likeRes.error);
                } else {
                    (likeRes.data || []).forEach(function (like) {
                        const post = posts.find(function (p) { return p.id === like.post_id; });
                        if (post) {
                            post.likes++;
                            if (like.visitor_id === visitorId) post.liked = true;
                        }
                    });
                }

                renderPosts();

            } catch (error) {
                console.error("LOAD POSTS ERROR:", error);
                el.emptyFeed.hidden = false;
                const msg = el.emptyFeed.querySelector("p");
                if (msg) msg.textContent = "Could not load publications: " + error.message;
            } finally {
                isLoading = false;
            }
        }

        /* ========= RENDER ========= */
        function renderPosts() {
            el.postsContainer.replaceChildren();
            el.emptyFeed.hidden = posts.length > 0;

            const sorted = posts.slice();
            if (el.sortPosts.value === "oldest") sorted.reverse();

            sorted.forEach(function (post) {
                el.postsContainer.appendChild(renderMessage(post, post.id));
            });
        }

        function renderMessage(item, rootId, isReply) {
            const wrapper = makeElement("article", isReply ? "reply" : "post");
            wrapper.dataset.itemId = item.id;

            const header = makeElement("div", "post-header");

            if (validUrl(item.avatar)) {
                const avatar = makeElement("img", "post-avatar");
                avatar.src = item.avatar;
                avatar.alt = item.nickname || "Avatar";
                avatar.addEventListener("error", function () {
                    avatar.replaceWith(makeElement("div", "post-avatar", "✦"));
                });
                header.appendChild(avatar);
            } else {
                header.appendChild(makeElement("div", "post-avatar", "✦"));
            }

            const info = makeElement("div");
            info.appendChild(makeElement("div", "post-author", item.nickname || "Anonymous"));
            info.appendChild(makeElement("div", "post-date", formatDate(item.date)));
            header.appendChild(info);
            wrapper.appendChild(header);

            if (item.text) {
                wrapper.appendChild(makeElement("div", "post-content", item.text));
            }

            if (validUrl(item.image)) {
                const img = makeElement("img", "post-image");
                img.src = item.image;
                img.alt = "Image";
                img.loading = "lazy";
                wrapper.appendChild(img);
            }

            if (validUrl(item.gif)) {
                const gif = makeElement("img", "post-image");
                gif.src = item.gif;
                gif.alt = "GIF";
                gif.loading = "lazy";
                wrapper.appendChild(gif);
            }

            const actions = makeElement("div", "post-actions");

            const likeBtn = makeElement("button", "like-button", (item.liked ? "♥ " : "♡ ") + (item.likes || 0));
            likeBtn.type = "button";
            likeBtn.dataset.action = "like";

            const replyBtn = makeElement("button", "reply-button", "↩ Reply");
            replyBtn.type = "button";
            replyBtn.dataset.action = "reply";

            actions.appendChild(likeBtn);
            actions.appendChild(replyBtn);
            wrapper.appendChild(actions);

            if (item.replies && item.replies.length > 0) {
                const repliesBox = makeElement("div", "replies-container");
                item.replies.forEach(function (reply) {
                    repliesBox.appendChild(renderMessage(reply, rootId, true));
                });
                wrapper.appendChild(repliesBox);
            }

            return wrapper;
        }

        /* ========= CREATE POST ========= */
        el.postForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const nickname = el.nicknameInput.value.trim();
            const avatar = validUrl(el.avatarInput.value.trim());
            const message = el.postText.value.trim();

            if (!nickname || nickname.length > 30) {
                alert("Неверный никнейм!");
                return;
            }
            if (!message && !selectedImage && !selectedGif) {
                alert("Добавь текст или изображение!");
                return;
            }

            const publishBtn = el.postForm.querySelector(".publish-button");
            publishBtn.disabled = true;
            publishBtn.textContent = "PUBLISHING...";

            try {
                const res = await supabase.from("posts").insert({
                    nickname: nickname,
                    avatar_url: avatar || null,
                    content: message,
                    image_url: selectedImage,
                    gif_url: selectedGif
                });

                if (res.error) throw res.error;

                el.postForm.reset();
                selectedImage = null;
                selectedGif = null;
                el.imagePreview.replaceChildren();
                el.gifInputPanel.hidden = true;
                el.emojiPicker.hidden = true;
                updateCounter();

                await loadPosts();

            } catch (error) {
                showError(error);
            } finally {
                publishBtn.disabled = false;
                publishBtn.textContent = "PUBLISH ✦";
            }
        });

        /* ========= LIKE ========= */
        async function toggleLike(postId) {
            const post = posts.find(function (p) { return p.id === postId; });
            if (!post) return;

            try {
                if (post.liked) {
                    const res = await supabase.from("likes").delete().eq("post_id", postId).eq("visitor_id", visitorId);
                    if (res.error) throw res.error;
                } else {
                    const res = await supabase.from("likes").insert({ post_id: postId, visitor_id: visitorId });
                    if (res.error) throw res.error;
                }
                await loadPosts();
            } catch (error) {
                showError(error);
            }
        }

        /* ========= REPLY HELPERS ========= */
        function findMessage(list, id) {
            for (let i = 0; i < list.length; i++) {
                if (list[i].id === id) return list[i];
                const found = findMessage(list[i].replies || [], id);
                if (found) return found;
            }
            return null;
        }

        function findRootPostId(itemId) {
            for (let i = 0; i < posts.length; i++) {
                if (posts[i].id === itemId) return posts[i].id;
                if (findMessage(posts[i].replies, itemId)) return posts[i].id;
            }
            return null;
        }

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
            cancel.addEventListener("click", function () { form.remove(); });

            const send = makeElement("button", "", "REPLY ✦");
            send.type = "submit";

            controls.appendChild(cancel);
            controls.appendChild(send);
            form.appendChild(nickname);
            form.appendChild(avatar);
            form.appendChild(textarea);
            form.appendChild(controls);
            return form;
        }

        /* ========= POST CLICK ========= */
        el.postsContainer.addEventListener("click", function (event) {
            const button = event.target.closest("button[data-action]");
            if (!button) return;

            const wrapper = button.closest("[data-item-id]");
            if (!wrapper) return;

            const itemId = wrapper.dataset.itemId;

            if (button.dataset.action === "like") {
                toggleLike(itemId);
                return;
            }

            if (button.dataset.action === "reply") {
                const existing = wrapper.querySelector(".reply-form");
                if (existing) {
                    existing.remove();
                    return;
                }
                const rootId = findRootPostId(itemId);
                wrapper.appendChild(createReplyForm(rootId, itemId));
            }
        });

        /* ========= REPLY SUBMIT ========= */
        el.postsContainer.addEventListener("submit", async function (event) {
            const form = event.target.closest(".reply-form");
            if (!form) return;

            event.preventDefault();

            const nickname = form.elements.nickname.value.trim();
            const avatar = validUrl(form.elements.avatar.value.trim());
            const content = form.elements.message.value.trim();
            if (!nickname || !content) return;

            const sendBtn = form.querySelector('button[type="submit"]');
            sendBtn.disabled = true;

            try {
                const res = await supabase.from("replies").insert({
                    post_id: form.dataset.rootId,
                    parent_reply_id: form.dataset.parentId === form.dataset.rootId ? null : form.dataset.parentId,
                    nickname: nickname,
                    avatar_url: avatar || null,
                    content: content
                });
                if (res.error) throw res.error;
                await loadPosts();
            } catch (error) {
                showError(error);
                sendBtn.disabled = false;
            }
        });

        /* ========= SORT ========= */
        el.sortPosts.addEventListener("change", renderPosts);

        /* ========= START ========= */
        updateCounter();
        loadPosts();
        setInterval(loadPosts, 15000);

        console.log("CHATTESELLON BOARD INITIALIZED");

    } catch (error) {
        console.error("INITIALIZATION ERROR:", error);
        alert("INITIALIZATION ERROR: " + error.message);
    }
});

}
