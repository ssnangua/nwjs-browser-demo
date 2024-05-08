/**
 * 应用菜单（地址栏···按钮的弹出菜单）
 */
import { createMenu } from "./common.js";

const EventEmitter = require("node:events");
const emitter = new EventEmitter();

const menu = createMenu([
  {
    label: "新建标签页",
    icon: "./assets/tab.png",
    key: "t",
    modifiers: "ctrl",
    click: () => emitter.emit("itemClick", "addTab"),
  },
  { type: "separator" },
  {
    label: "在页面上查找",
    icon: "./assets/find.png",
    key: "f",
    modifiers: "ctrl",
    click: () => emitter.emit("itemClick", "find"),
  },
  { type: "separator" },
  {
    label: "开发人员工具",
    icon: "./assets/devtools.png",
    key: "i",
    modifiers: "ctrl+shift",
    click: () => emitter.emit("itemClick", "toggleWebviewDevTools"),
  },
  {
    label: "开发人员工具（应用）",
    icon: "./assets/devtools-fill.png",
    key: "F12",
    click: () => emitter.emit("itemClick", "toggleAppDevTools"),
  },
  { type: "separator" },
  {
    label: "设置",
    icon: "./assets/setting.png",
    click: () => emitter.emit("itemClick", "showSettingPage"),
  },
  {
    label: "关于",
    icon: "./assets/app.png",
    click: () => emitter.emit("itemClick", "showAbout"),
  },
  { type: "separator" },
  {
    label: "退出",
    click: () => emitter.emit("itemClick", "quit"),
  },
]);

export default {
  on: (type, listener) => emitter.on(type, listener),
  popup(x, y) {
    menu.popup(x, y);
  },
};
