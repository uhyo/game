var EventEmitter=require('events').EventEmitter;
Game.prototype.internal_init=function(){
	this.event._old_emit=this.event.emit;
	var game=this;
	this.event.emit=function(name){
		var args=Array.prototype.slice.call(arguments,1);
		this._old_emit.apply(this,[name].concat(args));
		if(name==="loop")return;
		game.transport.gameevent(name,args);
	};
	//ループ
	this.event.on("loopstart",function(){
		//トランスポーターを変える
		game.transporter=ServerLoopTransporter;
		game.transport=game.getTransporter();
	});
};
Game.prototype.init=function(view,viewparam){
	//It's dummy!
	this.view=new ServerView(this,view);
	/*this.view=new view(this,viewparam);
	this.view.server=true;*/
	this.view.init(viewparam);
};
Game.prototype.start=function(){
	//何もしない
};
Game.prototype._old_newUser=Game.prototype.newUser;
Game.prototype.newUser=function(option,event){
	//新しいユーザー（サーバー用）
	//var user=this._old_newUser();
	var game=this;
	var user=new (this.defaultUser)();
	//ここでサーバー用に（中身なし）
	user.internal=false;
	ServerUser.prototype.init.call(user,option);
	user.event=event;
	event._old_emit=event.emit;
	event.emit=function(name){
		var args=Array.prototype.slice.call(arguments,1);
		this._old_emit.apply(this,[name].concat(args));
		//全員へ
		game.transport.userevent(user,name,args);
	};
	return user;
};
//オブジェクトを追加
/*Game.prototype._old_add=Game.prototype.add;
Game.prototype.add=function(constructor,param){
	var obj=this._old_add.apply(this,arguments);
	return obj;
};*/
Game.prototype._old_initObject=Game.prototype.initObject;
Game.prototype.initObject=function(d){
	//ユニークIDをあげる
	this._old_initObject(d);
	var ev=d.event;
	var game=this;
	ev._old_emit=ev.emit;
	ev.emit=function(name){
		var args=Array.prototype.slice.call(arguments,1);
		this._old_emit.apply(this,[name].concat(args));
		if(name!="internal" && name!="loop" && name!="die"){
			game.transport.event(d,name,args);
		}
	};

};
//ソケットで発信
Game.prototype.broadcast=function(name,obj){
	//name: メッセージ名 obj:内容
	this.gaminginfo.emit("broadcast",name,obj);
};
//JSONでコンストラクタ情報などを送るsystem
/*
	$type:"obj"/"user"
	properties:{
	}
*/
Game.prototype.jsonFilter=function(obj){
	//console.log(obj);
	if(typeof obj !=="object")return obj;
	if(!obj)return obj;
	var result={};
	var t=this;
	if(Array.isArray(obj)){
		return obj.map(function(x){return t.jsonFilter(x)});
	}else if(obj instanceof Game.User){
		return {
			$type:"user",
			properties:this.propertiesJSON(obj),
			_id:obj._id,
		};
	}else if(obj instanceof EventEmitter){
		return {
			$type:"EventEmitter",
		};
	}else if(!obj._constructor){
		//普通のオブジェクトだ
		return this.propertiesJSON(obj);
	}else{
		// 特殊オブジェクトだ
		return {
			$type:"obj",
			constructorName:obj._constructor.name,
			properties:this.propertiesJSON(obj),
			_param:this.propertiesJSON(obj._param || {}),
			_id:obj._id,
		};
	}
	for(var key in obj){
		var value=obj[key];
		if(typeof value !=="object"){
			result[key]=value;
		}else if(value){
		}
	}
	return result;
};
Game.prototype.propertiesJSON=function(obj){
	var keys=Object.keys(obj);
	var result={};
	for(var i=0,l=keys.length;i<l;i++){
		var k=keys[i];
		result[k]=this.jsonFilter(obj[k]);
	}
	return result;
};
//現在の状況を作る（JSON化される前提で）
Game.prototype.wholeEnvironment=function(){
	/*var result=[];
	for(var i=0,os=this.objects,l=os.length;i<l;i++){
		var obj=os[i];
		result.push({
			constructorName:obj._constructor.name,
			properties:this.propertiesJSON(obj),
		});
	}
	//できた
	console.log(result);
	return result;*/
   return this.jsonFilter(this.objects.filter(function(x){
	   return !x.private;
   }));
};

function ServerView(game,view){
	Game.View.apply(this);
	//viewの中身をからっぽにする
	var dummy=new view(game);
	for(var key in dummy){
		if(typeof dummy[key]==="function"){
			this[key]=function(){};
		}
	}
}
ServerView.prototype=Game.util.extend(Game.View,{
});
function ServerUser(){
	Game.User.apply(this);
}
ServerUser.prototype=Game.util.extend(Game.User,{
});

function ServerTransporter(game,gaminginfo){
	this.game=game;
	this.gaminginfo=gaminginfo;
}
ServerTransporter.prototype={
	broadcast:function(name,obj){
		this.gaminginfo.emit("broadcast",name,obj);
	},
	touser:function(user,name,obj){
		if(!user._socket)return;
		this.gaminginfo.emit("private",user._socket,name,obj);
	},
	add:function(obj){
		var o={
			constructorName:obj._constructor.name,
			_id:obj._id,
			param:this.game.jsonFilter(obj._param),
		};
		if(obj.private){
			//ユーザープライベートなオブジェクトである
			this.touser(obj.private,"add",o);
		}else{
			this.broadcast("add",o);
		}
	},
	die:function(obj){
		//console.log("die!",obj._id,obj._constructor.name);
		this.broadcast("die",obj._id);
	},
	event:function(obj,name,args){
		this.broadcast("event",{
			_id:obj._id,
			name:name,
			args:this.game.jsonFilter(args),
		});
	},
	gameevent:function(name,args){
		this.broadcast("gameevnt",{
			name:name,
			args:args,
		});
	},
	userevent:function(user,name,args){
		this.broadcast("userevent",{
			_id:user._id,
			name:name,
			args:args,
		});
	},
	loop:function(){},
};
function ServerLoopTransporter(){
	ServerTransporter.apply(this,arguments);
	//LoopTransporterではイベントをまとめる
	this.store=[];
	this.count=this.wait=this.game.config.fps*this.game.config.adjust;	//5秒に1回かな・・・
}
ServerLoopTransporter.prototype=Game.util.extend(ServerTransporter,{
	broadcast:function(name,obj){
		this.store.push({
			name:name,
			obj:obj,
		});
	},
	loop:function(){
		//放出
		var l;
		if((l=this.store.length)>1){
			this.gaminginfo.emit("broadcast","events",this.store);
		}else if(l){
			this.gaminginfo.emit("broadcast",this.store[0].name,this.store[0].obj);
		}
		this.store.length=0;
		if(--this.count===0){
			//調整してあげる
			this.gaminginfo.emit("volatile","env",this.game.wholeEnvironment());
			this.count=this.wait;
		}
	},
});
Game.prototype.transporter=ServerTransporter;
