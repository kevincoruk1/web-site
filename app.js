// Chat widget: sends messages to the agent API and renders the conversation.

// Where the agent API lives. After deploying the agent to Render, replace the URL below.
const API_BASE = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://localhost:8000"
  : "https://bright-smile-agent.onrender.com";

const panel = document.getElementById("chat-panel");
const messagesEl = document.getElementById("chat-messages");
const form = document.getElementById("chat-form");
const input = document.getElementById("chat-text");
const sendBtn = form.querySelector("button");

// One session id per browser tab, so the server can keep this visitor's history.
function getSessionId() {
  try {
    let id = sessionStorage.getItem("chat_session");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("chat_session", id);
    }
    return id;
  } catch {
    return crypto.randomUUID(); // storage blocked: fall back to a per-page id
  }
}
const sessionId = getSessionId();

// Add a message bubble. textContent (not innerHTML) prevents script injection.
function addMessage(text, who) {
  const el = document.createElement("div");
  el.className = `msg ${who}`;
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

// Open the panel; greet the visitor and wake the API the first time.
function openChat() {
  panel.hidden = false;
  if (!messagesEl.children.length) {
    // Free-tier server may be asleep; start waking it now so the first reply is faster
    fetch(`${API_BASE}/health`).catch(() => {});
    addMessage("Thanks for contacting Bright Smile Dental, how can I help?", "bot");
  }
  input.focus();
}

document.getElementById("chat-toggle").addEventListener("click", () => {
  panel.hidden ? openChat() : (panel.hidden = true);
});
document.getElementById("hero-book").addEventListener("click", openChat);
document.getElementById("chat-close").addEventListener("click", () => (panel.hidden = true));

// Send the message, show a typing indicator while the agent (and its tools) run.
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  input.value = "";
  sendBtn.disabled = true; // block double-sends while a turn is in progress
  const typing = addMessage("Typing…", "bot typing");

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, message: text }),
    });
    const data = await res.json();
    typing.remove();
    addMessage(res.ok ? data.reply : data.detail || "Something went wrong.", "bot");
  } catch {
    typing.remove();
    addMessage("Can't reach the server. Is it running?", "bot");
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
});
