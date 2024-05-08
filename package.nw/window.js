/**
 * 窗口
 */
const EventEmitter = require("node:events");
const emitter = new EventEmitter();

const win = nw.Window.get();
const { classList } = document.body;

// 最大化/最小化按钮
win.on("maximize", () => classList.add("window-maximized"));
win.on("restore", () => classList.remove("window-maximized"));

// 获得/失去焦点
win.on("blur", () => classList.add("window-blur"));
win.on("focus", () => classList.remove("window-blur"));

// 窗口按钮
document.querySelectorAll("[window-button]").forEach((el) => {
  const method = el.getAttribute("window-button");
  el.addEventListener("click", () => win[method]());
});

// 文件拖放
// TODO：WebView无法感应拖放
const preventDefault = (e) => {
  e.preventDefault();
  e.stopPropagation();
  return false;
};
window.addEventListener("dragenter", preventDefault);
window.addEventListener("dragover", preventDefault);
window.addEventListener("dragleave", preventDefault);
window.addEventListener("drop", (e) => {
  const [file] = e.dataTransfer.files;
  if (file) emitter.emit("addTab", { url: file.path });
  preventDefault(e);
});

export default emitter;
