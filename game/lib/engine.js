if(typeof require=="function" && typeof EventEmitter=="undefined"){
	EventEmitter=require('events').EventEmitter;
}

//外部へ情報を送れるやつ
var gaminginfo=new EventEmitter;

function Game(){
	this.config=Game.util.clone(this.defaultConfig);
	this.gaminginfo=gaminginfo;
	this.idGenerator=new IDGenerator();
	
	this.event=new EventEmitter();
	this.transport=this.getTransporter();

	this.objects=[];	//brain objects
	
	this.delays=[];	//{remains:frame, func:()}
	
	this.store={};	//データストア（Server用）
	//ユーザー
	this.defaultUser=Game.User;
	this._users=[];	//参加ユーザーの一覧
	//なんかのマネージャ
	this.manager=new Game.Manager(this);
	//できた
	gaminginfo.emit("new",this);


	this.internal_init();
}
Game.util={
	clone:function(obj){
		if(typeof obj!=="object" || !obj)return obj;

		var result=Object.create(Object.getPrototypeOf(obj));
		var arr=Object.getOwnPropertyNames(obj), l=arr.length;
		for(var i=0;i<l;i++){
			Object.defineProperty(result,arr[i],Object.getOwnPropertyDescriptor(obj,arr[i]));
		}
		return result;
	},
	merge:function(base,obj){
		var result=this.clone(base);
		if(!obj)return result;
		var arr=Object.getOwnPropertyNames(obj), l=arr.length;
		for(var i=0;i<l;i++){
			Object.defineProperty(result,arr[i],Object.getOwnPropertyDescriptor(obj,arr[i]));
		}
		return result;
	},
	extend:function(base,obj){
		var result=Object.create(base.prototype);
		if(!obj)return result;
		var arr=Object.getOwnPropertyNames(obj), l=arr.length;
		for(var i=0;i<l;i++){
			Object.defineProperty(result,arr[i],Object.getOwnPropertyDescriptor(obj,arr[i]));
		}
		return result;
	},
};


Game.prototype={
	internal_init:function(){
	},
//新しいIDを作る
	uniqueId:function(){
		return this.idGenerator.generate();
	},
	init:function(view,viewparam){
		//hard
		this.view = new view(this);
		this.view.init(viewparam);
	},
	start:function(){
		//hard
		//var user=new Game.User();
		var user=this.newUser();
		this.entry(user,{});
	},
	//ユーザーが登録された
	entry:function(user,opt){
		this._users.push(user);
		this.manager.newUser(user);
		this.event.emit("entry",user,opt);
	},
	//ユーザーがいなくなった
	byeUser:function(user){
		this._users=this._users.filter(function(x){return x!=user});
		this.manager.bye(user);
	},
	newUser:function(option){
		if(!option)option={};
		var user=new (this.defaultUser)();
		//ユーザーに対してIDを付加
		Object.defineProperty(user,"_id",{
			value:this.uniqueId()
		});
		user.init(option);
		return user;
	},
	useUser:function(userobj){
		this.defaultUser=userobj;
	},
	getTransporter:function(){
		return new (this.transporter)(this,this.gaminginfo);
	},
	//start loop
	loop:function(){
		
		this.manager=new Game.LoopManager(this);
		this.manager.start();
	},
	//main loop
	mainloop:function(){
		var arr=this.objects;
		this.view.event.emit("loop",arr);
		for(var i=0,l=arr.length;i<l;i++){
			var ins=arr[i].event;
			ins.emit("internal");
			ins.emit("loop");
			
			if(arr[i]._flg_dying){
				this.transport.die(arr[i]);
				arr.splice(i,1);
				i--,l--;
			}
		}
		//delayの処理
		arr=this.delays;
		for(i=0,l=arr.length;i<l;i++){
			var o=arr[i];
			if(o.cond && !o.cond()){
				arr.splice(i,1);
				i--,l=arr.length;
				continue;
			}
			if(--o.remains <= 0){
				o.func();
				arr.splice(i,1);
				i--,l=arr.length;
			}
		}
		this.transport.loop();
	},
	
	//objects return:internal object
	add:function(constructor,param){
		if(typeof constructor!=="function"){
			throw new Error;
		}
		
		//通知イベント
		var instance = new EventEmitter();
		
		var datastore=Game.util.clone(param);
		
		var d=new constructor(this,instance,datastore,this.view);
		
		//d.event = instance;
		Object.defineProperty(d,"event",{
			value:instance,
		});
		//コンストラクタを保存
		Object.defineProperty(d,"_constructor",{
			value:constructor,
		});
		//パラメータを保存
		Object.defineProperty(d,"_param",{
			value:Game.util.clone(param),
		});
		
		this.initObject(d);

		this.objects.push(d);
		this.transport.add(d);
		return d;
	},
	initObject:function(d){
		d._id=this.uniqueId();
		d.event.on("die",function(){
			d._flg_dying=true;	//dying flag
		}.bind(this));
	},
	
	//for internal loop
	filter:function(func){
		return this.objects.filter(function(x){return x instanceof func});
	},
	//一つ
	random:function(func){
		var arr=this.filter(func);
		if(arr.length==0)return null;
		return arr[Math.floor(Math.random()*arr.length)];
	},
	//数える
	count:function(func){
		return this.filter(func).length;
	},
	//全部削除（からっぽ）
	clean:function(){
		//this.objects.length=0;
		for(var i=0,l=this.objects.length;i<l;i++){
			this.objects[i]._flg_dying=true;
		}
	},
	//そのオブジェクトがまだ存在しているかどうか
	alive:function(obj){
		return this.objects.indexOf(obj)>=0;
	},
	
	//関数登録
	delay:function(time,func){
		this.delays.push({
			remains:time,
			func:func,
		});
	},
	delaywhile:function(time,cond,func){
		//cond()がfalseを返した場合delayを中断する
		this.delays.push({
			remains:time,
			cond:cond,
			func:func,
		});
	},
	//ストッパーつき関数登録
	delaystopper:function(time,func){
		this.delay(time,func);
		return function(){
			var d=this.delays;
			for(var i=0,l=d.length;i<l;i++){
				if(d[i].func===func){
					d.splice(i,1);
					break;
				}
			}
		};
	},
	//event
	//------------------
	defaultConfig:{
		fps:30,
		adjust:5,
		stopWithNoUser:true,
	}
};

