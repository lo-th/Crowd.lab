

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
    this.maxHeight = maxHeight || 100;
    this.ratio = maxHeight/765;
    this.withUnderWater = false;

    this.position = new THREE.Vector3( 0, 0, 0 )

    this.uniforms = null;

    this.colors = [0x505050, 0x707050, 0x909050, 0xAAAA50, 0xFFFF50];

    this.bumpTexture = new THREE.Texture();

    this.heightMap = null;
    this.normalMap = null;

    this.uniformsNoise = null;
    this.uniformsNormal = null;
    this.uniformsTerrain = null;

    this.mlib = {};
    this.textureCounter=0;

    this.sceneRenderTarget = null;
    this.cameraOrtho = null;

    this.specularMap = null;
    this.diffuseTexture1 = null;
    this.W = 0;
    this.H = 0;

    this.quadTarget = null;

    this.animDelta = 0;
    this.animDeltaDir = -1;
    this.lightVal = 0;
    this.lightDir = 1;

    this.updateNoise = true;

    this.tmpData = null;



}

TERRAIN.Generate.prototype = {
    constructor: TERRAIN.Generate,

    clear:function () {

    },
    init:function (W,H) {
        this.W = W || 512;
        this.H = H || 512;

        this.generateData(this.size, this.size, new THREE.Color(0x000000));

        this.sceneRenderTarget = new THREE.Scene();

        this.cameraOrtho = new THREE.OrthographicCamera( this.W / - 2, this.W / 2, this.H / 2, this.H / - 2, -10000, 10000 );
        this.cameraOrtho.position.z = 100;

        this.sceneRenderTarget.add( this.cameraOrtho );

        // HEIGHT + NORMAL MAPS

        var normalShader = THREE.NormalMapShader;

        //var rx = 256, ry = 256;
        var pars = { minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };

        this.heightMap  = new THREE.WebGLRenderTarget( this.size, this.size, pars );
        this.normalMap = new THREE.WebGLRenderTarget( this.size, this.size, pars );

        this.uniformsNoise = {

            time:   { type: "f", value: 1.0 },
            scale:  { type: "v2", value: new THREE.Vector2( 1.5, 1.5 ) },
            offset: { type: "v2", value: new THREE.Vector2( 0, 0 ) }

        };

        this.uniformsNormal = THREE.UniformsUtils.clone( normalShader.uniforms );

        this.uniformsNormal.height.value = 0.05;
        this.uniformsNormal.resolution.value.set( this.size, this.size );
        this.uniformsNormal.heightMap.value = this.heightMap;

        // NOISE

        var terrainNoise = THREE.ShaderNoise[ "noise" ];

        this.specularMap = new THREE.WebGLRenderTarget( 512, 512, pars );

        this.diffuseTexture1 = THREE.ImageUtils.loadTexture( "images/grass2.jpg")//, null, this.loadTextures() );

        this.applyShader();
            /*function () {

            this.loadTextures;
           // this.applyShader( THREE.LuminosityShader, this.diffuseTexture1, this.specularMap , W, H );

        } );*/

        var diffuseTexture2 = THREE.ImageUtils.loadTexture( "images/background6.jpg")//, null, this.loadTextures() );
        //var detailTexture = THREE.ImageUtils.loadTexture( "images/grasslight-big-nm.jpg", null, loadTextures );
        var detailTexture = THREE.ImageUtils.loadTexture( "images/grasslight_512.jpg")//, null, this.loadTextures() );

        this.diffuseTexture1.wrapS = this.diffuseTexture1.wrapT = THREE.RepeatWrapping;
        diffuseTexture2.wrapS = diffuseTexture2.wrapT = THREE.RepeatWrapping;
        detailTexture.wrapS = detailTexture.wrapT = THREE.RepeatWrapping;
        this.specularMap.wrapS = this.specularMap.wrapT = THREE.RepeatWrapping;

        // MAP

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

        // TERRAIN SHADER

        var terrainShader = THREE.ShaderTerrain[ "terrain" ];

        this.uniformsTerrain = THREE.UniformsUtils.clone( terrainShader.uniforms );

        this.uniformsTerrain[ "oceanTexture" ].value = oceanTexture;
        this.uniformsTerrain[ "sandyTexture" ].value = sandyTexture;
        this.uniformsTerrain[ "grassTexture" ].value = grassTexture;
        this.uniformsTerrain[ "rockyTexture" ].value = rockyTexture;
        this.uniformsTerrain[ "snowyTexture" ].value = snowyTexture;

        this.uniformsTerrain[ "tNormal" ].value = this.normalMap;
        this.uniformsTerrain[ "uNormalScale" ].value = 10//3.5;

        this.uniformsTerrain[ "tDisplacement" ].value = this.heightMap;

        this.uniformsTerrain[ "tDiffuse1" ].value = this.diffuseTexture1;
        this.uniformsTerrain[ "tDiffuse2" ].value = diffuseTexture2;
        this.uniformsTerrain[ "tSpecular" ].value = this.specularMap;
        this.uniformsTerrain[ "tDetail" ].value = detailTexture;

        this.uniformsTerrain[ "enableDiffuse1" ].value = true;
        this.uniformsTerrain[ "enableDiffuse2" ].value = true;
        this.uniformsTerrain[ "enableSpecular" ].value = true;

        this.uniformsTerrain[ "diffuse" ].value.setHex( 0x505050 );
        this.uniformsTerrain[ "specular" ].value.setHex( 0xffffff );
        this.uniformsTerrain[ "ambient" ].value.setHex( 0x111111 );

        this.uniformsTerrain[ "shininess" ].value = 50;

        this.uniformsTerrain[ "uDisplacementScale" ].value = this.maxHeight;

        //uniformsTerrain[ "uRepeatOverlay" ].value.set( 6, 6 );
        this.uniformsTerrain[ "uRepeatOverlay" ].value.set( 6, 6 );

        var params = [
                        [ 'heightmap',  terrainNoise.fragmentShader, terrainNoise.vertexShader, this.uniformsNoise, false ],
                        [ 'normal',     normalShader.fragmentShader,  normalShader.vertexShader, this.uniformsNormal, false ],
                        [ 'terrain',    terrainShader.fragmentShader, terrainShader.vertexShader, this.uniformsTerrain, true ]
                     ];

        var material;
        for( var i = 0; i < params.length; i ++ ) {

            material = new THREE.ShaderMaterial( {

                uniforms:       params[ i ][ 3 ],
                vertexShader:   params[ i ][ 2 ],
                fragmentShader: params[ i ][ 1 ],
                lights:         params[ i ][ 4 ],
                fog:            true
                } );

            this.mlib[ params[ i ][ 0 ] ] = material;

        }

        var plane = new THREE.PlaneGeometry( this.W, this.H );

        this.quadTarget = new THREE.Mesh( plane, new THREE.MeshBasicMaterial( { color: 0x000000 } ) );
        this.quadTarget.position.z = -500;
        this.sceneRenderTarget.add( this.quadTarget );


        var geometry = new THREE.PlaneGeometry(this.Tsize, this.Tsize, this.size, this.size);
        geometry.computeFaceNormals();
        geometry.computeVertexNormals();
        geometry.computeTangents();

        geometry.normalsNeedUpdate = true;
        geometry.tangentsNeedUpdate = true;
        
        var geo = THREE.BufferGeometryUtils.fromGeometry( geometry );
        geometry.dispose();

        this.mesh = new THREE.Mesh(  geo, this.mlib[ "terrain" ] );
        this.target.add( this.mesh );
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.y = -this.seaLevel;

        this.mesh.castShadow = false;
        this.mesh.receiveShadow = true;
    },
    applyShader:function () {
        var shader = THREE.LuminosityShader;

        var shaderMaterial = new THREE.ShaderMaterial( {

            fragmentShader: shader.fragmentShader,
            vertexShader: shader.vertexShader,
            uniforms: THREE.UniformsUtils.clone( shader.uniforms )

        } );

        shaderMaterial.uniforms[ "tDiffuse" ].value = this.diffuseTexture1;

        var sceneTmp = new THREE.Scene();

        var meshTmp = new THREE.Mesh( new THREE.PlaneGeometry( this.W, this.H ), shaderMaterial );
        meshTmp.position.z = -500;

        sceneTmp.add( meshTmp );

        renderer.render( sceneTmp, this.cameraOrtho, this.specularMap, true );

    },
    loadTextures:function () {

        this.textureCounter += 1;

        if ( this.textureCounter == 3 )  {

           // terrain.visible = true;
           this.mesh.visible = true;


        }

    },
    generateData : function (width, height, color) {
        var size = width * height;
        var data = new Uint8Array(4 * size);

        var r = Math.floor(color.r * 255);
        var g = Math.floor(color.g * 255);
        var b = Math.floor(color.b * 255);

        for (var i = 0; i < size; i++) {
            if (i == size / 2 + width / 2) {
                data[i * 4] = 255;
                data[i * 4 + 1] = g;
                data[i * 4 + 2] = b;
                data[i * 4 + 3] = 255;
            } else {
                data[i * 4] = r;
                data[i * 4 + 1] = g;
                data[i * 4 + 2] = b;
                data[i * 4 + 3] = 255;
            }
        }

        this.tmpData = data;
    },
    update:function (delta) {
        if ( this.mesh ) {

            var time = Date.now() * 0.001;

            var fLow = 0.01, fHigh = 0.8;

            this.lightVal = THREE.Math.clamp( this.lightVal + 0.5 * delta * this.lightDir, fLow, fHigh );

            var valNorm = ( this.lightVal - fLow ) / ( fHigh - fLow );

            scene.fog.color.setHSL( 43/360, 0.33, this.lightVal-0.03);

            hemiLight.color.setHSL( 220/360, 0.17, this.lightVal-0.1  );
            hemiLight.groundColor.setHSL( 43/360, 0.33, this.lightVal-0.03 );

            directionalLight.intensity = THREE.Math.mapLinear( valNorm, 0, 1, 0.1, 1.15 );
            pointLight.intensity = THREE.Math.mapLinear( valNorm, 0, 1, 0.9, 1.5 );

            sbox.opacity = (0.8-this.lightVal)+0.2;

            this.uniformsTerrain[ "uNormalScale" ].value = THREE.Math.mapLinear( valNorm, 0, 1, 0.6, 3.5 );

            if (  this.updateNoise ) {

                this.animDelta = THREE.Math.clamp( this.animDelta + 0.00075 * this.animDeltaDir, 0, 0.05 );
                this.uniformsNoise[ "time" ].value += delta * this.animDelta;

                this.uniformsNoise[ "offset" ].value.x += delta * 0.05;

                this.uniformsTerrain[ "uOffset" ].value.x = 4 * this.uniformsNoise[ "offset" ].value.x;

                this.quadTarget.material =  this.mlib[ "heightmap" ];
                renderer.render( this.sceneRenderTarget, this.cameraOrtho, this.heightMap, true );

                var gl = renderer.getContext();
                gl.readPixels( 0, 0, this.size, this.size, gl.RGBA, gl.UNSIGNED_BYTE, this.tmpData );

                this.quadTarget.material =  this.mlib[ "normal" ];
                renderer.render( this.sceneRenderTarget, this.cameraOrtho, this.normalMap, true );
            }
        }

    },
    anim:function () {
        this.animDeltaDir *= -1;
    },
    night:function () {
        this.lightDir *= -1;
    },
    getZ:function (x, z) {
        var colx =Math.floor((x / this.Tsize + .5) * ( this.size));
        var colz =Math.floor((-z / this.Tsize + .5) * ( this.size));
        var pixel = Math.floor(((colz-1)*this.size)+colx)*4;
        var result = (this.tmpData[pixel+0]+this.tmpData[pixel+1]+this.tmpData[pixel+2])*this.ratio;
        return result-this.seaLevel+4;
    }

}

