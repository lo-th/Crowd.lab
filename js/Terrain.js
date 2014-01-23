

var TERRAIN = { REVISION: '0.1' };

TERRAIN.ToRad = Math.PI / 180;

TERRAIN.Generate = function( target, size, Tsize, maxHeight,  seaLevel ){
    this.data = null;
    this.geometry = null;
    this.mesh = null;
    this.mesh2 = null;
    this.size = size || 64;
    this.Tsize = Tsize || 256;
    this.terrain = null;
    this.seaLevel =  seaLevel || 0;
    this.target = target;
    this.scaleH = 3
    this.maxY = maxHeight || 100;
    this.withUnderWater = false;
    this.rng = new TERRAIN.Prng();

    
    this.area = this.size * this.size;
    this.pixelArea = this.area * 4;


    this.material = null;
    this.customUniforms =null;

    this.canvas = null;
    this.context =null;
    this.imgData =null;

    this.colors = [0x505050, 0x707050, 0x909050, 0xAAAA50, 0xFFFF50];
}

TERRAIN.Generate.prototype = {
    constructor: TERRAIN.Generate,

    clear:function () {

    },
    init:function () {

    	// base geometry
    	this.geometry = new THREE.PlaneGeometry(this.Tsize, this.Tsize, this.size-1, this.size-1);
    	this.geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - 90 * TERRAIN.ToRad ) );
        this.geometry.applyMatrix( new THREE.Matrix4().makeRotationY( - 90 * TERRAIN.ToRad ) );

        this.canvas = document.createElement( 'canvas' );
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        this.context = this.canvas.getContext( '2d' );
        this.imgData = this.context.createImageData(this.size,this.size);//this.context.getImageData(0,0,this.size,this.size);

        // y data
        this.data = new Float32Array( this.area );
        for ( var i = 0; i < this.area; i ++ ) {
            this.data[i] = 0
        }

        this.test();
        

    },
    test:function () {

    	this.noize();
    	this.makeMaterial();

        this.build();
    },
    noize:function () {
    	var fNoise;
        this.rng.seed = 282;
        PerlinSimplex.setRng( this.rng );
        PerlinSimplex.noiseDetail(3,0.5);
        var complex = .02;//0422;
        var zz = Math.random()*100;
        
        var ii, x, y, xx, yy, pz;
        var j = 0;



        for (i = 0; i < this.pixelArea; i += 4) {
            ii = Math.floor(i/4);
            x = ii%this.size;
            y = Math.floor(ii/this.size);
            xx = 0+x*complex;
            yy = 0+y*complex;
            fNoise = Math.floor(PerlinSimplex.noise(xx,yy,zz)*256);

            // update image
            //this.imgData.data[i+0] = this.imgData.data[i+1] =this.imgData.data[i+2] = fNoise;
            //this.imgData.data[i+3] = 255;

            pz =  Math.floor((this.maxY * fNoise/255) - this.seaLevel);
            //pz =  ((this.maxY * fNoise/255) - this.seaLevel);

            this.imgData.data[i+0] = this.imgData.data[i+1] =this.imgData.data[i+2] = fNoise;
            this.imgData.data[i+3] = 255;




            // no under water
            if(!this.withUnderWater)if(pz<0) pz = 0

            this.data[j++] = pz;
        }

        this.context.putImageData(this.imgData,0,0);
    },


    getZ:function (z, x) {
        var colx =Math.floor((x / this.Tsize + .5) * ( this.size));
        var colz =Math.floor((-z / this.Tsize + .5) * ( this.size));
        var pix = Math.floor(((colz-1)*this.size)+colx);
        return this.data[pix-1];
    },
    makeMaterial:function(){

		// texture used to generate "bumpiness"
		//var bumpTexture = new THREE.ImageUtils.loadTexture( 'images/bone.jpg' );
		var bumpTexture = new THREE.Texture(this.canvas);
        bumpTexture.needsUpdate = true;
		bumpTexture.wrapS = bumpTexture.wrapT = THREE.RepeatWrapping; 
		// magnitude of normal displacement
		var bumpScale   =  (this.maxY+this.seaLevel)*0.67//*100)/255)//Math.floor(((this.maxY)/255)*100);//this.maxY+ this.seaLevel// 255//Math.floor((this.maxY ) - this.seaLevel);//255.0;
		
		var oceanTexture = new THREE.ImageUtils.loadTexture( 'images/rock-512.jpg' );
		oceanTexture.wrapS = oceanTexture.wrapT = THREE.RepeatWrapping; 
		
		var sandyTexture = new THREE.ImageUtils.loadTexture( 'images/grass-512.jpg' );
		sandyTexture.wrapS = sandyTexture.wrapT = THREE.RepeatWrapping; 
		
		var grassTexture = new THREE.ImageUtils.loadTexture( 'images/grass1.jpg' );
		grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping; 
		
		var rockyTexture = new THREE.ImageUtils.loadTexture( 'images/grass2.jpg' );
		rockyTexture.wrapS = rockyTexture.wrapT = THREE.RepeatWrapping; 
		
		var snowyTexture = new THREE.ImageUtils.loadTexture( 'images/rock.jpg' );
		snowyTexture.wrapS = snowyTexture.wrapT = THREE.RepeatWrapping; 

		
		// use "this." to create global object
		this.customUniforms = {
			bumpTexture:	{ type: "t", value: bumpTexture },
			bumpScale:	    { type: "f", value: bumpScale },
			oceanTexture:	{ type: "t", value: oceanTexture },
			sandyTexture:	{ type: "t", value: sandyTexture },
			grassTexture:	{ type: "t", value: grassTexture },
			rockyTexture:	{ type: "t", value: rockyTexture },
			snowyTexture:	{ type: "t", value: snowyTexture },
		};
		
		// create custom material from the shader code above
		//   that is within specially labelled script tags
		this.material = new THREE.ShaderMaterial( 
		{
		    uniforms: this.customUniforms,
			vertexShader: TERRAIN.Vshader ,
			fragmentShader: TERRAIN.Fshader//,
			 //side: THREE.FrontSide,
			 //vertexColors: THREE.VertexColors
			//transparent: true
			// side: THREE.DoubleSide
		});

    },
    build:function () {

       /* var i = this.geometry.vertices.length;
        while(i--){
            this.geometry.vertices[i].y = this.data[i];
        }

        THREE.GeometryUtils.triangulateQuads( this.geometry );

        this.geometry.computeFaceNormals();
        this.geometry.computeVertexNormals();
        this.geometry.verticesNeedUpdate = true;
        this.geometry.elementsNeedUpdate = true;
        this.geometry.normalsNeedUpdate  = true;
        */
        

        /*var material = new THREE.MeshBasicMaterial( {
            color: 0x448844, shading: THREE.FlatShading,
            wireframe: true, wireframeLinewidth: 2,
        } );*/


        if(this.mesh){
        	this.mesh.material = this.material
        	//this.target.remove( this.mesh );
        	//this.mesh.geometry.dispose();
        } else{

    	var geo = THREE.BufferGeometryUtils.fromGeometry( this.geometry );
        this.mesh = new THREE.Mesh( geo, this.material );
        this.mesh.position.y = -this.seaLevel
        this.target.add( this.mesh );
        }

        //this.meshToVBO();
    }/*,
    meshToVBO:function () {
    	//var tmp = this.mesh.clone();
    	//var tgeo = this.geometry;
        var triangles = this.geometry.faces.length;

        var geo = new THREE.BufferGeometry();
        geo.attributes = {
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

        var indices = geo.attributes.index.array;

        for ( var i = 0; i < indices.length; i ++ ) {
          indices[ i ] = i % ( 3 * chunkSize );
        }
   
        var positions = geo.attributes.position.array;
        var normals = geo.attributes.normal.array;
        var colors = geo.attributes.color.array;

        var color = new THREE.Color();

        var faces = this.geometry.faces;
        var verts = this.geometry.vertices;

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

            var vn = this.geometry.faces[ i ].vertexNormals

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

        geo.offsets = [];

        var offsets = triangles / chunkSize;

        for ( var i = 0; i < offsets; i ++ ) {

                var offset = {
                start: i * chunkSize * 3,
                index: i * chunkSize * 3,
                count: Math.min( triangles - ( i * chunkSize ), chunkSize ) * 3
            };

            geo.offsets.push( offset );

        }
                    
        //geometry.computeBoundingSphere();

        //

        var material = new THREE.MeshPhongMaterial( {
            color: 0x909090, ambient: 0x303030, specular: 0x808080, shininess: 20,
            side: THREE.FrontSide, vertexColors: THREE.VertexColors//, depthWrite: true, depthTest:true, blending: THREE.MultiplyBlending, transparent:true
        } );

        if(this.mesh2){
        	this.target.remove( this.mesh2 );
        	this.mesh2.geometry.dispose();
        }

        this.mesh2 = new THREE.Mesh( geo, material );
        this.target.add( this.mesh2 );
        this.mesh2.position.y =0.1
    }*/



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

