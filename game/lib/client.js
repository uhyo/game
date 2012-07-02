var socket=io.connect();
socket.on("connect",function(){

});
//Game p
gaminginfo.on("new",function(game){
	socket.on("init",function(obj){
		var env=obj.env;
		game.user._id=obj.user_id;
		game.objectsmap[obj.user_id]=game.user;
		//現在の状況すべて
		//console.log(JSON.stringify(env));
		game.objects.length=0;
		for(var i=0,l=env.length;i<l;i++){
			//ひとつずつ追加
			executeJSON(game,env[i]);
		}

		//全部
		socket.on("events",function(arr){
			for(var i=0,l=arr.length;i<l;i++){
				socket.$emit(arr[i].name,arr[i].obj);
			}
		});
		//メッセージを受け取りはじめる
		socket.on("add",function(obj){
			//新しいオブジェクトが追加された
			//クライアント側に追加する
			//console.log(window[obj.constructorName]);
			var o=game._old_add(window[obj.constructorName],executeJSON(game,obj.param));
			o._id=obj._id;
			//入れる
			game.objectsmap[o._id]=o;
		});
		socket.on("die",function(_id){
			//オブジェクトを削除する
			//console.log("dyyyyy!",_id,game.objectsmap[_id]);
			if(!game.objectsmap[_id])return;
			game.objectsmap[_id]._flg_dying=true;
			delete game.objectsmap[_id];
		});
		socket.on("event",function(obj){
			//イベントがきた
			var o=game.objectsmap[obj._id];
			if(!o)return;
			o.event.emit.apply(o.event,[obj.name].concat(obj.args));
		});
		socket.on("gameevent",function(obj){
			//イベントがきた
			game.event._old_emit.apply(game.event,[obj.name].concat(obj.args));
		});
		socket.on("userevent",function(obj){
			var u=game.objectsmap[obj._id];
			if(!u)return;
			u.event.emit.apply(u.event,[obj.name].concat(obj.args));
		});

	});

});
//Game override for client
Game.prototype.internal_init=function(){
	//オブジェクトたち(_idをキーにしたやつ）
	this.objectsmap={};
	//無効
	this.event._old_emit=this.event.emit;
	this.event.emit=function(){};
};
Game.prototype.start=function(){
	//サーバーへユーザーを送る
	this.user=this.newUser();
	this.user.init();
	socket.emit("entry");
	
};
Game.prototype._old_add=Game.prototype.add;
//クライアント側からは追加できない
Game.prototype.add=function(){};
//ユーザーに細工する
Game.prototype.newUser=function(){
	var user=new (this.defaultUser)();
	var old_emit=user.event.emit;
	user.event.emit=function(name){
		var args=Array.prototype.slice.call(arguments,1);
		socket.emit("userevent",{
			name:name,
			args:args,
		});
		//old_emit.apply(user.event,arguments);
	};
	return user;
};
Game.prototype.initObject=function(d){
	//イベントを制限 die無効
	d.event.removeAllListeners("internal");
};

//向こうの特殊形式を戻す
function executeJSON(game,obj){
	if(typeof obj!=="object" || !obj)return obj;
	if(obj.$type=="user"){
		//ユーザーオブジェクト
		//var user=game.newUser();
		var user;
		//console.log("user!",obj._id,game.user._id);
		if(obj._id==game.user._id){
			//自分だ
			user=game.user;
		}else{
			user=game.newUser();
			user.internal=false;
			user._id=obj._id;
			user.init();
			game.objectsmap[obj._id]=user;
		}
		setProperties(user,executeJSON(game,obj.properties));
		return user;
	}else if(obj.$type=="EventEmitter"){
		return new EventEmitter;
	}else if(obj.$type=="obj"){
		//何か
		var constructor=window[obj.constructorName];
		if(!constructor)throw new Error(obj.constructorName);
		//既存のオブジェクトかどうかチェック
		for(var i=0,l=game.objects.length;i<l;i++){
			//既にある
			if(game.objects[i]._id==obj._id){
				return game.objects[i];
			}
		}
		var o=game._old_add(constructor,executeJSON(game,obj._param));
		//現在のパラメータ反映
		setProperties(o,obj.properties);
		//入れる
		game.objectsmap[o._id]=o;
		return o;
	}else if(Array.isArray(obj)){
		return obj.map(function(x){return executeJSON(game,x)});
	}else{
		//ただのオブジェクト
		var ret={};
		for(var key in obj){
			ret[key]=executeJSON(game,obj[key]);
		}
		return ret;
	}

	function setProperties(obj,map){
		if(!obj)return; 
		for(var key in map){
			var value=map[key];
			obj[key]=executeJSON(game,value);
		}
	}
}

