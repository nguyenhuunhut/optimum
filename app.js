const CLIENT_ID = "1483751011071033344";
const GUILD_ID = "1354818163879182519";
const REDIRECT_URI =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? window.location.origin + window.location.pathname
    : "https://nguyenhuunhut.github.io/optimum/";

const ROLE_IDS = {
  MOD: "1358825437790212153",
  Chronicler: "1470691925408354476",
  Optimized: "1470692400983838732",
  Refined: "1470691680998133792",
  Observer: "1469244709015912481",
  RealOG: "1417277418900819968",
  ServerBooster: "1357033112022028289",
  Verified: "1356613189047029811",
};

const ROLE_TAGS = [
  { key: "MOD", label: "MOD", variant: "mod" },
  { key: "Chronicler", label: "Chronicler", variant: "chronicler" },
  { key: "Optimized", label: "Optimized", variant: "optimized" },
  { key: "Refined", label: "Refined", variant: "refined" },
  { key: "Observer", label: "Observer", variant: "observer" },
  { key: "RealOG", label: "RealOG", variant: "realog" },
  { key: "ServerBooster", label: "Server Booster", variant: "booster" },
  { key: "Verified", label: "Verified", variant: "verified" },
];

const ROLE_ORDER = ["MOD", "Chronicler", "Optimized", "Refined", "Observer", "RealOG", "ServerBooster", "Verified"];
const ROLE_ACCENT = {
  MOD: "#50b3ff",
  Chronicler: "#65e380",
  Optimized: "#65e380",
  Refined: "#b97cff",
  Observer: "#b97cff",
  RealOG: "#f5945c",
  ServerBooster: "#f5945c",
  Verified: "#50b3ff",
};
const ROLE_COPY = {
  MOD: {
    headline: "System guardian.",
    body: "You do not just contribute. You protect and guide the entire space. Your presence keeps the community structured, clear, and aligned.",
    cta: "Keep holding the standard.",
  },
  Chronicler: {
    headline: "Narrative architect.",
    body: "You turn moments into meaningful narratives. Your content shapes how Optimum is understood and shared.",
    cta: "Keep telling the story in your own way.",
  },
  Optimized: {
    headline: "High-signal, high-impact.",
    body: "You are a recognized force within the community. Your contributions are consistent, meaningful, and directional.",
    cta: "Keep raising the bar, your impact is seen.",
  },
  Refined: {
    headline: "Intentional contributor.",
    body: "You have moved beyond observation and started creating real value. Your presence improves the quality of discussion.",
    cta: "Stay consistent, you are on the right path.",
  },
  Observer: {
    headline: "Learning the system.",
    body: "You are developing an understanding of signal vs noise. Early interactions show you are starting to grasp how things work.",
    cta: "Take your time, understanding comes before impact.",
  },
  RealOG: {
    headline: "Early presence, lasting value.",
    body: "You have been here since the early stages. Your presence is part of the foundation of the community.",
    cta: "Keep that energy, it matters long-term.",
  },
  ServerBooster: {
    headline: "Infrastructure supporter.",
    body: "You directly enhance the server experience for everyone. Your contribution strengthens the system at its core.",
    cta: "Thank you for supporting the foundation.",
  },
  Verified: {
    headline: "Starting point.",
    body: "You have entered the system and unlocked access. Every journey begins here.",
    cta: "Observe, learn, and start building your presence.",
  },
};
const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=Optimum&background=2a2410&color=f6d36b&size=256";
const BANNER_LOGO_URL = "assets/logo-white.png";
const MASCOT_ICON_URL = "assets/mascot-love.png";
const CANVAS_FONT = '"Sora","Space Grotesk","Segoe UI",sans-serif';
const CONTRIBUTION_CHANNELS = {
  tweets: "1356603029268201595",
  memes: "1356603252925530282",
  arts: "1409550456174149842",
};

