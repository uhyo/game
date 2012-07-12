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
	render:function(){
		var div=document.createElement("div");
		div.textContent=this.getSuit()+this.getRank();
		return div;

	},
};
//山札
function Deck(game,event,param){
}


game.init(Game.ClientDOMView,{
});

game.add(Card,{suit:2,rank:8});
game.add(Card,{suit:0,rank:12});

game.start();