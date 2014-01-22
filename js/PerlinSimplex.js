// PerlinSimplex 1.2
// Ported from Stefan Gustavson's java implementation by Sean McCullough banksean@gmail.com
// http://staffwww.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf
// Read Stefan's excellent paper for details on how this code works.
// octaves and falloff implementation (and passing jslint) by Ron Valstar
// also implemented Karsten Schmidt's implementation
if (!this.PerlinSimplex) {
	var PerlinSimplex = function() {

		var F2 = 0.5*(Math.sqrt(3)-1);
		var G2 = (3-Math.sqrt(3))/6;
		var G22 = 2*G2 - 1;
		var F3 = 1/3;
		var G3 = 1/6;
		var F4 = (Math.sqrt(5) - 1)/4;
		var G4 = (5 - Math.sqrt(5))/20;
		var G42 = G4*2;
		var G43 = G4*3;
		var G44 = G4*4 - 1;
		// Gradient vectors for 3D (pointing to mid points of all edges of a unit cube)
		var aGrad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
		// Gradient vectors for 4D (pointing to mid points of all edges of a unit 4D hypercube)
		var grad4 = [[0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],[0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],[1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],[-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],[1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],[-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],[1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],[-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0]];
		// To remove the need for index wrapping, double the permutation table length
		var aPerm;
		// A lookup table to traverse the simplex around a given point in 4D. 
		// Details can be found where this table is used, in the 4D noise method. 
		var simplex = [[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]];
		//
		var g;
		var n0, n1, n2, n3, n4;
		var s;
		var c;
		var sc;
		var i, j, k, l;
		var t;
		var x0, y0, z0, w0;
		var i1, j1, k1, l1;
		var i2, j2, k2, l2;
		var i3, j3, k3, l3;
		var x1, y1, z1, w1;
		var x2, y2, z2, w2;
		var x3, y3, z3, w3;
		var x4, y4, z4, w4;
		var ii, jj, kk, ll;
		var gi0, gi1, gi2, gi3, gi4;
		var t0, t1, t2, t3, t4;
		//
		//
		var oRng = Math;
		var iOctaves = 1;
		var fPersistence = 0.5;
		var fResult, fFreq, fPers;
		var aOctFreq; // frequency per octave
		var aOctPers; // persistence per octave
		var fPersMax; // 1 / max persistence
		//
		// octFreqPers
		var octFreqPers = function octFreqPers() {
			var fFreq, fPers;
			aOctFreq = [];
			aOctPers = [];
			fPersMax = 0;
			for (var i=0;i<iOctaves;i++) {
				fFreq = Math.pow(2,i);
				fPers = Math.pow(fPersistence,i);
				fPersMax += fPers;
				aOctFreq.push( fFreq );
				aOctPers.push( fPers );
			}
			fPersMax = 1 / fPersMax;
		};
		// 1D dotproduct
		var dot1 = function dot1(g, x) { 
			return g[0]*x;
		};
		// 2D dotproduct
		var dot2 = function dot2(g, x, y) {
			return g[0]*x + g[1]*y;
		};
		// 3D dotproduct
		var dot3 = function dot3(g, x, y, z) {
			return g[0]*x + g[1]*y + g[2]*z;
		};
		// 4D dotproduct
		var dot4 = function dot4(g, x, y, z, w) {
			return g[0]*x + g[1]*y + g[2]*z + g[3]*w;
		};
		// setPerm
		var setPerm = function setPerm() {
			var i;
			var p = [];
			for (i=0; i<256; i++) {	
				p[i] = Math.floor(oRng.random()*256);
			}
			// To remove the need for index wrapping, double the permutation table length 
			aPerm = []; 
			for(i=0; i<512; i++) {
				aPerm[i] = p[i & 255];
			}
		};
		// noise2d
		var noise2d = function noise2d(x, y) {
			// Skew the input space to determine which simplex cell we're in 
			s = (x+y)*F2; // Hairy factor for 2D 
			i = Math.floor(x+s); 
			j = Math.floor(y+s); 
			t = (i+j)*G2; 
			x0 = x - (i - t); // Unskew the cell origin back to (x,y) space 
			y0 = y - (j - t); // The x,y distances from the cell origin 
			// For the 2D case, the simplex shape is an equilateral triangle. 
			// Determine which simplex we are in. 
			// Offsets for second (middle) corner of simplex in (i,j) coords 
			if (x0>y0) { // lower triangle, XY order: (0,0)->(1,0)->(1,1)
				i1 = 1;
				j1 = 0;
			}  else { // upper triangle, YX order: (0,0)->(0,1)->(1,1)
				i1 = 0;
				j1 = 1;
			}
			// A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and 
			// a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where 
			// c = (3-sqrt(3))/6 
			x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords 
			y1 = y0 - j1 + G2; 
			x2 = x0 + G22; // Offsets for last corner in (x,y) unskewed coords 
			y2 = y0 + G22; 
			// Work out the hashed gradient indices of the three simplex corners 
			ii = i&255; 
			jj = j&255; 
			// Calculate the contribution from the three corners 
			t0 = 0.5 - x0*x0-y0*y0; 
			if (t0<0) {
				n0 = 0; 
			} else { 
				t0 *= t0; 
				gi0 = aPerm[ii+aPerm[jj]] % 12; 
				n0 = t0 * t0 * dot2(aGrad3[gi0], x0, y0);  // (x,y) of aGrad3 used for 2D gradient 
			} 
			t1 = 0.5 - x1*x1-y1*y1; 
			if (t1<0) {
				n1 = 0; 
			} else { 
				t1 *= t1; 
				gi1 = aPerm[ii+i1+aPerm[jj+j1]] % 12; 
				n1 = t1 * t1 * dot2(aGrad3[gi1], x1, y1); 
			}
			t2 = 0.5 - x2*x2-y2*y2; 
			if (t2<0) {
				n2 = 0; 
			} else { 
				t2 *= t2; 
				gi2 = aPerm[ii+1+aPerm[jj+1]] % 12; 
				n2 = t2 * t2 * dot2(aGrad3[gi2], x2, y2); 
			} 
			// Add contributions from each corner to get the final noise value. 
			// The result is scaled to return values in the interval [0,1].
			return 70 * (n0 + n1 + n2);
		};
		// noise3d
		var noise3d = function noise3d(x,y,z) {
			// Noise contributions from the four corners 
			// Skew the input space to determine which simplex cell we're in 
			s = (x+y+z)*F3; // Very nice and simple skew factor for 3D 
			i = Math.floor(x+s); 
			j = Math.floor(y+s); 
			k = Math.floor(z+s); 
			t = (i+j+k)*G3;
			x0 = x - (i - t); // Unskew the cell origin back to (x,y,z) space 
			y0 = y - (j - t); // The x,y,z distances from the cell origin 
			z0 = z - (k - t); 
			// For the 3D case, the simplex shape is a slightly irregular tetrahedron. 
			// Determine which simplex we are in. 
			// Offsets for second corner of simplex in (i,j,k) coords 
			// Offsets for third corner of simplex in (i,j,k) coords 
			if (x0>=y0) { 
				if (y0>=z0) { // X Y Z order
					i1 = 1;
					j1 = 0;
					k1 = 0;
					i2 = 1;
					j2 = 1;
					k2 = 0;
				} else if (x0>=z0) { // X Z Y order
					i1 = 1;
					j1 = 0;
					k1 = 0;
					i2 = 1;
					j2 = 0;
					k2 = 1;
				} else { // Z X Y order
					i1 = 0;
					j1 = 0;
					k1 = 1;
					i2 = 1;
					j2 = 0;
					k2 = 1;
				} 
			} else { // x0<y0 
				if (y0<z0) { // Z Y X order
					i1 = 0;
					j1 = 0;
					k1 = 1;
					i2 = 0;
					j2 = 1;
					k2 = 1;
				} else if (x0<z0) { // Y Z X order
					i1 = 0;
					j1 = 1;
					k1 = 0;
					i2 = 0;
					j2 = 1;
					k2 = 1;
				} else { // Y X Z order
					i1 = 0;
					j1 = 1;
					k1 = 0;
					i2 = 1;
					j2 = 1;
					k2 = 0;
				}
			} 
			// A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z), 
			// a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and 
			// a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where 
			// c = 1/6.
			x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords 
			y1 = y0 - j1 + G3; 
			z1 = z0 - k1 + G3; 
			x2 = x0 - i2 + F3; // Offsets for third corner in (x,y,z) coords 
			y2 = y0 - j2 + F3; 
			z2 = z0 - k2 + F3; 
			x3 = x0 - 0.5; // Offsets for last corner in (x,y,z) coords 
			y3 = y0 - 0.5; 
			z3 = z0 - 0.5; 
			// Work out the hashed gradient indices of the four simplex corners 
			ii = i&255; 
			jj = j&255; 
			kk = k&255; 
			// Calculate the contribution from the four corners 
			t0 = 0.6 - x0*x0 - y0*y0 - z0*z0; 
			if (t0<0) {
				n0 = 0; 
			} else { 
				t0 *= t0; 
				gi0 = aPerm[ii+aPerm[jj+aPerm[kk]]] % 12; 
				n0 = t0 * t0 * dot3(aGrad3[gi0], x0, y0, z0); 
			}
			t1 = 0.6 - x1*x1 - y1*y1 - z1*z1; 
			if (t1<0) {
				n1 = 0; 
			} else { 
				t1 *= t1; 
				gi1 = aPerm[ii+i1+aPerm[jj+j1+aPerm[kk+k1]]] % 12; 
				n1 = t1 * t1 * dot3(aGrad3[gi1], x1, y1, z1); 
			} 
			t2 = 0.6 - x2*x2 - y2*y2 - z2*z2; 
			if (t2<0) {
				n2 = 0; 
			} else { 
				t2 *= t2; 
				gi2 = aPerm[ii+i2+aPerm[jj+j2+aPerm[kk+k2]]] % 12; 
				n2 = t2 * t2 * dot3(aGrad3[gi2], x2, y2, z2); 
			} 
			t3 = 0.6 - x3*x3 - y3*y3 - z3*z3; 
			if (t3<0) {
				n3 = 0; 
			} else { 
				t3 *= t3; 
				gi3 = aPerm[ii+1+aPerm[jj+1+aPerm[kk+1]]] % 12; 
				n3 = t3 * t3 * dot3(aGrad3[gi3], x3, y3, z3); 
			} 
			// Add contributions from each corner to get the final noise value. 
			// The result is scaled to stay just inside [0,1] 
			return 32 * (n0 + n1 + n2 + n3);
		};
		// noise4d
		var noise4d = function noise4d(x,y,z,w) {
			// from the five corners
			// Skew the (x,y,z,w) space to determine which cell of 24 simplices
			s = (x + y + z + w) * F4; // Factor for 4D skewing
			i = Math.floor(x + s);
			j = Math.floor(y + s);
			k = Math.floor(z + s);
			l = Math.floor(w + s);
			t = (i + j + k + l) * G4; // Factor for 4D unskewing
			x0 = x - (i - t); // The x,y,z,w distances from the cell origin
			y0 = y - (j - t);
			z0 = z - (k - t);
			w0 = w - (l - t);
			// For the 4D case, the simplex is a 4D shape I won't even try to describe.
			// To find out which of the 24 possible simplices we're in, we need to determine the magnitude ordering of x0, y0, z0 and w0.
			// The method below is a good way of finding the ordering of x,y,z,w and then find the correct traversal order for the simplex were in.
			// First, six pair-wise comparisons are performed between each possible pair of the four coordinates, and the results are used to add up binary bits for an integer index.
			c = 0;
			if (x0>y0) {
				c = 0x20;
			}
			if (x0>z0) {
				c |= 0x10;
			}
			if (y0>z0) {
				c |= 0x08;
			}
			if (x0>w0) {
				c |= 0x04;
			}
			if (y0>w0) {
				c |= 0x02;
			}
			if (z0>w0) {
				c |= 0x01;
			}
			// simplex[c] is a 4-vector with the numbers 0, 1, 2 and 3 in some
			// order. Many values of c will never occur, since e.g. x>y>z>w makes
			// x<z, y<w and x<w impossible. Only the 24 indices which have non-zero
			// entries make any sense. We use a thresholding to set the coordinates
			// in turn from the largest magnitude. The number 3 in the "simplex"
			// array is at the position of the largest coordinate.
			sc = simplex[c];
			i1 = sc[0] >= 3 ? 1 : 0;
			j1 = sc[1] >= 3 ? 1 : 0;
			k1 = sc[2] >= 3 ? 1 : 0;
			l1 = sc[3] >= 3 ? 1 : 0;
			// The number 2 in the "simplex" array is at the second largest
			// coordinate.
			i2 = sc[0] >= 2 ? 1 : 0;
			j2 = sc[1] >= 2 ? 1 : 0;
			k2 = sc[2] >= 2 ? 1 : 0;
			l2 = sc[3] >= 2 ? 1 : 0;
			// The number 1 in the "simplex" array is at the second smallest
			// coordinate.
			i3 = sc[0] >= 1 ? 1 : 0;
			j3 = sc[1] >= 1 ? 1 : 0;
			k3 = sc[2] >= 1 ? 1 : 0;
			l3 = sc[3] >= 1 ? 1 : 0;
			// The fifth corner has all coordinate offsets = 1, so no need to look
			// that up.
			x1 = x0 - i1 + G4; // Offsets for second corner in (x,y,z,w)
			y1 = y0 - j1 + G4;
			z1 = z0 - k1 + G4;
			w1 = w0 - l1 + G4;

			x2 = x0 - i2 + G42; // Offsets for third corner in (x,y,z,w)
			y2 = y0 - j2 + G42;
			z2 = z0 - k2 + G42;
			w2 = w0 - l2 + G42;

			x3 = x0 - i3 + G43; // Offsets for fourth corner in (x,y,z,w)
			y3 = y0 - j3 + G43;
			z3 = z0 - k3 + G43;
			w3 = w0 - l3 + G43;

			x4 = x0 + G44; // Offsets for last corner in (x,y,z,w)
			y4 = y0 + G44;
			z4 = z0 + G44;
			w4 = w0 + G44;

			// Work out the hashed gradient indices of the five simplex corners
			ii = i&255;
			jj = j&255;
			kk = k&255;
			ll = l&255;

			// Calculate the contribution from the five corners
			t0 = 0.6 - x0*x0 - y0*y0 - z0*z0 - w0*w0;
			if (t0<0) {
				n0 = 0; 
			} else { 
				t0 *= t0;
				gi0 = aPerm[ii + aPerm[jj + aPerm[kk + aPerm[ll]]]]%32;
				n0 = t0*t0*dot4(grad4[gi0], x0, y0, z0, w0);
			}
			t1 = 0.6 - x1*x1 - y1*y1 - z1*z1 - w1*w1;
			if (t1<0) {
				n1 = 0; 
			} else { 
				t1 *= t1;
				gi1 = aPerm[ii + i1 + aPerm[jj + j1 + aPerm[kk + k1 + aPerm[ll + l1]]]]%32;
				n1 = t1*t1*dot4(grad4[gi1], x1, y1, z1, w1);
			}
			t2 = 0.6 - x2*x2 - y2*y2 - z2*z2 - w2*w2;
			if (t2<0) {
				n2 = 0; 
			} else { 
				t2 *= t2;
				gi2 = aPerm[ii + i2 + aPerm[jj + j2 + aPerm[kk + k2 + aPerm[ll + l2]]]]%32;
				n2 = t2*t2*dot4(grad4[gi2], x2, y2, z2, w2);
			}
			t3 = 0.6 - x3*x3 - y3*y3 - z3*z3 - w3*w3;
			if (t3<0) {
				n3 = 0; 
			} else { 
				t3 *= t3;
				gi3 = aPerm[ii + i3 + aPerm[jj + j3 + aPerm[kk + k3 + aPerm[ll + l3]]]]%32;
				n3 = t3*t3*dot4(grad4[gi3], x3, y3, z3, w3);
			}
			t4 = 0.6 - x4*x4 - y4*y4 - z4*z4 - w4*w4;
			if (t4<0) {
				n4 = 0; 
			} else { 
				t4 *= t4;
				gi4 = aPerm[ii + 1 + aPerm[jj + 1 + aPerm[kk + 1 + aPerm[ll + 1]]]]%32;
				n4 = t4*t4*dot4(grad4[gi4], x4, y4, z4, w4);
			}
			// Sum up and scale the result to cover the range [-1,1]
			return 27.0*(n0 + n1 + n2 + n3 + n4);
		};
		// init
		setPerm();
		// return
		return {
			noise: function(x,y,z,w) {
				fResult = 0;
				for (g=0;g<iOctaves;g++) {
					fFreq = aOctFreq[g];
					fPers = aOctPers[g];
					switch (arguments.length) {
						case 4:  fResult += fPers*noise4d(fFreq*x,fFreq*y,fFreq*z,fFreq*w); break;
						case 3:  fResult += fPers*noise3d(fFreq*x,fFreq*y,fFreq*z); break;
						default: fResult += fPers*noise2d(fFreq*x,fFreq*y);
					}
				}
				return ( fResult*fPersMax + 1 )*0.5;
			},noiseDetail: function(octaves,falloff) {
				iOctaves = octaves||iOctaves;
				fPersistence = falloff||fPersistence;
				octFreqPers();
			},setRng: function(r) {
				oRng = r;
				setPerm();
			},toString: function() {
				return "[object PerlinSimplex "+iOctaves+" "+fPersistence+"]";
			}
		};
	}();
}