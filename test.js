var game = new Game();

//自機(brainオブジェクト)
/* param

x: 初期x座標
y: 初期y座標
speed: 移動スピード

user: Userオブジェクト
*/

//x,y,width,height
function Rect(game,event,param){
	this.x=0, this.y=0;
}
Rect.prototype={
	width:10,
	height:10,
	hitWith:function(obj){
		if(obj instanceof Rect){
			if(this.x<=obj.x+obj.width && this.x+this.width>=obj.x && this.y<=obj.y+obj.height && this.y+this.height>=obj.y){
				return true;
			}else{
				return false;
			}
		}else if(obj instanceof Point){
			if(this.x<=obj.x && obj.x<=this.x+this.width && this.y<=obj.y && obj.y<=this.y+this.height){
				return true;
			}else{
				return false;
			}
		}
		return false;
	},
	center:function(){
		return {x:this.x+this.width/2, y:this.y+this.height/2};
	},
};
//x,y
function Point(game,event,param){
	this.x=0, this.y=0;
}
Point.prototype={
	hitWith:function(obj){
		if(obj instanceof Rect)return obj.hitWith(this);
		return false;
	},
	center:function(){
		return {x:this.x, y:this.y};
	},
};

//game, event:イベント贈る param:データ格納
function MyMachine(game,event,param){

	//param:{user:Game.User}
	var user=param.user;
	
	//初期状態
	/*param{
		x:x, y:y, speed:speed
	}*/
	this.x=param.x, this.y=param.y, this.speed=param.speed;
	
	this.hp=this.maxhp;
	
	var t=this;

	var ke=user.event;
	user.keyWait([37,38,39,40,90/*Z*/]);

	//入力状態z
	var key={37:false,38:false,39:false,40:false,90:false};
	
	var shot_count=0, shot_wait=5;

	ke.on("keydown",function(e){
		var c=e.keyCode;
		key[c]=true;
		
	});
	ke.on("keyup",function(e){
		key[e.keyCode]=false;
	});
	
	event.on("internal",function(){
		if(key[90]){
			//Shot
			if(shot_count==0){
				game.add(MyShot,{
					x:t.x+t.width,
					y:t.y+t.height/2,
					speedx:10,
					speedy:0,
				});
				shot_count=shot_wait;
			}else{
				shot_count--;
			}
		}else{
			shot_count=0;
		}
	});

	event.on("loop",function(){
		//毎フレームの動作
		if(key[37]){
			t.x-=t.speed;
		}
		if(key[38]){
			t.y-=t.speed;
		}
		if(key[39]){
			t.x+=t.speed;
		}
		if(key[40]){
			t.y+=t.speed;
		}
		if(t.x<0)t.x=0;
		if(t.y<0)t.y=0;
		if(t.x>=game.width-t.width)t.x=game.width-t.width;
		if(t.y>=game.height-t.height)t.y=game.height-t.height;
	});
	event.on("render",function(canvas,ctx){
		//描画
		ctx.fillStyle="#000000";
		ctx.font=t.height+"px sans-serif";
		ctx.fillText("自分",t.x,t.y+t.height);
		
		//HPバー
		ctx.fillStyle="#dddddd";
		ctx.fillRect(t.x+2,t.y-2,t.width,4);
		ctx.fillStyle="#ee4444";
		ctx.fillRect(t.x+2,t.y-2,t.width*(t.hp/t.maxhp),4);
	});
	
	//外部干渉
	event.on("damage",function(power){
		t.hp-=power;
		if(t.hp<=0){
			t.hp=0;
			//爆発を起こす
			game.event.emit("effect","explode",t.center());
			//死ぬ
			event.emit("die");
			game.event.emit("over",t);
		}
	});
}
MyMachine.prototype=Game.util.extend(Rect,{
	width:36,
	height:20,
	maxhp:100,
});
function Shot(game,event,param){
	Point.apply(this,arguments);
	//初期状態
	/*param{
		x:x, y:y, speedx:speedx, speedy:speedy
	}*/
	var t=this;
	t.x=param.x, t.y=param.y, t.speedx=param.speedx, t.speedy=param.speedy;
	
	event.on("internal",function(){
		if(t.x<-10 || t.y<-10 || t.x>=game.width || t.y>=game.height){
			//画面から出た
			event.emit("die");
		}
		t.check(game,event);
	});
	
	event.on("loop",function(){
		//毎フレームの動作
		t.x+=t.speedx, t.y+=t.speedy;
	});
	event.on("render",function(canvas,ctx){
		//描画
		ctx.fillStyle=t.color;
		ctx.font="16px sans-serif";
		ctx.fillText("弾",t.x-8,t.y+8);
	});
}
Shot.prototype=Game.util.extend(Point,{
	width:10,
	height:10,
	check:function(game){
	},
	color:"#000000",
});
function MyShot(game,event,param){
	Shot.apply(this,arguments);
}
MyShot.prototype=Game.util.extend(Shot,{
	check:function(game,event){
		var arr=game.filter(EnemyBase);
		var t=this;
		for(var i=0,l=arr.length;i<l;i++){
			var obj=arr[i];
			if(t.hitWith(obj)){
				event.emit("die");
				obj.event.emit("damage",t.power);
			}
		}
	},
	
	power:10,
	color:"#0000ff",
});
function EnemyShot(game,event,param){
	Shot.apply(this,arguments);
}
EnemyShot.prototype=Game.util.extend(Shot,{
	check:function(game,event){
		var arr=game.filter(MyMachine);
		var t=this;
		for(var i=0,l=arr.length;i<l;i++){
			var obj=arr[i];
			if(t.hitWith(obj)){
				event.emit("die");
				obj.event.emit("damage",t.power);
			}
		}
	},
	power:10,
});
//================= Enemies =============
//base object
function EnemyBase(game,event,param){
	/*param{
		x:x, y:y
	}*/
	var t=this;
	t.x=param.x, t.y=param.y;
	t.hp=t.maxhp;
	event.on("damage",function(power){
		t.hp-=power;
		if(t.hp<=0){
			event.emit("die");
			//爆発
			game.event.emit("effect","explode",/*x,y*/t.center());
			//スコアを手に入れた
			game.event.emit("getscore",t.score);
		}
	});
	event.on("render",function(canvas,ctx){
		ctx.fillStyle=t.color;
		ctx.font=t.font;
		ctx.fillText(t.str,t.x,t.y+t.height-3);
	});
}
EnemyBase.prototype=Game.util.extend(Rect,{
	width:28,
	height:28,
	score:10,
	str:"敵",
	
	maxhp:1,
});

