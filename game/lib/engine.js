if(typeof require=="function" && typeof EventEmitter=="undefined"){
	EventEmitter=require('events').EventEmitter;
}

//外部へ情報を送れるやつ
var gaminginfo=new EventEmitter;

function Game(){
	this.config=Game.util.clone(this.defaultConfig);
	
	this.event=new EventEmitter();

	this.objects=[];	//brain objects
	
	this.delays=[];	//{remains:frame, func:()}
	
	this.store={};	//データストア（Server用）
	//ユーザー
	this.defaultUser=Game.User;
	//できた
	this.gaminginfo=gaminginfo;
	gaminginfo.emit("new",this);

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
	init:function(view,viewparam){
		//hard
		this.view = new view();
		this.view.init(viewparam);
	},
	start:function(){
		//hard
		//var user=new Game.User();
<<<<<<< HEAD
		var user=new (this.defaultUser)();
		user.init();
		this.event.emit("entry",user);
	},
=======
		var user=this.newUser();
		this.event.emit("entry",user);
	},
	newUser:function(){
		var user=new (this.defaultUser)();
		user.init();
		return user;
	},
>>>>>>> 13ddb72b024f09f1f0c99ccfd6a66710f3cba031
	useUser:function(userobj){
		this.defaultUser=userobj;
	},
	//start loop
	loop:function(){
		
		var wait=1000/this.config.fps;
		var self=this;
		var ev=this.event;
		
		ev.on("loop",this.mainloop.bind(this));
		
		loop();
		
		//main loop
		function loop(){
			ev.emit("loop");
			setTimeout(loop,wait);	//loop
		}
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
				arr.splice(i,1);
				i--,l--;
			}
		}
		//delayの処理
		arr=this.delays;
		for(i=0,l=arr.length;i<l;i++){
			if(--arr[i].remains <= 0){
				arr[i].func();
				arr.splice(i,1);
				i--,l--;
			}
		}
	},
	
	//objects return:internal object
	add:function(constructor,param){
		if(typeof constructor!=="function"){
			throw new Error;
		}
		
		//通知イベント
		var instance = new EventEmitter();
		
		var datastore=Game.util.clone(param);
		
		var d=new constructor(this,instance,datastore);
		
		//d.event = instance;
		Object.defineProperty(d,"event",{
			value:instance,
		});
		//コンストラクタを保存
		Object.defineProperty(d,"_constructor",{
			value:constructor,
		});
		
		this.initObject(d);

		this.objects.push(d);
		return d;
	},
	initObject:function(d){
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
	//event
	
	
	
	//------------------
	defaultConfig:{
		fps:30,
	}
};

Game.View=function(){
	
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
	Game.View.apply(this);
};
Game.ClientView.prototype=Game.util.merge(new Game.View,{
	mainloop:function(objects){
		//override main loop
		this.draw(objects);
	},
	draw:function(objects){
	},
});
Game.ClientCanvasView=function(){
	Game.ClientView.apply(this);
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
	draw:function(objects){
		var c=this.canvas, ctx=c.getContext('2d');
		ctx.clearRect(0,0,c.width,c.height);
		for(var i=0,l=objects.length;i<l;i++){
			objects[i].event.emit("render",c,ctx);
		}
	},
});

//User input
Game.User=function(){
	this.event=new EventEmitter();
};
Game.User.prototype={
	init:function(){},
};
Game.ClientUser=function(){
<<<<<<< HEAD
};
Game.ClientUser.prototype={
	init:function(){},
};
Game.KeyboardUser=function(){
	Game.User.apply(this,arguments);
};
Game.KeyboardUser.prototype=Game.extend(Game.User,{
=======
	Game.User.apply(this,arguments);
};
Game.ClientUser.prototype=Game.util.extend(Game.User,{
	init:function(){},
});
Game.KeyboardUser=function(){
	Game.ClientUser.apply(this,arguments);
};
Game.KeyboardUser.prototype=Game.util.extend(Game.ClientUser,{
>>>>>>> 13ddb72b024f09f1f0c99ccfd6a66710f3cba031
	init:function(){
		//var ev=this.event=new EventEmitter();
		var ev=this.event;
		
		this.waitingkey=[];
		//キーイベント定義
		document.addEventListener('keydown',function(e){
			if(this.waitingkey.indexOf(e.keyCode)>=0){
				ev.emit('keydown',e);
				e.preventDefault();
			}
		}.bind(this),false);
		document.addEventListener('keyup',function(e){
			if(this.waitingkey.indexOf(e.keyCode)>=0){
				ev.emit('keyup',e);
			}
		}.bind(this),false);
	},
	keyWait:function(arr){
		this.waitingkey=arr;
	},
});

if(typeof exports=="object" && exports){
	//exportできる
	exports.Game=Game;
	exports.gaminginfo=gaminginfo;
}