const loginBtn = document.getElementById("loginBtn");
const downloadBtn = document.getElementById("downloadBtn");
const logoutBtn = document.getElementById("logoutBtn");
const statusEl = document.getElementById("status");
const topAvatarEl = document.getElementById("topAvatar");
const topUsernameEl = document.getElementById("topUsername");
const preConnectCardEl = document.getElementById("preConnectCard");
const connectedBarEl = document.getElementById("connectedBar");
const cardWrapEl = document.getElementById("cardWrap");
const canvas = document.getElementById("roleCard");
const ctx = canvas.getContext("2d");

let currentProfile = null;
let tokenData = null;
let renderNonce = 0;

init();

async function init() {
  const guestProfile = createGuestProfile();
  renderCard(guestProfile);
  renderTopIdentity(guestProfile);
  setAuthState(false);

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");

  if (code) {
    status("Authenticating with Discord...");
    try {
      await handleOAuthCallback(code, state);
      window.history.replaceState({}, document.title, REDIRECT_URI);
      await loadUserData();
    } catch (error) {
      console.error(error);
      status(`Login error: ${error.message}`);
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
    status("Please update CLIENT_ID and GUILD_ID in app.js first.");
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
  if (!savedState || savedState !== state) throw new Error("Invalid OAuth state.");
  if (!codeVerifier) throw new Error("Missing code verifier.");

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
    throw new Error(`Failed to fetch access token (${tokenRes.status}).`);
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
    status("Not signed in.");
    return;
  }

  status("Loading account details...");

  const me = await discordFetch("/users/@me");
  const member = await discordFetch(`/users/@me/guilds/${GUILD_ID}/member`);
  const matchedRoles = detectMatchedRoles(member.roles || []);
  const role = detectMainRole(matchedRoles);
  const joinedDate = member.joined_at ? new Date(member.joined_at) : null;
  const contributionStats = (await fetchContributionStats(me.id).catch(() => null)) || {
    tweets: 0,
    memes: 0,
    arts: 0,
    total: 0,
  };

  currentProfile = {
    project: "Optimum",
    username: `${me.username}${me.discriminator && me.discriminator !== "0" ? "#" + me.discriminator : ""}`,
    displayName: me.global_name || me.username || "Member",
    handle: `@${me.username || "member"}`,
    language: formatLanguageLabel(navigator.language),
    role,
    joinedAt: joinedDate
      ? joinedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : null,
    joinDays: joinedDate ? Math.max(0, Math.floor((Date.now() - joinedDate.getTime()) / 86400000)) : 0,
    avatarUrl: getAvatarUrl(me),
    matchedRoles,
    contributionStats,
    connected: true,
  };

  renderCard(currentProfile);
  renderTopIdentity(currentProfile);
  status(`Welcome ${currentProfile.username} - primary role: ${currentProfile.role}`);
  setAuthState(true);
  downloadBtn.disabled = false;
  logoutBtn.disabled = false;
}

async function discordFetch(path) {
  const res = await fetch(`https://discord.com/api${path}`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!res.ok) throw new Error(`Discord API error (${res.status}) at ${path}`);
  return res.json();
}

function createGuestProfile() {
  return {
    project: "Optimum",
    username: "Guest",
    displayName: "Guest",
    handle: "@connect-discord",
    language: "Not connected",
    role: "No Role",
    joinedAt: null,
    joinDays: 0,
    avatarUrl: DEFAULT_AVATAR,
    matchedRoles: [],
    connected: false,
  };
}

function detectMatchedRoles(memberRoleIds) {
  return ROLE_ORDER.filter((roleName) => {
    const roleId = ROLE_IDS[roleName];
    return roleId && !roleId.startsWith("REPLACE") && memberRoleIds.includes(roleId);
  });
}

function detectMainRole(matchedRoles) {
  for (const roleName of ROLE_ORDER) {
    if (matchedRoles.includes(roleName)) return roleName;
  }
  return "No Role";
}

async function fetchContributionStats(userId) {
  const apiBase = window.OPTIMUM_STATS_API;
  if (!apiBase) return null;
  const base = apiBase.replace(/\/+$/, "");
  const params = new URLSearchParams({
    guild_id: GUILD_ID,
    user_id: userId,
    tweets_channel_id: CONTRIBUTION_CHANNELS.tweets,
    memes_channel_id: CONTRIBUTION_CHANNELS.memes,
    arts_channel_id: CONTRIBUTION_CHANNELS.arts,
  });
  const res = await fetch(`${base}/contributions?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  const tweets = Number(data.tweets) || 0;
  const memes = Number(data.memes) || 0;
  const arts = Number(data.arts) || 0;
  return { tweets, memes, arts, total: tweets + memes + arts };
}

function getAvatarUrl(me) {
  if (!me?.id) return DEFAULT_AVATAR;
  if (me.avatar) {
    const ext = me.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.${ext}?size=256`;
  }
  const index = Number(me.discriminator || "0") % 5;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

function formatLanguageLabel(locale) {
  if (!locale) return "Connected";
  if (locale.toLowerCase().startsWith("vi")) return "Vietnamese";
  if (locale.toLowerCase().startsWith("en")) return "English";
  return locale.toUpperCase();
}

function isLocalHost() {
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

function renderCard(profile) {
  const drawId = ++renderNonce;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, "#1d1d23");
  bg.addColorStop(0.58, "#16161b");
  bg.addColorStop(1, "#121215");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const glowA = ctx.createRadialGradient(220, 180, 30, 220, 180, 420);
  glowA.addColorStop(0, "rgba(185,124,255,0.22)");
  glowA.addColorStop(1, "rgba(185,124,255,0)");
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const glowB = ctx.createRadialGradient(980, 1040, 30, 980, 1040, 500);
  glowB.addColorStop(0, "rgba(80,179,255,0.18)");
  glowB.addColorStop(1, "rgba(80,179,255,0)");
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  roundedRect(ctx, 24, 24, canvas.width - 48, canvas.height - 48, 20);
  ctx.fillStyle = "rgba(239, 239, 239, 0.02)";
  ctx.fill();
  ctx.strokeStyle = "rgba(239, 239, 239, 0.16)";
  ctx.lineWidth = 2;
  ctx.stroke();

  drawHeader(profile);
  drawRoleTags(profile);
  drawLearnBanner(drawId);
  drawStats(profile, drawId);

  if (profile.avatarUrl) {
    drawAvatar(profile.avatarUrl, drawId);
  }
}

function drawHeader(profile) {
  const avatarX = 70;
  const avatarY = 82;
  const avatarSize = 156;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 7, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(80, 179, 255, 0.72)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.fillStyle = "#efefef";
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#111218";
  ctx.font = `700 56px ${CANVAS_FONT}`;
  ctx.fillText("?", avatarX + 66, avatarY + 100);

  ctx.fillStyle = "#efefef";
  ctx.font = `700 58px ${CANVAS_FONT}`;
  ctx.fillText(profile.displayName, 260, 138);

  ctx.fillStyle = "#c7c3cf";
  ctx.font = `500 43px ${CANVAS_FONT}`;
  ctx.fillText(profile.handle, 260, 196);

  ctx.fillStyle = "#a9a5b1";
  ctx.font = `500 35px ${CANVAS_FONT}`;
  ctx.fillText(profile.joinedAt ? `Joined ${profile.joinedAt}` : "Joined pending", 260, 252);
}

function drawRoleTags(profile) {
  roundedRect(ctx, 54, 288, canvas.width - 108, 246, 16);
  ctx.fillStyle = "rgba(239, 239, 239, 0.02)";
  ctx.fill();
  ctx.strokeStyle = "rgba(239, 239, 239, 0.14)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const tags = ROLE_TAGS.map((tag) => {
    if (profile.matchedRoles.includes(tag.key)) {
      return tag;
    }
    return { ...tag, variant: profile.connected ? "muted" : "neutral" };
  });

  ctx.font = `700 30px ${CANVAS_FONT}`;

  let x = 78;
  let y = 318;
  for (const item of tags) {
    const w = Math.max(120, ctx.measureText(item.label).width + 56);
    if (x + w > canvas.width - 78) {
      x = 78;
      y += 70;
    }
    drawTag(x, y, w, 46, item.label, item.variant);
    x += w + 14;
  }
}