function Enemy(game,event,param){
	EnemyBase.apply(this,arguments);
	/*param{
		x:x, y:y
	}*/
	var t=this;

	
	event.on("internal",function(){
		if(t.x<-10 || t.y<-10 || t.x>=game.width || t.y>=game.height){
			//画面から出た
			event.emit("die");
		}
	});
	event.on("loop",function(){
		t.x -= t.speed;
	});
	
	//
}
Enemy.prototype=Game.util.extend(EnemyBase,{
	score:10,
	color:"#ff0000",
	font:"22px sans-serif",
	
	speed:4,
});

function Enemy1(game,event,param){
	Enemy.apply(this,arguments);
	var t=this;

	var wait=40,count=wait;
	event.on("internal",function(){
		if(--count<=0){
			//発射
			var me=game.random(MyMachine);
			if(me){
				var c1=t.center(), c2=me.center();
				var k=Math.atan2(c2.y-c1.y, c2.x-c1.x);
				
				game.add(EnemyShot,{
					x:c1.x, y:c1.y,
					speedx:Math.cos(k)*10,
					speedy:Math.sin(k)*10,
				});
			}
			
			count=wait;
		}
	});
}
Enemy1.prototype=Game.util.extend(Enemy,{
	color:"#ff0000",
	speed:4,
	score:10,
});

