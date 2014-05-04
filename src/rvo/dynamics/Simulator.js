RVO.Simulator = function(){
	//this.time_ = 0;
    this.agents_ = [];
    this.obstacles_ = [];
    //this.time_ = 0;
    this.defaultAgent_ = null;
    this.kdTree_ = new RVO.KdTree();
    this.kdTree_.parent = this;
    this.timeStep_ = 1;
    this.performance=new RVO.Performance();
}

RVO.Simulator.prototype = {
    constructor: RVO.Simulator,

    clear:function () {
        
        var i = this.agents_.length;
        while(i--){ 
            this.agents_.pop(); 
        }
        i = this.obstacles_.length;
        while(i--){ 
        	this.obstacles_.pop(); 
        }
    },

    doStep:function () {
        var time1=Date.now();
        this.kdTree_.buildAgentTree();
        var time2=Date.now();
        this.performance.KdTree=time2-time1;

        var i = this.agents_.length;
        while(i--){
            this.agents_[i].computeNeighbors();
            this.agents_[i].computeNewVelocity();
            this.agents_[i].update(); 
        }
        var time3=Date.now();
        this.performance.updateAgent=time3-time2;

        // fps update
        if (time3 - 1000 > this.performance.time_prev) {
            this.performance.time_prev = time3;
            this.performance.fpsint = this.performance.fps; 
            this.performance.fps = 0;
        } this.performance.fps++;

    },

    processObstacles:function () {
        this.kdTree_.buildObstacleTree();
    },

    queryVisibility:function (point1, point2, radius) {
        return this.kdTree_.queryVisibility(point1, point2, radius);
    },

    addObstacle:function (vertices) {
        if (vertices.length < 2) {
            return -1;
        }

        var obstacleNo = this.obstacles_.length;

        for (var i = 0, l = vertices.length; i !== l; ++i) {
            var obstacle = new RVO.Obstacle();
            obstacle.point_ = vertices[i];

            if (i != 0) {
                obstacle.prevObstacle_ = this.obstacles_[this.obstacles_.length - 1];
                obstacle.prevObstacle_.nextObstacle_ = obstacle;
            }

            if (i == vertices.length - 1) {
                obstacle.nextObstacle_ = this.obstacles_[obstacleNo];
                obstacle.nextObstacle_.prevObstacle_ = obstacle;
            }

            obstacle.unitDir_ = (vertices[(i == vertices.length - 1 ? 0 : i + 1)].moins(vertices[i])).normalize();


            if (vertices.length == 2) {
                obstacle.isConvex_ = true;
            } else {
                obstacle.isConvex_ = (RVO.LeftOf(vertices[(i == 0 ? vertices.length - 1 : i - 1)], vertices[i], vertices[(i == vertices.length - 1 ? 0 : i + 1)]) >= 0);
            }

            obstacle.id_ = this.obstacles_.length;

            this.obstacles_.push(obstacle);
        }

        return obstacleNo;
    },
    addAgent: function (position) {
        if (this.defaultAgent_ === null) {
            return -1;
        }

        var agent = new RVO.Agent();
        agent.parent = this;

        agent.position_ = position;
        agent.maxNeighbors_ = this.defaultAgent_.maxNeighbors_;
        agent.maxSpeed_ = this.defaultAgent_.maxSpeed_;
        agent.neighborDist_ = this.defaultAgent_.neighborDist_;
        agent.radius_ = this.defaultAgent_.radius_;
        agent.timeHorizon_ = this.defaultAgent_.timeHorizon_;
        agent.timeHorizonObst_ = this.defaultAgent_.timeHorizonObst_;
        agent.velocity_ = this.defaultAgent_.velocity_;

        agent.id_ = this.agents_.length;

        this.agents_[agent.id_] = agent;
    },
    setAgentDefaults:function (neighborDist, maxNeighbors, timeHorizon, timeHorizonObst, radius, maxSpeed, velocity) {
        if (typeof velocity === "undefined") { velocity = new RVO.Vector2(0, 0); }
        if (this.defaultAgent_ == null) {
            this.defaultAgent_ = new RVO.Agent();
        }

        this.defaultAgent_.maxNeighbors_ = maxNeighbors;
        this.defaultAgent_.maxSpeed_ = maxSpeed;
        this.defaultAgent_.neighborDist_ = neighborDist;
        this.defaultAgent_.radius_ = radius;
        this.defaultAgent_.timeHorizon_ = timeHorizon;
        this.defaultAgent_.timeHorizonObst_ = timeHorizonObst;
        this.defaultAgent_.velocity_ = velocity;
    },
    setAgentPrefVelocity:function (agentNo, prefVelocity) {
        this.agents_[agentNo].prefVelocity_ = prefVelocity;
    },
    setTimeStep:function (v) {
        this.timeStep_ = v;
    },
    setAgentMaxSpeed:function (agentNo, maxSpeed) {
        this.agents_[agentNo].maxSpeed_ = maxSpeed;
    },
    setAgentRadius:function (agentNo, radius) {
        this.agents_[agentNo].radius_ = radius;
    },
    getAgentOrientation:function (agentNo) {
        return this.agents_[agentNo].orientation_;
    },
    getOrca:function (agentNo) {
        return this.agents_[agentNo].orcaLines_;
    },
    getAgentPositionScreen:function (agentNo) {
        return this.agents_[agentNo].positionScreen_;
    },
    getAgentVelocity:function (agentNo) {
        return this.agents_[agentNo].velocity_;
    },
    getAgentOldVelocity:function (agentNo) {
        return this.agents_[agentNo].prefVelocity_;
    },
    getAgentPosition:function (agentNo) {
        return this.agents_[agentNo].position_;
    },
    getNumAgents:function () {
        return this.agents_.length;
    },
    getAgentRadius:function (agentNo) {
        return this.agents_[agentNo].radius_;
    }

}