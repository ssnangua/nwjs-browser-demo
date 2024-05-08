/**
 * 标签页预览
 */
import { between } from "./common.js";

const $preview = document.querySelector("#tab-preview");
const $snapshoot = document.querySelector("#tab-snapshoot img");
const $title = document.querySelector("#tab-title");
const $icon = document.querySelector("#tab-icon");
const $host = document.querySelector("#tab-host");

let isShow = false;
let showTimer = -1;
let captureTimer = -1;

// WebView快照
const snapshoot = {
  show() {
    if ($snapshoot.src) $snapshoot.style.cssText = "opacity: 1;";
  },
  hide() {
    $snapshoot.style.cssText = "opacity: 0;";
  },
  update(src) {
    if (src !== $snapshoot.src) {
      this[src ? "show" : "hide"]();
      $snapshoot.src = src;
    }
  },
};
$snapshoot.addEventListener("load", () => snapshoot.show());
$snapshoot.addEventListener("error", () => snapshoot.hide());

// 捕获WebView快照
const capture = {
  query: [],
  running: false,
  request(webview, callback) {
    // 如果上个请求还没有处理完成，加入队列等待执行
    if (this.running) return this.query.push([webview, callback]);
    // 如果WebView已经销毁，不处理
    if (!webview.el) {
      if (this.query.length > 0) this.request(...this.query.pop());
      return;
    }
    this.running = true; // 处理中
    // 把WebView显示出来用于捕获，但不可见且不能交互
    webview.el.style.cssText = `display: flex; opacity: 0.01; position: absolute; pointer-events: none; top: 0; left: 0; width: 100%; height: 100%;`;
    // 稍微延迟等待WebView渲染布局
    setTimeout(() => {
      webview.captureVisibleRegion({ format: "jpeg", quality: 20 }, (dataUrl) => {
        this.running = false; // 捕获完成
        // 重置WebView
        webview.el.style.cssText = "";
        // 回调
        callback(dataUrl);
        // 如果有等待处理的队列，弹出最后添加的请求
        if (this.query.length > 0) this.request(...this.query.pop());
      });
    }, 300);
  },
};

export default {
  get isShow() {
    return isShow;
  },
  show({ tab, webview }) {
    if (tab.loading) return;
    clearTimeout(showTimer);
    showTimer = setTimeout(
      () => {
        isShow = true;
        if (tab.isActive) {
          // 当前激活的标签页不显示WebView快照
          $preview.classList.add("active");
        } else if (tab.snapshoot) {
          // 显示缓存的WebView快照（标签页激活和url发生变更时会清楚快照缓存）
          snapshoot.update(tab.snapshoot);
          $preview.classList.remove("active");
        } else {
          // 隐藏快照
          snapshoot.update("");
          $preview.classList.remove("active");
          // 捕获快照
          clearTimeout(captureTimer);
          captureTimer = setTimeout(() => {
            // 捕获请求
            capture.request(webview, (dataUrl) => {
              // 加载快照
              tab.snapshoot = dataUrl;
              snapshoot.update(dataUrl);
            });
          }, 300);
        }
        $title.innerText = tab.title;
        $icon.src = tab.favicon;
        $host.innerText = new URL(tab.url).host;
        const { left } = tab.el.getBoundingClientRect();
        $preview.style.left = between(20, left, window.innerWidth - 300) + "px";
        $preview.classList.remove("hide");
      },
      isShow ? 0 : 1000
    );
  },
  hide() {
    clearTimeout(showTimer);
    $preview.classList.add("hide");
    isShow = false;
  },
};
