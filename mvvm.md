# MVVM实现

## 创建Vue 类
```
1. 创建vue 实例，注册全局属性 $el、$data等属性
2. 判断$el根节点是否存在，调用Compiler()方法
```
### Compiler() 类
```
1. 创建文档碎片,将DOM 节点存储至内存
2. compile()编译文档碎片，填充数据
3. 将编译后内容，挂载到$el 根节点
```
### Compile() 编译
```
1. 遍历当前元素的子节点
2. 判断子节点是文本节点还是标签节点
3. 标签节点调用compileElement()方法编译，如果有子元素，递归调用compile()
4. 文本节点调用compileText()方法
```
### compileElement() 编译标签节点
```
1. 遍历当前元素的所有属性。
2. 使用isDirective()方法,判断当前属性是否是指令
3. 调用对应指令方法，对属性赋值
```
##  数据劫持 Object.defineProperty
```
1. 在渲染DOM元素之前，对说有数据进行数据劫持 new Observer()
2. 判断数据是否是对象，是对象遍历每一个属性，并调用defineReactive() 方法
3. defineReactive()内再次调用this.observe() 递归调用，对data内每一层数据都进行劫持
4. 使用Object.defineProperty() 对data中数据完成劫持
5. 在set 中对当前属性的赋值，再次调用this.observer() 完成数据劫持
```
## 观察者 (发布订阅模式)
```
1. 定义get、update 方法，分别获取和更新当前观察对象的值
2. 在数据变化时 new Watcher 实例，对当前数据添加观察者

```
### Dep 发布-订阅
```
1. 根据不同指令解析模板，同时添加Watcher 观察者 对该属性进行监控。
2. 在观察者Watcher 创建实例时，调用get()方法，获取当前属性的旧值，将当前watcher绑定到 Dep的target 属性Dep.target = this;
3. 在对数进行劫持时，判断当前订阅-发布 更具Dep.target ,判断当前属性是否被观察，若被观察，添加当前watcher 到订阅-发布 存储；
4. 
```
