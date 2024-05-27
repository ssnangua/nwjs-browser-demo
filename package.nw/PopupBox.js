class PopupBox extends HTMLElement {
  #modal;
  #popupBox;
  #searchInput;
  constructor() {
    super();

    const {
      title,
      startSearchButtonTitle,
      endSearchButtonTitle,
      moreButtonTitle,
      searchInputPlaceholder,
    } = this.dataset;

    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="./iconfont/iconfont.css" />
      <style>
      .hide {
        display: none !important;
      }
      .modal {
        z-index: 999;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.0001);
      }
      .popup-box {
        z-index: 1000;
        position: fixed;
        top: var(--top);
        right: var(--right);
        width: var(--width);
        height: var(--height);
        background-color: #fff;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
        border-radius: 8px;
        display: flex;
        flex-flow: column;
        min-height: 150px;
        max-height: calc(100vh - 100px);
      }
      .header {
        padding: 8px 10px;
        border-bottom: 1px solid #dadada;
      }
      .title {
        font-size: 14px;
        font-weight: bold;
      }
      .buttons {
        float: right;
      }
      [button] {
        padding: 6px;
        align-content: center;
        border-radius: 2px;
        cursor: pointer;
      }
      [button]:hover {
        background-color: #e5e5e5;
      }
      .search {
        padding: 2px 15px 3px 10px;
        border-bottom: 1px solid #dadada;
      }
      .search,
      .searching .header {
        display: none;
      }
      .searching .search {
        display: flex;
      }
      [button="end-search"] {
        transform: rotate(-90deg);
      }
      .search .icon-search {
        z-index: 1;
        align-content: center;
        margin-left: 18px;
      }
      .search input {
        flex: auto;
        border: 1px solid #888888;
        border-radius: 2px;
        outline: 2px solid rgba(136, 136, 136, 0);
        outline-offset: -2px;
        margin-left: -28px;
        line-height: 30px;
        padding: 0 10px 0 40px;
        transition: outline 0.3s;
      }
      .search input:focus {
        outline: 2px solid #888888;
      }
      .content {
        flex: auto;
        overflow: auto;
        margin: 0 5px;
      }
      .content::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      .content::-webkit-scrollbar-thumb {
        border-radius: 8px;
        background-color: #929292;
      }
      .content::-webkit-scrollbar-thumb:hover {
        background-color: #acacac;
      }
      </style>
      <div class="modal hide"></div>
      <div class="popup-box hide">
        <div class="header">
          <span class="title">${title || ""}</span>
          <span class="buttons">
            <i title="${
              startSearchButtonTitle || "搜索"
            }" class="iconfont icon-search button" button="start-search"></i>
            <i title="${
              moreButtonTitle || "更多选项"
            }" class="iconfont icon-more" button="more"></i>
          </span>
          <span class="buttons" style="margin-right: 5px;"><slot name="buttons"></slot></span>
        </div>
        <div class="search">
          <i title="${
            endSearchButtonTitle || "退出搜索"
          }" class="iconfont icon-up" button="end-search"></i>
          <i class="iconfont icon-search"></i>
          <input type="text" placeholder="${searchInputPlaceholder || "搜索"}" />
        </div>
        <div class="content"><slot name="content"></slot></div>
      </div>
    `;

    this.#modal = this.shadowRoot.querySelector(".modal");
    this.#popupBox = this.shadowRoot.querySelector(".popup-box");
    this.#searchInput = this.shadowRoot.querySelector(".search input");

    this.shadowRoot.querySelectorAll("[button]").forEach((el) => {
      const cmd = el.getAttribute("button");
      el.addEventListener("click", () => {
        if (cmd === "start-search") {
          this.isSearch = true;
        } else if (cmd === "end-search") {
          this.isSearch = false;
        } else if (cmd === "more") {
          this.dispatchEvent(new CustomEvent("more", { detail: { el } }));
        }
      });
    });

    this.#searchInput.addEventListener("input", (e) => {
      this.dispatchEvent(new CustomEvent("search", { detail: e.target.value }));
    });

    // 在面板外部按下鼠标，关闭面板
    //   WebView会吞掉鼠标事件，导致无法侦听到window的鼠标事件，所以加个全屏蒙版
    this.#modal.addEventListener("mousedown", () => {
      this.hide();
      this.isSearch = false;
    });
  }

  show() {
    this.#modal.classList.remove("hide");
    this.#popupBox.classList.remove("hide");
  }
  hide() {
    this.#modal.classList.add("hide");
    this.#popupBox.classList.add("hide");
  }
  get isShow() {
    return !this.#modal.classList.contains("hide");
  }
  set isShow(bool) {
    this[bool ? "show" : "hide"]();
  }
  get isSearch() {
    return this.#popupBox.classList.contains("searching");
  }
  set isSearch(bool) {
    this.#popupBox.classList[bool ? "add" : "remove"]("searching");
    if (bool) {
      this.#searchInput.focus();
    } else {
      this.#searchInput.value = "";
      this.dispatchEvent(new CustomEvent("end-search", {}));
    }
  }
}

customElements.define("popup-box", PopupBox);
