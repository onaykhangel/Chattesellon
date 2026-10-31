/* =====================================
   CHATTESELLON — PUBLIC MESSAGE BOARD
===================================== */

"use strict";

const SUPABASE_URL = "https://ywxkqpidkgagbnixoegv.supabase.co";
const SUPABASE_KEY = "sb_publishable_uFZC3FMn9y8qSLCpmgpqvw_sKPPrcol";

if (!window.supabase?.createClient) {
    alert("Supabase library not loaded!");
    throw new Error("Supabase missing");
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------- Visitor ID ---------- */

const VISITOR_KEY = "chattesellon_visitor_id";
let visitorId;
try {
    visitorId = localStorage.getItem(VISITOR_KEY);
    if (!visitorId) {
        visitorId = crypto.randomUUID?.() ?? `visitor-${Date.now()}-${Math.random()}`;
        localStorage.setItem(VISITOR_KEY, visitorId);
    }
} catch {
    visitorId = `visitor-${Date.now()}-${Math.random()}`;
}

/* ---------- State ---------- */

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

/* ---------- Helpers ---------- */

const $ = id => document.getElementById(id);

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
    } catch {}
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
    alert("ERROR: " + (error?.message ?? error));
}

/* ---------- Init ---------- */

document.addEventListener("DOMContentLoaded", initializeBoard);

