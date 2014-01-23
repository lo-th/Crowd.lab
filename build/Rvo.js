/**
 * RVO 2.0a
 * @author Samuel Giradin / http://www.visualiser.fr//
 * 
 * Compact Rvo.js
 * @author LoTh / http://3dflashlo.wordpress.com/
 */

var RVO = { REVISION: '2.0' };

RVO.EPSILON = 0.0001;
RVO.MAX_LEAF_SIZE = 10;
RVO.ToDeg = 180 / Math.PI;

//------------------------------
//  PERFORMANCE
//------------------------------

RVO.Performance = function(){
    this.KdTree=0;
    this.updateAgent=0;
    this.orcaLines=0;
}

//------------------------------
//  SIMULATOR
//------------------------------

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

//------------------------------
//  AGENT
//------------------------------

RVO.Agent = function(){
    // IList <KeyValuePair <float, Agent >> agentNeighbors_ = new List < KeyValuePair < float, Agent >>();
    // IList <KeyValuePair <float, Obstacle >> obstacleNeighbors_ = new List < KeyValuePair < float, Obstacle >>();
    // internal IList <Line > orcaLines_ = new List < Line > ();
    this.parent=null;
    this.agentNeighbors_ = [];
    this.obstacleNeighbors_ = [];
    this.orcaLines_ = [];
    this.maxNeighbors_ = 0;
    this.maxSpeed_ = 0;
    this.neighborDist_ = 0;
    this.orientation_ = 0;
    this.positionScreen_ = new RVO.Vector2(0, 0);
    this.prefVelocity_ = new RVO.Vector2(0, 0);
    this.radius_ = 0;
    this.timeHorizon_ = 0;
    this.timeHorizonObst_ = 0;
    this.id_ = 0;
    this.test = [];
    this.c = 0;
    this.RangeSq = null;
}

