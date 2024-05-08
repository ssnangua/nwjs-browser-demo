/**
 * 工具函数
 */

// 应用页面
export const pages = {
  blank: { title: "新建标签页", url: location.origin + "/blank.html" },
  setting: { title: "设置", url: location.origin + "/setting.html" },
};

// 是否是应用页面
export function isAppPage(url) {
  return url.startsWith(location.origin);
}

// 创建菜单
export function createMenu(items, option = { type: "contextmenu" }) {
  const menu = new nw.Menu(option);
  items.forEach((item) => {
    menu.append(new nw.MenuItem(item));
  });
  return menu;
}

// 取值范围
export function between(min, value, max) {
  return value < min ? min : value > max ? max : value;
}
