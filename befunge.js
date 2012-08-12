var game=new Game();
//フィールドを定義
function Field(game,event,param){
	this.source=[">v","^<"];	//ソースコード（y座標を配列で表現）
	
	this.cursors=[];	//登録されている
}
Field.prototype={
	init:function(game,event){
		var t=this;
		//カーソルが追加された
		event.on("addCursor",function(cursor){
			t.cursors.push(cursor);
		});
		//position:Vector ch:String
		event.on("input",function(position,ch){
			console.log("inp",position,ch);
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
		var pre=view.getItem();
		var spans=pre.getElementsByClassName("line");
		for(var y=0;y<this.height;y++){
			spans[y].textContent=this.source[y] || " ";
		}
		//カーソルを描画する
		for(var i=0,l=this.cursors.length;i<l;i++){
			var cursor=this.cursors[i], pos=cursor.position;
			var color=cursor.getColor();
			view.depend(cursor);
			var span=spans[pos.y];
			//前を切る
			var text=span.firstChild;
			//穴を埋める
			var t=text.nodeValue;
			var len=t.length;
			while(len<=pos.x){
				t+=" ";
				len++;
			}
			text.nodeValue=t;

			var node2=text.splitText(pos.x);
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
			stack:game.add(Stack),
		});
		return cursor;
	},
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
		//input.style.display="none";
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
				}
				else{
					//何もない
					return;
				}
				e.preventDefault();
			},false);
			//文字入力
			input.addEventListener('input',function(e){
				var v=input.value;
				console.log(v);
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
				input.focus();
			},false);
		}
		return input;
	},
	render:function(view){
		var input=view.getItem();
		if(this.user.internal){
			input.focus();
		}
	},
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
	},
	moveForward:function(){
		var p=this.position;
		p.event.emit("add",this.velocity);
		var adjust={}, adjust_flg=false;
		if(p.x<0){
			adjust.x=0, adjust_flg=true;
		}else if(p.x>=this.field.width){
			adjust.x=this.field.width-1, adjust_flg=true;
		}
		if(p.y<0){
			adjust.y=0, adjust_flg=true;
		}else if(p.y>=this.field.height){
			adjust.y=this.field.height-1, adjust_flg=true;
		}
		//修正入る
		if(adjust_flg){
			p.event.emit("add",adjust);
		}
	},
};
//プレイヤーの実行環境
function IP(game,event,param){
	Cursor.apply(this,arguments);
	var t=this;
	this.stack=param.stack || null;	//Stack
}
IP.prototype=Game.util.extend(Cursor,{
});
function Stack(game,event,param){
	this.stack=[];
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
