RVO.LeftOf = function (a, b, c) { 
	return RVO.Det(a.moins(c), b.moins(a)); 
}