function Enemy2(game,event,param){
	Enemy.apply(this,arguments);
	var t=this;

	var wait=40,count=wait;
	event.on("internal",function(){
		if(--count<=0){
			//発射
			var me=game.random(MyMachine);
			if(me){
				var c1=t.center(), c2=me.center();
				var k=Math.atan2(c2.y-c1.y, c2.x-c1.x);
				
				game.add(EnemyShot,{
					x:c1.x, y:c1.y,
					speedx:Math.cos(k)*10,
					speedy:Math.sin(k)*10,
				});
			}
			
			if(Math.random()<0.8){
				//連続
				count=Math.floor(wait/10);
			}else{
				count=wait;
			}
		}
	});
}
Enemy2.prototype=Game.util.extend(Enemy,{
	color:"#aa00aa",
	speed:6,
	score:15,
});

function Enemy3(game,event,param){
	Enemy.apply(this,arguments);
	var t=this;

	var wait=40,count=wait;
	event.on("internal",function(){
		if(--count<=0){
			//全方向発射
			var c=12;
			var c1=t.center();	//中心座標
			for(var i=0;i<c;i++){
				var k=Math.PI*2 *i/c;
				game.add(EnemyShot,{
					x:c1.x, y:c1.y,
					speedx:Math.cos(k)*10,
					speedy:Math.sin(k)*10,
				});
			}
			count=wait;
		}
	});
}
Enemy3.prototype=Game.util.extend(Enemy,{
	color:"#00bb00",
	speed:4,
	score:15,
});

function Enemy4(game,event,param){
	Enemy.apply(this,arguments);
	var t=this;

	var wait=40,count=wait;
	var pushcountmax=3, pushcount=pushcountmax;
	event.on("internal",function(){
		if(--count<=0){
			//全方向発射
			var c=12;
			var c1=t.center();	//中心座標
			for(var i=0;i<c;i++){
				var k=Math.PI*2 *i/c;
				game.add(EnemyShot,{
					x:c1.x, y:c1.y,
					speedx:Math.cos(k)*10,
					speedy:Math.sin(k)*10,
				});
			}
			if(pushcount>0){
				count=Math.floor(wait/8);
				pushcount--;
			}else{
				count=wait;
				pushcount=pushcountmax;
			}
		}
	});
}
Enemy4.prototype=Game.util.extend(Enemy,{
	color:"#007070",
	speed:4,
	score:25,
});

//---- BOSS
function Boss(game,event,param){
	EnemyBase.apply(this,arguments);
	
	var t=this;
	
	event.on("render",function(canvas,ctx){
		ctx.fillStyle="#dddddd";
		ctx.fillRect(t.x, t.y+t.height+2, t.width, 4);

		ctx.fillStyle="#ff0000";
		ctx.fillRect(t.x, t.y+t.height+2, Math.floor(t.width*t.hp/t.maxhp), 4);
	});
}
Boss.prototype=Game.util.extend(EnemyBase,{
	font:"40px serif",
	color:"#006600",
	str:"ボス",
	
	width:80,
	height:40,
	
	maxhp: 500,
});

