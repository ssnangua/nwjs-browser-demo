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

// 展开时间
export function expandDate(time) {
  const date = new Date(time);
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    date: date.getDate(),
    hours: date.getHours(),
    minutes: date.getMinutes(),
    seconds: date.getSeconds(),
    day: date.getDay(),
  };
}
// 时间格式化
const DAY = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
export function formatDate(time, format = "yyyy-MM-dd hh:mm:ss") {
  const { year, month, date, day, hours, minutes, seconds } = expandDate(time);
  const o = {
    "y+": year,
    "M+": month + 1,
    "d+": date,
    "h+": hours,
    "m+": minutes,
    "s+": seconds,
    D: DAY[day],
  };
  for (let k in o) {
    if (new RegExp(`(${k})`).test(format)) {
      format = format.replace(
        RegExp.$1,
        RegExp.$1.length === 1 ? o[k] : `0${o[k]}`.substr(-RegExp.$1.length)
      );
    }
  }
  return format;
}

// 语义化字节数
export function humanBytes(bytes, digits = 1) {
  const i = bytes == 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(1024));
  return (
    Number((bytes / Math.pow(1024, i)).toFixed(digits)) + " " + ["B", "KB", "MB", "GB", "TB"][i]
  );
}

// 简单的模板编译
export function compileHTML(template, data) {
  return template.replace(/\${(.*?)}/g, (_, key) => {
    return encodeHTML(data[key.trim()] || "");
  });
}

// HTML字符转义
export function encodeHTML(str) {
  return (str + "").replace(/[\u00A0-\u9999<>\&'"]/g, (i) => "&#" + i.charCodeAt(0) + ";");
}

// 延迟
export function delay(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 获取图标base64
export function getImageBase64(url) {
  return fetch(url)
    .then((response) => {
      return response.arrayBuffer().then((arrayBuffer) => {
        const contentType = response.headers.get("content-type");
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        return `data:${contentType};base64,${base64}`;
      });
    })
    .catch((error) => {
      console.warn(error);
      return "";
    });
}
