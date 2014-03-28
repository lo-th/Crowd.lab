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