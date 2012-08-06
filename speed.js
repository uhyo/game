var game = new Game();

//カードを定義
function Card(game,event,param){
	var t=this;

	t.suit=param.suit;//0(spade), 1(heart), 2(diamond), 3(club); nullならばempty
	t.rank=param.rank;	//1～13
}
Card.prototype={
	suits:["\u2660","\u2665","\u2666","\u2663"],
	suitColors:["#000000","#ff0000","#ff0000","#000000"],
	getSuit:function(){
		if(this.suit==null)return "";
		return this.suits[this.suit];
	},
	ranks:[null,"A","2","3","4","5","6","7","8","9","10","J","Q","K"],
	getRank:function(){
		return this.ranks[this.rank];
	},
	//render系メソッド
	renderInit:function(){
		var div= document.createElement("div");
		div.classList.add("card");
		div.draggable=true;
		return div;
	},
	render:function(view){
		var div=view.getItem();
		if(this.suit==null){
			//emptyカード
			/*while(div.hasChildNodes()){
				div.removeChild(div.firstChid);
			}*/
			//div.textContent="空";
			div.textContent="　";
			div.draggable=false;
			delete div.dataset.suit;
			delete div.dataset.rank;
			return;
		}
		var s=document.createElement("span");
		s.classList.add("suit");
		s.textContent=this.getSuit();
		var r=document.createElement("span");
		r.classList.add("rank");
		r.textContent=this.getRank();
		div.appendChild(s);
		div.appendChild(r);
		div.style.color=this.suitColors[this.suit];
		div.dataset.suit=this.suit;
		div.dataset.rank=this.rank;
	},
	//-------------
	isNext:function(card){
		//となりどうしか確認する
		if(!(card instanceof Card))return null;
		if(this.suit==null || card.suit==null)return false;
		if(Math.abs(this.rank-card.rank)===1)return true;
		//AとK
		if(this.rank===1 && card.rank===13)return true;
		if(this.rank===13 && card.rank===1)return true;
		return false;
	},
};
//場
function Field(game,event,param){
	var t=this;
	t.hands=[];
	t.deck=null;
	t.user=param.user;	//ユーザーをとっておく
	event.on("add",function(obj){
		t.hands.push(obj);
	});
	event.on("removehand",function(index){
		t.hands.splice(index,1);
	});
	event.on("setdeck",function(deck){
		t.deck=deck;
	});
}