Game.View=function(game){
	this.game=game;
	this.server=false;	//サーバーサイドかどうか
};
Game.View.prototype={
	init:function(param){
		var ev=this.event=new EventEmitter();
		ev.on("loop",this.mainloop.bind(this));
	},
	mainloop:function(objects){
		//main loop
		/*for(var i=0,l=instances.length;i<l;i++){
			instances[i].emit("draw");
		}*/
	},
};

Game.ClientView=function(){
	Game.View.apply(this,arguments);
};
Game.ClientView.prototype=Game.util.merge(new Game.View,{
	mainloop:function(objects){
		//override main loop
		this.render(objects);
	},
	render:function(objects){
	},
});
Game.ClientCanvasView=function(){
	Game.ClientView.apply(this,arguments);
};
Game.ClientCanvasView.prototype=Game.util.merge(new Game.ClientView,{
	init:function(param){
		Game.ClientView.prototype.init.apply(this,arguments);
		
		var c=this.canvas=document.createElement("canvas");
		c.width=param.width, c.height=param.height;
		
		var wrapper=document.createElement("div");
		wrapper.appendChild(c);
		document.body.appendChild(wrapper);
	},
	render:function(objects){
		var c=this.canvas, ctx=c.getContext('2d');
		ctx.clearRect(0,0,c.width,c.height);
		for(var i=0,l=objects.length;i<l;i++){
			objects[i].event.emit("render",c,ctx);
		}
	},
});
Game.ClientDOMView=function(){
	Game.ClientView.apply(this,arguments);
	//body直下に描画するべきもの
	this.toprender=null;
};
Game.ClientDOMView.prototype=Game.util.extend(Game.ClientView,{
	init:function(param){
		Game.ClientView.prototype.init.apply(this,arguments);
		this.nodeMap={};	//_idをキーにしたい
		/*(_id):{
		  node:(Node)
		  dependency:[obj,obj,...]
		}*/
		this.stack=[];	//現在のオブジェクト
		this.stacktop=null;
	},
	//トップレンダリング
	getTop:function(){
		if(!this.toprender || !game.alive(this.toprender)){
			//新しいのを探す
			var arr=game.objects.filter(function(x){return x.renderTop});
			if(arr.length===0){
				throw new Error("no object whose renderTop ===true");
			}
			this.toprender=arr[0];
		}
		return this.toprender;
	},
	//走査して書き直す
	rerender:function(){
		this.render(this.getTop());
		//hard
		while(document.body.hasChildNodes()){
			document.body.removeChild(document.body.firstChild);
		}
		var m=this.getMap(this.toprender);
		document.body.appendChild(m.node);
	},

	//スタック関連
	_addStack:function(obj){
		this.stack.push(obj);
		this.stacktop=obj;
	},
	_popStack:function(){
		var o=this.stack.pop();
		this.stacktop=this.stack[this.stack.length-1];
		return o;
	},
	getMap:function(obj){
		var m=this.nodeMap[obj._id];
		if(!m){
			m=this.nodeMap[obj._id]={
				node:null,
				dependency:[],
			};
		}
		return m;
	},

	//そのオブジェクト
	render:function(obj){
		if(this.stacktop){
			//そのオブジェクトに依存する
			var m=this.getMap(this.stacktop);
			//そのオブジェクトに依存している
			m.dependency.push(obj);
		}
		this._addStack(obj);
		//レンダリングしてもらう
		var mm=this.getMap(obj);
		mm.dependency=[];	//依存関係初期化
		obj.render(this);
		//レンダリング終了
		this._popStack();
	},
	//トップのノードを作る
	newItem:function(){
		var t=this.stacktop;
		if(!t)throw new Error("empty stack");
		var result=t.renderInit();
		var m=this.getMap(t);
		m.node=result;
		m.dependency=[];
		return result;
	},
	//トップのノードを得る
	getItem:function(){
		var t=this.stacktop;
		if(!t)throw new Error("empty stack");
		var m=this.getMap(t);
		var result;
		if(!m.node){
			result=this.newItem();
		}else{
			result=m.node;
		}
		return result;
	},
});

