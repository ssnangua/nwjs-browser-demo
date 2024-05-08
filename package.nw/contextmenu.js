/**
 * 主窗口右键菜单
 */
import { createMenu } from "./common.js";

/**
 * 输入框菜单
 */
function popupInputMenu(x, y, $input) {
  const clipboard = nw.Clipboard.get();
  const hasSelection = $input.selectionStart !== $input.selectionEnd;
  const canPaste = !!clipboard.get("text");
  const hasValue = !!$input.value;
  const menu = createMenu([
    {
      label: "剪切　　　　",
      icon: "./assets/cut.png",
      key: "x",
      modifiers: "ctrl",
      enabled: hasSelection,
      click: () => document.execCommand("cut"),
    },
    {
      label: "复制",
      icon: "./assets/copy.png",
      key: "c",
      modifiers: "ctrl",
      enabled: hasSelection,
      click: () => document.execCommand("copy"),
    },
    {
      label: "粘贴",
      icon: "./assets/paste.png",
      key: "v",
      modifiers: "ctrl",
      enabled: canPaste,
      click: () => document.execCommand("paste"),
    },
    {
      label: "全选",
      key: "a",
      modifiers: "ctrl",
      enabled: hasValue,
      click: () => document.execCommand("selectAll"),
    },
  ]);
  menu.popup(x, y);
}

window.addEventListener("contextmenu", (e) => {
  if (e.target.tagName.toLowerCase() === "input") {
    popupInputMenu(e.x, e.y, e.target);
  }
  e.preventDefault();
  return false;
});