function drawLearnBanner(drawId) {
  roundedRect(ctx, 54, 574, canvas.width - 108, 138, 22);
  const banner = ctx.createLinearGradient(54, 574, canvas.width - 54, 712);
  banner.addColorStop(0, "rgba(80, 179, 255, 0.22)");
  banner.addColorStop(1, "rgba(185, 124, 255, 0.18)");
  ctx.fillStyle = banner;
  ctx.fill();
  ctx.strokeStyle = "rgba(80, 179, 255, 0.62)";
  ctx.lineWidth = 2;
  ctx.stroke();

  drawBannerLogo(drawId, 82, 603, 220, 66);

  ctx.fillStyle = "#ddd8ea";
  ctx.font = `600 28px ${CANVAS_FONT}`;
  ctx.fillText("Your contributions are recognized and appreciated.", 336, 651);
}

function drawBannerLogo(drawId, x, y, maxW, maxH) {
  roundedRect(ctx, x - 10, y - 8, maxW + 20, maxH + 16, 32);
  ctx.fillStyle = "rgba(74, 53, 108, 0.62)";
  ctx.fill();
  ctx.strokeStyle = "rgba(185, 124, 255, 0.55)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const img = new Image();
  img.onload = () => {
    if (drawId !== renderNonce) return;
    const ratio = img.naturalWidth / img.naturalHeight;
    let drawW = maxW;
    let drawH = drawW / ratio;
    if (drawH > maxH) {
      drawH = maxH;
      drawW = drawH * ratio;
    }
    const drawX = x + (maxW - drawW) / 2;
    const drawY = y + (maxH - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  };
  img.src = BANNER_LOGO_URL;
}

function drawStats(profile, drawId) {
  const panelX = 54;
  const panelY = 748;
  const panelW = canvas.width - 108;
  const panelH = 446;
  roundedRect(ctx, panelX, panelY, panelW, panelH, 22);
  ctx.fillStyle = "rgba(239, 239, 239, 0.02)";
  ctx.fill();
  ctx.strokeStyle = "rgba(239, 239, 239, 0.14)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const roleName = ROLE_COPY[profile.role] ? profile.role : "Verified";
  const info = ROLE_COPY[roleName];
  const accent = ROLE_ACCENT[roleName] || "#50b3ff";
  const contentX = panelX + 42;
  const contentY = panelY + 102;
  const contentW = panelW - 84;
  const mascotSize = 92;
  const mascotX = panelX + panelW - mascotSize - 26;
  const mascotY = panelY + 24;

  drawMascotAccent(drawId, mascotX, mascotY, mascotSize);

  ctx.fillStyle = accent;
  ctx.font = `700 66px ${CANVAS_FONT}`;
  ctx.fillText(roleName, contentX, contentY);

  ctx.fillStyle = "#efefef";
  ctx.font = `600 36px ${CANVAS_FONT}`;
  ctx.fillText(info.headline, contentX, contentY + 64);

  ctx.fillStyle = "#c4bfce";
  ctx.font = `500 30px ${CANVAS_FONT}`;
  drawWrappedText(info.body, contentX, contentY + 116, contentW, 44);

  ctx.font = `700 30px ${CANVAS_FONT}`;
  const ctaWidth = Math.min(contentW, ctx.measureText(info.cta).width + 56);
  drawPill(contentX, panelY + panelH - 78, ctaWidth, 48, info.cta, {
    bg: "rgba(185, 124, 255, 0.14)",
    border: "rgba(185, 124, 255, 0.4)",
    text: "#d8c0ff",
  });
}

function drawTag(x, y, w, h, label, variant) {
  const variants = {
    neutral: { bg: "rgba(239, 239, 239, 0.02)", border: "rgba(239, 239, 239, 0.18)", text: "#bcb9c7" },
    mod: { bg: "rgba(80, 179, 255, 0.2)", border: "rgba(80, 179, 255, 0.56)", text: "#7ac6ff" },
    chronicler: { bg: "rgba(101, 227, 128, 0.2)", border: "rgba(101, 227, 128, 0.56)", text: "#8bee9f" },
    realog: { bg: "rgba(245, 148, 92, 0.2)", border: "rgba(245, 148, 92, 0.58)", text: "#f9b28a" },
    booster: { bg: "rgba(185, 124, 255, 0.2)", border: "rgba(185, 124, 255, 0.58)", text: "#cda4ff" },
    verified: { bg: "rgba(101, 227, 128, 0.2)", border: "rgba(101, 227, 128, 0.56)", text: "#9bf1ab" },
    observer: { bg: "rgba(185, 124, 255, 0.22)", border: "rgba(185, 124, 255, 0.58)", text: "#caa0ff" },
    top: { bg: "rgba(80, 179, 255, 0.2)", border: "rgba(80, 179, 255, 0.58)", text: "#7ac6ff" },
    optimized: { bg: "rgba(101, 227, 128, 0.22)", border: "rgba(101, 227, 128, 0.54)", text: "#86eca1" },
    refined: { bg: "rgba(185, 124, 255, 0.22)", border: "rgba(185, 124, 255, 0.54)", text: "#c79eff" },
    active: { bg: "rgba(239, 239, 239, 0.12)", border: "rgba(239, 239, 239, 0.3)", text: "#efefef" },
    muted: { bg: "rgba(239, 239, 239, 0.01)", border: "rgba(239, 239, 239, 0.12)", text: "rgba(189, 185, 198, 0.58)" },
    default: { bg: "rgba(239, 239, 239, 0.02)", border: "rgba(239, 239, 239, 0.16)", text: "#bebacc" },
  };
  const style = variants[variant] || variants.default;
  drawPill(x, y, w, h, label, style);
}

function drawPill(x, y, w, h, label, style) {
  roundedRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = style.bg;
  ctx.fill();
  ctx.strokeStyle = style.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = style.text;
  ctx.font = `700 30px ${CANVAS_FONT}`;
  ctx.fillText(label, x + 18, y + 33);
}

function drawWrappedText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let lineY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) ctx.fillText(line, x, lineY);
}