//LEVEL5ボス
function Boss1(game,event,param){
	Boss.apply(this,arguments);
	
	var t=this;
	t.mode=0;
	
	var children=[];
	
	var movup=true;	//上へ
	
	var atkwait=14, count=atkwait;
	
	event.on("internal",function(){
		//進行判定
		switch(t.mode){
		case 0:
			if(t.x <= game.width-t.width*2){
				event.emit("modechange",1);
			}
			break;
		case 1:
			//敵出現
			children.length=0;
			for(var i=0,l=3;i<l;i++){
				//護衛の敵
				children.push(game.add(EnemyAttendantRound1,{
					angle:Math.PI*2*i/l,
					parent:t,
					radius:80,
				}));
			}
			event.emit("modechange",2);
			break;
		case 2:
			//攻撃
			if(--count <=0){
				//発射
				var me=game.random(MyMachine);
				if(me){
					var c1=t.center(), c2=me.center();
					var k=Math.atan2(c2.y-c1.y, c2.x-c1.x);
					
					game.add(EnemyShot,{
						x:c1.x, y:c1.y,
						speedx:Math.cos(k)*12,
						speedy:Math.sin(k)*12,
					});
				}
				count=atkwait;
			}
		}
	});
	
	event.on("loop",function(){
		switch(t.mode){
		case 0:
			//登場
			t.x -= 5;
			if(t.x <= game.width-t.width*2){
				t.mode=1;
			}
			break;
		case 2:
			//上下移動
			if(movup){
				t.y-=4;
				if(t.y<30){
					movup=false;
				}
			}else{
				t.y+=4;
				if(t.y>game.height-40){
					movup=true;
				}
			}
			break;
		}
	});
	
	//もーどちぇんじ
	event.on("modechange",function(m){
		t.mode=m;
	});
}
Boss1.prototype=Game.util.extend(Boss,{
	score:1000,
});
//周りを回る敵
function EnemyAttendantRound(game,event,param){
	EnemyBase.apply(this,arguments);
	var t=this;
	/*param:{
		angle: Math.PI,
		parent: Enemy,
		radius: 80,
	}*/
	t.angle=param.angle;
	t.parent=param.parent;	//Enemy
	var maxradius=param.radius || t.radius;
	t.radius=0;	//最初は真ん中に
	
	event.on("loop",function(){
		//回る
		t.angle+=t.av;
		if(t.angle>=Math.PI*2)t.algle-=Math.PI*2;
		
		var pc=t.parent.center();
		t.x = pc.x+Math.cos(t.angle)*t.radius -t.width/2;
		t.y = pc.y+Math.sin(t.angle)*t.radius -t.height/2;
		
		if(t.radius<maxradius){
			t.radius+=10;
			if(t.radius>maxradius)t.radius=maxradius;
		}
	});
}
EnemyAttendantRound.prototype=Game.util.extend(EnemyBase,{
	width:32,
	height:32,
	font:"32px sans-serif",
	color:"#ff0000",
	maxhp:150,
	score:0,
	
	av:Math.PI/30,	//角速度[rad/frame]
	radius:80,
});
//まっすぐ撃つ
function EnemyAttendantRound1(game,event,param){
	EnemyAttendantRound.apply(this,arguments);
	var t=this;
	
	var wait=12, count=wait;
	
	event.on("internal",function(){
		if(--count <= 0){
			game.add(EnemyShot,{
				x:t.x, y:t.y,
				speedx:-10,
				speedy:0,
			});
			count=wait;
		}
	});
}
EnemyAttendantRound1.prototype=Game.util.extend(EnemyAttendantRound,{
});



function EnemyGenerator(game,event,param){
	/*param{
		r:0<r<1(確率)
	}*/
	var t=this;
	
	var r=1/30;
	
	t.stage=0;
	
	var scores=[null,0,150,400, 750, 1200];
	
	var l=scores.length-1;

	event.on("internal",function(){
		if(t.stage>0 && Math.random()<r){
			var nextEnemy=getEnemy();
			if(nextEnemy){
				game.add(nextEnemy,{
					x:game.width-10,
					y:Math.floor(Math.random()*(game.height-25)),
				});
			}
		}
		if(t.stage<l && scores[t.stage+1]<=game.store.score){
			//次のステージへ
			t.stage++;
			game.add(AnnounceDisplay,{
				str:"LEVEL "+t.stage,
			});
			
			//BOSS判定
			switch(t.stage){
				case 5:
					game.add(Boss1,{
						x:game.width,
						y:game.height/2,
					});
					break;
			}
		}
	});
	
	function getEnemy(){
		var r=Math.random();
		switch(t.stage){
			case 1:
				return Enemy1;
			case 2:
				return r<0.6 ? Enemy1 : Enemy2;
			case 3:
				return r<0.3 ? Enemy1 :
				       r<0.7 ? Enemy2 : Enemy3;
			case 4:
				return r<0.1 ? Enemy1 :
				       r<0.4 ? Enemy2 :
				       r<0.8 ? Enemy3 : Enemy4;
			case 5:
				//BOSS
				return null;
				
			default:
				return null;
		}
	}
}

