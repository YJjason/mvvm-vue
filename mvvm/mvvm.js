/* 一. 创建Vue 基础类； */
class Vue {
    constructor( options ){
        this.$el = options.el;
        this.$data = options.data;
        let computed = options.computed;
        let methods = options.methods;
        if(this.$el){
            /*2.数据劫持*/
            new Observer( this.$data );
            for(let key in computed){
                console.log(key)
                Object.defineProperty( this.$data, key, {
                    get: () => {
                        console.log(11,key)
                        return computed[key].call( this );
                    },
                } );
            }
            for(let key in methods){
                Object.defineProperty( this, key,{
                    get(){
                        return methods[key]
                    }
                })

            }
            this.proxyVm(this.$data);
            /*1.编译模版*/
            new Compiler( this.$el, this );
        }
    }
    proxyVm( data ){
        for(let key in data){
            Object.defineProperty( this, key, {
                get(){
                    return data[key];
                },
                set( newValue ){
                    data[key] = newValue;
                },
            } );
        }
    }

}

/*四、观察者 Watcher*/
class Watcher {
    /*数据修改，执行cb*/
    constructor( vm, expr, cb ){
        this.vm = vm;
        this.expr = expr;
        this.cb = cb;
        /*首次渲染，获取旧值*/
        this.oldValue = this.get();
    }
    /**
     * 1。new Watch 实例时，调用get 方法
     * 2。触发 Object.defineProperty get 方法
     * 3。
     * */
    get(){
        Dep.target = this; // 将当前watcher 作为target属性，绑定到Dep 类
        // 取值，将该观察者，和数据关联
        let value = CompilerUtil.getValue( this.vm, this.expr );
        //
        Dep.target = null;
        return value
    }

    /*更新操作，当数据发生改变，调用update方法更新*/
    update(){
        // 获取新值
        let newVal = CompilerUtil.getValue( this.vm, this.expr );
        if(newVal !== this.oldValue){
            //数据变化，触发回调
            this.cb( newVal );
        }
    }
}

/**
 * 发布-订阅
 * addSubs 收集watcher,
 * notify 数据发生改变时,通知watcher update 执行更新
 */
class Dep {
    constructor(){
        this.subs = []
    }
    addSubs( watcher ){
        this.subs.push( watcher );
    }
    notify(){
        this.subs.forEach(watcher => watcher.update())
    }
}

/* 三、 数据劫持 */
class Observer {
    constructor( data ){
        this.observer( data )
    }
    observer( data ){
        if(data && typeof data === 'object'){
            for(let key in data){
                this.defineReactive( data, key, data[key] )
            }
        }
    }
    /**
     * 对data 中每一项进行劫持
     * @param obj
     * @param key
     * @param value
     * @returns {*}
     */
    defineReactive( obj, key, value ){
        this.observer( value );
        /*数据初始 劫持时，对每一个数据增加 Dep属性*/
        let dep = new Dep();
        Object.defineProperty( obj, key, {
            get(){
                //创建Watcher时，取到对应内容，并且把watcher放到全局
                Dep.target && dep.addSubs(Dep.target);
                return value
            },
            set: ( newVal ) => {
                if(value !== newVal){
                    /*更新或替换原对象时，对新数据进行劫持*/
                    this.observer( newVal );
                    value = newVal;
                    dep.notify();
                }
            }
        } )
    }
}

/*  二、编译类，编译当前模版内容 */
class Compiler {
    //接收当前要编译的模版el,当前vue实例 vm
    constructor( el, vm ){
        this.vm = vm;
        //判断el属性，是否是一个元素
        this.el = this.isElementNode( el ) ? el : document.querySelector( el );
        //使用 Fragment 将当前元素存放内存中；
        let fragment = this.nodeToFragment( this.el );
        // 将模版中数据，使用data 进行编译替换
        this.compile( fragment );
        // 将内存中编译后元素，重新渲染到DOM;
        this.el.appendChild( fragment );
    }

    /**
     * 元素节点编译
     * @param node
     */
    compileElement( node ){
        /*获取元素的所有属性*/
        let attributes = node.attributes;
        [ ...attributes ].forEach( attr => {
            let {name, value: expr} = attr;
            if(this.isDirective( name )){ // v-model v-html v-bind
                let [ , directive ] = name.split( '-' );
                /*调用对应指令, 对当前实例中，满足expr 表达式的node 元素赋值 */
                // CompilerUtil[directive]( node, expr, this.vm )
                let [directiveName,eventName] = directive.split(':'); //v-on:click
                CompilerUtil[directiveName](node,expr,this.vm,eventName);
            }
        } )
    }

    /**
     * 文本节点编译,
     * @param node
     */
    compileText( node ){
        /*判断当前文本节点是否有 {{}}*/
        let expr = /\{\{(.+?)\}\}/;
        let content = node.textContent;
        if(expr.test( content )){ //{{xx}} {{a}} {{b}}
            CompilerUtil['text']( node, content, this.vm ); // content {{a}} {{b}}
        }
    }

    /**
     * 核心编译 编译内存中存储的 元素模版
     * @param node
     */
    compile( node ){
        let childNodes = node.childNodes; // 获取当前元素的子节点
        /*遍历所有子节点，判断是元素或者文本节点*/
        [ ...childNodes ].forEach( child => {
            if(this.isElementNode( child )){
                this.compileElement( child )
                /*递归，循环子元素*/
                this.compile( child );
            } else{
                this.compileText( child )
            }
        } )
    }

    /**
     * 判断当前元素属性，是否是v-指令
     * @param name
     */
    isDirective( name ){
        return name.includes( 'v-' );
    }

