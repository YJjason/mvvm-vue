// Dep 订阅类
class Dep {
  constructor() {
    this.subs = []; // 存放所有的 watcher
  }
  //订阅watcher
  addSub(watcher) {
    this.subs.push(watcher);
  }
  //发布消息
  notify() {
    this.subs.forEach((watcher) => watcher.update());
  }
}
// 观察者(发布订阅)
class Watcher {
  constructor(vm, expr, cb) {
    this.vm = vm;
    this.expr = expr;
    this.cb = cb;
    //默认先保存旧值
    this.oldValue = this.get();
  }
  get() {
    Dep.target = this; // 将当前watcher 实例添加到Dep.target 全局属性上
    let value = CompilerUtil.getValue(this.vm, this.expr);
    Dep.target = null;
    return value;
  }
  //数据变化后，调用观察者的update  方法
  update() {
    let newVal = CompilerUtil.getValue(this.vm, this.expr);
    //判断newVal 和this.oldValue 是否相等;不相等，调用回调函数
    if (newVal !== this.oldValue) {
      this.cb(newVal);
    }
  }
}

//数据劫持
class Observer {
  constructor(data) {
    this.observer(data);
  }
  observer(data) {
    //如果数据是对象
    if (data && typeof data === "object") {
      for (let key in data) {
        this.defineReactive(data, key, data[key]);
      }
    }
  }
  defineReactive(obj, key, value) {
    //递归调用 observer() ,对每一层都劫持
    this.observer(value);
    let dep = new Dep(); // 给每个数据都添加具有发布-订阅的功能
    Object.defineProperty(obj, key, {
      get() {
        Dep.target && dep.addSub(Dep.target); // 当前属性已经被观察，push到订阅-发布 数组
        return value;
      },
      set: (newValue) => {
        if (newValue !== value) {
          //赋值时是一个对象是，再次调用observer()
          this.observer(newValue);
          value = newValue;
          dep.notify(); // 数据发生变化，执行notify() 方法
        }
      },
    });
  }
}
//编译模板
class Compiler {
  /**
   *
   * @param {当前元素} el
   * @param {当前实例} vm
   */
  constructor(el, vm) {
    this.vm = vm;
    // 判断el是否是元素，获取元素DOM节点
    this.el = this.isElementNode(el) ? el : document.querySelector(el);

    //将当前节点中元素，放入到内存
    let fragment = this.nodeToFragment(this.el);
    //替换节点内容，页面渲染
    //使用数据编译模板
    this.compile(fragment);

    this.el.appendChild(fragment);
  }
  //判断是否是指令
  isDirective(attrName) {
    return attrName.startsWith("v-");
  }
  //编译元素
  compileElement(node) {
    let attributes = node.attributes;
    [...attributes].forEach((attr) => {
      //eg=>v-model='' type='text'
      let { name, value: expr } = attr;
      //判断name 是否是指令
      if (this.isDirective(name)) {
        let [, directive] = name.split("-"); // v-model v-html
        let [directiveName, eventName] = directive.split(":"); // v-on:click
        //调用不同指令. 通过this.vm 获取expr 表达式对应的值，渲染到node元素上
        // CompilerUtil[directive](node, expr, this.vm);
        CompilerUtil[directiveName](node, expr, this.vm, eventName);
      }
    });
  }
  //编译文本 {{xx}}
  compileText(node) {
    //获取节点content
    let content = node.textContent;
    let repx = /\{\{(.+?)\}\}/;
    if (repx.test(content)) {
      CompilerUtil["text"](node, content, this.vm); //{{a}} {{b}}
    }
  }
  /***
   *  核心编译方法
   *  编译内存中的DOM
   * */
  compile(node) {
    let childNodes = node.childNodes;
    [...childNodes].forEach((child) => {
      //判断是否是元素节点
      if (this.isElementNode(child)) {
        this.compileElement(child);
        //如果是元素节点，递归遍历子节点
        this.compile(child);
      } else {
        this.compileText(child);
      }
    });
  }
  /** 将DOM 节点移动到内存中 */
  nodeToFragment(node) {
    //创建文档碎片
    let fragment = document.createDocumentFragment();
    let firstChild;
    //最外层节点
    while ((firstChild = node.firstChild)) {
      // appendChild 具有移动性，将DOM中节点移除，添加到另一处
      fragment.appendChild(firstChild);
    }
    return fragment;
  }
  /**
   * 判断是否是元素节点
   */
  isElementNode(node) {
    return node.nodeType === 1;
  }
}
//编译工具
CompilerUtil = {
  // 更具expr 表达式 获取对应值
  getValue(vm, expr) {
    return expr.split(".").reduce((data, current) => {
      return data[current];
    }, vm.$data);
  },
  //视图修改，对数据赋值
  setValue(vm, expr, value) {
    // vm.$data.school.name = 'xxx'
    return expr.split(".").reduce((data, current, index, arr) => {
      if (index === arr.length - 1) {
        return (data[current] = value);
      }
      return data[current];
    }, vm.$data);
  },
  //node是当前节点，expr表达式，vm是当前实例
  model(node, expr, vm) {
    //给输入框赋值
    let fn = this.updater["modelUpdater"];
    //数据变化的时候，监控数据变化 触发更新
    new Watcher(vm, expr, (newVal) => {
      // 给输入框添加一个观察者，数据变化出发该方法，用新值给输入框赋值
      fn(node, newVal);
    });
    // 绑定事件，实现试图修改，数据改变
    node.addEventListener("input", (e) => {
      let value = e.target.value;
      this.setValue(vm, expr, value);
    });
    let value = this.getValue(vm, expr);
    fn(node, value);
  },
  html(node,expr,vm) {
    let fn = this.updater["htmlUpdater"];
    new Watcher(vm, expr, (newVal) => {
      fn(node, newVal);
    });
    let value = this.getValue(vm, expr);
    fn(node, value);
  },
  getContentValue(vm, expr) {
    return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      return this.getValue(vm, args[1]);
    });
  },
  //on 事件
  on(node, expr, vm, eventName) {
    //v-on:click="change"
    node.addEventListener(eventName, (e) => {
      vm[expr].call(vm, e);
    });
  },
  //expr 特殊情况 eg=> {{a}} {{b}} {{c}} 多个值
  text(node, expr, vm) {
    let fn = this.updater["textUpdater"];
    let content = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      new Watcher(vm, args[1], () => {
        fn(node, this.getContentValue(vm, expr));
      });
      return this.getValue(vm, args[1]);
    });
    fn(node, content);
  },
  updater: {
    //将数据插入到节点中
    modelUpdater(node, value) {
      node.value = value;
    },
    htmlUpdater(node,value) {
      node.innerHTML = value;
    },
    textUpdater(node, value) {
      node.textContent = value;
    },
  },
};

//定义Vue 基类
class Vue {
  constructor(options) {
    //当前实例绑定 $el、$data 等
    this.$el = options.el;
    this.$data = options.data;

    let computed = options.computed;

    let methods = options.methods;

    //1.判断当前根元素是否存在
    if (this.$el) {
      //使用Object.defineProperty() 对所有数据劫持
      new Observer(this.$data);
      for (let key in computed) {
        Object.defineProperty(this.$data, key, {
          get: () => {
            return computed[key].call(this);
          },
        });
      }
      for (let key in methods) {
        Object.defineProperty(this, key, {
          get() {
            return methods[key];
          },
        });
      }
      // 把数据获取操作，vm上的操作，代理到 vm.$data 即 vm.$data ===  vm
      this.proxyVm(this.$data);
      //存在根元素，
      new Compiler(this.$el, this);
    }
  }
  proxyVm(data) {
    for (let key in data) {
      Object.defineProperty(this, key, {
        get() {
          return data[key];
        },
        set(newValue) {
          data[key] = newValue;
        },
      });
    }
  }
}
