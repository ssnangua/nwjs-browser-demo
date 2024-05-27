/**
 * WebView的右键菜单
 */
import { createMenu } from "./common.js";

const EventEmitter = require("node:events");
const emitter = new EventEmitter();

let position, types, tabId;

// 通用菜单
const separator = { type: "separator" };
const inspect = {
  label: "检查　　　　",
  icon: "./assets/inspect.png",
  click: () => emitter.emit("itemClick", "inspect", position),
};

// 默认菜单
const defaultMenu = {
  back: {
    label: "返回",
    icon: "./assets/back.png",
    key: "left",
    modifiers: "alt",
    click: () => emitter.emit("itemClick", "back"),
  },
  forward: {
    label: "前进",
    icon: "./assets/forward.png",
    key: "right",
    modifiers: "alt",
    click: () => emitter.emit("itemClick", "forward"),
  },
  reload: {
    label: "刷新",
    key: "r",
    modifiers: "ctrl",
    icon: "./assets/reload.png",
    click: () => emitter.emit("itemClick", "reload"),
  },
  savePageAs: {
    label: "另存为",
    icon: "./assets/saveas.png",
    key: "s",
    modifiers: "ctrl",
    click: () => emitter.emit("itemClick", "savePageAs"),
  },
  print: {
    label: "打印",
    key: "p",
    modifiers: "ctrl",
    icon: "./assets/print.png",
    click: () => emitter.emit("itemClick", "print"),
  },
};

// 链接菜单
const linkMenu = {
  openLinkInNewTab: {
    label: "在新标签页中打开链接",
    icon: "./assets/tab.png",
    click: () => emitter.emit("itemClick", "addTab", { url: types.link.url, insertAfter: tabId }),
  },
  saveLinkAs: {
    label: "将链接另存为",
    click: () => emitter.emit("itemClick", "saveLinkAs", { url: types.link.url }),
  },
  copyLink: {
    label: "复制链接",
    icon: "./assets/link.png",
    click: () => emitter.emit("itemClick", "copyText", { text: types.link.url }),
  },
};

// 图片菜单
const imageMenu = {
  openImageInNewTab: {
    label: "在新标签页中打开图片",
    icon: "./assets/image-newtab.png",
    click: () => emitter.emit("itemClick", "addTab", { url: types.image.url, insertAfter: tabId }),
  },
  saveImageAs: {
    label: "将图片另存为",
    icon: "./assets/image-saveas.png",
    click: () => emitter.emit("itemClick", "saveImageAs", { url: types.image.url }),
  },
  copyImage: {
    label: "复制图像",
    icon: "./assets/image-copy.png",
    click: () => emitter.emit("itemClick", "copyImage", { url: types.image.url }),
  },
  copyImageLink: {
    label: "复制图像链接",
    click: () => emitter.emit("itemClick", "copyText", { text: types.image.url }),
  },
};

// 选中文本菜单
const selectionMenu = {
  copy: {
    label: "复制",
    icon: "./assets/copy.png",
    key: "c",
    modifiers: "ctrl",
    click: () => emitter.emit("itemClick", "copyText", { text: types.selection.text }),
  },
};

// 输入框菜单
const inputMenu = {
  cut: {
    label: "剪切",
    icon: "./assets/cut.png",
    key: "x",
    modifiers: "ctrl",
    click: () => emitter.emit("itemClick", "execCommand", "cut"),
  },
  copy: {
    label: "复制",
    icon: "./assets/copy.png",
    key: "c",
    modifiers: "ctrl",
    click: () => emitter.emit("itemClick", "execCommand", "copy"),
  },
  paste: {
    label: "粘贴",
    icon: "./assets/paste.png",
    key: "v",
    modifiers: "ctrl",
    click: () => emitter.emit("itemClick", "execCommand", "paste"),
  },
  selectAll: {
    label: "全选",
    key: "a",
    modifiers: "ctrl",
    click: () => emitter.emit("itemClick", "execCommand", "selectAll"),
  },
};

export default {
  on: (type, listener) => emitter.on(type, listener),
  popup({ x, y, types: _types, tabId: _tabId, canGoBack, canGoForward, canPaste }) {
    position = { x, y };
    tabId = _tabId;
    types = {};
    _types.forEach((item) => (types[item.type] = item));
    // console.log(types);

    let itemsGroups = [];

    if (_types.length === 0) {
      itemsGroups.push([
        /* 返回　 */ { ...defaultMenu.back, enabled: canGoBack },
        /* 前进　 */ ...(canGoForward ? [defaultMenu.forward] : []),
        /* 刷新　 */ defaultMenu.reload,
        /* ————— */ separator,
        /* 另存为 */ defaultMenu.savePageAs,
        /* 打印　 */ defaultMenu.print,
      ]);
    } else {
      if (types.link) {
        // 链接
        itemsGroups.push([
          /* 在新标签页中打开链接 */ linkMenu.openLinkInNewTab,
          /* ——————————————————— */ separator,
          /* 将链接另存为　　　　 */ linkMenu.saveLinkAs,
          /* 复制链接　　　　　　 */ linkMenu.copyLink,
        ]);
      }

      if (types.image) {
        // 图片
        itemsGroups.push([
          /* 在新标签页中打开图像 */ imageMenu.openImageInNewTab,
          /* 将图像另存为　　　　 */ { ...imageMenu.saveImageAs, enabled: types.image.valid },
          /* 复制图像　　　　　　 */ { ...imageMenu.copyImage, enabled: types.image.valid },
          /* 复制图像链接　　　　 */ imageMenu.copyImageLink,
        ]);
      } /* else if (types.video) {
        // TODO：视频
        itemsGroups.push([]);
      } */ else if (types.input) {
        // 输入框
        itemsGroups.push([
          /* 剪切 */ { ...inputMenu.cut, enabled: types.input.hasSelection },
          /* 复制 */ { ...inputMenu.copy, enabled: types.input.hasSelection },
          /* 粘贴 */ { ...inputMenu.paste, enabled: canPaste },
          /* 全选 */ { ...inputMenu.selectAll, enabled: types.input.hasValue },
        ]);
        // console.log(itemsGroups);
      }

      if (types.selection) {
        // 选中文本
        itemsGroups.push([/* 复制 */ selectionMenu.copy]);
      }
    }

    // 检查
    itemsGroups.push([/* 检查 */ inspect]);

    // 弹出菜单
    itemsGroups.slice(1).forEach((items) => items.unshift(/* —— */ separator));
    const menu = createMenu([].concat(...itemsGroups));
    menu.popup(x, y);
  },
};
