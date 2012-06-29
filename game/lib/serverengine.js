var EventEmitter=require('events').EventEmitter;
Game.prototype.init=function(view,viewparam){
	//It's dummy!
	this.view=new ServerView();
	this.view.init(viewparam);
};
Game.prototype.start=function(){
	//何もしない
};
Game.prototype._old_newUser=Game.prototype.newUser;
Game.prototype.newUser=function(event){
	//新しいユーザー（サーバー用）
	//var user=this._old_newUser();
	var user=new (this.defaultUser)();
	//ここでサーバー用に（中身なし）
	ServerUser.prototype.init.apply(user);
	user.event=event;
	//ユーザーに対してIDを付加
	Object.defineProperty(user,"_id",{
		value:this.uniqueId()
	});
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
	d._id=this.uniqueId();
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
	if(typeof obj !=="object")return obj;
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
   return this.jsonFilter(this.objects);
};

function ServerView(){
	Game.View.apply(this);
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
	add:function(obj){
		this.broadcast("add",{constructorName:obj._constructor.name,_id:obj._id,param:this.game.jsonFilter(obj._param)});
	},
	die:function(obj){
		//console.log("die!",obj._id,obj._constructor.name);
		this.broadcast("die",obj._id);
	},
};
Game.prototype.transporter=ServerTransporter;
