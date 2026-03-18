const CLIENT_ID = "1483751011071033344";
const GUILD_ID = "1354818163879182519";
const REDIRECT_URI = "https://nguyenhuunhut.github.io/optimum1/";

const ROLE_IDS = {
  RealOG: "1417277418900819968",
  Optimized: "1470692400983838732",
  Refined: "1470691680998133792",
  Observer: "1469244709015912481",
};

const ROLE_STYLE = {
  RealOG: { color: "#f59e0b", gradient: ["#4c2500", "#1f1400"] },
  Optimized: { color: "#10b981", gradient: ["#003b2c", "#001f1c"] },
  Refined: { color: "#38bdf8", gradient: ["#00324f", "#001f33"] },
  Observer: { color: "#a78bfa", gradient: ["#2e1f59", "#1a1333"] },
  "No Role": { color: "#94a3b8", gradient: ["#333c4f", "#1a2130"] },
};

const loginBtn = document.getElementById("loginBtn");
const downloadBtn = document.getElementById("downloadBtn");
const logoutBtn = document.getElementById("logoutBtn");
const statusEl = document.getElementById("status");
const canvas = document.getElementById("roleCard");
const ctx = canvas.getContext("2d");

let currentProfile = null;
let tokenData = null;

init();

async function init() {
  renderCard({ project: "Optimum", username: "Guest", role: "No Role" });

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");

  if (code) {
    status("Đang xác thực Discord...");
    try {
      await handleOAuthCallback(code, state);
      window.history.replaceState({}, document.title, REDIRECT_URI);
      await loadUserData();
    } catch (error) {
      console.error(error);
      status(`Lỗi đăng nhập: ${error.message}`);
    }
  }

  loginBtn.addEventListener("click", beginDiscordLogin);
  downloadBtn.addEventListener("click", downloadCard);
  logoutBtn.addEventListener("click", logout);
}

function beginDiscordLogin() {
  if (!CLIENT_ID.startsWith("REPLACE") && !GUILD_ID.startsWith("REPLACE")) {
    // continue
  } else {
    status("Bạn cần cập nhật CLIENT_ID và GUILD_ID trong app.js trước.");
    return;
  }

  const state = randomString(24);
  const verifier = randomString(80);
  localStorage.setItem("discord_oauth_state", state);
  localStorage.setItem("discord_code_verifier", verifier);

  pkceChallenge(verifier).then((challenge) => {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      scope: "identify guilds.members.read",
      state,
      redirect_uri: REDIRECT_URI,
      prompt: "consent",
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    window.location.href = `https://discord.com/oauth2/authorize?${params.toString()}`;
  });
}

async function handleOAuthCallback(code, state) {
  const savedState = localStorage.getItem("discord_oauth_state");
  const codeVerifier = localStorage.getItem("discord_code_verifier");
  if (!savedState || savedState !== state) throw new Error("State không hợp lệ.");
  if (!codeVerifier) throw new Error("Thiếu code verifier.");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: codeVerifier,
  });

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenRes.ok) {
    throw new Error(`Không lấy được access token (${tokenRes.status}).`);
  }

  tokenData = await tokenRes.json();
  sessionStorage.setItem("discord_token_data", JSON.stringify(tokenData));

  localStorage.removeItem("discord_oauth_state");
  localStorage.removeItem("discord_code_verifier");
}

async function loadUserData() {
  if (!tokenData) {
    const saved = sessionStorage.getItem("discord_token_data");
    if (saved) tokenData = JSON.parse(saved);
  }
  if (!tokenData?.access_token) {
    status("Chưa đăng nhập.");
    return;
  }

  status("Đang tải thông tin tài khoản...");

  const me = await discordFetch("/users/@me");
  const member = await discordFetch(`/users/@me/guilds/${GUILD_ID}/member`);
  const role = detectMainRole(member.roles || []);

  currentProfile = {
    project: "Optimum",
    username: `${me.username}${me.discriminator && me.discriminator !== "0" ? "#" + me.discriminator : ""}`,
    role,
    joinedAt: member.joined_at ? new Date(member.joined_at).toLocaleDateString("vi-VN") : null,
  };

  renderCard(currentProfile);
  status(`Xin chào ${currentProfile.username} - role chính: ${currentProfile.role}`);
  downloadBtn.disabled = false;
  logoutBtn.disabled = false;
}

async function discordFetch(path) {
  const res = await fetch(`https://discord.com/api${path}`, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });
  if (!res.ok) throw new Error(`Discord API lỗi (${res.status}) tại ${path}`);
  return res.json();
}

function detectMainRole(memberRoleIds) {
  const order = ["RealOG", "Optimized", "Refined", "Observer"];
  for (const roleName of order) {
    const roleId = ROLE_IDS[roleName];
    if (roleId && !roleId.startsWith("REPLACE") && memberRoleIds.includes(roleId)) {
      return roleName;
    }
  }
  return "No Role";
}

function renderCard(profile) {
  const style = ROLE_STYLE[profile.role] || ROLE_STYLE["No Role"];
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, style.gradient[0]);
  gradient.addColorStop(1, style.gradient[1]);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.arc(860, 120, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e5e7eb";
  ctx.font = "700 54px Inter, sans-serif";
  ctx.fillText("OPTIMUM", 64, 104);

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "500 32px Inter, sans-serif";
  ctx.fillText("Commemorative Role Card", 64, 154);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 56px Inter, sans-serif";
  ctx.fillText(profile.username, 64, 320);

  ctx.fillStyle = style.color;
  ctx.font = "700 72px Inter, sans-serif";
  ctx.fillText(profile.role, 64, 420);

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "500 26px Inter, sans-serif";
  ctx.fillText(`Project: ${profile.project}`, 64, 484);

  if (profile.joinedAt) {
    ctx.fillText(`Joined: ${profile.joinedAt}`, 64, 522);
  }
}

function downloadCard() {
  const link = document.createElement("a");
  const safeName = (currentProfile?.username || "optimum-user").replace(/[^a-z0-9]/gi, "_").toLowerCase();
  link.download = `optimum-role-card-${safeName}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function logout() {
  sessionStorage.removeItem("discord_token_data");
  tokenData = null;
  currentProfile = null;
  downloadBtn.disabled = true;
  logoutBtn.disabled = true;
  renderCard({ project: "Optimum", username: "Guest", role: "No Role" });
  status("Đã đăng xuất cục bộ khỏi website.");
}

function status(message) {
  statusEl.textContent = message;
}

function randomString(len) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (const n of arr) out += chars[n % chars.length];
  return out;
}

async function pkceChallenge(verifier) {
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