// WATER

TERRAIN.Water = function(renderer, camera, scene) {
    this.waterNormals = new THREE.ImageUtils.loadTexture( 'images/water.jpg' );
    this.waterNormals.wrapS = this.waterNormals.wrapT = THREE.RepeatWrapping; 
    //this.waterNormal.format = THREE.RGBFormat;

    this.water = new THREE.Water( renderer, camera, scene , {
        textureWidth: 256, 
        textureHeight: 256,
        waterNormals: this.waterNormals,
        alpha:  0.8,
        sunDirection:  directionalLight.position.normalize(),
        sunColor: 0xffffee,
        waterColor: 0x001e0f,
        distortionScale: 50.0,
        fog: true,
    } );

    this.mirrorMesh = new THREE.Mesh( new THREE.PlaneGeometry(10000, 10000, 10, 10 ),  this.water.material);
    this.mirrorMesh.add( this.water );
    this.mirrorMesh.rotation.x = - Math.PI * 0.5;
    this.mirrorMesh.position.y = -0.1
    scene.add( this.mirrorMesh );
}

TERRAIN.Water.prototype = {
    constructor: TERRAIN.Water,
    clear:function () {
        scene.remove( this.mirrorMesh );
    },
    render:function () {
        this.water.material.uniforms.time.value += 1.0 / 60.0;
        this.water.render();
    }
}