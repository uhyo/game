//node-game
var ev=require('events'), path=require('path'), express=require('express'), socketio=require('socket.io');
var gameengine=require('./engine.js');
//サーバー用差分
var Game=gameengine.Game;
global.Game=Game;
require('./serverengine.js');

//サーバー作動
exports.Server=function(){
	ev.EventEmitter.apply(this,arguments);
}
exports.Server.prototype=Game.util.extend(ev.EventEmitter,{
	init:function(gamefile,options){
		//サーバー起動
		this.initServer(options);
		//ゲーム起動
		this.gamefile=path.join(path.dirname(require.main.filename),gamefile);
		require(this.gamefile);

	},
	initServer:function(options){
		//init server
		var app=this.app=express.createServer();
		app.configure(function(){
			app.set('views',__dirname+'/views');
			app.set('view engine','jade');
			app.set('view options',{layout:false});
		});
		app.use(app.router);
		app.get('/',function(req,res){
			//順番が大事かもしれない
			res.render('index',{scriptsdir:"/script",title:options.title,scripts:[
				"EventEmitter.min.js",
				"engine.js",
				"client.js",
				"game.js"]});
		});
		app.get('/script/:file',function(req,res,next){
			console.log(req.params.file);
			var filename;
			switch(req.params.file){
				case 'EventEmitter.min.js':
					filename='../module/EventEmitter.min.js';
					break;
				case 'engine.js':
					filename='./engine.js';
					break;
				case 'game.js':
					filename=this.gamefile;
					break;
				case 'client.js':
					filename='./client.js';
					break;
			}
			if(!filename){
				next();
				return;
			}
			res.sendfile(path.resolve(__dirname,filename),function(err){
				console.log(err);
				next();
			});

		}.bind(this));
		app.listen(options.port || 80);
		var io=socketio.listen(app);

		this.initSocket(io);
	},
	initSocket:function(io){
		var gaminginfo=gameengine.gaminginfo;

		gaminginfo.on("new",function(game){
			//新しいインスタンスができた
			//ユーザーの襲来
			io.on("entry",function(){
			});
		});

	},
});
