/* ChatHub Proxy Browser - app.js */

const PROXY_PREFIX = "/proxy/";
const GOOGLE_SEARCH = "https://duckduckgo.com/?q=";

var tabs = [];
var activeTabId = null;
var tabCounter = 0;

var tabbar         = document.getElementById("tabbar");
var newTabBtn      = document.getElementById("newTabBtn");
var urlbar         = document.getElementById("urlbar");
var goBtn          = document.getElementById("goBtn");
var backBtn        = document.getElementById("backBtn");
var fwdBtn         = document.getElementById("fwdBtn");
var reloadBtn      = document.getElementById("reloadBtn");
var homeBtn        = document.getElementById("homeBtn");
var proxyFrame     = document.getElementById("proxyFrame");
var homepage       = document.getElementById("homepage");
var loadingOverlay = document.getElementById("loadingOverlay");
var statusText     = document.getElementById("statusText");
var themeToggle    = document.getElementById("themeToggle");
var themeIcon      = document.getElementById("themeIcon");
var homeSearch     = document.getElementById("homeSearch");
var homeGoBtn      = document.getElementById("homeGoBtn");

var isDark = true;
themeToggle.addEventListener("click", function() {
  isDark = !isDark;
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  themeIcon.textContent = isDark ? "☀️" : "🌙";
});

function createTab(title, url) {
  title = title || "Nueva pestaña";
  url   = url   || "";
  tabCounter++;
  var tab = { id: tabCounter, title: title, url: url, history: [], historyIndex: -1 };
  tabs.push(tab);
  renderTabs();
  switchTab(tab.id);
  return tab.id;
}

function renderTabs() {
  document.querySelectorAll(".tab").forEach(function(el) { el.remove(); });
  tabs.forEach(function(tab) {
    var el = document.createElement("div");
    el.className = "tab" + (tab.id === activeTabId ? " active" : "");
    el.dataset.id = tab.id;
    var titleSpan = document.createElement("span");
    titleSpan.className = "tab-title";
    titleSpan.title = tab.title;
    titleSpan.textContent = "🔒 " + tab.title;
    var closeBtn = document.createElement("button");
    closeBtn.className = "tab-close";
    closeBtn.dataset.id = tab.id;
    closeBtn.title = "Cerrar pestaña";
    closeBtn.textContent = "×";
    el.appendChild(titleSpan);
    el.appendChild(closeBtn);
    tabbar.insertBefore(el, newTabBtn);
    el.addEventListener("click", function(e) {
      if (!e.target.classList.contains("tab-close")) switchTab(tab.id);
    });
    closeBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      closeTab(tab.id);
    });
  });
}

function switchTab(id) {
  activeTabId = id;
  var tab = getTab(id);
  renderTabs();
  if (tab && tab.url) {
    urlbar.value = tab.url;
    showFrame(PROXY_PREFIX + tab.url);
  } else {
    urlbar.value = "";
    showHomepage();
  }
  updateNavButtons();
}

function closeTab(id) {
  if (tabs.length === 1) {
    tabs = tabs.filter(function(t) { return t.id !== id; });
    createTab();
    return;
  }
  var idx = tabs.findIndex(function(t) { return t.id === id; });
  tabs = tabs.filter(function(t) { return t.id !== id; });
  if (activeTabId === id) {
    var nextTab = tabs[Math.min(idx, tabs.length - 1)];
    switchTab(nextTab.id);
  } else {
    renderTabs();
  }
}

function getTab(id) {
  return tabs.find(function(t) { return t.id === id; });
}

function forceHttps(url) {
  if (!url) return "";
  if (url.indexOf("http://") === 0) {
    return "https://" + url.slice(7);
  }
  return url;
}

function normalizeUrl(raw) {
  var url = raw.trim();
  if (!url) return "";
  var hasProto = url.indexOf("http://") === 0 || url.indexOf("https://") === 0;
  if (!hasProto && url.indexOf(".") === -1) {
    return GOOGLE_SEARCH + encodeURIComponent(url);
  }
  if (!hasProto) url = "https://" + url;
  return forceHttps(url);
}

