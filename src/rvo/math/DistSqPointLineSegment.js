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