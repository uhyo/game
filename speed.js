var game = new Game();

//カードを定義
function Card(game,event,param){
	var t=this;

	t.suit=param.suit;//0(spade), 1(heart), 2(diamond), 3(club)
	t.rank=param.rank;	//1～13
}
Card.prototype={
	suits:["\u2660","\u2665","\u2666","\u2663"],
	suitColors:["#000000","#ff0000","#ff0000","#000000"],
	getSuit:function(){
		return this.suits[this.suit];
	},
	ranks:[null,"A","2","3","4","5","6","7","8","9","10","J","Q","K"],
	getRank:function(){
		return this.ranks[this.rank];
	},
	//render系メソッド
	renderInit:function(){
		return document.createElement("div");
	},
	render:function(view){
		var div=view.getItem();
		div.textContent=this.getSuit()+this.getRank();
		div.style.color=this.suitColors[this.suit];
	},
};
//山札
function Deck(game,event,param){
}
//手札
function Hand(game,event,param){
	var t=this, view=game.view;
	t.cards=[];
	//カードを追加
	event.on("add",function(card){
		t.cards.push(card);
	});
}
Hand.prototype={
	//render系メソッド
	renderInit:function(){
		return document.createElement("div");
	},
	render:function(view){
		var div=view.newItem();
		var arr=this.cards;
		for(var i=0,l=arr.length;i<l;i++){
			div.appendChild(view.render(arr[i]));
		}
	},
};
//場
function Field(game,event,param){
	var t=this;
	t.hands=[];
	event.on("add",function(obj){
		t.hands.push(obj);
	});
}

Field.prototype={
	//render系メソッド
	renderTop:true,	//トップに描画されるオブジェクト
	renderInit:function(){
		return document.createElement("div");
	},
	render:function(view){
		var div=view.newItem();
		var arr=this.hands;
		for(var i=0,l=arr.length;i<l;i++){
			div.appendChild(view.render(arr[i]));
		}
	},
};

game.init(Game.ClientDOMView,{
});

var h=game.add(Hand,{});
h.event.emit("add",game.add(Card,{suit:2,rank:8}));
h.event.emit("add",game.add(Card,{suit:0,rank:12}));
var f=game.add(Field,{});
f.event.emit("add",h);

game.useUser(Game.KeyboardUser);
game.event.on("entry",function(user,opt){
	var e=user.event;
	user.keyWait([37,38,39,40]);
	e.on("keydown",function(ev){
		h.event.emit("add",game.add(Card,{
			suit:Math.floor(Math.random()*4),
			rank:Math.floor(Math.random()*13+1),
		}));
	});
});
game.start();
