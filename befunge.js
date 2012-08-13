var game=new Game();
//フィールドを定義
function Field(game,event,param){
	this.source=[">v","^<"];	//ソースコード（y座標を配列で表現）
	
	this.cursors=[];	//登録されている
	this.ips=[];	//実行中のIP
}
Field.prototype={
	init:function(game,event){
		var t=this;
		//カーソルが追加された
		event.on("addCursor",function(cursor){
			t.cursors.push(cursor);
		});
		event.on("addIP",function(ip){
			t.ips.push(ip);
		});
		//position:Vector ch:String
		event.on("input",function(position,ch){
			var text=t.source[position.y] || "";
			//文字を書き換える
			var l=text.length;
			var px=position.x;
			//埋める
			while(l<px){
				text+=" ";
				l++;
			}
			//書き換える
			text= text.slice(0,px)+ch+text.slice(px+1);
			//間が飛ぶかもしれないけど気にしない
			t.source[position.y]=text;
		});
	},
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
		var t=this;
		var pre=view.getItem();
		var spans=pre.getElementsByClassName("line");
		for(var y=0;y<this.height;y++){
			spans[y].textContent=this.source[y] || " ";
		}
		//カーソルを描画する
		for(var i=0,l=this.cursors.length;i<l;i++){
			renderCursor(this.cursors[i],false);
		}
		//IPも描画する
		for(i=0,l=this.ips.length;i<l;i++){
			renderCursor(this.ips[i],true);
		}
		//Cursorを描画できる ipflg:IPかどうか
		function renderCursor(cursor,ipflg){
			var pos=cursor.position;
			var color=t.colors[cursor.number];
			view.depend(cursor);
			var span=spans[pos.y];
			var node=span.firstChild;
			var pre_x=0;	//今までに数えた
			//背景色を決める
			var cursorBack = ipflg ? color.ipBack : color.back;
			while(true){
				while(node.firstChild){
					//テキストノードを求めて潜る
					node=node.firstChild;
				}
				//テキストノードだし
				var text=node;
				if(text.nodeValue.length<= pos.x-pre_x){
					//足りない
					pre_x+=text.nodeValue.length;
					if(node.nextSibling){
						//次がある
						node=node.nextSibling;
						continue;
					}else{
						//もう無いので戻る
						while(!node.nextSibling){
							var node=node.parentNode;
							if(node===span){
								//戻りすぎた
								node=null;
								break;
							}
							if(!node)break;
						}
						if(node==null){
							//結局なかった
							break;
						}
						node=node.nextSibling;
					}
					continue;
				}
				//ここだ
				//前を切る
				var node2=text.splitText(pos.x-pre_x);
				//カーソルがある部分を分離する
				var node3=node2.splitText(1);
				var cursor=document.createElement("span");
				//色が違う
				cursor.style.backgroundColor=cursorBack;
				cursor.textContent=node3.previousSibling.textContent;
				node3.parentNode.replaceChild(cursor,node3.previousSibling);
				break;
			}
			if(node==null){
				//無かった
				//var t=span.textContent, len=t.length;
				var newText="";
				var len=0;
				while(len<pos.x-pre_x){
					newText+=" ";
					len++;
				}
				//埋める
				span.appendChild(document.createTextNode(newText));
				//カーソルを描画
				var cursor=document.createElement("span");
				cursor.style.backgroundColor=cursorBack;
				cursor.textContent=" ";
				span.appendChild(cursor);
			}
		}
	},

	width: 80,
	height:25,
	//描画用の色
	colors:[
		//1P色（赤）
		{
			back:"#ffcccc",	//背景
			color:"#ff0000",//文字
			ipBack:"#ff9999",	//IPの背景
		},
			//2P色（青）
		{
			back:"#ccccff",
			color:"#0000ff",
			ipBack:"#9999ff",
		},
	],
	//---内部用
	//新しいCursorを作る
	setupCursor:function(user){
		var l=this.cursors.length;
		if(l>=game.playersNumber)return null;
		var pos,v;
		var posobj={
			minx:0, miny:0,
			maxx:this.width-1,
			maxy:this.height-1,
		};
		switch(l){
			case 0:
				//最初は左上
				posobj.x=0, posobj.y=0;
				pos=game.add(LimitedVector,posobj);
				//向きは右へ
				v=game.add(Vector,{x:1,y:0});
				break;
			case 1:
				//2番目は逆
				posobj.x=this.width-1, posobj.y=this.height-1;
				pos=game.add(LimitedVector,posobj);
				v=game.add(Vector,{x:-1,y:0});
				break;
		}
		var cursor=game.add(Cursor,{
			number:l,
			field:this,
			user:user,
			position:pos,
			velocity:v,
		});
		return cursor;
	},
	//カーソル起動
	runCursor:function(cursor){
		if(this.ips.some(function(x){
			return x.number===cursor.number;
		})){
			//すでにある
			return;
		}
		var pos=game.add(LimitedVector,cursor.position);
		var v=game.add(Vector,cursor.velocity);
		var ip=game.add(IP,{
			number:cursor.number,
			field:this,
			user:cursor.user,
			position:pos,
			velocity:v,
			stack:game.add(Stack),
		});
		this.event.emit("addIP",ip);
		ip.run();
		return ip;

	},
	//命令を読む
	getInstruction:function(x,y){
		if(!this.source[y])return " ";
		return this.source[y][x] || " ";
	}
}
//ベクトル
function Vector(game,event,param){
	var t=this;
	this.x=param.x || 0;
	this.y=param.y || 0;
	//ベクトルを書き換える
	event.on("set",function(obj){
		t.set(obj);
	});
	//加算する
	event.on("add",function(vector){
		t.add(vector);
	});
	//減算する
	event.on("subtract",function(vector){
		t.subtract(vector);
	});
	//掛け算する
	event.on("multiply",function(number){
		t.multiply(number);
	});
}
Vector.prototype={
	set:function(obj){
		if(obj.x!=null)this.x=obj.x;
		if(obj.y!=null)this.y=obj.y;
		this.adjust();
	},
	add:function(vector){
		this.x+=vector.x;
		this.y+=vector.y;
		this.adjust();
	},
	subtract:function(vector){
		this.x-=vector.x;
		this.y-=vector.y;
		this.adjust();
	},
	multiply:function(number){
		this.x*=number;
		this.y*=number;
		this.adjust();
	},
	adjust:function(){},
};
//範囲を決められているベクトル
function LimitedVector(game,event,param){
	Vector.apply(this,arguments);
	this.minx=param.minx;
	this.miny=param.miny;
	this.maxx=param.maxx;
	this.maxy=param.maxy;
}
LimitedVector.prototype=Game.util.extend(Vector,{
	adjust:function(){
		//範囲を逸脱しないか確認
		if(this.x<this.minx){
			this.x=this.minx;
		}else if(this.x>this.maxx){
			this.x=this.maxx;
		}
		if(this.y<this.miny){
			this.y=this.miny;
		}else if(this.y>this.maxy){
			this.y=this.maxy;
		}
	},
});
//カーソル
function Cursor(game,event,param){
	var t=this;
	this.number=param.number || 0;	//何Pか
	this.field=param.field || null;	//parent Field
	this.user=param.user || null;
	this.position=param.position || null;	//Vector
	this.velocity=param.velocity || null;	//Vector
}
Cursor.prototype={
	//init
	init:function(){
		//入力
		this.catchInput();
	},
	renderTop:true,
	renderInit:function(){
		//キー入力取得用
		var t=this;
		var input=document.createElement("input");
		input.type="text";
		input.autofocus=true;
		//どこかへ吹っ飛ばす
		input.style.position="absolute";
		input.style.left="0";
		input.style.top="-500px";
		//キーイベント
		var user=this.user, ev=user.event;
		if(user.internal){
			//! 要整理
			//キー操作
			input.addEventListener('keydown',function(e){
				var c=e.keyCode;
				if(37<=c && c<=40){
					//方向キーで移動
					var obj={};
					switch(c){
						case 37:
							obj.x=-1,obj.y=0;
							break;
						case 38:
							obj.x=0,obj.y=-1;
							break;
						case 39:
							obj.x=1,obj.y=0;
							break;
						case 40:
							obj.x=0,obj.y=1;
							break;
					}
					ev.emit("move",obj);
				}else if(c===8){
					//BS
					ev.emit("special","BackSpace");
				}else if(c===46){
					//Delete
					ev.emit("special","Delete");
				}else if(c===116){
					//F5
					ev.emit("special","Run");
				}else{
					//何もない
					return;
				}
				e.preventDefault();
			},false);
			//文字入力
			input.addEventListener('input',function(e){
				var v=input.value;
				if(v.length>0){
					//入力された
					var ch=v.charCodeAt(0);
					if(0x20<=ch && ch<=0x7e){
						ev.emit("input",v.charAt(0));
					}
					input.value="";

				}
			},false);
			input.addEventListener('blur',function(e){
				e.preventDefault();
				setTimeout(function(){
					input.focus();
					//input.setSelectionRange(0,0);	//先頭へ
				},0);
			},false);
		}
		return input;
	},
	render:function(view){
		var input=view.getItem();
		view.depend(this.position);
	},
	//ユーザー入力を受け付ける
	catchInput:function(){
		//ユーザーのキー入力で動く
		var user=this.user;
		var t=this;
		//debugger;
		user.event.on("move",function(obj){
			if(obj.x!=null && obj.y!=null){
				//x,yを指定された
				t.velocity.event.emit("set",{
					x:obj.x,y:obj.y
				});
			}
			//動く
			t.moveForward();
		});
		user.event.on("input",function(ch){
			//Field->(depend on)->Cursor なので自動書き換えに期待
			//文字を入力した
			t.field.event.emit("input",t.position,ch);
			var newvec=null;
			//文字によって移動方向変更したりして
			if(ch==="v"){
				newvec={x:0,y:1};
			}else if(ch==="<"){
				newvec={x:-1,y:0};
			}else if(ch===">"){
				newvec={x:1,y:0};
			}else if(ch==="^"){
				newvec={x:0,y:-1};
			}
			if(newvec){
				t.velocity.event.emit("set",newvec);
			}
			t.moveForward();
		});
		//その他のキー操作
		user.event.on("special",function(mode){
			switch(mode){
				case "BackSpace":
					//戻って削除
					t.moveBack();
					t.field.event.emit("input",t.position," ");
					break;
				case "Delete":
					t.field.event.emit("input",t.position," ");
					break;
				case "Run":
					t.field.runCursor(t);
					break;
			}
		});
	},
	moveForward:function(){
		var p=this.position;
		p.event.emit("add",this.velocity);
	},
	moveBack:function(){
		this.position.event.emit("subtract",this.velocity);
	},
};
//プレイヤーの実行環境
function IP(game,event,param){
	Cursor.apply(this,arguments);
	var t=this;
	this.stack=param.stack || null;	//Stack
}
IP.prototype=Game.util.extend(Cursor,{
	renderTop:false,
	catchInput:function(){
	},
	clockInterval:200,	//[ms/回] プログラムカウンタ動作
	//発進!!
	run:function(){
		var t=this;
		tick();

		function tick(){
			t.tick();
			setTimeout(tick,t.clockInterval);
		}
	},
	tick:function(){
		//実行する
		var ch=this.field.getInstruction(this.position.x,this.position.y);
		//console.log(ch);
		//Direction Changing命令
		if(ch==="?"){
			//Go Away
			var rnd=Math.floor(Math.random()*4);
			ch=["><^v"][rnd];
		}
		if(ch===">"){
			//Go East
			this.velocity.event.emit("set",{x:1,y:0});
		}else if(ch==="<"){
			//Go West
			this.velocity.event.emit("set",{x:-1,y:0});
		}else if(ch==="^"){
			//Go North
			this.velocity.event.emit("set",{x:0,y:-1});
		}else if(ch==="v"){
			//Go South
			this.velocity.event.emit("set",{x:0,y:1});
		}else if(ch==="]"){
			//Turn Right
			this.velocity.event.emit("set",{x:-this.velocity.y, y:this.velocity.x});
		}else if(ch==="["){
			//Turn Left
			this.velocity.event.emit("set",{x:this.velocity.y, y:-this.velocity.x});
		}else if(ch==="r" || ("A"<=ch && ch<="Z")){
			//Reverse
			this.velocity.event.emit("multiply",-1);
		}else if(ch==="x"){
			//Absolute Vector
		}
		//移動する
		this.position.event.emit("add",this.velocity);
	},
});
function Stack(game,event,param){
	this.stack=[];
}
Stack.prototype={
	renderInit:function(){
		var div=document.createElement("div");
		return div;
	},
	renderTop:function(view){
		var div=view.getItem();
	},
}

