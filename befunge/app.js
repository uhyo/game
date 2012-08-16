var game=require('./../game');

var server=new game.Server();
server.init("befunge.js",{
	port:8080,
	title:"befunge",
});
server.serve('css','befunge.css');
server.route('',{});
