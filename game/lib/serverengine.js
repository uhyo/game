var EventEmitter=require('events').EventEmitter;
var g_idGenerator;
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
	return user;
};
//オブジェクトを追加
Game.prototype._old_add=Game.prototype.add;
Game.prototype.add=function(constructor,param){
	var obj=this._old_add.apply(this,arguments);
	//console.log(constructor.name);
	obj._id=this.uniqueId();
	this.broadcast("add",{constructorName:constructor.name,_id:obj._id,param:this.jsonFilter(param)});
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
//新しいIDを作る
Game.prototype.uniqueId=function(){
	return g_idGenerator.generate();
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

function IDGenerator(){
	this.count=0;
}
IDGenerator.prototype.generate=function(){
	return this.count++;
};
g_idGenerator=new IDGenerator();
