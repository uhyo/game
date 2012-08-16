var game=require('./../game');

var server=new game.Server();
server.init("speed.js",{
	port:8080,
	title:"speed",
});
server.serve('css','speed.css');
server.route('',{});
