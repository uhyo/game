var game=require('./game');

var server=new game.Server();
server.init("test.js",{
	port:80,
	title:"my game",
});

