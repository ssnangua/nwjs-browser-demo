/**
 * WebView
 */
import WebView from "./WebView.js";

const EventEmitter = require("node:events");
const emitter = new EventEmitter();

const webviews = {};
let activeWebview;

function addWebview(tabId, url) {
  const webview = new WebView({ tabId, url });
  webviews[tabId] = webview;

  // 文档发生导航
  webview.on("navigate", (url) => emitter.emit("navigate", tabId, url));
  // 文档取消加载或加载失败
  webview.on("stop", (e) => emitter.emit("stop", tabId));
  // 打开新窗口
  webview.on("open", (url) => emitter.emit("open", tabId, url));
  // 自行关闭
  webview.on("close", () => emitter.emit("close", tabId));
  // 加载完成，获取页面基本信息
  webview.on("load", () => {
    webview.getInfo((info) => emitter.emit("infoUpdate", tabId, info));
  });
  // 权限请求
  webview.on("permissionrequest", ({ permission, url, request }) => {
    // request.allow();
    if (permission === "download") {
      emitter.emit("download", { url });
    }
  });

  // 标题变更
  webview.onMessage("WV_infoChange", (info) => emitter.emit("infoUpdate", tabId, info));
  // 鼠标右键
  webview.onMessage("WV_contextmenu", (data) => emitter.emit("contextmenu", tabId, data));
  // 快捷键
  webview.onMessage("WV_shortcut", (data) => emitter.emit("shortcut", data));
  // 链接预览
  webview.onMessage("WV_targetUrl", (url) => emitter.emit("update-target-url", url));

  // 获取设置数据
  webview.onMessage("WV_getSettingData", () => emitter.emit("getSettingData", tabId));
  // 保存设置数据
  webview.onMessage("WV_setSettingData", (data) => emitter.emit("setSettingData", data));
  // 搜索
  webview.onMessage("WV_search", (data) => emitter.emit("search", data));

  return webview;
}

// 根据tabId获取WebView
function getWebview(tabId) {
  return tabId ? webviews[tabId] : activeWebview;
}

// 关闭WebView
function closeWebview(tabId) {
  webviews[tabId]?.remove();
  delete webviews[tabId];
}

// 激活WebView
function setActiveWebview(tabId) {
  if (activeWebview) activeWebview.active = false;
  activeWebview = webviews[tabId];
  if (activeWebview) activeWebview.active = true;
}

// 调整布局（开发者工具面板大小）
const $resizer = document.querySelector(".resize-handler-h");
let resizeInfo;
$resizer.addEventListener("mousedown", onResizeStart);
function onResizeStart(e) {
  if (activeWebview?.devTools) {
    const $devTools = activeWebview.devTools.el;
    resizeInfo = { $devTools, x: e.x, width: $devTools.offsetWidth };
    $resizer.parentElement.classList.add("resizing");
    window.addEventListener("mousemove", onResize);
    window.addEventListener("mouseup", onResizeEnd);
  }
}
function onResize(e) {
  resizeInfo.$devTools.style.width = resizeInfo.width + resizeInfo.x - e.x + "px";
}
function onResizeEnd() {
  resizeInfo = null;
  $resizer.parentElement.classList.remove("resizing");
  window.removeEventListener("mousemove", onResize);
  window.removeEventListener("mouseup", onResizeEnd);
}

export default {
  on: (type, listener) => emitter.on(type, listener),
  getWebview,
  addWebview,
  closeWebview,
  get activeWebview() {
    return activeWebview;
  },
  setActiveWebview,
};
