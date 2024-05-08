/**
 * 标签页右键菜单
 */
import { createMenu } from "./common.js";

const EventEmitter = require("node:events");
const emitter = new EventEmitter();

let tabId;

const menu = createMenu([
  {
    label: "在右侧新建标签页",
    icon: "./assets/tab.png",
    click: () => emitter.emit("itemClick", "addTab", { insertAfter: tabId }),
  },
  { type: "separator" },
  {
    label: "刷新",
    icon: "./assets/reload.png",
    key: "r",
    modifiers: "ctrl",
    click: () => emitter.emit("itemClick", "reload", tabId),
  },
  { type: "separator" },
  {
    label: "关闭标签页",
    icon: "./assets/close.png",
    key: "w",
    modifiers: "ctrl",
    click: () => emitter.emit("itemClick", "closeTab", tabId),
  },
  {
    label: "关闭其他标签页",
    click: () => emitter.emit("itemClick", "closeOtherTabs", tabId),
  },
  {
    label: "关闭右侧标签页",
    enabled: false,
    click: () => emitter.emit("itemClick", "closeRightTabs", tabId),
  },
  /*
  // TODO：没做历史记录，相关功能无效
  { type: "separator" },
  {
    label: "重新打开关闭的标签页",
    icon: "./assets/close.png",
    key: "t",
    modifiers: "ctrl+shift",
    click: () => emitter.emit("itemClick", "reopenTab"),
  },
  */
]);

const $closeOtherTabs = menu.items.find((item) => item.label === "关闭其他标签页");
const $closeRightTabs = menu.items.find((item) => item.label === "关闭右侧标签页");

export default {
  on: (type, listener) => emitter.on(type, listener),
  popup(x, y, { closeOtherTabsEnabled, closeRightTabsEnabled, tab }) {
    tabId = tab.tabId;
    $closeOtherTabs.enabled = closeOtherTabsEnabled;
    $closeRightTabs.enabled = closeRightTabsEnabled;
    menu.popup(x, y);
  },
};