Field.prototype={
	//render系メソッド
	renderInit:function(){
		return document.createElement("div");
	},
	render:function(view){
		var div=view.newItem();
		//山札
		if(this.deck){
			div.appendChild(view.render(this.deck));
		}
		var arr=this.hands;
		for(var i=0,l=arr.length;i<l;i++){
			var card=view.render(arr[i]);
			card.dataset.handindex=i;
			div.appendChild(card);
		}
	},
	//------
	isBlank:function(){
		//手札に空きがあるか
		return this.hands.length<4 && this.deck.cards.length>0;
	},
};
//山札（飾り）
function Deck(game,event,param){
	var t=this;
	t.cards=param.cards || [];
	t.user=param.user;	//ユーザー情報を保存
	event.on("pop",function(){
		t.cards.pop();
	});
}
Deck.prototype={
	renderInit:function(view){
		var t=this;
		var div=document.createElement("div");
		div.classList.add("deck");
		//ドローされたときの情報
		div.addEventListener("click",function(){
			t.user.event.emit("draw");
		},false);
		return div;
	},
	render:function(view){
		var div=view.getItem();
		div.textContent="　";
		if(this.cards.length===0){
			div.classList.add("empty");
		}
	},
	//一番上
	last:function(){
		return this.cards[this.cards.length-1];
	},
}
//全体
function Room(game,event,param){
	//フィールドを追加
	var t=this;
	t.ended=false;	//終了フラグ
	t.fields=[];
	//フィールドに出ている
	t.cards=[];
	for(var i=0;i<2;i++){
		t.cards.push(game.add(CardZone,{index:i}));
	}
	event.on("addfield",function(field){
		if(t.fields.length<game.playersNumber){
			//まだ入れる
			t.fields.push(field);
		}
	});
	//終了を検知する
	game.event.on("end",function(){
		t.ended=true;
	});
}
Room.prototype={
	renderTop:true,	//トップに描画されるオブジェクト
	renderInit:function(){
		return document.createElement("div");
	},
	render:function(view){
		var div=view.newItem();
		var me,opp
		//自分のを手前に表示する
		if(this.fields[0] && this.fields[0].user===game.user){
			me=this.fields[0];
			opp=this.fields[1];
		}else{
			me=this.fields[1];
			opp=this.fields[0];
		}
		if(opp){
			div.appendChild(view.render(opp));
		}
		var d=document.createElement("div");
		d.classList.add("zonewrapper");
		this.cards.forEach(function(card,i){
			var n=view.render(card);
			n.dataset.zoneindex=i;
			d.appendChild(n);
		});
		div.appendChild(d);
		if(me){
			div.appendChild(view.render(me));
		}
	},
	//--- 内部用
	getDeck:function(game,field){
		var i=this.fields.indexOf(field);
		if(i<0)return null;
		//先攻は黒,後攻は赤
		var suits= i===0?[0,3]:[1,2];
		//1～13
		var result=[];
		suits.forEach(function(suit){
			for(var i=1;i<=13;i++){
				result.push(game.add(Card,{suit:suit,rank:i}));
			}
		});
		//return game.add(Deck,{cards:Game.util.shuffleArray(result)});
		return game.add(Deck,{user:field.user,cards:Game.util.shuffleArray(result).slice(0,6)});
	},
	//--- view用
	getZoneindex:function(view,node){
		var arr=this.cards;
		for(var i=0,l=arr.length;i<l;i++){
			if(view.isOwner(arr[i],node))return i;
		}
		return -1;
	},
	//そのフィールドからカードをさらに出せるか
	isFieldSustainable:function(field){
		if(field.isBlank())return true;
		return field.hands.some(function(card){
			return this.cards.some(function(zone){
				return zone.card.isNext(card);
			});
		},this);
	},
};
//カードを乗せる場所
function CardZone(game,event,param){
	var t=this;
	t.index=param.index;	//roomの中の場所
	t.card=game.add(Card,{rank:null,suit:null});	//最初は空
	event.on("add",function(card){
		t.card=card;
	});
}
CardZone.prototype={
	renderInit:function(){
		var div= document.createElement("div");
		div.dropzone="move";
		div.classList.add("cardzone");
		div.addEventListener("dragover",function(e){
			e.preventDefault();
		},false);
		return div;
	},
	render:function(view){
		var div=view.newItem();
		if(this.card){
			div.appendChild(view.render(this.card));
		}
	},
}
//新しくカードをのせるボード
function SpitBoard(game,event,param){
	var t=this;
	this.strs=["いっ","せー","のー","で"];
	t.index=0;

	event.on("count",function(c){
		//カウント
		t.index=c;
	});
}
SpitBoard.prototype={
	renderTop:true,
	renderInit:function(){
		var div=document.createElement("div");
		div.classList.add("spitboard");
		return div;
	},
	render:function(view){
		var div=view.getItem();
		div.textContent=this.strs.slice(0,this.index).join("");
	},
	//内部用
	startcount:function(){
		var t=this, event=this.event;
		var wait=800;
		setTimeout(count,wait);
		function count(){
			if(t.index+1<t.strs.length){
				setTimeout(count,wait);
			}else{
				setTimeout(function(){
					event.emit("die");
				},wait/4);
				t.newcard();
			}
			event.emit("count",t.index+1);
		}
	},
	newcard:function(){
		//新しいの一枚を上に乗せる
		var flag=false;	//変化があったか
		room.fields.forEach(function(f,i){
			if(f.deck.cards.length>0){
				var zone=room.cards[i];
				zone.event.emit("add",f.deck.last());
				f.deck.event.emit("pop");
				flag=true;
			}
		});
		if(flag)stopstop();
		else judge();
	},
};
//画面を被うパネル
function Panel(game,event,param){
}
Panel.prototype={
	str:"",	//表示文字列
	renderTop:true,
	renderInit:function(view){
		var div=document.createElement("div");
		div.classList.add("panel");
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
	game.event.on("newplayer",function(number){
		//人数に達したら消える
		if(number>=game.playersNumber){
			event.emit("die");
		}

	});
}
WaitingPanel.prototype=Game.util.extend(Panel,{
	str:"現在募集中です",
});
function OutcomePanel(game,event,param){
	Panel.apply(this,arguments);
	this.str=param.outcome;	//結果
	this.user=param.user;
	//各ユーザーに対してのみ表示
	this._private=this.user;
}
OutcomePanel.prototype=Game.util.extend(Panel,{
});

game.init(Game.ClientDOMView,{
});
//設定
game.playersNumber=2;
var room;
function newgame(){
	game.clean();
	room=game.add(Room);
	//集まるのを待つパネル
	game.add(WaitingPanel);
}
newgame();

//手詰まり判定
function stopstop(){
	if(room.fields.every(function(f){
		return !room.isFieldSustainable(f);
	})){
		//もう動けない
		var board=game.add(SpitBoard,{});
		board.startcount();
	}
}
//決着
function judge(){
	var flag=0;
	for(var i=0,l=room.fields.length;i<l;i++){
		var f=room.fields[i];
		if(f.deck.cards.length===0){
			//空になった
			flag++;
		}	
	}
	if(flag===0){
		//まだ決着がついていない
		return;
	}
	for(var i=0,l=room.fields.length;i<l;i++){
		var f=room.fields[i];
		if(flag>1){
			//引き分けだ
			game.add(OutcomePanel,{
				user:f.user,
				outcome:"引き分け",
			});
		}else{
			game.add(OutcomePanel,{
				user:f.user,
				outcome:(f.deck.cards.length===0 ? "勝ち":"負け"),
			});
		}
	}
	game.event.emit("end");
	//8秒後にニューゲーム
	setTimeout(function(){
		newgame();
	},8000);
}

game.useUser(Game.DOMUser,function(user){
	//ドラッグ
	user.ondrag(function(from,to){
		console.log("drag",from,to);
		if(from instanceof Card && to instanceof CardZone){
			//カードを出した
			user.event.emit("movehand",from,to);
		}
	},false);
});
game.event.on("entry",function(user,opt){
	/*var e=user.event;
	user.keyWait([37,38,39,40]);
	e.on("keydown",function(ev){
		h.event.emit("add",game.add(Card,{
			suit:Math.floor(Math.random()*4),
			rank:Math.floor(Math.random()*13+1),
		}));
	});*/
	game.session(user);	//セッションを保持させる

	//開始時は4枚ドローする
	game.event.on("newplayer",function(number){
		var count=0;
		if(number>=game.playersNumber){
			//ドロー開始
			draw();
		}
		function draw(){
			user.event.emit("draw");
			if(++count<4){
				setTimeout(draw,180);
			}
		}
	});

	var deck=game.add(Deck,{});
	var field=game.add(Field,{user:user});
	room.event.emit("addfield",field);
	var deck=room.getDeck(game,field);
	field.event.emit("setdeck",deck);
	var view=game.view;
	//新しい人がきた
	game.event.emit("newplayer",room.fields.length);
	//ドロー
	user.event.on("draw",function(){
		//ドローした
		if(room.ended)return;
		if(deck.cards.length>0 && field.isBlank()){
			field.event.emit("add",deck.last());
			deck.event.emit("pop");
			judge();
			stopstop();
		}
	});
	//手札を移動
	user.event.on("movehand",function(card,zone){
		if(room.ended)return;
		//console.log(card,zone);
		if(!zone)return;
		var h=field.hands;
		//手札にあるかどうか調べる
		var handindex;
		for(var i=0;i<h.length;i++){
			if(h[i]===card){
				handindex=i;
				break;
			}
		}
		if(handindex==null)return;
		if(zone.card.isNext(card)){
			//カードを出す
			field.event.emit("removehand",handindex);
			zone.event.emit("add",card);
		}
	});
	//終了したらもう知らない
	game.event.once("end",function(){
		game.unsession(user);
	});
});
game.start();