RVO.Agent.prototype = {
    constructor: RVO.Agent,

    computeNeighbors:function () {
        this.obstacleNeighbors_ = [];
        var rangeSq = RVO.Sqr(this.timeHorizonObst_ * this.maxSpeed_ + this.radius_);
        this.parent.kdTree_.computeObstacleNeighbors(this, rangeSq);

        this.agentNeighbors_ = [];
        if (this.maxNeighbors_ > 0) {
            this.RangeSq = RVO.Sqr(this.neighborDist_);
            this.parent.kdTree_.computeAgentNeighbors(this, this.RangeSq);
        }
    },
    computeNewVelocity:function () {// !! 26%
        this.orcaLines_ = [];

        var invTimeHorizonObst = 1 / this.timeHorizonObst_;

        for (var i = 0, m = this.obstacleNeighbors_.length; i !== m; ++i) {
            var obstacle1 = this.obstacleNeighbors_[i].Value;
            var obstacle2 = obstacle1.nextObstacle_;

            var relativePosition1 = obstacle1.point_.moins(this.position_);
            var relativePosition2 = obstacle2.point_.moins(this.position_);

            /*
            * Check if velocity obstacle of obstacle is already taken care of by
            * previously constructed obstacle ORCA lines.
            */
            var alreadyCovered = false;

            for (var j = 0, l = this.orcaLines_.length; j !== l; ++j) {
                if (RVO.Det(relativePosition1.mul_k(invTimeHorizonObst).moins(this.orcaLines_[j].point), this.orcaLines_[j].direction) - invTimeHorizonObst * this.radius_ >= -RVO.EPSILON && RVO.Det(relativePosition2.mul_k(invTimeHorizonObst).moins(this.orcaLines_[j].point), this.orcaLines_[j].direction) - invTimeHorizonObst * this.radius_ >= -RVO.EPSILON) {
                    alreadyCovered = true;
                    break;
                }
            }

            if (alreadyCovered) {
                continue;
            }

            /* Not yet covered. Check for collisions. */
            var distSq1 = relativePosition1.absSq();
            var distSq2 = relativePosition2.absSq();

            var radiusSq = RVO.Sqr(this.radius_);

            var obstacleVector = obstacle2.point_.moins(obstacle1.point_);
            var s = relativePosition1.moinsSelf().mul(obstacleVector) / obstacleVector.absSq();
            var distSqLine = (relativePosition1.moinsSelf().plus(obstacleVector.mul_k(-s))).absSq();


            var line = new RVO.Line();

            if (s < 0 && distSq1 <= radiusSq) {
                /* Collision with left vertex. Ignore if non-convex. */
                if (obstacle1.isConvex_) {
                    line.point = new RVO.Vector2(0, 0);
                    line.direction = new RVO.Vector2(-relativePosition1.y, relativePosition1.x).normalize();


                    this.orcaLines_.push(line);
                }
                continue;
            } else if (s > 1 && distSq2 <= radiusSq) {
                /* Collision with right vertex. Ignore if non-convex
                * or if it will be taken care of by neighoring obstace */
                if (obstacle2.isConvex_ && RVO.Det(relativePosition2, obstacle2.unitDir_) >= 0) {
                    line.point = new RVO.Vector2(0, 0);
                    line.direction = new RVO.Vector2(-relativePosition2.y, relativePosition2.x).normalize();
                    this.orcaLines_.push(line);
                }
                continue;
            } else if (s >= 0 && s < 1 && distSqLine <= radiusSq) {
                /* Collision with obstacle segment. */
                line.point = new RVO.Vector2(0, 0);
                line.direction = obstacle1.unitDir_.moinsSelf();
                this.orcaLines_.push(line);
                continue;
            }

            /*
            * No collision.
            * Compute legs. When obliquely viewed, both legs can come from a single
            * vertex. Legs extend cut-off line when nonconvex vertex.
            */
            var leftLegDirection;
            var rightLegDirection;

            if (s < 0 && distSqLine <= radiusSq) {
                /*
                * Obstacle viewed obliquely so that left vertex
                * defines velocity obstacle.
                */
                if (!obstacle1.isConvex_) {
                    continue;
                }

                obstacle2 = obstacle1;

                var leg1 = Math.sqrt(distSq1 - radiusSq);
                leftLegDirection = new RVO.Vector2(relativePosition1.x * leg1 - relativePosition1.y * this.radius_, relativePosition1.x * this.radius_ + relativePosition1.y * leg1).div_k(distSq1);
                rightLegDirection = new RVO.Vector2(relativePosition1.x * leg1 + relativePosition1.y * this.radius_, -relativePosition1.x * this.radius_ + relativePosition1.y * leg1).div_k(distSq1);
            } else if (s > 1 && distSqLine <= radiusSq) {
                /*
                * Obstacle viewed obliquely so that
                * right vertex defines velocity obstacle.
                */
                if (!obstacle2.isConvex_) {
                    continue;
                }

                obstacle1 = obstacle2;

                var leg2 = Math.sqrt(distSq2 - radiusSq);
                leftLegDirection = new RVO.Vector2(relativePosition2.x * leg2 - relativePosition2.y * this.radius_, relativePosition2.x * this.radius_ + relativePosition2.y * leg2).div_k(distSq2);
                rightLegDirection = new RVO.Vector2(relativePosition2.x * leg2 + relativePosition2.y * this.radius_, -relativePosition2.x * this.radius_ + relativePosition2.y * leg2).div_k(distSq2);
            } else {
                /* Usual situation. */
                if (obstacle1.isConvex_) {
                    var leg1 = Math.sqrt(distSq1 - radiusSq);
                    leftLegDirection = new RVO.Vector2(relativePosition1.x * leg1 - relativePosition1.y * this.radius_, relativePosition1.x * this.radius_ + relativePosition1.y * leg1).div_k(distSq1);
                } else {
                    /* Left vertex non-convex; left leg extends cut-off line. */
                    leftLegDirection = obstacle1.unitDir_.moinsSelf();
                }

                if (obstacle2.isConvex_) {
                    var leg2 = Math.sqrt(distSq2 - radiusSq);
                    rightLegDirection = new RVO.Vector2(relativePosition2.x * leg2 + relativePosition2.y * this.radius_, -relativePosition2.x * this.radius_ + relativePosition2.y * leg2).div_k(distSq2);
                } else {
                    /* Right vertex non-convex; right leg extends cut-off line. */
                    rightLegDirection = obstacle1.unitDir_;
                }
            }

            /*
            * Legs can never point into neighboring edge when convex vertex,
            * take cutoff-line of neighboring edge instead. If velocity projected on
            * "foreign" leg, no constraint is added.
            */
            var leftNeighbor = obstacle1.prevObstacle_;

            var isLeftLegForeign = false;
            var isRightLegForeign = false;

            if (obstacle1.isConvex_ && RVO.Det(leftLegDirection, leftNeighbor.unitDir_.moinsSelf()) >= 0) {
                /* Left leg points into obstacle. */
                leftLegDirection = leftNeighbor.unitDir_.moinsSelf();
                isLeftLegForeign = true;
            }

            if (obstacle2.isConvex_ && RVO.Det(rightLegDirection, obstacle2.unitDir_) <= 0) {
                /* Right leg points into obstacle. */
                rightLegDirection = obstacle2.unitDir_;
                isRightLegForeign = true;
            }

            /* Compute cut-off centers. */
            var leftCutoff = obstacle1.point_.moins(this.position_).mul_k(invTimeHorizonObst);
            var rightCutoff = obstacle2.point_.moins(this.position_).mul_k(invTimeHorizonObst);

            var cutoffVec = rightCutoff.moins(leftCutoff);

            //var cutoffVec = new Vector2(3, 3.3);
            /* Project current velocity on velocity obstacle. */
            /* Check if current velocity is projected on cutoff circles. */
            //var t = (obstacle1 == obstacle2 ? 0.5 : this.velocity_.moins(leftCutoff).mul(cutoffVec) / RVO.AbsSq(cutoffVec));
            var t = (obstacle1 == obstacle2 ? 0.5 : this.velocity_.moins(leftCutoff).mul(cutoffVec) / cutoffVec.absSq());

            // var  tLeft : number = ((velocity_ - leftCutoff) * leftLegDirection);
            var tLeft = this.velocity_.moins(leftCutoff).mul(leftLegDirection);
            var tRight = this.velocity_.moins(rightCutoff).mul(rightLegDirection);

            if ((t < 0 && tLeft < 0) || (obstacle1 == obstacle2 && tLeft < 0 && tRight < 0)) {
                /* Project on left cut-off circle. */
                var unitW = this.velocity_.moins(leftCutoff).normalize();

                line.direction = new RVO.Vector2(unitW.y, -unitW.x);
                line.point = leftCutoff.plus(unitW.mul_k(this.radius_ * invTimeHorizonObst));
                this.orcaLines_.push(line);
                continue;
            } else if (t > 1 && tRight < 0) {
                /* Project on right cut-off circle. */
                var unitW = this.velocity_.moins(rightCutoff).normalize();

                line.direction = new RVO.Vector2(unitW.y, -unitW.x);
                line.point = rightCutoff.plus(unitW.mul_k(this.radius_ * invTimeHorizonObst));
                this.orcaLines_.push(line);
                continue;
            }

            /*
            * Project on left leg, right leg, or cut-off line, whichever is closest
            * to velocity.
            */
            var distSqCutoff = ((t < 0 || t > 1 || obstacle1 == obstacle2) ? Number.POSITIVE_INFINITY : (this.velocity_.moins(leftCutoff.plus(cutoffVec.mul_k(t)))).absSq() );

            var distSqLeft = ((tLeft < 0) ? Number.POSITIVE_INFINITY :(this.velocity_.moins(leftCutoff.plus(leftLegDirection.mul_k(tLeft)))).absSq() );

            var distSqRight = ((tRight < 0) ? Number.POSITIVE_INFINITY : (this.velocity_.moins(rightCutoff.plus(rightLegDirection.mul_k(tRight)))).absSq() );
            

            if (distSqCutoff <= distSqLeft && distSqCutoff <= distSqRight) {
                /* Project on cut-off line. */
                line.direction = obstacle1.unitDir_.moinsSelf();
                line.point = leftCutoff.plus(new RVO.Vector2(-line.direction.y, line.direction.x).mul_k(this.radius_ + invTimeHorizonObst));
                this.orcaLines_.push(line);
                continue;
            } else if (distSqLeft <= distSqRight) {
                /* Project on left leg. */
                if (isLeftLegForeign) {
                    continue;
                }

                line.direction = leftLegDirection;
                line.point = leftCutoff.plus(new RVO.Vector2(-line.direction.y, line.direction.x).mul_k(this.radius_ + invTimeHorizonObst));

                this.orcaLines_.push(line);
                continue;
            } else {
                /* Project on right leg. */
                if (isRightLegForeign) {
                    continue;
                }

                line.direction = rightLegDirection.moinsSelf();
                line.point = rightCutoff.plus(new RVO.Vector2(-line.direction.y, line.direction.x).mul_k(this.radius_ + invTimeHorizonObst));

                this.orcaLines_.push(line);
                continue;
            }
        }

        //if (this.id_ == 0) console.log(this.orcaLines_.length);
        var numObstLines = this.orcaLines_.length;
        if (this.id_ === 1)this.parent.performance.orcaLines = numObstLines;

        var invTimeHorizon = 1.0 / this.timeHorizon_;

        var i = this.agentNeighbors_.length

        //for (var i = 0; i < this.agentNeighbors_.length; ++i) {
        while(i--){
            var other = this.agentNeighbors_[i].Value;

            var relativePosition = other.position_.moins(this.position_);
            var relativeVelocity = this.velocity_.moins(other.velocity_);

            //var distSq = RVO.AbsSq(relativePosition);
            var distSq = relativePosition.absSq();
            var combinedRadius = this.radius_ + other.radius_;
            var combinedRadiusSq = RVO.Sqr(combinedRadius);

            var line = new RVO.Line();
            var u = new RVO.Vector2(0, 0);

            if (distSq > combinedRadiusSq) {
                /* No collision. */
                var w = relativeVelocity.moins(relativePosition.mul_k(invTimeHorizon));

                /* Vector from cutoff center to relative velocity. */
                //var wLengthSq = RVO.AbsSq(w);
                var wLengthSq = w.absSq();

                var dotProduct1 = w.mul(relativePosition);

                if (dotProduct1 < 0 && RVO.Sqr(dotProduct1) > combinedRadiusSq * wLengthSq) {
                    /* Project on cut-off circle. */
                    var wLength = Math.sqrt(wLengthSq);
                    var unitW = w.div_k(wLength);

                    line.direction = new RVO.Vector2(unitW.y, -unitW.x);
                    u = unitW.mul_k(combinedRadius * invTimeHorizon - wLength);
                } else {
                    /* Project on legs. */
                    var leg = Math.sqrt(distSq - combinedRadiusSq);

                    if (RVO.Det(relativePosition, w) > 0) {
                        /* Project on left leg. */
                        line.direction = new RVO.Vector2(relativePosition.x * leg - relativePosition.y * combinedRadius, relativePosition.x * combinedRadius + relativePosition.y * leg).div_k(distSq);
                    } else {
                        /* Project on right leg. */
                        line.direction = new RVO.Vector2(relativePosition.x * leg + relativePosition.y * combinedRadius, -relativePosition.x * combinedRadius + relativePosition.y * leg).div_k(distSq).moinsSelf();
                    }

                    var dotProduct2 = relativeVelocity.mul(line.direction);

                    u = line.direction.mul_k(dotProduct2).moins(relativeVelocity);
                }
            } else {
                /* Collision. Project on cut-off circle of time timeStep. */
                var invTimeStep = 1 / this.parent.timeStep_;

                /* Vector from cutoff center to relative velocity. */
                var w = relativeVelocity.moins(relativePosition.mul_k(invTimeStep));
                var wLength = w.abs();
                var unitW = w.div_k(wLength);

                line.direction = new RVO.Vector2(unitW.y, -unitW.x);

                u = unitW.mul_k(combinedRadius * invTimeStep - wLength);
            }

            // line.point = Vector2.v_add(this.velocity_, Vector2.v_mul(u, 0.5));
            ///  line.point = this.velocity_.plus(u.mul_k(.5));
            line.point = u.mul_k(0.5).plus(this.velocity_);
            this.orcaLines_.push(line);
        }
        //console.log(this.prefVelocity_);

        var lineFail = this.linearProgram2(this.orcaLines_, this.maxSpeed_, this.prefVelocity_, false, this.newVelocity_);

        if (lineFail < this.orcaLines_.length) {
            this.linearProgram3(this.orcaLines_, numObstLines, lineFail, this.maxSpeed_, this.newVelocity_);
        }
    },
    insertAgentNeighbor:function (agent, rangeSq) {
        if (this !== agent) {
            var distSq = this.position_.moins(agent.position_).absSq();

            if (distSq < this.RangeSq) {
                if (this.agentNeighbors_.length < this.maxNeighbors_) {
                    this.agentNeighbors_.push(new RVO.KeyValuePair(distSq, agent));
                }

                var i = this.agentNeighbors_.length - 1;

                while (i !== 0 && distSq < this.agentNeighbors_[i - 1].Key) {
                    this.agentNeighbors_[i] = this.agentNeighbors_[i - 1];
                    --i;
                }

                this.agentNeighbors_[i] = new RVO.KeyValuePair(distSq, agent);

                if (this.agentNeighbors_.length === this.maxNeighbors_) {
                    this.RangeSq = this.agentNeighbors_[this.agentNeighbors_.length - 1].Key;
                }
            }
        }
    },
    update:function () {
        this.velocity_ = this.newVelocity_;
        this.position_ = this.position_.plus(this.velocity_.mul_k(this.parent.timeStep_));
        var v = 0;

        if (this.c <= 30) {
            this.orientation_ = Math.atan2(this.velocity_.y, this.velocity_.x) * RVO.ToDeg + 90;
            this.test[this.c] = this.orientation_;
            this.c++;
        } else {
            this.test.shift();
            this.test[this.c - 1] = Math.atan2(this.velocity_.y, this.velocity_.x) + Math.PI;

            for (var i = 0, j=this.test.length; i !== j; ++i) {
                v += this.test[i];
            }

            v = v / this.c;
            this.orientation_ = v * RVO.ToDeg + 270;
        }
    },
    insertObstacleNeighbor:function (obstacle, rangeSq) {
        var nextObstacle_ = obstacle.nextObstacle_;

        var distSq = RVO.DistSqPointLineSegment(obstacle.point_, nextObstacle_.point_, this.position_);

        if (distSq < rangeSq) {
            this.obstacleNeighbors_.push(new RVO.KeyValuePair(distSq, obstacle));

            var i = this.obstacleNeighbors_.length - 1;
            while (i != 0 && distSq < this.obstacleNeighbors_[i - 1].Key) {
                this.obstacleNeighbors_[i] = this.obstacleNeighbors_[i - 1];
                --i;
            }
            this.obstacleNeighbors_[i] = new RVO.KeyValuePair(distSq, obstacle);
        }
    },
    linearProgram1:function (lines, lineNo, radius, optVelocity, directionOpt, result) {
        var dotProduct = lines[lineNo].point.mul(lines[lineNo].direction);
        var discriminant = RVO.Sqr(dotProduct) + RVO.Sqr(radius) - (lines[lineNo].point).absSq();

        if (discriminant < 0) {
            /* Max speed circle fully invalidates line lineNo. */
            return false;
        }

        var sqrtDiscriminant = Math.sqrt(discriminant);
        var tLeft = -dotProduct - sqrtDiscriminant;
        var tRight = -dotProduct + sqrtDiscriminant;

        var i = lineNo;
        var point = lines[lineNo].point;
        var direction = lines[lineNo].direction;

        while(i--){
            var denominator = RVO.Det(direction, lines[i].direction);
            var numerator = RVO.Det(lines[i].direction, point.moins(lines[i].point));

            if (Math.abs(denominator) <= RVO.EPSILON) {
                /* Lines lineNo and i are (almost) parallel. */
                if (numerator < 0) {
                    return false;
                } else {
                    continue;
                }
            }

            var t = numerator / denominator;

            if (denominator >= 0) {
                /* Line i bounds line lineNo on the right. */
                tRight = Math.min(tRight, t);
            } else {
                /* Line i bounds line lineNo on the left. */
                tLeft = Math.max(tLeft, t);
            }

            if (tLeft > tRight) {
                return false;
            }
        }

        if (directionOpt) {
            /* Optimize direction. */
            if (optVelocity.mul(direction) > 0) {
                /* Take right extreme. */
                this.newVelocity_ = point.plus(direction.mul_k(tRight));
            } else {
                /* Take left extreme. */ 
                this.newVelocity_ = point.plus(direction.mul_k(tLeft));
            }
        } else {
            /* Optimize closest point. */
            var t1 = direction.mul(optVelocity.moins(point));

            if (t1 < tLeft) {
                this.newVelocity_ = point.plus(direction.mul_k(tLeft));
            } else if (t1 > tRight) {
                this.newVelocity_ = point.plus(direction.mul_k(tRight));
            } else {
                this.newVelocity_ = point.plus(direction.mul_k(t1));
            }
        }

        return true;
    },
    linearProgram2:function (lines, radius, optVelocity, directionOpt, result) {
        //console.log(optVelocity);
        if (directionOpt) {
            /*
            * Optimize direction. Note that the optimization velocity is of unit
            * length in this case.
            */
            this.newVelocity_ = optVelocity.mul_k(radius);
            
        } else if ( optVelocity.absSq() > RVO.Sqr(radius)) {
            /* Optimize closest point and outside circle. */
            this.newVelocity_ = (optVelocity.normalize()).mul_k(radius);
        } else {
            /* Optimize closest point and inside circle. */
            this.newVelocity_ = optVelocity;
        }

        for (var i = 0, j= lines.length; i < j; ++i) {
            if (RVO.Det(lines[i].direction, lines[i].point.moins(this.newVelocity_)) > 0) {
                /* Result does not satisfy constraint i. Compute new optimal result. */
                var tempResult = this.newVelocity_;
                if (!this.linearProgram1(lines, i, radius, optVelocity, directionOpt, this.newVelocity_)) {
                    // tempResult;
                    this.newVelocity_ = tempResult;
                    return i;
                }
            }
        }

        //  console.log(lines.length);
        return lines.length;
    },
    linearProgram3:function (lines, numObstLines, beginLine, radius, result) {
        var distance = 0;
        var direction;
        var point;
        var direction2;
        var point2;


        for (var i = beginLine, l = lines.length; i < l; ++i) {
            direction = lines[i].direction;
            point = lines[i].point;

            if (RVO.Det(direction, point.moins(this.velocity_)) > distance) {
                /* Result does not satisfy constraint of line i. */
                var projLines = [];
                for (var ii = 0; ii < numObstLines; ++ii) {
                    projLines.push(lines[ii]);
                }

                for (var j = numObstLines; j < i; ++j) {

                    var line = new RVO.Line();
                    direction2 = lines[j].direction;
                    point2 = lines[j].point;


                    var determinant = RVO.Det(direction, direction2);

                    if (Math.abs(determinant) <= RVO.EPSILON) {
                        /* Line i and line j are parallel. */
                        if (direction.mul(direction2) > 0) {
                            continue;
                        } else {
                            /* Line i and line j point in opposite direction. */
                            line.point = point.plus(point2).mul_k(.5);
                        }
                    } else {
                        var n = RVO.Det(direction2, point.moins(point2)) / determinant;
                        var v = direction.mul_k(n);
                        line.point = point.plus(v);
                        // console.log("this case OO");
                    }

                    line.direction = (direction2.moins(direction)).normalize();
                    projLines.push(line);
                }

                // console.log("b", projLines.length);
                var tempResult = this.newVelocity_;
                if (this.linearProgram2(projLines, radius, new RVO.Vector2(-direction.y, direction.x), true, this.newVelocity_) < projLines.length) {
                    /* This should in principle not happen.  The result is by definition
                    * already in the feasible region of this linear program. If it fails,
                    * it is due to small floating point error, and the current result is
                    * kept.
                    */
                    //  result = tempResult;
                    // console.log("should not happen");
                    this.newVelocity_ = tempResult;
                }

                distance = RVO.Det(direction, point.moins(this.newVelocity_));
            }
        }
    }
}