//ゲーム初期化
var field=null;
game.init(Game.ClientDOMView);
game.config.fps=10;
game.playersNumber=2;
game.useUser(Game.DOMUser,function(user){
});
game.internal(function(){
	field=game.add(Field);
});

//keydownのイベントオブジェクトからprintableキーを
var getChar=(function(){
	//[ normal, shift]
	var specialKeys={
		0xba:["*",":"],
		0xbb:[";","+"],
		0xbc:[",","<"],
		0xbd:["-","="],
		0xbe:[".",">"],
		0xbf:["/","?"],
		0xc0:["@","`"],
		0xdb:["[","{"],
		0xdc:["\\","|"],
		0xdd:["]","}"],
		0xde:["^","~"],
		0xe2:["\\","_"],
	};

	return getChar;
	function getChar(e){
		var ch=e.keyCode;
		console.log("char!",ch,e.shiftKey);
		if(0x41<=ch && ch<=0x5a){
			//a～z
			if(e.shiftKey){
				//A～Z
				return String.fromCharCode(ch);
			}else{
				//a～z
				return String.fromCharCode(ch+0x20);
			}
		}else if(0x30<=ch && ch<=0x39){
			//0～9
			if(e.shiftKey){
				//!～)
				if(ch===0x30)return null;	//Shift+0
				return String.fromCharCode(ch-0x10);
			}else{
				//0～9
				return String.fromCharCode(ch);
			}
		}else if(specialKeys[ch]){
			return specialKeys[ch][e.shiftKey ? 1 : 0];
		}
	}
})();
game.event.on("entry",function(user){
	game.session(user);
	var cursor=field.setupCursor(user);
	if(!cursor)return;
	field.event.emit("addCursor",cursor);
});

game.start();

