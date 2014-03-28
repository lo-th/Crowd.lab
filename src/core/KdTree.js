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