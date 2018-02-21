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