    /**
     * 收集当前元素的所有节点，移动到内存；
     * @param node
     */
    nodeToFragment( node ){
        //创建一个文档碎片对象
        let fragment = document.createDocumentFragment();
        let firstChild;
        while(firstChild = node.firstChild){
            fragment.appendChild( firstChild );
        }
        return fragment
    }

    /**
     * 判断是否是元素节点
     * @param node
     */
    isElementNode( node ){
        return node.nodeType === 1;
    }
}

/* a. 工具类方法，更具不同指令执行对应的具体实现 */

/*
CompilerUtil = {
    // 更具expr 表达式 获取对应值
    getValue( vm, expr ){
        return expr.split( "." ).reduce( ( data, current ) => {
            return data[current];
        }, vm.$data );
    },
    //视图修改，对数据赋值
    setValue( vm, expr, value ){
        // vm.$data.school.name = 'xxx'
        return expr.split( "." ).reduce( ( data, current, index, arr ) => {
            if(index === arr.length - 1){
                return ( data[current] = value );
            }
            return data[current];
        }, vm.$data );
    },
    //node是当前节点，expr表达式，vm是当前实例
    model( node, expr, vm ){
        //给输入框赋值
        let fn = this.updater["modelUpdater"];
        //数据变化的时候，监控数据变化 触发更新
        new Watcher( vm, expr, ( newVal ) => {
            // 给输入框添加一个观察者，数据变化出发该方法，用新值给输入框赋值
            fn( node, newVal );
        } );
        // 绑定事件，实现试图修改，数据改变
        node.addEventListener( "input", ( e ) => {
            let value = e.target.value;
            this.setValue( vm, expr, value );
        } );
        let value = this.getValue( vm, expr );
        fn( node, value );
    },
    html( node, expr, vm ){
        let fn = this.updater["htmlUpdater"];
        new Watcher( vm, expr, ( newVal ) => {
            fn( node, newVal );
        } );
        let value = this.getValue( vm, expr );
        fn( node, value );
    },
    getContentValue( vm, expr ){
        return expr.replace( /\{\{(.+?)\}\}/g, ( ...args ) => {
            return this.getValue( vm, args[1] );
        } );
    },
    //on 事件
    on( node, expr, vm, eventName ){
        //v-on:click="change"
        node.addEventListener( eventName, ( e ) => {
            vm[expr].call( vm, e );
        } );
    },
    //expr 特殊情况 eg=> {{a}} {{b}} {{c}} 多个值
    text( node, expr, vm ){
        let fn = this.updater["textUpdater"];
        let content = expr.replace( /\{\{(.+?)\}\}/g, ( ...args ) => {
            new Watcher( vm, args[1], () => {
                fn( node, this.getContentValue( vm, expr ) );
            } );
            return this.getValue( vm, args[1] );
        } );
        fn( node, content );
    },
    updater: {
        //将数据插入到节点中
        modelUpdater( node, value ){
            node.value = value;
        },
        htmlUpdater( node, value ){
            node.innerHTML = value;
        },
        textUpdater( node, value ){
            node.textContent = value;
        },
    },
};

*/

CompilerUtil = {
    /*抽取取值方法*/
    getValue( vm, expr ){ // vm.$data  'school.name'
        return expr.split( '.' ).reduce( ( data, current ) => {
            return data[current];
        }, vm.$data );
    },
    setValue( vm, expr,value){ // vm.$data 'school.name' = 'xx'
        expr.split( '.' ).reduce( ( data, current,index,arr ) => {
            if(index === arr.length -1){
                return  data[current] =value;
            }
            return data[current];
        }, vm.$data );
    },
    /**
     * @param node 当前元素节点
     * @param expr 当前表达式，v-model 对应绑定对象 input change 事件
     * @param vm 当前实例
     */
    model( node, expr, vm ){
        let fn = this.updater['modelUpdater'];
        /*解析模版指令和数据变化时，创建当前数据的 watcher*/
        new Watcher(vm,expr,(newVal) => {
            fn(node,newVal)
        })
        /*input change 事件*/
        node.addEventListener( 'input',e=>{
            let value = e.target.value;
            this.setValue(vm,expr,value);
        })
        let value = this.getValue( vm, expr );
        fn( node, value );
    },
    html(node,expr,vm){
        let fn  = this.updater['htmlUpdater'];

        new Watcher(vm,expr,(newVal) => {
            fn(node,newVal)
        })
        let value = this.getValue( vm, expr );
        fn(node,value);
    },
    getContentValue(vm,expr){
        return expr.replace(/\{\{(.+?)\}\}/g,(...args) => {
            return this.getValue(vm,args[1])
        })
    },
    on(node,expr,vm,eventName){
        node.addEventListener( eventName,e=>{
            vm[expr].call(vm,e);
        })
    },
    text( node, expr, vm ){ //expr => {{a}} 或者 {{a}} {{b}}
        let reg = /\{\{(.+?)\}\}/g;
        let fn = this.updater['textUpdater'];
        let content = expr.replace( reg, ( ...args ) => {
            // args[1] 获取文本节点中的每一个表达式
            new Watcher(vm,args[1],() => {
                return fn(node, this.getContentValue(vm,expr))
            })
            return this.getValue( vm, args[1] );
        } )
        fn( node, content );
    },
    updater: {
        modelUpdater( node, value ){
            node.value = value;
        },
        htmlUpdater( node, value ){
            node.innerHTML = value;
        },
        textUpdater( node, value ){
            node.textContent = value;
        }
    }
}

