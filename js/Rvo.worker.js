

'use strict';
importScripts('../build/Rvo.js');

var simulator;
var simulationStep;
var timerStep;
var radius1 = 8;
var radius2 = 6;
var nAgent;
var na = 60;//55;
var hh = 1100;
var ww = 1100;
var xx = 0;
var yy = 0;
var ToRad = Math.PI / 180;
var goals = [];
var target = new RVO.Vector2( 0 , 0 );

var fps=0, time, time_prev=0, fpsint = 0;
var timer, delay, timerStep, t01, ms, maxms = 0;
var isTimout = false;

var positions = [];
var rotations = [];
var infos = [];

self.onmessage = function (e) {
	var phase = e.data.tell;
	if(phase === "INIT"){
        createSimulation(e.data);
    }
    if(phase === "TARGET"){
        xx = e.data.x || 0;
        yy = e.data.y || 0;
        target = new RVO.Vector2( xx , yy );
    }
    if(phase === "CLEAR"){ 
    	clearSimulation();
    }
    //if(phase === "UPDATE"){ if(isTimout) update(); else timer = setInterval(update, timerStep);  }
}

//--------------------------------------------------
//   WORKER MESSAGE
//--------------------------------------------------

var update = function(){
	t01 = Date.now();

    var goalVector;
    var p, r;

    var i = nAgent;

    //simulator.doStep();
    
    while(i--){
        if(i<na) goals[i] = target;

        p = simulator.getAgentPosition(i);
        r = simulator.getAgentOrientation(i);

        goalVector = goals[i].moins( p );
        if ( goalVector.length() > 1) {
            goalVector = goalVector.normalize();
        }
        simulator.setAgentPrefVelocity(i, goalVector);

        // data
        positions[i] = [ p.x,  p.y ];
        rotations[i] = r * ToRad;
    }

    simulator.doStep();

    simulationInfo();

    self.postMessage({tell:"RUN", infos:infos, pos:positions, rot:rotations });

    if(isTimout){
        delay = timerStep - (Date.now()-t01);
        timer = setTimeout(update, delay);
    }
}

var createSimulation = function(data){

	simulator = new RVO.Simulator();
	simulationStep = data.simulationStep || 1.75;
    timerStep = data.timerStep || 1000/60;
    isTimout = data.timer || false;

    na = data.nAgent || 100;
   // radius1 = data.r1 || 8;
    //radius2 = data.r2 || 6;

    simulator.setTimeStep(simulationStep);
    simulator.setAgentDefaults(125/4, 50/4, 100/4, 0, radius1, 0.2);
    

    populate();

    if(isTimout) update(); else timer = setInterval(update, timerStep);

}

var clearSimulation = function(){

    if(isTimout)clearTimeout(timer);
    else clearInterval(timer);
    simulator.clear();

    goals = [];
    positions = [];
    rotations = [];
    infos = [];

    self.postMessage({tell:"CLEAR"});
}

function populate() {
    var n = na;
    var c = 0;

    for (var j = 1; j < 4; j++) {
        for (var i = 0; i < n; i++) {
            //add agent & his start position
            var v = new RVO.Vector2(Math.cos(i * 2 * Math.PI / n), Math.sin(i * 2 * Math.PI / n));

            if (j == 1) {
                simulator.addAgent(v.mul_k(200));
                self.postMessage({tell:"ADD", type:"agent", radius:radius2 });
                simulator.setAgentMaxSpeed(c, .5 + Math.random() * 1);
            }
            if (j == 2) {
                simulator.addAgent(v.mul_k(330));
                self.postMessage({tell:"ADD", type:"agent", radius:radius1 });
            }
            if (j == 3) {
                simulator.addAgent(v.mul_k(410));
                self.postMessage({tell:"ADD", type:"agent", radius:radius1 });
            }

            if (j == 1)
                simulator.setAgentRadius(i, radius2);


            //simulator.setAgentMaxSpeed(c, .5 + Math.random());

            //simulator.setAgentMaxSpeed(c, 0.2);

            //store the goal to the opposite
            var v = simulator.getAgentPosition(c);
            goals.push(v);

            c++;
        }
    }

    /*
    * Add (polygonal) obstacles, specifying their vertices in counterclockwise
    * order.
    */
    var obstacle1 = [];
    var obstacle2 = [];
    var obstacle3 = [];
    var obstacle4 = [];

    obstacle1.push(new RVO.Vector2(50, 300));
    obstacle1.push(new RVO.Vector2(-50, 300));
    obstacle1.push(new RVO.Vector2(-50, 50.0));
    obstacle1.push(new RVO.Vector2(50, 50.0));

    obstacle2.push(new RVO.Vector2(50, -50));
    obstacle2.push(new RVO.Vector2(-50, -50));
    obstacle2.push(new RVO.Vector2(-50, -300));
    obstacle2.push(new RVO.Vector2(50, -300));

    obstacle3.push(new RVO.Vector2(ww / 2, -hh / 2));
    obstacle3.push(new RVO.Vector2(-ww / 2, -hh / 2));
    obstacle3.push(new RVO.Vector2(-ww / 2, hh / 2));
    obstacle3.push(new RVO.Vector2(ww / 2, hh / 2));

    obstacle4.push(new RVO.Vector2(20, -20));
    obstacle4.push(new RVO.Vector2(20, 20));
    obstacle4.push(new RVO.Vector2(-20, 20));
    obstacle4.push(new RVO.Vector2(-20, -20));



    simulator.addObstacle(obstacle1);
    simulator.addObstacle(obstacle2);
    simulator.addObstacle(obstacle3);
    simulator.addObstacle(obstacle4);

    simulator.processObstacles();

    self.postMessage({tell:"ADD", type:"obstacle", pos:[0,0,175], size:[100, 100, 250] });
    self.postMessage({tell:"ADD", type:"obstacle", pos:[0,0,-175], size:[100, 100, 250] });
    self.postMessage({tell:"ADD", type:"obstacle", pos:[0,0,0], size:[40, 100, 40] });
    
	
    nAgent = simulator.getNumAgents();
}


var simulationInfo = function(){

    time = Date.now();
    ms = time - t01;
    if(ms > maxms)maxms = ms;
    if (time - 1000 > time_prev) {
        time_prev = time; fpsint = fps; fps = 0;
    } fps++;

    infos[0] = fpsint;
    infos[1] = ms;
    infos[2] = maxms;
    infos[3] = simulator.performance.KdTree;
    infos[4] = simulator.performance.updateAgent;
    infos[5] = simulator.performance.orcaLines;
}