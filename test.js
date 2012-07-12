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

	//入力状態z
	var key={37:false,38:false,39:false,40:false,90:false};
	
	var shot_count=0, shot_wait=5;

	var ke=user.event;
	user.keyWait([37,38,39,40,90/*Z*/]);

	ke.on("keydown",function(e){
		var c=e.keyCode;
		key[c]=true;
		
	});
	ke.on("keyup",function(e){
		key[e.keyCode]=false;
	});
	
	//切断時
	ke.on("disconnect",function(){
		//自殺
		event.emit("die");
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
		}
	});
	event.on("die",function(){
		game.event.emit("over",t,user);
	});
	event.on("recover",function(power){
		t.hp+=power;
		if(t.hp>t.maxhp)t.hp=t.maxhp;
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
		ctx.font=t.font;
		ctx.fillText(t.str,t.x-8,t.y+8);
	});
}
Shot.prototype=Game.util.extend(Point,{
	str:"弾",
	width:10,
	height:10,
	check:function(game){
	},
	color:"#000000",
	font:"16px sans-serif",
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
function EnemyBigShot(game,event,param){
	EnemyShot.apply(this,arguments);
}
EnemyBigShot.prototype=Game.util.extend(EnemyShot,{
	power:15,
	width:20,
	height:20,
	font:"24px sans-serif",

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
		if(t.x<-t.width || t.y<-t.height || t.x>=game.width || t.y>=game.height){
			//画面から出た
			event.emit("die");
		}
	});
}
Enemy.prototype=Game.util.extend(EnemyBase,{
	score:10,
	color:"#ff0000",
	font:"22px sans-serif",
	
	speed:4,
	startpoint:"right",
});
//まっすぐ進む
function EnemyStraight(game,event,param){
	Enemy.apply(this,arguments);
	var t=this;
	event.on("loop",function(){
		t.x -= t.speed;
	});
}
EnemyStraight.prototype=Game.util.extend(Enemy,{
});


function Enemy1(game,event,param){
	EnemyStraight.apply(this,arguments);
	var t=this;

	var wait=40,count=wait;
	event.on("internal",function(){
		if(--count<=0){
			//発射
			var me=game.random(MyMachine);
			if(me){
				var c1=t.center(), c2=me.center();
				var k=Math.atan2(c2.y-c1.y, c2.x-c1.x);
				
				game.add(t.shot,{
					x:c1.x, y:c1.y,
					speedx:Math.cos(k)*10,
					speedy:Math.sin(k)*10,
				});
			}
			
			count=wait;
		}
	});
}
Enemy1.prototype=Game.util.extend(EnemyStraight,{
	color:"#ff0000",
	speed:4,
	score:10,
	//使う弾
	shot:EnemyShot,
});

function Enemy2(game,event,param){
	EnemyStraight.apply(this,arguments);
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
Enemy2.prototype=Game.util.extend(EnemyStraight,{
	color:"#aa00aa",
	speed:6,
	score:15,
});

function Enemy3(game,event,param){
	EnemyStraight.apply(this,arguments);
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
Enemy3.prototype=Game.util.extend(EnemyStraight,{
	color:"#00bb00",
	speed:4,
	score:15,
});

function Enemy4(game,event,param){
	EnemyStraight.apply(this,arguments);
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
Enemy4.prototype=Game.util.extend(EnemyStraight,{
	color:"#007070",
	speed:4,
	score:25,
});

function Enemy5(game,event,param){
	Enemy3.apply(this,arguments);
}
Enemy5.prototype=Game.util.extend(Enemy3,{
	color:"#009900",
	speed:-4,
	score:40,
	startpoint:"left",
});
//でかい敵
function Enemy6(game,event,param){
	Enemy1.apply(this,arguments);
}
Enemy6.prototype=Game.util.extend(Enemy1,{
	color:"#800000",
	speed:3,
	maxhp:50,
	width:70,
	height:70,
	score:60,
	font:"64px serif",
	shot:EnemyBigShot,
});
//さインカーブを描く敵
function Enemy7(game,event,param){
	Enemy.apply(this,arguments);

	var t=this;
	var zero=t.y;

	t.angle=0;	//角度

	event.on("loop",function(){
		t.angle+=t.angv;
		t.x-=t.speed;
		
		if(t.angle>=2*Math.PI)t.angle-=2*Math.PI;
		t.y=zero+t.radius*Math.sin(t.angle);
	});
}
Enemy7.prototype=Game.util.extend(Enemy,{
	score:60,
	speed:4,
	angv:Math.PI/45,
	radius:150,
});
//流れる敵の親
function Enemy8_Parent(game,event,param){
	var t=this;
	t.y=param.y;
	t.count=0,t.count2=0;
	var wait=6,radius=null,lambda=15;
	event.on("internal",function(){
		if(t.count===0 && t.count2===0){
			//最初
			radius=Math.floor(Math.random()*80)+60;
			lambda=Math.floor(Math.random()*6)+11;
		}
		if(++t.count >= wait){
			//敵を発生させる

			addEnemy(Enemy1,{
				y:t.y+radius*Math.sin(t.count2*Math.PI*2/lambda),
			});
			t.count2++, t.count=0;
			if(t.count2>=lambda){
				event.emit("die");
			}
		}
	});
}
//アイテム
function Item(game,event,param){
	Point.apply(this,arguments);
	//初期状態
	/*param{
		x:x, y:y, speedx:speedx, speedy:speedy
	}*/
	var t=this;
	t.x=param.x, t.y=param.y;
	
	event.on("internal",function(){
		if(t.x<-10 || t.y<-10 || t.x>=game.width || t.y>=game.height){
			//画面から出た
			event.emit("die");
		}
		t.check(game,event);
	});
	
	event.on("loop",function(){
		//毎フレームの動作
		t.x-=t.speedx;
		//色変える
		t.color="hsl("+(Math.floor(t.x/2)%360)+",100%,50%)";

	});
	event.on("render",function(canvas,ctx){
		//描画
		//console.log(t.color+" "+t.font+" "+t.str+" "+t.x+" "+t.y);
		ctx.fillStyle=t.color;
		ctx.font=t.font;
		ctx.fillText(t.str,t.x-8,t.y+8);
	});
}
Item.prototype=Game.util.extend(Point,{
	width:40,
	height:20,
	speedx:4,
	str:"ITEM",
	font:"bold 22px sans-serif",
	startpoint:"right",
	check:function(game,event){
		var arr=game.filter(MyMachine);
		var t=this;
		for(var i=0,l=arr.length;i<l;i++){
			var obj=arr[i];
			if(t.hitWith(obj)){
				event.emit("die");
				t.effect(obj);
			}
		}
	},
	effect:function(machine){},
	color:"#000000",
});
//回復アイテム
function Item1(game,event,param){
	Item.apply(this,arguments);
}
Item1.prototype=Game.util.extend(Item,{
	str:"回復",
	power:40,
	effect:function(machine){
		//回復
		machine.event.emit("recover",this.power);
	},
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
	
	t.movup=true;	//上へ
	
	var atkwait=14, count=atkwait;
	
	event.on("internal",function(){
		//進行判定
		switch(t.mode){
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
				//t.mode=1;
				event.emit("modechange",1);
			}
			break;
		case 2:
			//上下移動
			if(t.movup){
				t.y-=4;
				if(t.y<30){
					t.movup=false;
				}
			}else{
				t.y+=4;
				if(t.y>game.height-40){
					t.movup=true;
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
	score:1200,
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
	t.x=t.parent.x, t.y=t.parent.y;
	
	event.on("loop",function(){
		//回る
		t.angle+=t.av;
		if(t.angle>=Math.PI*2)t.angle-=Math.PI*2;
		
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
//まっすぐ撃つ
function EnemyAttendantRound2(game,event,param){
	EnemyAttendantRound.apply(this,arguments);
	var t=this;
	
	var wait=240, count=wait;
	var parent=t.parent;
	
	t.mode=0;
	event.on("internal",function(){
		if(t.mode==0){
			if(--count <= 0){
				//開く
				count=30;
				event.emit("modechange",1);
			}
		}else if(t.mode==1){
			if(--count <= 0){
				//撃つ
				var me=game.random(MyMachine);
				if(me){
					var c1=t.center(), c2=me.center();
					var k=Math.atan2(c2.y-c1.y, c2.x-c1.x);

					game.add(EnemyAttendantRound2Shot,{
						x:c1.x, y:c1.y,
						speedx:Math.cos(k)*14,
						speedy:Math.sin(k)*14,
					});
					event.emit("die");
				}
			}
		}
	});
	event.on("loop",function(){
		if(t.mode==1){
			t.radius++;
		}
	});
	event.on("modechange",function(mode){
		t.mode=mode;
	});
}
EnemyAttendantRound2.prototype=Game.util.extend(EnemyAttendantRound,{
	str:"葉",
	font:"26px serif",
	color:"#009900",
	width:26,
	height:26,
});
function EnemyAttendantRound2Shot(game,event,param){
	EnemyShot.apply(this,arguments);
}
EnemyAttendantRound2Shot.prototype=Game.util.extend(EnemyShot,{
	str:"葉",
	font:"26px serif",
	color:"#009900",
	width:26,
	height:26,
});

//LEVEL10ボス
function Boss2(game,event,param){
	Boss.apply(this,arguments);
	
	var t=this;
	t.mode=0;
	
	var children=[];
	
	t.movup=true;	//上へ
	
	var atkwait=14, count=atkwait;
	
	event.on("internal",function(){
		//進行判定
		switch(t.mode){
		case 1:
			//敵出現
			makebarrier();
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
				if(children.every(function(x){return !game.alive(x)})){
					event.emit("modechange",3);
					count=atkwait*8;
				}

			}
			break;
		case 3:
			//補充
			if(--count <=0){
				event.emit("modechange",1);
			}
			break;
		}
	});
	function makebarrier(){
		children.length=0;
		for(var i=0,l=16;i<l;i++){
			//護衛の敵
			children.push(game.add(EnemyAttendantRound2,{
				angle:Math.PI*2*i/l,
				parent:t,
				radius:0,
			}));
		}
	}
	
	event.on("loop",function(){
		switch(t.mode){
		case 0:
			//登場
			t.x -= 5;
			if(t.x <= game.width-t.width*2){
				//t.mode=1;
				event.emit("modechange",1);
			}
			break;
		case 2:
			//上下移動
			if(t.movup){
				t.y-=4;
				if(t.y<30){
					t.movup=false;
				}
			}else{
				t.y+=4;
				if(t.y>game.height-40){
					t.movup=true;
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
Boss2.prototype=Game.util.extend(Boss,{
	score:2000,
	maxhp:1200,
	font:"40px serif",
	width:120,
	color:"#666600",
	str:"BOSS",
});


function EnemyGenerator(game,event,param){
	/*param{
		r:0<r<1(確率)
	}*/
	var t=this;
	
	var r=1/30;
	
	t.stage=0;
	
	var scores=[null,0,150,400, 750, 1200, 2400, 3800,5000,7000,10000];
	var clear=12000;
	
	var l=scores.length-1;

	event.on("internal",function(){
		var rr=r*game.count(MyMachine);
		if(t.stage>0 && Math.random()<rr){
			var nextEnemy=getEnemy();
			if(nextEnemy){
				addEnemy(nextEnemy);
			}
		}
		var stagenow = t.stage;
		while(t.stage<l && scores[t.stage+1]<=game.store.score){
			//次のステージへ
			t.stage++;
		}
		if(stagenow<t.stage){
			//進んだ
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
				case 10:
					game.add(Boss2,{
						x:game.width,
						y:game.height/2,
					});
					break;
			}
		}
		if(game.store.score>=clear){
			game.add(AnnounceDisplay,{
				str:"Game Clear",
			});
			clear=Infinity;
			game.delay(game.config.fps*10,function(){
				var arr=game.filter(MyMachine);
				arr.forEach(function(machine){
					machine.event.emit("die");
				});
				game.clean();
				game.event.emit("initgame");
			});
				
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
				       r<0.8 ? Enemy3 :
					   r<0.96? Enemy4 : Item1;
			case 5:
				//BOSS
				return r<0.05? Item1 : null;
			case 6:
				return r<0.1 ? Enemy1 :
				       r<0.4 ? Enemy2 :
					   r<0.7 ? Enemy3 :
					   r<0.8 ? Enemy4 :
					   r<0.96? Enemy5 : Item1;
			case 7:
				return r<0.15? Enemy1 :
				       r<0.3 ? Enemy2 :
					   r<0.5 ? Enemy3 :
					   r<0.6 ? Enemy4 :
					   r<0.8 ? Enemy5 : 
					   r<0.9 ? Enemy6 : Item1;
			case 8:
				return r<0.15? Enemy2 :
				       r<0.35? Enemy3 :
					   r<0.5 ? Enemy4 :
					   r<0.65? Enemy5 :
					   r<0.8 ? Enemy6 : 
					   r<0.9 ? Enemy7 : Item1;
			case 9:
				return r<0.15? Enemy2 :
					   r<0.3 ? Enemy3 :
					   r<0.4 ? Enemy4 :
					   r<0.55? Enemy5 :
					   r<0.7 ? Enemy6 :
					   r<0.85? Enemy7 : 
					   r<0.9 ? Enemy8_Parent : Item1;
			case 10:
				//BOSS
				return r<0.08? Item1 : null;
				
			default:
				return null;
		}
	}
}
//ふつうの敵を発生させる
function addEnemy(constructor,option){
	var p=constructor.prototype.startpoint;
	if(!option)option={};
	if(!option.x && option.x!==0)option.x=p==="right" ? game.width-10 : 2;
	if(!option.y && option.y!==0)option.y=Math.floor(Math.random()*(game.height-25));
	game.add(constructor,option);
}

//スコアをディスプレイする
function ScoreDisplay(game,event,param){
	var t=this;
	t.score=/*0*/game.store.score;
	//ゲームイベントに割り込み
	game.event.on("getscore",function(delta){
		//t.score+=delta;
		event.emit("getscore",delta);
	});
	event.on("render",function(canvas,ctx){
		ctx.fillStyle="#000000";
		ctx.font="16px serif";
		ctx.fillText("SCORE: "+t.score,20,50);
	});
	event.on("getscore",function(delta){
		t.score+=delta;
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
//みるだけーのパネル
function LivePanel(game,event,param){
	var user=param.user;
	var e=user.event;

	//ユーザープライベートなオブジェクト
	this.private=user;
	e.on("disconnect",function(){
		event.emit("die");
	});
	event.on("render",function(canvas,ctx){
		ctx.fillStyle="rgba(255,0,0,0.7)";
		ctx.font="80px fantasy";
		ctx.fillText("LIVE",game.width-200,80);
		if(game.count(MyMachine)===0){
			ctx.font="50px sans-serif";
			ctx.fillStyle="rgba(0,0,0,0.8)";
			ctx.fillText("参加者募集中",50,game.height-20);
		}
	});
}
//エントリーのパネル
function EntryPanel(game,event,param){
	var user=param.user;
	var e=user.event;

	//ユーザープライベートなオブジェクト
	this.private=user;
	e.on("disconnect",function(){
		event.emit("die");
	});
	user.keyWait([13]);
	e.on("keydown",function(ev){
		//はじまる
		e.removeAllListeners("keydown");
		//しらせる
		event.emit("enter");
		event.emit("die");
	});

	event.on("render",function(canvas,ctx){
		ctx.fillStyle="rgba(191,191,191,0.7)";
		ctx.fillRect(50,50,game.width-100,game.height-100);
		ctx.fillStyle="#000000";
		ctx.font="46px sans-serif";
		ctx.fillText("シューティング",80,60);
		ctx.font="30px sans-serif";
		ctx.fillText("参加するにはEnterキーを押して下さい",70,100);
		ctx.font="24px serif";
		ctx.fillText("操作方法: 上下左右キーで移動",100,150);
		ctx.fillText("Zキーで弾を発射",100,180);
	});
}
//コンティニューパネル
function ContinueCountDisplay(game,event,param){
	this.remains=param.remains;
	var t=this;

	event.on("loop",function(){
		t.remains--;
		if(t.remains<0){
			event.emit("die");
		}
	});
	game.event.on("newMachine",function(){
		event.emit("die");
	});
	event.on("render",function(canvas,ctx){
		if(game.count(EntryPanel)>0)return;	//邪魔
		ctx.fillStyle="rgba(191,191,191,0.7)";
		ctx.fillRect(50,50,game.width-100,game.height-100);
		ctx.fillStyle="#000000";
		ctx.font="30px sans-serif";
		ctx.fillText("参加者募集中",70,100);
		ctx.font="24px serif";
		ctx.fillText("あと　　　　秒以内に参加しないと",100,150);
		ctx.fillText("ゲームオーバーになります",100,180);
		ctx.fillStyle="#ff0000";
		ctx.fillText("　　 "+(t.remains/game.config.fps).toPrecision(3),100,150);
	});
}
//fps
function FPSChecker(game,event,param){
	var t=this;
	t.time=Date.now();
	t.count=0;
	t.fpssum=0;
	event.on("loop",function(){
		var now=Date.now();
		var d=now-t.time;	//今回の時間
		t.fpssum = (t.fpssum*t.count+d)/(++t.count);
		if(t.count>=30){
			console.log("fps="+(1000/t.fpssum));
			t.count=0, t.fpssum=0;
		}
		t.time=now;
	});

}

//settings
game.width=650, game.height=450;

game.init(Game.ClientCanvasView,{
	width:650,
	height:450,
});
game.useUser(Game.KeyboardUser);

game.event.on("entry",function(user,opt){
	//新しいユーザー
	/*game.add(MyMachine,{
		x:50,
		y:50,
		speed:6,
		user:user,
	});*/
	newPanel(user);
	function newPanel(user){
		var panel;
		if(opt.live){
			panel=game.add(LivePanel,{
				user:user,
			});
		}else{

			panel=game.add(EntryPanel,{
				user:user,
			});
			panel.event.on("enter",function(){
				//参戦
				game.add(MyMachine,{
					x:50,
					y:50,
					speed:6,
					user:user,
				});
				game.event.emit("newMachine");
			});
		}
		var handler=function(){
			if(!game.alive(panel)){
				//Zombie panel!
				newPanel(user);
			}
		};
		game.event.on("initgame",handler);
		user.event.on("disconnect",function(){
			game.event.removeListener("initgame",handler);
		});
	}
});
//game.add(FPSChecker,{});
game.event.on("initgame",function(){
	initGame();
});
game.event.emit("initgame");

//スコア管理
game.event.on("getscore",function(delta){
	game.store.score+=delta;
});

game.event.on("over",function(userMachine,user){
	//死んだ
	var arr=game.filter(MyMachine);
	arr=arr.filter(function(x){return x!=userMachine});
	if(arr.length==0){
		//もういない(30秒)
		game.add(ContinueCountDisplay,{remains:game.config.fps*30});
		game.delaywhile(game.config.fps*30,function(){
			//条件
			return game.count(MyMachine)===0;
		},function(){
			//誰もいない
			if(game.count(MyMachine)===0){
				game.clean();
				game.add(GameOverDisplay,{});
				game.event.emit("gameover");
				game.delay(game.config.fps*10,function(){
					//再開
					game.event.emit("initgame");
				});
			}
		});
	}
	//45秒あとに再開できる
	var stop=game.delaystopper(game.config.fps*45,function(){
		if(!user.alive)return;
		game.add(EntryPanel,{
			user:user,
		});
	});
	game.once("initgame",stop);

});

game.start();

//config
game.config.fps=30;

game.loop();

function initGame(){
	game.store.score=0//0;
	game.add(EnemyGenerator);
	game.add(ScoreDisplay,{});

	game.add(EffectProcessor,{});
}