function drawMascotAccent(drawId, x, y, size) {
  const img = new Image();
  img.onload = () => {
    if (drawId !== renderNonce) return;
    ctx.save();
    ctx.shadowColor = "rgba(185, 124, 255, 0.35)";
    ctx.shadowBlur = 14;
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
  };
  img.src = MASCOT_ICON_URL;
}

function drawAvatar(url, drawId) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    if (drawId !== renderNonce) return;
    const x = 70;
    const y = 82;
    const size = 156;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
  };
  img.src = url;
}

function roundedRect(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
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
  const guestProfile = createGuestProfile();
  renderCard(guestProfile);
  renderTopIdentity(guestProfile);
  status("Signed out locally from the website.");
  setAuthState(false);
}

function renderTopIdentity(profile) {
  if (!topAvatarEl || !topUsernameEl) return;
  topAvatarEl.src = profile.avatarUrl || DEFAULT_AVATAR;
  topUsernameEl.textContent = profile.connected ? profile.handle.replace(/^@/, "") : "guest";
}

function setAuthState(connected) {
  if (preConnectCardEl) preConnectCardEl.classList.toggle("hidden", connected);
  if (connectedBarEl) connectedBarEl.classList.toggle("hidden", !connected);
  if (cardWrapEl) cardWrapEl.classList.toggle("hidden", !connected);
}

function status(message) {
  if (statusEl) statusEl.textContent = message;
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
