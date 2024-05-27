/**
 * 地址栏
 */
import { isAppPage } from "./common.js";

const EventEmitter = require("node:events");
const emitter = new EventEmitter();

const $addressBar = document.querySelector(".address-bar");
const $showAppMenu = document.querySelector('[nav-button="showAppMenu"]');
const $downloading = document.querySelector('[nav-button-state="downloading"]');
const $progress = document.querySelector('[nav-button-state="downloading"]>svg');

// 按钮点击
document.querySelectorAll("[nav-button]").forEach((el) => {
  const cmd = el.getAttribute("nav-button");
  el.addEventListener("click", (e) => emitter.emit("buttonClick", cmd));
});

// 地址输入框
const $address = document.querySelector("#address");
// 按下回车触发跳转
$address.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (e.key === "Enter") emitter.emit("navigate", $address.value.trim());
});
// 获得焦点时自动全选
$address.addEventListener("focus", () => {
  $address.setSelectionRange(0, $address.value.length);
});

export default {
  on: (type, listener) => emitter.on(type, listener),
  get loading() {
    return $addressBar.classList.contains("loading");
  },
  set loading(loading) {
    $addressBar.classList[loading ? "add" : "remove"]("loading");
  },
  // 更新导航按钮
  updateNavigate({ url, canGoBack, canGoForward }) {
    $address.value = isAppPage(url) ? "" : url; // 更新输入框内容，如果是应用页面，则不显示url
    $addressBar.classList[canGoBack ? "add" : "remove"]("can-go-back"); // 是否可返回
    $addressBar.classList[canGoForward ? "add" : "remove"]("can-go-forward"); // 是否可前进
  },
  // 更新下载按钮
  updateDownload({ downloading, count, bytesReceived, totalBytes }) {
    if (downloading) {
      $addressBar.classList.add("downloading");
      // 处于“下载中”的下载项数量
      $downloading.style.setProperty("--count", `"${count < 100 ? count : "99+"}"`);
      // 下载进度
      const progress = Math.round((bytesReceived / totalBytes) * 100);
      $progress.style.setProperty("--progress", progress);
    } else {
      $addressBar.classList.remove("downloading");
    }
  },
  focus: () => $address.focus(),
};
