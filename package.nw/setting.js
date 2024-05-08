/**
 * 设置数据
 */
import defaultSetting from "./defaultSetting.json" with { type: "json" };

let setting;

// storage发生变更时（可能来自其他窗口的修改），同步最新数据
chrome.storage.onChanged.addListener((data) => {
  if (data.setting) setting = data.setting.newValue;
});

export default {
  async init() {
    if (!setting) {
      setting = await new Promise((resolve) => {
        chrome.storage.local.get(["setting"], ({ setting }) => {
          resolve(Object.assign(defaultSetting, setting));
        });
      });
    }
    return setting;
  },
  get: (key) => (key ? setting[key] : JSON.parse(JSON.stringify(setting))),
  set: (key, value) => {
    if (typeof key === "string") setting[key] = value;
    else Object.assign(setting, key);
    chrome.storage.local.set({ setting });
  },
  getHomeUrl: () => setting.home,
  getSearchUrl: (keyword) => {
    const { rule } = setting.search.find((item) => item.active);
    return rule.replace("%s", keyword);
  },
};
