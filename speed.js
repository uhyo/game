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
			div.textContent="空";
			div.draggable=false;
			delete div.dataset.suit;
			delete div.dataset.rank;
			return;
		}
		div.textContent=this.getSuit()+this.getRank();
		div.style.color=this.suitColors[this.suit];
		div.dataset.suit=this.suit;
		div.dataset.rank=this.rank;
	},
	//-------------
	isNext:function(card){
		//となりどうしか確認する
		if(!(card instanceof Card))return null;
		if(this.suit==null || card.suit==null)return true;
		if(Math.abs(this.rank-card.rank)===1)return true;
		//AとK
		if(this.rank===1 && card.rank===13)return true;
		if(this.rank===13 && card.rank===1)return true;
		return false;
	},
};
//山札
function Deck(game,event,param){
}
//場
function Field(game,event,param){
	var t=this;
	t.hands=[];
	t.deck=param.deck;
	t.user=param.user;
	event.on("add",function(obj){
		t.hands.push(obj);
	});
	event.on("removehand",function(index){
		t.hands.splice(index,1);
	});
}

Field.prototype={
	//render系メソッド
	renderInit:function(){
		return document.createElement("div");
	},
	render:function(view){
		var div=view.newItem();
		var arr=this.hands;
		for(var i=0,l=arr.length;i<l;i++){
			var card=view.render(arr[i]);
			card.dataset.handindex=i;
			div.appendChild(card);
		}
		//山札
		div.appendChild(view.render(this.deck));
	},
	//------
	isBlank:function(){
		//手札に空きがあるか
		return this.hands.length<4;
	},
};
//山札（飾り）
function Deck(game,event,param){
	var t=this;
}
Deck.prototype={
	renderInit:function(){
		return document.createElement("div");
	},
	render:function(view){
		var div=view.getItem();
		div.classList.add("deck");
		div.textContent="山札";
	},
}
//全体
function Room(game,event,param){
	//フィールドを追加
	var t=this;
	t.fields=[];
	//フィールドに出ている
	t.cards=[];
	for(var i=0;i<2;i++){
		t.cards.push(game.add(CardZone,{}));
	}
	event.on("addfield",function(field){
		if(t.fields.length<2){
			//まだ入れる
			t.fields.push(field);
		}
	});
}
Room.prototype={
	renderTop:true,	//トップに描画されるオブジェクト
	renderInit:function(){
		return document.createElement("div");
	},
	render:function(view){
		debugger;
		var div=view.newItem();
		if(this.fields[0]){
			div.appendChild(view.render(this.fields[0]));
		}
		var d=document.createElement("div");
		this.cards.forEach(function(card,i){
			var n=view.render(card);
			n.dataset.zoneindex=i;
			d.appendChild(n);
		});
		div.appendChild(d);
		if(this.fields[1]){
			div.appendChild(view.render(this.fields[1]));
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
		return Game.util.shuffleArray(result);
	},
	//--- view用
	getZoneindex:function(view,node){
		var arr=this.cards;
		for(var i=0,l=arr.length;i<l;i++){
			if(view.isOwner(arr[i],node))return i;
		}
		return -1;
	},
};
//カードを乗せる場所
function CardZone(game,event,param){
	var t=this;
	t.card=game.add(Card,{rank:null,suit:null});	//最初は空
	event.on("add",function(card){
		t.card=card;
	});
}
CardZone.prototype={
	renderInit:function(){
		var div= document.createElement("div");
		div.dropzone="move";
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

game.init(Game.ClientDOMView,{
});
var room=game.add(Room);

game.useUser(Game.DOMUser);
game.event.on("entry",function(user,opt){
	/*var e=user.event;
	user.keyWait([37,38,39,40]);
	e.on("keydown",function(ev){
		h.event.emit("add",game.add(Card,{
			suit:Math.floor(Math.random()*4),
			rank:Math.floor(Math.random()*13+1),
		}));
	});*/
	var deck=game.add(Deck,{});
	var field=game.add(Field,{deck:deck,user:user});
	room.event.emit("addfield",field);
	var view=game.view;
	//入力を司る
	user.addEventListener("click",function(e){
		var t=e.target;
		if(view.isOwner(deck,t)){
			//デッキからドロー
			user.event.emit("draw");
		}
	},false);
	user.addEventListener("dragstart",function(e){
		var t=e.target;
		if(view.isOwner(field,t)){
			//カードをドラッグ
			//始点
			e.dataTransfer.items.add(t.dataset.handindex,"text/x-handindex");
			//console.log(e.dataTransfer.items[0]);
		}
	},false);
	//内部的な動作を作る
	user.addEventListener("drop",function(e){
		var t=e.target;
		var zoneindex=room.getZoneindex(view,t);
		if(zoneindex>=0){
			//終点
			var d=e.dataTransfer.items[0];
			if(!d)return;
			if(d.type=="text/x-handindex"){
				d.getAsString(function(handindex){
					user.event.emit("movehand",handindex-0,zoneindex-0);
				});
			}
		}
	},false);
	var deckcards=room.getDeck(game,field);
	//ドロー
	user.event.on("draw",function(){
		//ドローした
		if(deckcards.length>0 && field.isBlank()){
			field.event.emit("add",deckcards.pop());
		}
	});
	//手札を移動
	user.event.on("movehand",function(handindex,zoneindex){
		//console.log(handindex,zoneindex);
		var zone=room.cards[zoneindex];
		var from=field.hands[handindex];
		if(!zone || !from)return;
		if(zone.card.isNext(from)){
			//カードを出す
			console.warn("removehand!!!");
			field.event.emit("removehand",handindex);
			console.warn("zone!!!");
			zone.event.emit("add",from);
		}
	});
});
game.start();
