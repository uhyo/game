var socket=io.connect();
socket.on("connect",function(){

});
//Game p
gaminginfo.on("new",function(game){
	socket.on("add",function(obj){
		//新しいオブジェクトが追加された
		//クライアント側に追加する
		//console.log(window[obj.constructorName]);
		var o=game._old_add(window[obj.constructorName],executeJSON(game,obj.param));
		o._id=obj._id;
	});
	socket.on("init",function(env){
		//現在の状況すべて
		game.objects.length=0;
		//console.log(env);
		for(var i=0,l=env.length;i<l;i++){
			//ひとつずつ追加
			executeJSON(game,env[i]);
		}


	});

});
//Game override for client
Game.prototype.start=function(){
	//サーバーへユーザーを送る
	socket.emit("entry",{});
	
};
Game.prototype._old_add=Game.prototype.add;
//クライアント側からは追加できない
Game.prototype.add=function(){};

//向こうの特殊形式を戻す
function executeJSON(game,obj){
	if(typeof obj!=="object" || !obj)return obj;
	if(obj.$type=="user"){
		//ユーザーオブジェクト
		var user=game.newUser();
		setProperties(user,executeJSON(game,obj.properties));
		return user;
	}else if(obj.$type=="EventEmitter"){
		return new EventEmitter;
	}else if(obj.$type=="obj"){
		//何か
		var constructor=window[obj.constructorName];
		if(!constructor)throw new Error(obj.constructorName);
		//console.log("$obj!",JSON.stringify(obj));
		var o=game._old_add(constructor,executeJSON(game,obj.properties));
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
		for(var key in map){
			var value=map[key];
			obj[key]=value;
		}
	}
}
