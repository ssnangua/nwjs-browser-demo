/**
 * 快捷键
 *   本模块的逻辑也会注入到WebView中（WebView的事件无法冒泡到主窗口，包括快捷键操作）
 *   部分有区别的逻辑，通过关键词替换：
 *     - /*webview_inject_remove*\/  注入时会替换为“//”，即注释掉
 *     - //webview_inject_add//      注入时会去掉，即取消注释
 */
/*webview_inject_remove*/ const EventEmitter = require("node:events");
/*webview_inject_remove*/ const emitter = new EventEmitter();

window.addEventListener("keydown", (e) => {
  if (e.repeat || !e.key) return;
  // console.log(e);
  let shortcut = [];
  if (e.ctrlKey || e.metaKey) shortcut.push("Ctrl");
  if (e.shiftKey) shortcut.push("Shift");
  if (e.altKey) shortcut.push("Alt");
  shortcut.push(e.key.toUpperCase());
  shortcut = shortcut.join("+");

  let cmd, data;
  //webview_inject_add// const selection = window.getSelection().toString();
  if (shortcut === "Alt+ARROWLEFT") {
    cmd = "back"; // 返回
  } else if (shortcut === "Alt+ARROWRIGHT") {
    cmd = "forward"; // 前进
  } else if (shortcut === "F5" || shortcut === "Ctrl+R") {
    cmd = "reload"; // 刷新
  } else if (shortcut === "Ctrl+F") {
    cmd = "find"; // 在页面上查找
    //webview_inject_add// data = { text: selection, newFind: true };
  } else if (shortcut === "Ctrl+G" || shortcut === "F3") {
    cmd = "findNext"; // 查找下一个
    //webview_inject_add// data = { text: selection };
  } else if (shortcut === "Ctrl+Shift+G") {
    cmd = "findPrev"; // 查找上一个
    //webview_inject_add// data = { text: selection };
  } else if (shortcut === "Ctrl+S") {
    cmd = "savePageAs"; // 页面另存为
  } else if (shortcut === "Ctrl+P") {
    cmd = "print"; // 打印
  } else if (shortcut === "Ctrl+T") {
    cmd = "addTab"; // 新建标签页
  } else if (shortcut === "Ctrl+W") {
    cmd = "closeTab"; // 关闭当前标签页
  } else if (shortcut === "Ctrl+J") {
    cmd = "showDownloads"; // 下载
  } else if (shortcut === "Ctrl+Shift+I") {
    cmd = "toggleWebviewDevTools"; // 开发者工具
  } else if (shortcut === "ESCAPE") {
    cmd = "esc";
  }
  if (cmd) {
    /*webview_inject_remove*/ emitter.emit("shortcut", { shortcut, cmd, data });
    //webview_inject_add// NW.sendMessage("WV_shortcut", { shortcut, cmd, data });
    e.preventDefault();
    e.stopPropagation();
  }
});

/*webview_inject_remove*/ export default emitter;