TERRAIN.Vshader = [
"uniform sampler2D bumpTexture;",
"uniform float bumpScale;",
"varying float vAmount;",
"varying vec2 vUV;",
"void main(){ ",
"	vUV = uv;",
"	vec4 bumpData = texture2D( bumpTexture, uv );",
"	vAmount = bumpData.r;",
"    vec3 newPosition = position + normal * bumpScale * vAmount;",
"	gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 ); }"
].join("\n");

TERRAIN.Fshader = [
"uniform sampler2D oceanTexture;",
"uniform sampler2D sandyTexture;",
"uniform sampler2D grassTexture;",
"uniform sampler2D rockyTexture;",
"uniform sampler2D snowyTexture;",
"varying vec2 vUV;",
"varying float vAmount;",
"void main() {",
"	vec4 water = (smoothstep(0.01, 0.25, vAmount) - smoothstep(0.24, 0.26, vAmount)) * texture2D( oceanTexture, vUV * 20.0 );",
"	vec4 sandy = (smoothstep(0.24, 0.27, vAmount) - smoothstep(0.28, 0.31, vAmount)) * texture2D( sandyTexture, vUV * 20.0 );",
"	vec4 grass = (smoothstep(0.28, 0.32, vAmount) - smoothstep(0.35, 0.40, vAmount)) * texture2D( grassTexture, vUV * 20.0 );",
"	vec4 rocky = (smoothstep(0.30, 0.50, vAmount) - smoothstep(0.40, 0.70, vAmount)) * texture2D( rockyTexture, vUV * 20.0 );",
"	vec4 snowy = (smoothstep(0.50, 0.65, vAmount))                                   * texture2D( snowyTexture, vUV * 20.0 );",
"	gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0) + water + sandy + grass + rocky + snowy; }"
].join("\n");