function initializeBoard() {
    try {
        const el = {
            postForm:        $("postForm"),
            postText:        $("postText"),
            postsContainer:  $("postsContainer"),
            emptyFeed:       $("emptyFeed"),
            imageUpload:     $("imageUpload"),
            imagePreview:    $("imagePreview"),
            emojiPicker:     $("emojiPicker"),
            emojiList:       $("emojiList"),
            emojiButton:     $("emojiButton"),
            gifInputPanel:   $("gifInputPanel"),
            gifUrl:          $("gifUrl"),
            gifButton:       $("gifButton"),
            addGifButton:    $("addGifButton"),
            characterCounter:$("characterCounter"),
            sortPosts:       $("sortPosts"),
            nicknameInput:   $("nickname"),
            avatarInput:     $("avatarUrl"),
        };

        for (const [name, element] of Object.entries(el)) {
            if (!element) throw new Error("HTML ELEMENT NOT FOUND: " + name);
        }

        /* ========= CHARACTER COUNTER ========= */

        const updateCounter = () => {
            el.characterCounter.textContent = `${el.postText.value.length} / 2000`;
        };
        el.postText.addEventListener("input", updateCounter);

        /* ========= EMOJI PICKER ========= */

        function insertEmoji(emoji) {
            const start = el.postText.selectionStart;
            const end = el.postText.selectionEnd;
            el.postText.value =
                el.postText.value.substring(0, start) +
                emoji +
                el.postText.value.substring(end);
            el.postText.focus();
            const pos = start + emoji.length;
            el.postText.setSelectionRange(pos, pos);
            updateCounter();
        }

        (function buildEmojiPicker() {
            el.emojiList.replaceChildren();
            EMOJIS.forEach(emoji => {
                const btn = makeElement("button", "", emoji);
                btn.type = "button";
                btn.addEventListener("click", () => insertEmoji(emoji));
                el.emojiList.appendChild(btn);
            });
        })();

        el.emojiButton.addEventListener("click", () => {
            el.emojiPicker.hidden = !el.emojiPicker.hidden;
        });

        /* ========= IMAGE UPLOAD ========= */

        el.imageUpload.addEventListener("change", () => {
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
            reader.onload = () => {
                selectedImage = reader.result;
                selectedGif = null;
                el.gifUrl.value = "";
                renderImagePreview(selectedImage, () => {
                    selectedImage = null;
                    el.imageUpload.value = "";
                });
            };
            reader.onerror = () => alert("Could not read image.");
            reader.readAsDataURL(file);
        });

        function renderImagePreview(src, onRemove) {
            el.imagePreview.replaceChildren();
            const img = makeElement("img");
            img.src = src;
            img.alt = "Preview";
            img.style.maxWidth = "120px";
            img.style.maxHeight = "100px";
            el.imagePreview.appendChild(img);

            const remove = makeElement("button", "", "✕");
            remove.type = "button";
            remove.addEventListener("click", () => {
                onRemove();
                el.imagePreview.replaceChildren();
            });
            el.imagePreview.appendChild(remove);
        }

        /* ========= GIF ========= */

        el.gifButton.addEventListener("click", () => {
            el.gifInputPanel.hidden = !el.gifInputPanel.hidden;
        });

        el.addGifButton.addEventListener("click", () => {
            const url = validUrl(el.gifUrl.value.trim());
            if (!url) {
                alert("Введи корректную ссылку на GIF.");
                return;
            }
            selectedGif = url;
            selectedImage = null;
            el.imageUpload.value = "";
            renderImagePreview(url, () => { selectedGif = null; });
            el.gifInputPanel.hidden = true;
            el.gifUrl.value = "";
        });

        /* ========= LOAD POSTS ========= */

        async function loadPosts() {
            if (isLoading) return;
            isLoading = true;

            try {
                const { data: postData, error: postError } =
                    await supabase.from("posts").select("*")
                        .order("created_at", { ascending: false });
                if (postError) throw postError;

                posts = (postData || []).map(post => ({
                    ...post,
                    text:   post.content,
                    avatar: post.avatar_url,
                    image:  post.image_url,
                    gif:    post.gif_url,
                    date:   post.created_at,
                    likes:  0,
                    liked:  false,
                    replies: [],
                }));

                // replies
                const { data: replyData, error: replyError } =
                    await supabase.from("replies").select("*")
                        .order("created_at", { ascending: true });
                if (replyError) console.error("REPLIES ERROR:", replyError);
                else buildReplyTree(replyData || []);

                // likes
                const { data: likeData, error: likeError } =
                    await supabase.from("likes").select("*");
                if (likeError) console.error("LIKES ERROR:", likeError);
                else applyLikes(likeData || []);

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

        function buildReplyTree(replyData) {
            const replyMap = new Map();
            replyData.forEach(reply => {
                replyMap.set(reply.id, {
                    ...reply,
                    text:   reply.content,
                    avatar: reply.avatar_url,
                    date:   reply.created_at,
                    replies: [],
                });
            });
            const postMap = new Map(posts.map(p => [p.id, p]));

            replyData.forEach(reply => {
                const item = replyMap.get(reply.id);
                if (reply.parent_reply_id) {
                    replyMap.get(reply.parent_reply_id)?.replies.push(item);
                } else {
                    postMap.get(reply.post_id)?.replies.push(item);
                }
            });
        }

        function applyLikes(likeData) {
            likeData.forEach(like => {
                const post = posts.find(p => p.id === like.post_id);
                if (post) {
                    post.likes++;
                    if (like.visitor_id === visitorId) post.liked = true;
                }
            });
        }

        /* ========= RENDER ========= */

        function renderPosts() {
            el.postsContainer.replaceChildren();
            el.emptyFeed.hidden = posts.length > 0;

            const sorted = [...posts];
            if (el.sortPosts.value === "oldest") sorted.reverse();

            sorted.forEach(post => {
                el.postsContainer.appendChild(renderMessage(post, post.id));
            });
        }

        function renderMessage(item, rootId, isReply = false) {
            const wrapper = makeElement("article", isReply ? "reply" : "post");
            wrapper.dataset.itemId = item.id;

            /* header */
            const header = makeElement("div", "post-header");
            if (validUrl(item.avatar)) {
                const avatar = makeElement("img", "post-avatar");
                avatar.src = item.avatar;
                avatar.alt = item.nickname || "Avatar";
                avatar.addEventListener("error", () => {
                    avatar.replaceWith(makeElement("div", "post-avatar", "✦"));
                });
                header.appendChild(avatar);
            } else {
                header.appendChild(makeElement("div", "post-avatar", "✦"));
            }

            const authorInfo = makeElement("div");
            authorInfo.appendChild(makeElement("div", "post-author", item.nickname || "Anonymous"));
            authorInfo.appendChild(makeElement("div", "post-date", formatDate(item.date)));
            header.appendChild(authorInfo);
            wrapper.appendChild(header);

            /* content */
            if (item.text) {
                wrapper.appendChild(makeElement("div", "post-content", item.text));
            }

            /* image / gif */
            if (validUrl(item.image)) {
                const img = makeElement("img", "post-image");
                img.src = item.image;
                img.alt = "Attached image";
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

            /* actions */
            const actions = makeElement("div", "post-actions");
            const likeBtn = makeElement(
                "button", "like-button",
                `${item.liked ? "♥" : "♡"} ${item.likes || 0}`
            );
            likeBtn.type = "button";
            likeBtn.dataset.action = "like";

            const replyBtn = makeElement("button", "reply-button", "↩ Reply");
            replyBtn.type = "button";
            replyBtn.dataset.action = "reply";

            actions.append(likeBtn, replyBtn);
            wrapper.appendChild(actions);

            /* replies */
            if (item.replies?.length) {
                const container = makeElement("div", "replies-container");
                item.replies.forEach(reply => {
                    container.appendChild(renderMessage(reply, rootId, true));
                });
                wrapper.appendChild(container);
            }

            return wrapper;
        }

        /* ========= CREATE POST ========= */

        el.postForm.addEventListener("submit", async event => {
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
                const { error } = await supabase.from("posts").insert({
                    nickname,
                    avatar_url: avatar || null,
                    content: message,
                    image_url: selectedImage,
                    gif_url: selectedGif,
                });
                if (error) throw error;

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
            const post = posts.find(p => p.id === postId);
            if (!post) return;

            try {
                if (post.liked) {
                    const { error } = await supabase.from("likes").delete()
                        .eq("post_id", postId)
                        .eq("visitor_id", visitorId);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from("likes").insert({
                        post_id: postId,
                        visitor_id: visitorId,
                    });
                    if (error) throw error;
                }
                await loadPosts();
            } catch (error) {
                showError(error);
            }
        }

        /* ========= REPLY ========= */

        function findMessage(list, id) {
            for (const item of list) {
                if (item.id === id) return item;
                const found = findMessage(item.replies || [], id);
                if (found) return found;
            }
            return null;
        }

        function findRootPostId(itemId) {
            for (const post of posts) {
                if (post.id === itemId) return post.id;
                if (findMessage(post.replies, itemId)) return post.id;
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
            cancel.addEventListener("click", () => form.remove());

            const send = makeElement("button", "", "REPLY ✦");
            send.type = "submit";

            controls.append(cancel, send);
            form.append(nickname, avatar, textarea, controls);
            return form;
        }

        el.postsContainer.addEventListener("click", event => {
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

        el.postsContainer.addEventListener("submit", async event => {
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
                const { error } = await supabase.from("replies").insert({
                    post_id: form.dataset.rootId,
                    parent_reply_id:
                        form.dataset.parentId === form.dataset.rootId
                            ? null
                            : form.dataset.parentId,
                    nickname,
                    avatar_url: avatar || null,
                    content,
                });
                if (error) throw error;
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

        // Realtime вместо setInterval (опционально — см. ниже)
        supabase.channel("posts-live")
            .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => loadPosts())
            .on("postgre
