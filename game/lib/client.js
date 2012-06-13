var socket=io.connect();
socket.on("connect",function(){

});

//Game override for client
Game.prototype.start=function(){
	//サーバーへユーザーを送る
	socket.emit("entry",{});
	
};
