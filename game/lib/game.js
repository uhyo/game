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
	this.routeOptions={};
}
exports.Server.prototype=Game.util.extend(ev.EventEmitter,{
	io:function(cb){
		cb(socketio);
	},
	init:function(gamefile,options){
		//サーバー起動
		this.initServer(options);
		//ゲーム起動
		this.gamefile=path.join(path.dirname(require.main.filename),gamefile);
		require(this.gamefile);

	},
	route:function(name,func){
		this.routeOptions[name]=func;
	},
	initServer:function(options){
		//init server
		var t=this;
		var app=this.app=express.createServer();
		app.configure(function(){
			app.set('views',__dirname+'/views');
			app.set('view engine','jade');
			app.set('view options',{layout:false});
		});
		app.use(app.router);
		app.get('/:mode?',function(req,res){
			//順番が大事かもしれない
			var mode=req.params.mode;
			if(!mode)mode="";
			var option=t.routeOptions[mode];
			if(!option){
				res.send(404);
				return;
			}
			res.render('index',{scriptsdir:"/script",title:options.title,scripts:[
					   "EventEmitter.min.js",
					   "engine.js",
					   "client.js",
					   "route.js",
					   "game.js"],
			});
		});
		app.get('/script/:file',function(req,res,next){
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
				case 'route.js':
					res.send("_g_routes="+JSON.stringify(t.routeOptions),{"Content-Type":"text/javascript"});
					return;
			}
			if(!filename){
				next();
				return;
			}
			res.sendfile(path.resolve(__dirname,filename));

		}.bind(this));
		app.listen(options.port || 80);
		var io=socketio.listen(app);
		io.set('log level',1);
		this.initSocket(io);
	},
	initSocket:function(io){
		var gaminginfo=gameengine.gaminginfo;

		gaminginfo.on("new",function(game){
			//新しいインスタンスができた
			//ゲーム用
			gaminginfo.on("broadcast",function(name,obj){
				io.sockets.emit(name,obj);
			});
			gaminginfo.on("private",function(socket,name,obj){
				socket.emit(name,obj);
			});
			gaminginfo.on("volatile",function(name,obj){
				io.sockets.volatile.emit(name,obj);
			});
			io.sockets.on("connection",function(socket){
				//ユーザーの襲来
				//ユーザー入力のイベント
				var user;
				var event=new EventEmitter();
				socket.on("disconnect",function(){
					//切断された
					event.emit("disconnect");
					if(user){
						game.byeUser(user);
					}

				});
				socket.on("entry",function(option){
					// ユーザーを教えてあげる
					//（サーバー側用ユーザーオブジェクト作成）
					//ここでユーザーに現在の状況を教える
					var env=game.wholeEnvironment();
					user=game.newUser(option,event);
					//ユーザーとソケットを結びつける
					Object.defineProperty(user,"_socket",{
						value:socket,
					});
					socket.on("initok",function(){
						//game.event.emit("entry",user);
						game.entry(user,option);
						game._users.push(user);
						socket.removeAllListeners("initok");
					});
					socket.emit("init",{
						env:env,
						user_id:user._id,
					});
				});
				//クライアント側で起きたイベント
				socket.on("userevent",function(obj){
					if(!obj || !obj.args)return;
					event.emit.apply(event,[obj.name].concat(obj.args));
				});
				//動く
				if(game.loopController){
					game.loopController.start();
				}
			});
		});

	},
});