//------------------------------
//  KDTREE
//------------------------------

RVO.KdTree = function() {
	this.parent=null;
    //this.MAX_LEAF_SIZE = 10;
    this.agents_ = [];
    this.agentTree_ = [];
}

RVO.KdTree.prototype = {
    constructor: RVO.KdTree,

    buildAgentTree:function () {

        var i = this.parent.agents_.length;
        var n;
        while(i--){
            this.agents_[i] = this.parent.agents_[i];
            n = 2*i;
            this.agentTree_[n] = new RVO.AgentTreeNode();
            this.agentTree_[n+1] = new RVO.AgentTreeNode();
        }

        if (this.agents_.length !== 0) {
            this.buildAgentTreeRecursive(0, this.agents_.length, 0);
        }

    },
    buildAgentTreeRecursive:function (begin, end, node) {
        // console.log(node);
        var agX = this.agentTree_[node];
        agX.begin = begin;
        agX.end = end;
        agX.minX = agX.maxX = this.agents_[begin].position_.x;
        agX.minY = agX.maxY = this.agents_[begin].position_.y;

        var agIpos;

        for (var i = begin + 1; i < end; ++i) {
            agIpos = this.agents_[i].position_;
            agX.maxX = Math.max(agX.maxX, agIpos.x);
            agX.minX = Math.min(agX.minX, agIpos.x);
            agX.maxY = Math.max(agX.maxY, agIpos.y);
            agX.minY = Math.min(agX.minY, agIpos.y);
        }

        if (end - begin > RVO.MAX_LEAF_SIZE) {
            var isVertical = (agX.maxX - agX.minX > agX.maxY - agX.minY);
            var splitValue = (isVertical ? 0.5 * (agX.maxX + agX.minX) : 0.5 * (agX.maxY + agX.minY));

            var left = begin;
            var right = end;

            while (left < right) {
                while (left < right && (isVertical ? this.agents_[left].position_.x : this.agents_[left].position_.y) < splitValue) {
                    ++left;
                }

                while (right > left && (isVertical ? this.agents_[right - 1].position_.x : this.agents_[right - 1].position_.y) >= splitValue) {
                    --right;
                }

                if (left < right) {
                    // std::swap in c++ to JS
                    var tmp = this.agents_[left];
                    this.agents_[left] = this.agents_[right - 1];
                    this.agents_[right - 1] = tmp;
                    ++left;
                    --right;
                }
            }

            //   var leftSize: number = left - begin;
            if (left == begin) {
                ++left;
                ++right;
            }

            agX.left = node + 1;
            agX.right = node + 2 * (left - begin);

            this.buildAgentTreeRecursive(begin, left, agX.left);
            this.buildAgentTreeRecursive(left, end, agX.right);
        }
    },
    computeAgentNeighbors:function (agent, rangeSq) {
        this.queryAgentTreeRecursive(agent, rangeSq, 0);
    },
    queryAgentTreeRecursive:function (agent, rangeSq, node) {
        var agX = this.agentTree_[node];
        var pair_R, pair_L, PL, PR, pos;

        if (agX.end - agX.begin <= RVO.MAX_LEAF_SIZE) {
            for (var i = agX.begin; i < agX.end; ++i) {
                //agent.insertAgentNeighbor(this.agents_[i], this.agents_[i].RangeSq);
                agent.insertAgentNeighbor(this.agents_[i], rangeSq);
            }
        } else {
            pos = agent.position_;
            pair_L = [];
            pair_L.length = 4;

            PL = this.agentTree_[agX.left];
            pair_L[0] = RVO.Sqr(Math.max(0, PL.minX - pos.x));
            pair_L[1] = RVO.Sqr(Math.max(0, pos.x - PL.maxX));
            pair_L[2] = RVO.Sqr(Math.max(0, PL.minY - pos.y));
            pair_L[3] = RVO.Sqr(Math.max(0, pos.y - PL.maxY));

            pair_R = [];
            pair_R.length = 4;


            PR = this.agentTree_[agX.right];
            pair_R[0] = RVO.Sqr(Math.max(0, PR.minX - pos.x));
            pair_R[1] = RVO.Sqr(Math.max(0, pos.x - PR.maxX));
            pair_R[2] = RVO.Sqr(Math.max(0, PR.minY - pos.y));
            pair_R[3] = RVO.Sqr(Math.max(0, pos.y - PR.maxY));

            var distSqLeft = pair_L[0] + pair_L[1] + pair_L[2] + pair_L[3];
            var distSqRight = pair_R[0] + pair_R[1] + pair_R[2] + pair_R[3];

            if (distSqLeft < distSqRight) {
                if (distSqLeft < rangeSq) {
                    this.queryAgentTreeRecursive(agent, rangeSq, agX.left);

                    if (distSqRight < rangeSq) {
                        this.queryAgentTreeRecursive(agent, rangeSq, agX.right);
                    }
                }
            } else {
                if (distSqRight < rangeSq) {
                    this.queryAgentTreeRecursive(agent, rangeSq, agX.right);

                    if (distSqLeft < rangeSq) {
                        this.queryAgentTreeRecursive(agent, rangeSq, agX.left);
                    }
                }
            }
        }
    },
    buildObstacleTree:function () {
        this.obstacleTree_ = new RVO.ObstacleTreeNode();

        var obstacles = [];

        for (var i = 0; i < this.parent.obstacles_.length; ++i) {
            obstacles[i] = this.parent.obstacles_[i];
        }

        this.obstacleTree_ = this.buildObstacleTreeRecursive(obstacles);
    },
    buildObstacleTreeRecursive:function (obstacles) {
        // console.log("buildObstacleTreeRecursive");
        if (obstacles.length == 0) {
            return null;
        }

        var node = new RVO.ObstacleTreeNode();

        var optimalSplit = 0;
        var minLeft = obstacles.length;
        var minRight = obstacles.length;

        for (var i = 0; i < obstacles.length; ++i) {
            var leftSize = 0;
            var rightSize = 0;

            var obstacleI1 = obstacles[i];
            var obstacleI2 = obstacleI1.nextObstacle_;

            for (var j = 0; j < obstacles.length; ++j) {
                if (i == j) {
                    continue;
                }

                var obstacleJ1 = obstacles[j];
                var obstacleJ2 = obstacleJ1.nextObstacle_;

                var j1LeftOfI = RVO.LeftOf(obstacleI1.point_, obstacleI2.point_, obstacleJ1.point_);
                var j2LeftOfI = RVO.LeftOf(obstacleI1.point_, obstacleI2.point_, obstacleJ2.point_);

                if (j1LeftOfI >= -RVO.EPSILON && j2LeftOfI >= -RVO.EPSILON) {
                    ++leftSize;
                } else if (j1LeftOfI <= RVO.EPSILON && j2LeftOfI <= RVO.EPSILON) {
                    ++rightSize;
                } else {
                    ++leftSize;
                    ++rightSize;
                }

                var l = new RVO.FloatPair(Math.max(leftSize, rightSize), Math.min(leftSize, rightSize));
                var r = new RVO.FloatPair(Math.max(minLeft, minRight), Math.min(minLeft, minRight));

                if (RVO.FloatPair.sup_equal(l, r)) {
                    break;
                }
            }

            var l = new RVO.FloatPair(Math.max(leftSize, rightSize), Math.min(leftSize, rightSize));
            var r = new RVO.FloatPair(Math.max(minLeft, minRight), Math.min(minLeft, minRight));
            if (RVO.FloatPair.inf(l, r)) {
                minLeft = leftSize;
                minRight = rightSize;
                optimalSplit = i;
            }
        }

        /* Build split node. */
        var leftObstacles = [];
        for (var n = 0; n < minLeft; ++n)
            leftObstacles[n] = null;
        var rightObstacles = [];
        for (var n = 0; n < minRight; ++n)
            rightObstacles[n] = null;

        var leftCounter = 0;
        var rightCounter = 0;
        var i = optimalSplit;

        var obstacleI1 = obstacles[i];
        var obstacleI2 = obstacleI1.nextObstacle_;

        for (var j = 0; j < obstacles.length; ++j) {
            if (i == j) {
                continue;
            }

            var obstacleJ1 = obstacles[j];
            var obstacleJ2 = obstacleJ1.nextObstacle_;

            var j1LeftOfI = RVO.LeftOf(obstacleI1.point_, obstacleI2.point_, obstacleJ1.point_);
            var j2LeftOfI = RVO.LeftOf(obstacleI1.point_, obstacleI2.point_, obstacleJ2.point_);

            if (j1LeftOfI >= -RVO.EPSILON && j2LeftOfI >= -RVO.EPSILON) {
                leftObstacles[leftCounter++] = obstacles[j];
            } else if (j1LeftOfI <= RVO.EPSILON && j2LeftOfI <= RVO.EPSILON) {
                rightObstacles[rightCounter++] = obstacles[j];
            } else {
                /* Split obstacle j. */
                //  float t = RVOMath.det(obstacleI2.point_ - obstacleI1.point_, obstacleJ1.point_ - obstacleI1.point_) / RVOMath.det(obstacleI2.point_ - obstacleI1.point_, obstacleJ1.point_ - obstacleJ2.point_);
                var p00 = obstacleI2.point_.moins(obstacleI1.point_);
                var t1 = RVO.Det(p00, obstacleJ1.point_.moins(obstacleI1.point_));
                var t2 = RVO.Det(p00, obstacleJ1.point_.moins(obstacleJ2.point_));
                var t = t1 / t2;

                //Vector2 splitpoint = obstacleJ1.point_ + t * (obstacleJ2.point_ - obstacleJ1.point_);
                var vMinus = obstacleJ2.point_.moins(obstacleJ1.point_);
                var vMul = vMinus.mul_k(t);

                var splitpoint = obstacleJ1.point_.plus(vMul);

                var newObstacle = new RVO.Obstacle();
                newObstacle.point_ = splitpoint;
                newObstacle.prevObstacle_ = obstacleJ1;
                newObstacle.nextObstacle_ = obstacleJ2;
                newObstacle.isConvex_ = true;
                newObstacle.unitDir_ = obstacleJ1.unitDir_;

                newObstacle.id_ = this.parent.obstacles_.length;

                this.parent.obstacles_.push(newObstacle);

                obstacleJ1.nextObstacle_ = newObstacle;
                obstacleJ2.prevObstacle_ = newObstacle;

                if (j1LeftOfI > 0) {
                    leftObstacles[leftCounter++] = obstacleJ1;
                    rightObstacles[rightCounter++] = newObstacle;
                } else {
                    rightObstacles[rightCounter++] = obstacleJ1;
                    leftObstacles[leftCounter++] = newObstacle;
                }
            }
        }

        node.obstacle = obstacleI1;
        node.left = this.buildObstacleTreeRecursive(leftObstacles);
        node.right = this.buildObstacleTreeRecursive(rightObstacles);
        return node;
    },
    computeObstacleNeighbors:function (agent, rangeSq) {
        // console.log("compute");
        this.queryObstacleTreeRecursive(agent, rangeSq, this.obstacleTree_);
    },
    queryObstacleTreeRecursive:function (agent, rangeSq, node) {
        if (node == null) {
            return;
        }

        var obstacle1 = node.obstacle;
        var obstacle2 = obstacle1.nextObstacle_;

        var agentLeftOfLine = RVO.LeftOf(obstacle1.point_, obstacle2.point_, agent.position_);

        this.queryObstacleTreeRecursive(agent, rangeSq, (agentLeftOfLine >= 0 ? node.left : node.right));

        //var distSqLine = RVO.Sqr(agentLeftOfLine) / RVO.AbsSq(obstacle2.point_.moins(obstacle1.point_));
        var distSqLine = RVO.Sqr(agentLeftOfLine) / (obstacle2.point_.moins(obstacle1.point_)).absSq();

        if (distSqLine < rangeSq) {
            if (agentLeftOfLine < 0) {
                /*
                * Try obstacle at this node only if agent is on right side of
                * obstacle (and can see obstacle).
                */
                agent.insertObstacleNeighbor(node.obstacle, rangeSq);
            }

            /* Try other side of line. */
            this.queryObstacleTreeRecursive(agent, rangeSq, (agentLeftOfLine >= 0 ? node.right : node.left));
        }
    },
    queryVisibility:function (q1, q2, radius) {
        return this.queryVisibilityRecursive(q1, q2, radius, this.obstacleTree_);
    },
    queryVisibilityRecursive:function (q1, q2, radius, node) {
        if (node == null) {
            return true;
        } else {
            var obstacle1 = node.obstacle;
            var obstacle2 = obstacle1.nextObstacle_;

            var q1LeftOfI = RVO.LeftOf(obstacle1.point_, obstacle2.point_, q1);
            var q2LeftOfI = RVO.LeftOf(obstacle1.point_, obstacle2.point_, q2);
            //var invLengthI = 1 / RVO.AbsSq(obstacle2.point_.moins(obstacle1.point_));
            var invLengthI = 1 / (obstacle2.point_.moins(obstacle1.point_)).absSq();

            if (q1LeftOfI >= 0 && q2LeftOfI >= 0) {
                return this.queryVisibilityRecursive(q1, q2, radius, node.left) && ((RVO.Sqr(q1LeftOfI) * invLengthI >= RVO.Sqr(radius) && RVO.Sqr(q2LeftOfI) * invLengthI >= RVO.Sqr(radius)) || this.queryVisibilityRecursive(q1, q2, radius, node.right));
            } else if (q1LeftOfI <= 0 && q2LeftOfI <= 0) {
                return this.queryVisibilityRecursive(q1, q2, radius, node.right) && ((RVO.Sqr(q1LeftOfI) * invLengthI >= RVO.Sqr(radius) && RVO.Sqr(q2LeftOfI) * invLengthI >= RVO.Sqr(radius)) || this.queryVisibilityRecursive(q1, q2, radius, node.left));
            } else if (q1LeftOfI >= 0 && q2LeftOfI <= 0) {
                /* One can see through obstacle from left to right. */
                return this.queryVisibilityRecursive(q1, q2, radius, node.left) && this.queryVisibilityRecursive(q1, q2, radius, node.right);
            } else {
                var point1LeftOfQ = RVO.LeftOf(q1, q2, obstacle1.point_);
                var point2LeftOfQ = RVO.LeftOf(q1, q2, obstacle2.point_);
                //var invLengthQ = 1 / RVO.AbsSq(q2.moins(q1));
                var invLengthQ = 1 / q2.moins(q1).absSq()

                return (point1LeftOfQ * point2LeftOfQ >= 0 && RVO.Sqr(point1LeftOfQ) * invLengthQ > RVO.Sqr(radius) && RVO.Sqr(point2LeftOfQ) * invLengthQ > RVO.Sqr(radius) && this.queryVisibilityRecursive(q1, q2, radius, node.left) && this.queryVisibilityRecursive(q1, q2, radius, node.right));
            }
        }
    }
}

