var game=new Game();
//フィールドを定義
function Field(game,event,param){
	this.source=[];	//ソースコード（y座標を配列で表現）
	
	this.cursors=[];	//登録されている
	this.ips=[];	//実行中のIP
	this.problem=null;
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
			ip.event.once("die",function(){
				//なくなったら消す
				var index=t.ips.indexOf(ip);
				if(index>=0){
					t.ips.splice(index,1);
				}
			});
		});
		//position:Vector ch:String
		event.on("input",function(position,ch){
			if(ch<" " || "~"<ch)return;
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
		//問題が決定した
		event.on("addProblem",function(problem){
			//problem: ProblemPanel
			t.problem=problem;
		});
		//初期化
		event.on("initField",function(){
			t.source=[];	//ソースコード（y座標を配列で表現）

			t.cursors=[];	//登録されている
			t.ips=[];	//実行中のIP
			t.problem=null;
		});
	},
	renderTop:true,
	renderInit:function(view){
		var div=document.createElement("div");
		var pre=document.createElement("pre");
		pre.classList.add("field");
		for(var y=0;y<this.height;y++){
			var span=document.createElement("span");
			span.classList.add("line");
			pre.appendChild(span);
			pre.appendChild(document.createTextNode("\n"));
		}
		div.appendChild(pre);
		var info=document.createElement("div");
		info.classList.add("info");
		div.appendChild(info);
		var div2=document.createElement("div");
		//問題表示用
		div2.classList.add("problemarea");
		div.appendChild(div2);
		return div;
	},
	render:function(view){
		var t=this;
		var div=view.getItem();
		var pre=div.getElementsByTagName("pre")[0];
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
		//IPの情報を描画する
		var info=div.getElementsByClassName("info")[0];
		while(info.hasChildNodes())info.removeChild(info.firstChild);
		for(i=0,l=this.ips.length;i<l;i++){
			info.appendChild(view.render(this.ips[i]));
		}
		//問題を描画する
		var pra=div.getElementsByClassName("problemarea")[0];
		if(this.problem){
			//問題表示
			pra.appendChild(view.render(this.problem));
		}else{
			while(pra.hasChildNodes())pra.removeChild(pra.firstChild);
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
			darkBack:"#dbafaf",	//暗い背景
		},
			//2P色（青）
		{
			back:"#ccccff",
			color:"#0000ff",
			ipBack:"#9999ff",
			darkBack:"#afafdb",
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
		
		var posobj, vobj;
		switch(cursor.number){
			case 0://1P
				posobj={x:0,y:0};
				vobj={x:1,y:0};
				break;
			case 1://2P
				posobj={x:this.width-1, y:this.height-1};
				vobj={x:-1,y:0};
				break;
		}
		var pos=game.add(Vector,posobj);
		var v=game.add(Vector,vobj);
		var ip=game.add(IP,{
			number:cursor.number,
			field:this,
			user:cursor.user,
			position:pos,
			velocity:v,
			stack:game.add(Stack),
			storageOffset:game.add(Vector,{x:0,y:0}),
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
	this.input=false;	//まだ入力できない
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
			//文字入力
			input.addEventListener('input',function(e){
				var v=input.value;
				if(v.length>0){
					//入力された
					var ch=v.charCodeAt(0);
					if(0x20<=ch && ch<=0x7e){
						if(t.input){
							ev.emit("input",v.charAt(0));
						}
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
		//はじまるまでは動かない
		game.event.on("editstart",function(){
			t.input=true;
		});
		//終了したら動けない
		game.event.on("success",function(){
			t.input=false;
		});
		//debugger;
		user.event.on("move",function(obj){
			if(!t.input)return;
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
			if(!t.input)return;
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
			if(!t.input)return;
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
	this.storageOffset=param.storageOffset;
	this.output="";	//出力
	this.mode="normal";
	this.success=true;	//失敗したらfalseになる
}
IP.prototype=Game.util.extend(Cursor,{
	init:function(game,event,param){
		var t=this;
		Cursor.prototype.init.apply(this,arguments);
		event.on("mode",function(mode){
			t.mode=mode;
		});
		event.on("outputDecimal",function(number){
			//数字をoutput!
			t.output+=number+" ";
		});
		event.on("outputChar",function(code){
			if(code===8){
				//BS
				t.output=t.output.slice(0,t.output.length-1);
			}else if(code===10){
				t.output+="\n";
			}else{
				t.output+=String.fromCharCode(code);
			}
		});
		//止まる
		event.once("stop",function(){
			var problem=t.field.problem.getProblem();
			if(problem.check(t)){
				//ミッションコンプリートした
				game.event.emit("success",t);
			}else{
				//ダメ　やり直し
				t.success=false;
				setTimeout(function(){
					event.emit("die");
				},3000);
			}
		});
		//スピード
		game.event.on("editstart",function(speed){
			t.clockInterval=speed;
		});
	},
	renderTop:false,
	//Fieldの配下で描画される
	renderInit:function(){
		var div=document.createElement("div");
		div.classList.add("ipInfo");
		return div;
	},
	render:function(view){
		var div=view.getItem();

		var c=this.field.colors[this.number];
		div.style.backgroundColor= this.success ? c.back : c.darkBack;

		while(div.hasChildNodes())div.removeChild(div.firstChild);
		//スタック情報とoutput情報
		var pre=document.createElement("pre");
		pre.classList.add("output");
		pre.textContent=this.output;
		div.appendChild(pre);
		div.appendChild(view.render(this.stack));
	},
	catchInput:function(){
	},
	clockInterval:200,	//[ms/回] プログラムカウンタ動作
	//発進!!
	run:function(){
		var t=this;
		var alive_flg=true;
		tick();

		//止まったら終わり
		t.event.once("stop",function(){
			alive_flg=false;
		});
		function tick(){
			t.tick();
			if(alive_flg)setTimeout(tick,t.clockInterval);
		}
	},
	tick:function(){
		//実行する
		var t=this;
		var times=1;	//回数
		do{
			var ch=this.field.getInstruction(this.position.x,this.position.y);
			var st=this.stack;
			//console.log(ch,this.stringmode);
			if(this.mode==="jumpover"){
				if(ch===";"){
					//jumpover終了
					this.event.emit("mode","normal");
				}
			}else if(this.mode==="string"){
				//stringmodeだ
				if(ch===" " && st.last()===32){
					//SGML-style
				}else if(ch==='"'){
					//Toggle Stringmode
					this.event.emit("mode","normal");
				}else{
					st.push(ch.charCodeAt(0));
				}
			}else{
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
					var vec=st.popVector();
					this.velocity.event.emit("set",vec);
				}
				//Cell Crunching
				else if("0"<=ch && ch<="9"){
					st.push(parseInt(ch,10));
					//this.stack.event.emit("push",parseInt(ch));
				}else if("a"<=ch && ch<="f"){
					st.push(parseInt(ch,16));
				}else if(ch==="+"){
					//Add
					st.push(st.pop()+st.pop());
				}else if(ch==="*"){
					//Multiply
					st.push(st.pop()*st.pop());
				}else if(ch==="-"){
					//Subtract
					st.push(-st.pop()+st.pop());
				}else if(ch==="/"){
					//Divide
					var right=st.pop(),left=st.pop();
					var result=Math.floor(left/right);
					if(isFinite(result)){
						st.push(result);
					}else{
						//zero divisionとか
						st.push(0);
					}
				}else if(ch==="%"){
					//Remainder
					var right=st.pop(), left=st.pop();
					var result=Math.floor(left%right);
					if(isFinite(result)){
						st.push(result);
					}else{
						st.push(0);
					}
				}else if(ch==='"'){
					//Toggle Stringmode
					this.event.emit("mode","string");
				}else if(ch==="'"){
					//Fetch Character
					forward();
					var c=this.field.getInstruction(this.position.x,this.position.y);
					st.push(c.charCodeAt(0));
				}//Stack Manipulation
				else if(ch==="$"){
					//Pop
					st.pop();
				}else if(ch===":"){
					//Duplicate
					var p=st.pop();
					st.push(p,p);
				}else if(ch==="\\"){
					//Swap
					var f=st.pop(), s=st.pop();
					st.push(f,s);
				}else if(ch==="n"){
					//Clear Stack
					st.event.emit("clear");
				}//Stack Stack Manipulation
				else if(ch==="{"){
					//Begin Block
					var num=st.pop();
					//SOSSからnum個のスタックをとる(空きは0で埋める）
					var values=[];
					if(num<0){
						//numが負の場合逆にSOSSに0を積む
						for(var i=0;i<-num;i++){
							st.push(0);
						}
					}else{
						for(var i=0;i<num;i++){
							values.push(st.pop());
						}
					}
					//そしてSOSSに位置ベクトルを積む
					st.pushVector(this.storageOffset);
					//TOSSを用意する
					st.newStack();
					//さっきのを積む
					st.push.apply(st,values.reverse());
					//新しいstorage Offset
					this.storageOffset.event.emit("set",{
						x:this.position.x+this.velocity.x,
						y:this.position.y+this.velocity.y,
					});
				}else if(ch==="}"){
					//End Block
					if(st.stacks.length===1){
						//underflow!
						this.velocity.event.emit("multiply",-1);
					}else{

						var num=st.pop();
						var values=[];
						if(num<0){
							//numが負の場合はSOSSから取り除く
						}else{
							//TOSSからnumだけとる
							for(var i=0;i<num;i++){
								values.push(st.pop());
							}
						}
						st.popStack();
						//ベクトル
						var vec=st.popVector();	//新しいposition
						this.storageOffset.event.emit("set",vec);
						//SOSSに移す
						st.push.apply(st,values.reverse());
						if(num<0){
							//負の場合はSOSSから取り除く
							for(var i=0;i<-num;i++){
								st.pop();
							}
						}
					}
				}else if(ch==="u"){
					//Stack under Stack
					if(st.stacks.length===1){
						//underflow!
						this.velocity.event.emit("multiply",-1);
					}else{
						var count=st.pop();
						//難しそうなのでスタックに任せる
						st.event.emit("u_transfer",count);
					}
				}//Flow Control
				else if(ch==="#"){
					//Trampoline
					forward();
				}else if(ch==="@" || ch==="q"){
					//Stop, Quit
					//Concurrentは使えないので
					this.event.emit("stop");
					return;
				}else if(ch===";"){
					//Jump Over
					//本当はとばすけど今回はひとつずつ
					this.event.emit("mode","jumpover");
				}else if(ch==="j"){
					//Jump Forward
					var num=st.pop();
					if(num>=0){
						for(var i=0;i<num;i++){
							forward();
						}
					}else{
						for(var i=0;i<-num;i++){
							backward();
						}
					}
				}else if(ch==="k"){
					//Iterate
					var num=st.pop();
					forward();
					//本当はSpaceを何度も繰り返さないけど・・・
					//この場所を繰り返す
					times=num+1;	//最初に減るので1個余計
					continue;
				}//Decision Making
				else if(ch==="!"){
					//Logical Not
					var val=st.pop();
					st.push(val===0 ? 1 : 0);
				}else if(ch==="`"){
					//Greater Than
					var f=st.pop(), s=st.pop();
					st.push(s>f ? 1 :0);
				}else if(ch==="_"){
					//East-West If
					var val=st.pop();
					if(val===0){
						this.velocity.event.emit("set",{x:1,y:0});
					}else{
						this.velocity.event.emit("set",{x:-1,y:0});
					}
				}else if(ch==="|"){
					//North-South If
					var val=st.pop();
					if(val===0){
						this.velocity.event.emit("set",{x:0,y:1});
					}else{
						this.velocity.event.emit("set",{x:0,y:-1});
					}
				}else if(ch==="w"){
					//Compare
					var b=st.pop(), a=st.pop();
					if(a<b){
						//左へ
						this.velocity.event.emit("set",{x:this.velocity.y, y:-this.velocity.x});
					}else if(a>b){
						//右へ
						this.velocity.event.emit("set",{x:-this.velocity.y, y:this.velocity.x});
					}//同じならまっすぐ

				}//Funge-Space Storage
				else if(ch==="g"){
					//Get
					var vec=st.popVector();
					st.push(this.field.getInstruction(this.storageOffset.x+vec.x,this.storageOffset.y+vec.y).charCodeAt(0));
				}else if(ch==="p"){
					//Put
					var vec=st.popVector();
					var val=st.pop();
					this.field.event.emit("input",{
						x:this.storageOffset.x+vec.x,
						y:this.storageOffset.y+vec.y
					}, String.fromCharCode(val));
				}else if(ch==="s"){
					//Store Character
					forward();
					this.field.event.emit("input",this.position,String.fromCharCode(st.pop()));

				}//Standard Input/Output
				else if(ch==="."){
					//Output Decimal
					this.event.emit("outputDecimal",st.pop());
				}else if(ch===","){
					//Output Character
					this.event.emit("outputChar",st.pop());
				}else if(ch==="&"){
					//Input Decimal
					st.push(0);
				}else if(ch==="~"){
					//Input Character
					st.push(10);
				}//File Input/Output
				else if(ch==="i"){
					//Input File
					st.popString();
					st.pop();	//flags
					st.popVector();
					//ファイルオープンは失敗するので反射
					this.velocity.event.emit("multiply",-1);
				}else if(ch==="o"){
					//Output File
					st.popString();
					st.pop();	//flags
					st.popVector();
					//失敗するので反射
					this.velocity.event.emit("multiply",-1);
				}//System Execution
				else if(ch==="="){
					//Execute
					//そんなことはできない
					st.popString();
					st.push(Math.floor(Math.random()*99+1));	//失敗コード
				}//System Informatin Retrieval
				else if(ch==="y"){
					//Get SysInfo
					var d=new Date;
					//まずのせるスタックを配列で生成
					//topから順番に
					var result=[
						16,	//1
						4,	//2
						0x67616d65,	//3 ("game")
						100,	//4 (1.00)
						0,	//5
						0x2f,	//6 ("/")
						2,	//7
						0,	//8
						this.number,	//9
						this.position.x,
						this.position.y,	//10
						this.velocity.x,
						this.velocity.y,	//11
						this.storageOffset.x,
						this.storageOffset.y,	//12	
						0,
						0,	//13
						this.field.width-1,
						this.field.height-1,	//14
						(d.getFullYear()-1900)*256*256+(d.getMonth()+1)*256+d.getDate(),	//15
						d.getHours()*256*256+d.getMinutes()*256+d.getSeconds(),	//16
						this.stack.stacks.map(function(x){return x.length}).reduce(function(a,b){return a+b},0),	//17
						];
					result.push.apply(result,this.stack.stacks.map(function(x){return x.length}));	//18
					result.push(0,0,0,	//19
							0,0);	//20
					var arg=st.pop();
					if(arg>0){
						//ひとつだけ
						st.push(result[arg] || 0);
					}else{
						//全部!!!
						st.push.apply(st,result.reverse());
					}
				}//FingerPrints
				else if(ch==="("){
					//Load Semantics
					var count=st.pop();	//count
					for(var i=0;i<count;i++){
						st.pop();
					}
					//だめだよ!
					this.velocity.event.emit("multiply",-1);
				}else if(ch===")"){
					//Unload Semantics
					var count=st.pop();	//count
					for(var i=0;i<count;i++){
						st.pop();
					}
				}//Noop
				else if(ch==="z"){
				}


			}
		}while(--times >0);

		//移動する
		forward();
		//次へ進む
		function forward(){
			go(t.velocity);
			//t.position.event.emit("add",t.velocity);
		}
		//前へ戻る
		function backward(){
			go({x:t.velocity.x*-1, y:t.velocity.y*-1})
			//t.position.event.emit("subtract",t.velocity);
		}
		//とにかく進む
		function go(vector){
			//vector:{x,y}
			var nv={
				x:t.position.x+vector.x,
				y:t.position.y+vector.y,
			};
			if(chk(nv)){
				var delta={x:-vector.x, y:-vector.y};
				//逆方向へ
				do{
					nv.x+=delta.x, nv.y+=delta.y;
				}while(!chk(nv));
				//行き過ぎなのでひとつ戻る
				nv.x-=delta.x, nv.y-=delta.y;
			}
			t.position.event.emit("set",nv);

			//外に出ているかどうかチェック
			function chk(v){
				return v.x<0 || v.y<0 || v.x>=t.field.width || v.y>=t.field.height;
			}
		}
	},
});
function Stack(game,event,param){
	//Stack Stack
	this.stacks=[[]];
	this.stack=[];
}
Stack.prototype={
	init:function(game,event,param){
		//スタックに追加
		this.stack=this.stacks[this.stacks.length-1];
		var t=this;
		event.on("push",function(){
			//argumentsに複数あるかもしれない（その順に追加）
			for(var i=0,l=arguments.length;i<l;i++){
				t.stack.push(arguments[i]);
			}
		});
		//x,yをもつオブジェクトをのせる
		event.on("pushVector",function(obj){
			t.stack.push(obj.x,obj.y);
		});
		event.on("pop",function(number){
			//複数またはひとつ除く
			if(!number){
				//1つ
				t.stack.pop();
			}else{
				t.stack.splice(t.stack.length-number,number);
			}
		});
		event.on("clear",function(){
			//スタック消去
			t.stack.length=0;
		});
		//pushを書き換え
		Object.defineProperty(this,"push",{
			value:event.emit.bind(event,"push"),
			enumerable:false,
			writable:true,
			configurable:true,
		});
		event.on("newStack",function(){
			//新しいスタック
			t.stack=[];
			t.stacks.push(t.stack);
		});
		event.on("popStack",function(){
			t.stacks.pop();
			t.stack=t.stacks[t.stacks.length-1];
		});
		event.on("u_transfer",function(count){
			//count個だけSOSSからTOSSへ移す
			var toss=t.stacks.pop();
			var soss=t.stacks.pop();
			if(count>=0){
				for(var i=0;i<count;i++){
					toss.push(soss.pop() || 0);
				}
			}else{
				//逆方向
				for(var i=0;i<-count;i++){
					soss.push(toss.pop() || 0);
				}
			}
			//戻す
			t.stacks.push(soss,toss);
		});
		//null-terminatedの文字列を取り出す
		event.on("popString",function(){
			for(var i=t.stack.length-1;i>=0;i--){
				if(!t.stack[i])break;
			}
			t.stack.length=Math.max(0,i);
		});
	},
	renderInit:function(){
		var div=document.createElement("div");
		div.classList.add("stack");
		return div;
	},
	render:function(view){
		var div=view.getItem();
		div.textContent=this.stacks.map(function(x){return x.join(" ")}).join(" / ");
	},
	///内部用
	//簡易のため、操作後自らイベント発火
	push:function(){
		//init内で置き換えられる
		//this.event.emit.apply(this.event,["push"].concat(arguments));
	},
	pushVector:function(obj){
		this.event.emit("pushVector",obj);
	},
	popVector:function(){
		//{x,y}のオブジェクトで返す
		return {y:this.pop(), x:this.pop()};
	},
	pop:function(){
		//1つ除く
		if(this.stack.length===0)return 0;
		var val=this.stack[this.stack.length-1];
		this.event.emit("pop");
		return val;
	},
	//popせずに最後のやつを取得
	last:function(){
		return this.stack[this.stack.length-1] || 0;
	},
	newStack:function(){
		this.event.emit("newStack");
	},
	popStack:function(){
		this.event.emit("popStack");
	},
	popString:function(){
		//null terminatedの文字列を取得
		var str="";
		for(var i=this.stack.length-1;i>=0;i--){
			if(!this.stack[i])break;
			str+=String.fromCharCode(this.stack[i]);
		}
		this.event.emit("popString");
		return str;
	},
}

//画面を被うパネル
function Panel(game,event,param){
}
Panel.prototype={
	str:"",	//表示文字列
	renderTop:true,
	renderInit:function(view){
		var div=document.createElement("div");
		div.classList.add("panel");
		div.classList.add("simple");
		return div;
	},
	render:function(view){
		var div=view.getItem();
		div.textContent=this.str;
	},
};
//待機中の表示
function WaitingPanel(game,event,param){
	Panel.apply(this,arguments);
}
WaitingPanel.prototype=Game.util.extend(Panel,{
	str:"現在募集中です",
	init:function(game,event,param){
		game.event.on("duel",function(number){
			//人数に達したら消える
			event.emit("die");
		});
	},
});
//難易度選択
function LevelPanel(game,event,param){
	this.user=param.user;
	this.field=param.field;
	this.levels=["Easy","Normal","Hard"];
	this.index=0;
}
LevelPanel.prototype={
	init:function(game,event){
		var user=this.user, ev=user.event;
		var t=this;
		ev.on("move",handler);
		ev.on("die",function(){
			ev.removeListener("move",handler);
		});
		event.on("select",function(delta){
			if(delta===-1){
				if(--t.index<0){
					t.index=0;
				}
			}else if(delta===1){
				if(++t.index>=t.levels.length){
					t.index--;
				}
			}
		});
		event.on("decide",function(){
			//決定した　出題パネルを出す
			var problem=game.add(ProblemPanel,{
				level:t.index,
				field:t.field,
			});
			t.field.event.emit("addProblem",problem);
			event.emit("die");
			event.removeAllListeners();
			setTimeout(function(){
				var counter=game.add(CountdownPanel,{
					count:5,
				});
				counter.event.once("die",function(){
					//試合開始だ!
					var p=problem.getProblem();
					problem.event.emit("inactive");
					game.event.emit("editstart",p.speed);
				});
			},1000);
		});
		function handler(obj){
			//moveを流用
			if(obj.x===0){
				event.emit("select",obj.y);
			}else if(obj.x===1){
				//決定
				event.emit("decide");
			}
		}
	},
	renderTop:true,
	renderInit:function(view){
		var sec=document.createElement("section");
		sec.classList.add("panel");
		sec.classList.add("levelselect");
		var h1=document.createElement("h1");
		h1.textContent="難易度選択";
		sec.appendChild(h1);
		var p=document.createElement("p");
		if(this.user===game.user){
			//自分が選択する
			p.textContent="上下キー（選択）と右キー（決定）で難易度を選択して下さい";
		}else{
			p.textContent="1Pが難易度を選択しています...";
		}
		sec.appendChild(p);
		var ul=document.createElement("ul");
		for(var i=0;item=this.levels[i++];){
			var li=document.createElement("li");
			li.textContent=item;
			ul.appendChild(li);
		}
		sec.appendChild(ul);
		return sec;
	},
	render:function(view){
		var sec=view.getItem();
		var ul=sec.getElementsByTagName("ul")[0];
		var lis=ul.getElementsByTagName("li");
		for(var i=0,l=lis.length;i<l;i++){
			if(i===this.index){
				lis[i].classList.add("selected");
			}else{
				lis[i].classList.remove("selected");
			}
		}
	},
};
//問題定義パネル
function ProblemPanel(game,event,param){
	this.level=param.level;	//0～2?
	this.field=param.field;
	this.active=true;	//問題を全面に表示されるかどうか
	//問題決定
	var len=this.problems[this.level].length;
	this.number=Math.floor(Math.random()*len);
}
ProblemPanel.prototype={
	init:function(game,event){
		var t=this;
		event.on("inactive",function(){
			t.active=false;
		});
	},
	//renderTop:true,
	renderInit:function(view){
		var sec=document.createElement("section");
		sec.classList.add("levelselect");
		var h1=document.createElement("h1");
		h1.textContent="問題";
		sec.appendChild(h1);
		//問題形式に応じて作る
		var problem=this.getProblem();
		var p=document.createElement("p");
		sec.appendChild(p);
		switch(problem.type){
			case "simpleString":
				//文字列出力
				var code=document.createElement("code");
				code.classList.add("order");
				code.style.display="block";
				code.textContent='"'+problem.value+'"';
				p.appendChild(code);
				p.appendChild(document.createTextNode("を出力しなさい"));
				break;
		}
		//入力
		var h2=document.createElement("h2");
		h2.textContent="入力";
		sec.appendChild(h2);
		var input=problem.input;
		if(!input){
			var p2=document.createElement("p");
			p2.textContent="なし";
			sec.appendChild(p2);
		}else{
			var pre2=document.createElement("pre");
			pre2.classList.add("output");
			pre2.textContent=input.join("\n");
			sec.appendChild(pre2);

		}
		return sec;
	},
	render:function(view){
		var sec=view.getItem();
		if(this.active){
			sec.classList.remove("inactive");
			sec.classList.add("panel");
		}else{
			sec.classList.add("inactive");
			sec.classList.remove("panel");
		}
	},
	//問題を返す
	getProblem:function(){
		return this.problems[this.level][this.number];
	},
	//問題コレクション
	/*
	   {
		type: ***
		input:null or Array
		input Array:[
		speed: 200,	//IP動作スピード[s/回]
		string,string,...
		check:function(ip){return true;}
		]
	 */
	problems:[
		//Easy
		[
			{
				type:"simpleString",
				value:"Hello, world!",
				speed:100,
				input:null,
				check:function(ip){
					//return /Hello, world![\s\n]*$/.test(ip.output);
					return /H/.test(ip.output);
				},
			},
		],
	],
};
//カウントダウンパネル
function CountdownPanel(game,event,param){
	this.count=param.count;
	//カウントダウンする
	var t=this;
	t.str=String(this.count);
	down();
	function down(){
		event.emit("set",String(t.count--));
		if(t.count>=0){
			setTimeout(down,1000);
		}else{
			event.emit("die");
		}
	}
}
CountdownPanel.prototype=Game.util.extend(Panel,{
	init:function(game,event){
		var t=this;
		event.on("set",function(str){
			t.str=str;
		});
	},
});
//結果パネル
function OutcomePanel(game,event,param){
	this.str=param.outcome;	//結果
	this.user=param.user;
	//各ユーザーに対してのみ表示
	this._private=this.user;
	this.index=0;	//選択
	this.decided=false;	//決定したか
}
OutcomePanel.prototype={
	init:function(game,event){
		var user=this.user, ev=user.event;
		var t=this;
		ev.on("move",handler);
		ev.on("decide",function(){
			ev.removeListener("move",handler);
		});
		event.on("select",function(delta){
			if(t.decided)return;
			if(delta===-1){
				if(--t.index<0){
					t.index=0;
				}
			}else if(delta===1){
				if(++t.index>1){
					t.index--;
				}
			}
		});
		event.on("decide",function(){
			//決定した　出題パネルを出す
			if(t.decided)return;
			t.decided=true;
		});
		function handler(obj){
			//moveを流用
			if(obj.x===0){
				event.emit("select",obj.y);
			}else if(obj.x===1){
				//決定
				event.emit("decide",t.index);
			}
		}
	},
	renderTop:true,
	renderInit:function(view){
		var sec=document.createElement("section");
		sec.classList.add("panel");
		sec.classList.add("levelselect");
		var h1=document.createElement("h1");
		h1.textContent=this.str;
		sec.appendChild(h1);
		var p=document.createElement("p");
		p.classList.add("selectioninfo");
		//p.textContent=;
		sec.appendChild(p);
		var ul=document.createElement("ul");
		var arr=["もう一戦","やめる"];
		for(var i=0, item;item=arr[i++];){
			var li=document.createElement("li");
			li.textContent=item;
			ul.appendChild(li);
		}
		sec.appendChild(ul);
		return sec;
	},
	render:function(view){
		var sec=view.getItem();
		var p=sec.getElementsByClassName("selectioninfo")[0];
		var ul=sec.getElementsByTagName("ul")[0];
		if(this.decided){
			//決まっている
			p.textContent="対戦相手の選択を待機中です…";
			ul.hidden=true;
		}else{
			p.textContent="上下キー（選択）と右キー（決定）で選択して下さい";
			ul.hidden=false;
			var lis=ul.getElementsByTagName("li");
			for(var i=0,l=lis.length;i<l;i++){
				if(i===this.index){
					lis[i].classList.add("selected");
				}else{
					lis[i].classList.remove("selected");
				}
			}
		}
	},
};
//汎用おしらせパネル
function InfoPanel(game,event,param){
	this.str=param.str;
	//time: 一定時間で消滅
	if(param.time){
		setTimeout(function(){
			event.emit("die");
		},param.time);
	}
	if(param.user){
		this._private=param.user;
	}
}
InfoPanel.prototype=Game.util.extend(Panel,{
	renderInit:function(view){
		var div=Panel.prototype.renderInit.apply(this,arguments);
		div.classList.remove("simple");
		div.classList.add("importantpanel");
		return div;
	},
});

//ゲーム初期化
var field=null;
game.init(Game.ClientDOMView);
//なんと一人のときは一人モード
game.playersNumber=game.env==="standalone" ? 1 : 2;
game.useUser(Game.DOMUser,function(user){
	//キー操作
	var ev=user.event;
	document.addEventListener('keydown',function(e){
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
});

//special events
//game.internal(function(){
game.event.on("gamestart",function handler(){
	game.clean();
	game.event.removeAllListeners();
	game.event.on("gamestart",handler);	//zombie handler!!
	game.add(WaitingPanel);
	var field=game.add(Field);

	game.event.on("entry",function(user){
		user.event.removeAllListeners();
		game.session(user);
		var cursor=field.setupCursor(user);
		if(!cursor)return;
		field.event.emit("addCursor",cursor);
		if(field.cursors.length===game.playersNumber){
			//十分集まった
			game.event.emit("duel");
			//難易度選択パネルを表示
			game.add(LevelPanel,{
				user:field.cursors[0].user,
				field:field,
			});
		}
	});
	game.event.on("success",function(ip){
		//このユーザーが成功したぞ！
		var user=ip.user;
		var field=ip.field;
		var arr=field.cursors;
		var decide_count=0;	//設定終了
		var positive=true;	//次参加するか
		var panels=[];	//パネル
		for(var i=0,l=arr.length;i<l;i++){
			var o;
			if(arr[i].user===user){
				//勝った
				panels[i]=o=game.add(OutcomePanel,{
					outcome:"勝ち",
					user:user,
				});
			}else{
				//負けた
				panels[i]=o=game.add(OutcomePanel,{
					outcome:"負け",
					user:arr[i].user,
				});
			}
			o.event.once("decide",function(sel){
				decide_count++;	//決定した
				if(sel===1){
					//やめる
					positive=false;
				}
				//集計する
				if(decide_count===arr.length){
					//揃った
					if(positive){
						//続投だ!!
						field.event.emit("initField");
						for(var j=0;j<l;j++){
							panels[j].event.emit("die");
							game.event.emit("entry",arr[j].user);
						}
					}else{
						//終了だ!!
						game.event.emit("gamestart");
						for(var j=0;j<l;j++){
							//次ゲームに参加できるように
							game.unsession(panels[j].user);
							if(panels[j].index===0){
								//やりたかったのに...
								game.add(InfoPanel,{
									str:"対戦相手は次ゲームに参加しませんでした。終了します。",
									time:5000,
									user:panels[j].user,
								});
							}else{
								game.add(InfoPanel,{
									str:"ゲームを終了します。",
									time:5000,
									user:panels[j].user,
								});
							}
							//panels[j].event.emit("die");
						}
					}
				}
			});
		}
	});
});

game.start();

