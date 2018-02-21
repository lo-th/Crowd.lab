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
                    var dist_uv = Math.abs(roadmap[v].position.moins(roadmap[u].position));

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