//------------------------------
//  AGENTTREENODE
//------------------------------

RVO.AgentTreeNode = function() {
}

//------------------------------
//  OBSTACLES
//------------------------------

RVO.Obstacle = function() {
}

//------------------------------
//  OBSTACLESTREENODE
//------------------------------

RVO.ObstacleTreeNode = function() {
}

//------------------------------
//  ROADMAPVETEX
//------------------------------

RVO.RoadmapVertex = function() {
}

//------------------------------
//  MULTIMAP
//------------------------------

RVO.Multimap = function() {
	this.keyValue = [];
}

//------------------------------
//  DIJKSTRA
//------------------------------

RVO.Dijkstra = function() {
}

RVO.Dijkstra.prototype = {
    constructor: RVO.Dijkstra,

    buildRoadmap:function (sim, roadmap) {
        for (var i = 0; i < roadmap.length; ++i) {
            for (var j = 0; j < roadmap.length; ++j) {
                if (sim.queryVisibility(roadmap[i].position, roadmap[j].position, sim.getAgentRadius(0))) {
                    roadmap[i].neighbors.push(j);
                }
            }

            for (var k = 0; k < 4; ++k) {
                roadmap[i].distToGoal[k] = Number.POSITIVE_INFINITY;
            }
        }

        for (var i = 0; i < 4; ++i) {
            //std:: multimap < float, int > Q;
            var Q = new RVO.Multimap();

            // std:: vector < std:: multimap < float, int >:: iterator > posInQ(roadmap.size(), Q.end());
            var posInQ = new RVO.Multimap();

            roadmap[i].distToGoal[i] = 0;

            // posInQ[i] = Q.insert(std:: make_pair(0.0f, i));
            posInQ[i] = Q.keyValue.push(new RVO.KeyValuePair(0, i));

            while (Q.keyValue.length != 0) {
                // const u = Q.begin() - > second;
                //  Q.erase(Q.begin());
                //   posInQ[u] = Q.end();
                var u = Q.keyValue[0].Value;
                Q.keyValue.shift();
                posInQ[u] = Q.keyValue[Q.keyValue.length - 1];

                for (var j = 0; j < roadmap[u].neighbors.length; ++j) {
                    var v = roadmap[u].neighbors[j];
                    var dist_uv = RVO.Abs(roadmap[v].position.moins(roadmap[u].position));

                    if (roadmap[v].distToGoal[i] > roadmap[u].distToGoal[i] + dist_uv) {
                        roadmap[v].distToGoal[i] = roadmap[u].distToGoal[i] + dist_uv;

                        if (posInQ[v] == Q.keyValue[Q.keyValue.length - 1]) {
                            posInQ[v] = Q.keyValue.push(new RVO.KeyValuePair(roadmap[v].distToGoal[i], v));
                        } else {
                            //  Q.erase(posInQ[v]);
                            Q.keyValue.push(new RVO.KeyValuePair(roadmap[v].distToGoal[i], v));
                        }
                    }
                }
            }
        }
    }

}

