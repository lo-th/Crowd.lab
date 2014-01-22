

var TERRAIN = { REVISION: '0.1' };

TERRAIN.ToRad = Math.PI / 180;

TERRAIN.Generate = function( target, size, Tsize, maxHeight,  seaLevel ){
    this.data = null;
    this.geometry = null;
    this.mesh = null;
    this.size = size || 64;
    this.Tsize = Tsize || 256;
    this.terrain = null;
    this.seaLevel =  seaLevel || 0;
    this.target = target;
    this.scaleH = 3
    this.maxY = maxHeight || 100;
    this.withUnderWater = false;

    this.colors = [0x505050, 0x707050, 0x909050, 0xAAAA50, 0xFFFF50];
}

TERRAIN.Generate.prototype = {
    constructor: TERRAIN.Generate,

    clear:function () {

    },
    init:function () {
        var canvas = document.createElement( 'canvas' );
        canvas.width = this.size;
        canvas.height = this.size;
        var context = canvas.getContext( '2d' );

        var s2 = this.size

        var imgData = context.getImageData(0,0,s2,s2);
        var area = this.size * this.size;
        this.data = new Float32Array( area );
        for ( var i = 0; i < area; i ++ ) {
            this.data[i] = 0
        }

        var fNoise;
        var aPixels = imgData.data;

        //var Prng;
        var g = new TERRAIN.Prng();//.seed = 282;
        g.seed = 282;
        PerlinSimplex.setRng(g);
        //PerlinSimplex.noiseDetail(3,.5);
        PerlinSimplex.noiseDetail(3,0.3);
        var complex = .02;//0422;
        var zz = Math.random()*100;
        var j = 0;
        var ii, x, y, xx, yy, pz;



        for (i = 0, n=aPixels.length; i < n; i += 4) {
            ii = Math.floor(i/4);
            x = ii%this.size;
            y = Math.floor(ii/s2);
            xx = 0+x*complex;
            yy = 0+y*complex;
            fNoise = Math.floor(PerlinSimplex.noise(xx,yy,zz)*256);
            //pz =  Math.floor((this.maxY * fNoise/255) - this.seaLevel);
            pz =  ((this.maxY * fNoise/255) - this.seaLevel);
            // no under water
            if(!this.withUnderWater)if(pz<0) pz = 0

            this.data[j++] = pz;
        }

        this.build();
    },
    
    /*initImage:function (img) {
        var canvas = document.createElement( 'canvas' );
        canvas.width = this.size;
        canvas.height = this.size;
        var context = canvas.getContext( '2d' );

        var area = this.size * this.size
        this.data = new Float32Array( area );
        context.drawImage(img,0,0);
        for ( var i = 0; i < area; i ++ ) {
            this.data[i] = 0
        }

        var imgd = context.getImageData(0, 0, this.size, this.size);
        var pix = imgd.data;

        var j=0;
        for (var i = 0, n = pix.length; i < n; i += (4)) {
            var all = pix[i]+pix[i+1]+pix[i+2];
            this.data[j++] = all/30;
        }

        this.build();
    },*/
    getPos:function (z, x) {
        var colx =Math.floor((x / this.Tsize + .5) * ( this.size));
        var colz =Math.floor((-z / this.Tsize + .5) * ( this.size));
        //var colx =((x / this.Tsize + .5) * ( this.size));
        //var colz =((-z / this.Tsize + .5) * ( this.size));
        //var mz = Math.floor(colz/this.Tsize);
        //var pix = Math.floor(mz*this.Tsize+colx);
        var pix = Math.floor(((colz-1)*this.size)+colx);
        y = this.data[pix-1];

        return y;
    },
    build:function () {
        this.geometry = new THREE.PlaneGeometry(this.Tsize, this.Tsize, this.size-1, this.size-1);
        var i = this.geometry.vertices.length;
        while(i--){
            this.geometry.vertices[i].z = this.data[i];
        }

        /*console.log(this.geometry.vertices.length/this.size)

        var colx =Math.floor((550 / this.Tsize+ .5) * ( this.size ));
        var colz =Math.floor((550 / this.Tsize + .5) * ( this.size));
        var pix = Math.floor(((colz-1)*this.size)+colx);
        console.log(colx, colz,  pix-1, this.geometry.vertices.length)

        console.log("0=", this.geometry.vertices[0].x, this.geometry.vertices[0].y, this.geometry.vertices[0].z);
        console.log("0=", this.getPos(this.geometry.vertices[0].x, this.geometry.vertices[0].y));
        
        var p0 = this.geometry.vertices.length-1

        console.log("300=", this.geometry.vertices[p0].x, this.geometry.vertices[p0].y, this.geometry.vertices[p0].z);
        console.log("300=", this.getPos(this.geometry.vertices[p0].x, this.geometry.vertices[p0].y));

*/

        THREE.GeometryUtils.triangulateQuads( this.geometry );
        //this.geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );
        //this.geometry.applyMatrix( new THREE.Matrix4().makeRotationY( - Math.PI / 2 ) );

        this.geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - 90 * TERRAIN.ToRad ) );
        this.geometry.applyMatrix( new THREE.Matrix4().makeRotationY( - 90 * TERRAIN.ToRad ) );

        // Calculate per-vertex normals.
        this.geometry.computeFaceNormals();
        this.geometry.computeVertexNormals();
        this.geometry.verticesNeedUpdate = true;
        this.geometry.elementsNeedUpdate = true;
        this.geometry.normalsNeedUpdate  = true;

        var material = new THREE.MeshBasicMaterial( {
            color: 0x448844, shading: THREE.FlatShading,
            wireframe: true, wireframeLinewidth: 2,
            transparent: true } );

        this.mesh = new THREE.Mesh( this.geometry, material );

        this.meshToVBO();
    },
    meshToVBO:function () {
        var triangles = this.mesh.geometry.faces.length;

        var geometry = new THREE.BufferGeometry();
        geometry.attributes = {
            index: {
                itemSize: 1,
                array: new Int16Array( triangles * 3 ),
                numItems: triangles * 3
            },
            position: {
                itemSize: 3,
                array: new Float32Array( triangles * 3 * 3 ),
                numItems: triangles * 3 * 3
            },
            normal: {
                itemSize: 3,
                array: new Float32Array( triangles * 3 * 3 ),
                numItems: triangles * 3 * 3
            },
            color: {
                itemSize: 3,
                array: new Float32Array( triangles * 3 * 3 ),
                numItems: triangles * 3 * 3
            }
        }

        var chunkSize = 2000;

        var indices = geometry.attributes.index.array;

        for ( var i = 0; i < indices.length; i ++ ) {
          indices[ i ] = i % ( 3 * chunkSize );
        }
                    
        var positions = geometry.attributes.position.array;
        var normals = geometry.attributes.normal.array;
        var colors = geometry.attributes.color.array;

        var color = new THREE.Color();

        var faces = this.mesh.geometry.faces;
        var verts = this.mesh.geometry.vertices;

        for ( var i = 0; i < triangles; i++ ) {

            var ai = faces[ i ].a
            var bi = faces[ i ].b
            var ci = faces[ i ].c

            positions[ i * 9 ]     = verts[ ai ].x;
            positions[ i * 9 + 1 ] = verts[ ai ].y;
            positions[ i * 9 + 2 ] = verts[ ai ].z;

            positions[ i * 9 + 3 ] = verts[ bi ].x;
            positions[ i * 9 + 4 ] = verts[ bi ].y;
            positions[ i * 9 + 5 ] = verts[ bi ].z;

            positions[ i * 9 + 6 ] = verts[ ci ].x;
            positions[ i * 9 + 7 ] = verts[ ci ].y;
            positions[ i * 9 + 8 ] = verts[ ci ].z;

           //

            var vn = this.mesh.geometry.faces[ i ].vertexNormals

            normals[ i * 9 ]     = vn[ 0 ].x;
            normals[ i * 9 + 1 ] = vn[ 0 ].y;
            normals[ i * 9 + 2 ] = vn[ 0 ].z;

            normals[ i * 9 + 3 ] = vn[ 1 ].x;
            normals[ i * 9 + 4 ] = vn[ 1 ].y;
            normals[ i * 9 + 5 ] = vn[ 1 ].z;

            normals[ i * 9 + 6 ] = vn[ 2 ].x;
            normals[ i * 9 + 7 ] = vn[ 2 ].y;
            normals[ i * 9 + 8 ] = vn[ 2 ].z;

            //
            

            var ca = verts[ai].y + verts[bi].y + verts[ci].y / 3
            var cb = 2.0 / ca;

            if ( ca > 42 ) {
                //color.setRGB( 0.5, 0.6, 0.02 );
                color.setHex(this.colors[4])
            } else if ( ca > 7.3 ) {
                //color.setRGB( 0.1, 0.5 + cb, 0.1 );
                color.setHex(this.colors[3])
            } else if ( ca > 6.3 ) {
                //color.setRGB( 0.3, 0.3, 0.5 );
                color.setHex(this.colors[2])
            } else if ( ca > 5.3 ) {
                //color.setRGB( 0.5, 0.5, 0.0 );
                color.setHex(this.colors[1])
            } else {
                //color.setRGB( 0.0, 0.2, 0.5 );
                color.setHex(this.colors[0])
            }

            colors[ i * 9 ]     = color.r;
            colors[ i * 9 + 1 ] = color.g;
            colors[ i * 9 + 2 ] = color.b;

            colors[ i * 9 + 3 ] = color.r;
            colors[ i * 9 + 4 ] = color.g;
            colors[ i * 9 + 5 ] = color.b;

            colors[ i * 9 + 6 ] = color.r;
            colors[ i * 9 + 7 ] = color.g;
            colors[ i * 9 + 8 ] = color.b;

        }

        //

        geometry.offsets = [];

        var offsets = triangles / chunkSize;

        for ( var i = 0; i < offsets; i ++ ) {

                var offset = {
                start: i * chunkSize * 3,
                index: i * chunkSize * 3,
                count: Math.min( triangles - ( i * chunkSize ), chunkSize ) * 3
            };

            geometry.offsets.push( offset );

        }
                    
        geometry.computeBoundingSphere();

        //

        var material = new THREE.MeshPhongMaterial( {
            color: 0x909090, ambient: 0x303030, specular: 0x808080, shininess: 20,
            side: THREE.FrontSide, vertexColors: THREE.VertexColors//, depthWrite: false
        } );

        this.terrain = new THREE.Mesh( geometry, material );
        this.target.add( this.terrain );
    }



}

TERRAIN.Prng = function() {
    var iMersenne = 2147483647;
    var rnd = function(seed) {
        if (arguments.length) {
            that.seed = arguments[0];
        }
        that.seed = that.seed*16807%iMersenne;
        return that.seed;
    };
    var that = {
        seed: 123,
        rnd: rnd,
        random: function(seed) {
            if (arguments.length) {
                that.seed = arguments[0];
            }
            return rnd()/iMersenne;
        }
    };
    return that;
};