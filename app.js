var game=require('./game');

var server=new game.Server();
/*server.init("test.js",{
	port:8080,
	title:"my game",
});
server.route('',{});
server.route('live',{live:true});
*/
server.init("speed.js",{
	port:8080,
	title:"speed",
});
server.serve('css','speed.css');
server.route('',{});
