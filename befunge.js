var game=new Game();
//フィールドを定義
function Field(game,event,param){
	var t=this;
	this.source=[">v","^<"];	//ソースコード（y座標を配列で表現）
	
	this.ips=[];	//登録されているIP
	//実行環境が追加された
	event.on("addIP",function(ip){
		t.ips.push(ip);
	});
}
Field.prototype={
	renderTop:true,
	renderInit:function(view){
		var pre=document.createElement("pre");
		pre.classList.add("field");
		for(var y=0;y<this.height;y++){
			var span=document.createElement("span");
			span.classList.add("line");
			pre.appendChild(span);
			pre.appendChild(document.createTextNode("\n"));
		}
		return pre;
	},
	render:function(view){
		var pre=view.getItem();
		var spans=pre.getElementsByClassName("line");
		for(var y=0;y<this.height;y++){
			if(this.source[y]){
				spans[y].textContent=this.source[y];
			}
		}
		//カーソルを描画する
		for(var i=0,l=this.ips.length;i<l;i++){
			var ip=this.ips[i], pos=ip.position;
			var color=ip.getColor();
			view.depend(ip);
			var span=spans[pos.y];
			//前を切る
			var node2=span.firstChild.splitText(pos.x);
			//カーソルがある部分を分離する
			var node3=node2.splitText(1);
			var cursor=document.createElement("span");
			cursor.style.backgroundColor=color.back;
			cursor.textContent=node3.previousSibling.textContent;
			span.replaceChild(cursor,node3.previousSibling);
		}
	},

	width: 80,
	height:25,
	//---内部用
	//新しいIPを作る
	setupIP:function(user){
		var l=this.ips.length;
		if(l>=game.playersNumber)return null;
		var pos,v;
		switch(l){
			case 0:
				//最初は左上
				pos=game.add(Vector,{x:0,y:0});
				//向きは右へ
				v=game.add(Vector,{x:1,y:0});
				break;
			case 1:
				//2番目は逆
				pos=game.add(Vector,{x:this.width-1,y:this.height-1});
				v=game.add(Vector,{x:-1,y:0});
				break;
		}
		var ip=game.add(IP,{
			number:l,
			field:this,
			user:user,
			position:pos,
			velocity:v,
			stack:game.add(Stack),
		});
		return ip;
	},
}
//ベクトル
function Vector(game,event,param){
	var t=this;
	this.x=param.x || 0;
	this.y=param.y || 0;
}
//プレイヤーの実行環境
function IP(game,event,param){
	var t=this;
	this.number=param.number || 0;	//何Pか
	this.field=param.field || null;	//parent Field
	this.user=param.user || null;
	this.position=param.position || null;	//Vector
	this.velocity=param.velocity || null;	//Vector
	this.stack=param.stack || null;	//Stack
}
IP.prototype={
	//描画はFieldに任せるかな
	render:function(){},
	renderInit:function(){},
	//描画用の色
	colors:[
		//1P色（赤）
		{
			back:"#ffcccc",	//背景
			color:"#ff0000",//文字
		},
			//2P色（青）
		{
			back:"#ccccff",
			color:"#0000ff",
		},
	],
	getColor:function(){return this.colors[this.number]},
};
function Stack(game,event,param){
	this.stack=[];
}

//ゲーム初期化
var field=null;
game.init(Game.ClientDOMView);
game.config.fps=10;
game.playersNumber=2;
game.useUser(Game.DOMUser);
game.internal(function(){
	field=game.add(Field);
});

game.event.on("entry",function(user){
	game.session(user);
	var ip=field.setupIP(user);
	if(!ip)return;
	field.event.emit("addIP",ip);
});

game.start();

