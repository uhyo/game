Game.prototype.init=function(view,viewparam){
	//It's dummy!
	this.view=new ServerView();
	this.view.init(viewparam);
};
Game.prototype.start=function(){
	//何もしない
};

function ServerView(){
	Game.View.apply(this);
}
ServerView.prototype=Game.util.extend(Game.View,{
});