//User input
Game.User=function(){
	this.event=new EventEmitter();
	this.internal=true;	//内部フラグ
	this.alive=true;	//まだ生存しているかどうか
};
Game.User.prototype={
	init:function(){},
};
Game.DummyUser=function(){
	this.event=new EventEmitter();
};
Game.ClientUser=function(){
	Game.User.apply(this,arguments);
};
Game.ClientUser.prototype=Game.util.extend(Game.User,{
	init:function(){},
});
Game.KeyboardUser=function(){
	Game.ClientUser.apply(this,arguments);
};
Game.KeyboardUser.prototype=Game.util.extend(Game.ClientUser,{
	init:function(){
		//var ev=this.event=new EventEmitter();
		var ev=this.event;
		
		this.waitingkey=[];
		if(this.internal){
			//キーイベント定義
			document.addEventListener('keydown',function(e){
				if(this.waitingkey.indexOf(e.keyCode)>=0){
					ev.emit('keydown',{
						keyCode:e.keyCode,
					});
					e.preventDefault();
				}
			}.bind(this),false);
			document.addEventListener('keyup',function(e){
				if(this.waitingkey.indexOf(e.keyCode)>=0){
					ev.emit('keyup',{
						keyCode:e.keyCode,
					});
				}
			}.bind(this),false);
		}
	},
	keyWait:function(arr){
		this.waitingkey=arr;
	},
});

//各種通信 基底クラス的なものを定義
Game.Transporter=function(game,gaminginfo){
}
Game.Transporter.prototype={
	add:function(obj){},
	die:function(obj){},
	event:function(obj,name,args){},
	gameevent:function(name,args){},
	userevent:function(user,name,args){},
	loop:function(){},
};
Game.prototype.transporter=Game.Transporter;

Game.Manager=function(game){
	this.game=game;
};
Game.Manager.prototype={
	start:function(){},
	newUser:function(user){},
	bye:function(user){},
};
//ループ用
Game.LoopManager=function(game){
	Game.Manager.apply(this,arguments);
	this.usercount=0;
	this.stop_flg=true;
	this.ticktime=null;
};
Game.LoopManager.prototype={
	start:function(){
		var game=this.game, self=this;
		var ev=game.event;
		this.usercount=game._users.length;
		//ev.on("loop",this.mainloop.bind(this));
		ev.emit("loopstart");
		
		this.stop_flg=true;
		this.loopstart();
		//this.loopController.start();
		
	},
	newUser:function(user){
		this.usercount++;
		this.loopstart();
	},
	loopstart:function(){
		if(!this.stop_flg || this.usercount===0)return;
		console.log("starting...");
		this.stop_flg=false;
		this.ticktime=Date.now();
		var t=this,game=this.game;
		var fps=game.config.fps;
		var ev=game.event;
		
		//時間カウント
		var frametime=1000/fps;
		var ticktime=Date.now();

		//main loop
		loop();
		function loop(){
			//ev.emit("loop");
			game.mainloop();
			var now=Date.now();
			var waitingtime=frametime-(now-ticktime);
			ticktime=ticktime+frametime;
			//console.log(waitingtime);
			if(!t.stop_flg){
				setTimeout(loop,waitingtime);	//loop
			}
		}
	},
	loopstop:function(){
		this.stop_flg=true;
		console.log("stopping...");
	},
	bye:function(user){
		this.usercount--;
		if(this.usercount===0)this.loopstop();
	},

}
function IDGenerator(){
	this.count=0;
}
IDGenerator.prototype.generate=function(){
	return this.count++;
};

if(typeof exports=="object" && exports){
	//exportできる
	exports.Game=Game;
	exports.gaminginfo=gaminginfo;
}
