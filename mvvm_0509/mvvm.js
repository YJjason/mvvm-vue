class Dep {
  constructor() {
    this.subs = [];
  }
  addSub(watcher) {
    this.subs.push(watcher);
  }
  notify() {
    this.subs.forEach((watcher) => {
      watcher.update();
    });
  }
}

// 观察者
class Watcher {
  constructor(vm, expr, cb) {
    this.vm = vm;
    this.expr = expr;
    this.cb = cb;
    this.oldValue = this.get();
  }
  get() {
    let value = CompilerUtils.getValue(this.vm, this.expr);
    return value;
  }
  update() {
    let newVlaue = CompilerUtils.getValue(this.vm, this.expr);
    if (newValue !== this.oldValue) {
      this.cb(newVlaue);
    }
  }
}

class Observer {
  constructor(data) {
    this.observe(data);
  }
  observe(data) {
    if (data && typeof data === "object") {
      for (let key in data) {
        this.defineReactive(data, key, data[key]);
      }
    }
  }
  defineReactive(obj, key, value) {
    this.observe(value);
    Object.defineProperty(obj, key, {
      get() {
        return value;
      },
      set: (newValue) => {
        if (newValue !== value) {
          this.observe(newValue);
          value = newValue;
        }
      },
    });
  }
}

// 创建Vue 基类
class Vue {
  constructor(options) {
    this.$el = options.el;
    this.$data = options.data;

    if (this.$el) {
      // 编译dom元素
      new Compiler(this.$el, this);
      //数据绑定 即数据劫持
      new Observer(this.$data);
    }
  }
}

// 编译模板 类
class Compiler {
  constructor(el, vm) {
    //当前实例
    this.vm = vm;
    // 判断传入 el 是否存在
    this.el = this.isElementNode(el) ? el : document.querySelector(el);
    //使用文档碎片，将该节点下的所有元素，存放到内存。优化速度
    let fragment = this.nodeToFragment(this.el);
    // 遍历 文档碎片，编译DOM 中的模板
    this.compile(fragment);
    // 将已经用data替换过模板的 DOM ,重新渲染到页面
    this.el.appendChild(fragment);
  }
  //编译文档碎片内容
  compile(node) {
    let childNodes = node.childNodes;
    [...childNodes].forEach((child) => {
      // 判断子节点是否是 元素，还是文本节点
      if (this.isElementNode(child)) {
        this.compileElement(child);
        this.compile(child);
      } else {
        this.compileText(child);
      }
    });
  }
  isDirective(attrName) {
    return attrName.includes("v-");
  }
  //编译元素
  compileElement(node) {
    //获取元素属性，判断是否有对应指令
    let attributes = node.attributes;
    [...attributes].forEach((attr) => {
      let { name, value: expr } = attr;
      //根据name 判断是否时指令
      if (this.isDirective(name)) {
        //判断时那种指令 v-model v-html
        let [, directive] = name.split("-");
        //根据不同指令调用对应方法
        CompilerUtils[directive](node, expr, this.vm);
      }
    });
  }
  //编译文本
  compileText(node) {
    let content = node.textContent;
    let regx = /\{\{(.+?)\}\}/;
    if (regx.test(content)) {
      // 获取文本表达式 {{xx}}{{dd}}, 调用text 方法解析
      CompilerUtils["text"](node, content, this.vm);
    }
  }
  //当DOM 元素转为文档碎片
  nodeToFragment(node) {
    let fragment = document.createDocumentFragment();
    let firstChild;
    while ((firstChild = node.firstChild)) {
      fragment.appendChild(firstChild);
    }
    return fragment;
  }

  //判断是否时元素节点
  isElementNode(node) {
    return node.nodeType === 1;
  }
}

CompilerUtils = {
  getValue(vm, expr) {
    return expr.split(".").reduce((data, current) => {
      return data[current];
    }, vm.$data);
  },
  model(node, expr, vm) {
    let fn = this.updater["modelUpdater"];
    // 输入框添加观察者，当数据发生变化时，出发该方法回调，重新赋值
    new Watcher(vm, expr, (newValue) => {
      fn(node, newValue);
    });
    let value = this.getValue(vm, expr);
    fn(node, value);
  },
  html() {},
  getContentValue(vm, expr) {
    return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      return this.getValue(vm, args[1]);
    });
  },
  text(node, expr, vm) {
    let fn = this.updater["textUpdater"];
    let value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      new Watcher(vm, args[1], () => {
        fn(node, this.getContentValue(vm, expr));
      });
      return this.getValue(vm, args[1]);
    });
    fn(node, value);
  },
  updater: {
    modelUpdater(node, value) {
      node.value = value;
    },
    htmlUpdater() {},
    textUpdater(node, value) {
      node.textContent = value;
    },
  },
};