//------------------------------
//  FLOATPAIR
//------------------------------

RVO.FloatPair = function(a, b) {
	this._a = a;
    this._b = b;
}

RVO.FloatPair.inf = function (lhs, rhs) {
    return (lhs._a < rhs._a || !(rhs._a < lhs._a) && lhs._b < rhs._b);
}
RVO.FloatPair.inf_equal = function (lhs, rhs) {
    return (lhs._a == rhs._a && lhs._b == rhs._b) || lhs < rhs;
}
RVO.FloatPair.sup = function (lhs, rhs) {
    return !RVO.FloatPair.inf_equal(lhs, rhs);
    // return !inf_equal(lhs, rhs);
}
RVO.FloatPair.sup_equal = function (lhs, rhs) {
    return !RVO.FloatPair.inf;
}

//------------------------------
//  KEYVALUEPAIR
//------------------------------

RVO.KeyValuePair = function(key_, value_) {
	this.Key = key_;
    this.Value = value_;
}

//------------------------------
//  VECTOR2
//------------------------------

RVO.Vector2 = function(x, y) {
    this.x = x || 0;
    this.y = y || 0;
}

RVO.Vector2.prototype = {
    constructor: RVO.Vector2,

    moins:function (v) {
       //this.x -= v.x;
       // this.y -= v.y;
        return new RVO.Vector2(this.x - v.x, this.y - v.y);
    },
    moinsSelf:function () {
       // this.x = -this.x;
       // this.y = -this.y;
        return new RVO.Vector2(-this.x, -this.y);
    },
    plus:function (v) {
       // this.x += v.x;
       // this.y += v.y;
        return new RVO.Vector2(this.x + v.x, this.y + v.y);
    },

    mul:function (v) {
        return this.x * v.x + this.y * v.y;
    },

    absSq:function (v) {
        return this.x * this.x + this.y * this.y;
    },
    abs: function () {
        return Math.sqrt( this.x * this.x + this.y * this.y );
    },
    mul_k:function (k) {
        //this.x *= k;
        //this.y *= k;
        return new RVO.Vector2(this.x * k, this.y * k);
    },
    div_k:function (k) {
        var s = 1 / k;
        //this.x *= s;
        //this.y *= s;
        return new RVO.Vector2(this.x * s, this.y * s);
    },

    length: function () {
        return Math.sqrt( this.x * this.x + this.y * this.y );
    },
    divideScalar: function ( scalar ) {
        if ( scalar !== 0 ) {
            var invScalar = 1 / scalar;
            this.x *= invScalar;
            this.y *= invScalar;
        } else {
            this.x = 0;
            this.y = 0;
        }
        return this;
    },
    normalize: function () {
        return this.divideScalar( this.length() );
    },
    clone: function () {
        return new RVO.Vector2( this.x, this.y );
    }
}

//------------------------------
//  LINE
//------------------------------

RVO.Line = function() {
}

//------------------------------
//  MATH
//------------------------------

RVO.Sqr = function(p){ return p * p; }

RVO.Det = function (v1, v2) { return v1.x * v2.y - v1.y * v2.x; }

RVO.LeftOf = function (a, b, c) { return RVO.Det(a.moins(c), b.moins(a)); }

RVO.DistSqPointLineSegment = function (a, b, c) {
    var r = c.moins(a).mul(b.moins(a)) / (b.moins(a)).absSq();
    if (r < 0) {
        return (c.moins(a)).absSq();
    } else if (r > 1) {
        return (c.moins(b)).absSq();
    } else {
        return (c.moins(a.plus(b.moins(a).mul_k(r)))).absSq();
    }
}