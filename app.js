var game=require('./game');

var server=new game.Server();
server.init("test.js",{
	port:8080,
	title:"my game",
});

