var game=require('./../game');

var server=new game.Server();
server.init("shooting.js",{
	port:8080,
	title:"shooting game",
});
server.route('',{});
server.route('live',{live:true});