//スコアをディスプレイする
function ScoreDisplay(game,event,param){
	var t=this;
	t.score=0;
	//ゲームイベントに割り込み
	game.event.on("getscore",function(delta){
		t.score+=delta;
	});
	event.on("render",function(canvas,ctx){
		ctx.fillStyle="#000000";
		ctx.font="16px serif";
		ctx.fillText("SCORE: "+t.score,20,50);
	});
}
//エフェクトを発行する
function EffectProcessor(game,event,param){
	game.event.on("effect",function(type,params){
		switch(type){
		case "explode":
			//爆発
			var m=20;
			for(var i=0;i<m;i++){
				var k=Math.PI*2*i/m;
				
				game.add(FadingEffect,{
					x:params.x-8, y:params.y+8,
					speedx:Math.cos(k)*7, speedy:Math.sin(k)*7,
					color:"#ffdd00",
					str:"爆",
					life:25,
				});
			}
		}
	});
}
//エフェクト
function Effect(game,event,param){
}
function FadingEffect(game,event,param){
	/*param:{
		x:x, y:y,
		speedx, speedy,
		color:...,
		font:font,
		str:str,
		life:life,//何フレーム残るか
	}*/
	
	this.x=param.x, this.y=param.y;
	this.speedx=param.speedx, this.speedy=param.speedy;
	this.color=param.color, this.life=param.life;
	this.str=param.str;
	if(param.font)this.font=param.font;
	var t=this;
	t.age=0;
	
	event.on("internal",function(){
		if(++t.age >= t.life){
			event.emit("die");
		}
	});
	event.on("loop",function(){
		t.x+=t.speedx;
		t.y+=t.speedy;
	});
	event.on("render",function(canvas,ctx){
		ctx.save();
		ctx.fillStyle=t.color;
		ctx.font=t.font;
		ctx.globalAlpha=1-t.age/t.life;
		ctx.fillText(t.str,t.x,t.y);
		ctx.restore();
	});
}
FadingEffect.prototype=Game.util.extend(Effect,{
	font:"18px sans-serif",
});

//上乗せ画面
function GameOverDisplay(game,event,param){
	var t=this;
	t.count=100;
	event.on("internal",function(){
		if(--t.count<=0){
			event.emit("die");
		}
	});
	event.on("render",function(canvas,ctx){
		ctx.font="72px serif";
		ctx.fillStyle="#000000";
		ctx.fillText("Game over",20,100);
	});
}
//飛んでくる
function AnnounceDisplay(game,event,param){
	var t=this;
	/*param{
		font:font
		str:str
		color:color
	}*/
	t.font = param.font ? param.font : "72px serif";
	t.color= param.color? param.color: "#000000";
	t.str=param.str;
	
	t.x=200;
	t.y=-20;
	t.mode=0;
	t.count=0;
	
	var vy=20;
	event.on("loop",function(){
		switch(t.mode){
		case 0:	//上から降りてくる
			t.y+=vy;
			if(t.y>=200){
				t.mode=1;
				t.y=200;
				t.count=0;
			}
			break;
		case 1:	//表示中
			if(++t.count>=30){
				t.mode=2;
			}
			break;
		case 2:	//下へ
			t.y+=vy*1.5;
			if(t.y>=game.height+100){
				event.emit("die");
			}
			break;
		}
	});
	event.on("render",function(canvas,ctx){
		ctx.font=t.font;
		ctx.fillStyle=t.color;
		ctx.fillText(t.str,t.x,t.y);
	});
}

//settings
game.width=650, game.height=450;

game.init(Game.ClientCanvasView,{
	width:650,
	height:450,
});


game.event.on("entry",function(user){
	//新しいユーザー
	game.add(MyMachine,{
		x:50,
		y:50,
		speed:6,
		user:user,
	});
});
game.add(EnemyGenerator);
game.add(ScoreDisplay,{});

game.add(EffectProcessor,{});

//スコア管理
game.store.score=0;
game.event.on("getscore",function(delta){
	game.store.score+=delta;
});

game.event.on("over",function(user){
	//死んだ
	var arr=game.filter(MyMachine);
	arr=arr.filter(function(x){return x!=user});
	if(arr.length==0){
		//もういない
		game.delay(45,function(){
			game.clean();
			game.add(GameOverDisplay,{});
		});
	}
});

game.start();

game.loop();