function navigate(rawUrl) {
  var url = normalizeUrl(rawUrl);
  if (!url) return;
  var tab = getTab(activeTabId);
  tab.url = url;
  tab.title = getDomain(url);
  tab.history = tab.history.slice(0, tab.historyIndex + 1);
  tab.history.push(url);
  tab.historyIndex = tab.history.length - 1;
  urlbar.value = url;
  renderTabs();
  showFrame(PROXY_PREFIX + url);
  updateNavButtons();
  setStatus("🔒 Conectando de forma segura…");
}

function showFrame(src) {
  homepage.classList.add("hidden");
  proxyFrame.classList.add("hidden");
  loadingOverlay.classList.remove("hidden");
  src = forceHttps(src);
  proxyFrame.src = src;
  proxyFrame.onload = function() {
    try {
      var frameUrl = proxyFrame.contentWindow.location.href;
      if (frameUrl && frameUrl !== "about:blank" && frameUrl.indexOf(PROXY_PREFIX) === -1) {
        navigate(frameUrl);
        return;
      }
    } catch(e) {}
    loadingOverlay.classList.add("hidden");
    proxyFrame.classList.remove("hidden");
    setStatus("✅ Cargado — conexión cifrada");
  };
  proxyFrame.onerror = function() {
    loadingOverlay.classList.add("hidden");
    setStatus("❌ Error al cargar la página");
  };
}

function showHomepage() {
  proxyFrame.classList.add("hidden");
  loadingOverlay.classList.add("hidden");
  homepage.classList.remove("hidden");
  proxyFrame.src = "about:blank";
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch(e) {
    return url.slice(0, 20);
  }
}

function updateNavButtons() {
  var tab = getTab(activeTabId);
  backBtn.disabled = !tab || tab.historyIndex <= 0;
  fwdBtn.disabled  = !tab || tab.historyIndex >= tab.history.length - 1;
}

function setStatus(msg) {
  statusText.textContent = msg;
}

goBtn.addEventListener("click", function() { navigate(urlbar.value); });
urlbar.addEventListener("keydown", function(e) {
  if (e.key === "Enter") navigate(urlbar.value);
});

backBtn.addEventListener("click", function() {
  var tab = getTab(activeTabId);
  if (tab && tab.historyIndex > 0) {
    tab.historyIndex--;
    var url = forceHttps(tab.history[tab.historyIndex]);
    tab.url = url;
    urlbar.value = url;
    showFrame(PROXY_PREFIX + url);
    updateNavButtons();
  }
});

fwdBtn.addEventListener("click", function() {
  var tab = getTab(activeTabId);
  if (tab && tab.historyIndex < tab.history.length - 1) {
    tab.historyIndex++;
    var url = forceHttps(tab.history[tab.historyIndex]);
    tab.url = url;
    urlbar.value = url;
    showFrame(PROXY_PREFIX + url);
    updateNavButtons();
  }
});

reloadBtn.addEventListener("click", function() {
  var tab = getTab(activeTabId);
  if (tab && tab.url) showFrame(PROXY_PREFIX + tab.url);
});

homeBtn.addEventListener("click", function() {
  var tab = getTab(activeTabId);
  tab.url = "";
  tab.title = "Nueva pestaña";
  urlbar.value = "";
  renderTabs();
  showHomepage();
});

newTabBtn.addEventListener("click", function() { createTab(); });

homeGoBtn.addEventListener("click", function() { navigate(homeSearch.value); });
homeSearch.addEventListener("keydown", function(e) {
  if (e.key === "Enter") navigate(homeSearch.value);
});

document.querySelectorAll(".ql-btn").forEach(function(btn) {
  btn.addEventListener("click", function() { navigate(btn.dataset.url); });
});

/* Vigilar navegación que escape del proxy */
setInterval(function() {
  try {
    var frameUrl = proxyFrame.contentWindow.location.href;
    if (!frameUrl || frameUrl === "about:blank") return;
    if (frameUrl.indexOf(PROXY_PREFIX) === -1) {
      navigate(frameUrl);
      return;
    }
    var realUrl = frameUrl.replace(window.location.origin + PROXY_PREFIX, "");
    if (realUrl && realUrl !== urlbar.value) {
      urlbar.value = realUrl;
      var tab = getTab(activeTabId);
      if (tab) {
        tab.url = realUrl;
        tab.title = getDomain(realUrl);
        renderTabs();
      }
    }
  } catch(e) {}
}, 500);

createTab();
showHomepage();
