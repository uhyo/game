var socket=io.connect();
socket.on("connect",function(){

});
//Game p
gaminginfo.on("new",function(game){
	socket.on("init",function(obj){
		var env=obj.env;
		game.user._id=obj.user_id;
		//現在の状況すべて
		console.log("init!");
		//console.log(JSON.stringify(env));
		game.objects.length=0;
		for(var i=0,l=env.length;i<l;i++){
			//ひとつずつ追加
			executeJSON(game,env[i]);
		}

		//メッセージを受け取りはじめる
		socket.on("add",function(obj){
			//新しいオブジェクトが追加された
			//クライアント側に追加する
			//console.log(window[obj.constructorName]);
			var o=game._old_add(window[obj.constructorName],executeJSON(game,obj.param));
			o._id=obj._id;
		});
		socket.on("die",function(obj){
			//オブジェクトを削除する
			console.log("diehi");
			game.objectsmap[obj._id]._flg_dying=true;
			delete game.objectsmap[obj._id];
		});

	});

});
//Game override for client
Game.prototype.internal_init=function(){
	//オブジェクトたち(_idをキーにしたやつ）
	this.objectsmap={};
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
		old_emit.apply(user.event,arguments);
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
		console.log("user!",obj._id,game.user._id);
		if(obj._id==game.user._id){
			//自分だ
			user=game.user;
		}else{
			new Game.DummyUser();
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

