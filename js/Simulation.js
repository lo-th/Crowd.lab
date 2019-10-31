function Simulation(){

    this.content = view.getContent() 
    this.agents = view.getBody();
    this.solids = view.getSolid();
    this.geo = view.getGeo();
    this.mat = view.getMat();

    this.mat['agent'] = new THREE.MeshBasicMaterial({ color:0x7caccc, wireframe:true });
    this.mat['agentHide'] = new THREE.MeshBasicMaterial({ color:0x7caccc, wireframe:true, transparent:true, opacity:0.1 });
    this.mat['heros'] = view.material({ name:'heros', skinning:true, map: view.texture( 'heros_c.jpg' ), roughness:0.75, metalness:0.25 })//new THREE.MeshLambertMaterial({ color:0xffffff, skinning:true, shadowSide:false, reflectivity:0.4 });
    this.mat['way'] = new THREE.MeshBasicMaterial({ color:0xFF8800, wireframe:true });
    this.mat['wall'] = view.material({ name:'wall', color:0x0088FF, transparent:true, opacity:0.3 })//new THREE.MeshLambertMaterial({  })

}

Simulation.prototype = {

    update: function () {

        var speed;

        var i = this.agents.length, a, n, s, c, ca;

        //this.agents.forEach( function( a, id ) {
        while(i--){

            a = this.agents[i];

            n = ( i * 5 );

            s = Gr[n]
            a.position.set( Gr[n+1], 0, Gr[n+2] );
            a.rotation.y = -Gr[n+3] - Math.PI90;

            c = a.children[0];

            // time scale
            var ts = s*3;
            ts = ts < 0.15 ? 0.15 : ts;

            // transition
            var tt = 0.5;//s*2;
           // tt = tt < 0.1 ? 0.1 : tt;

            //if(i===0) console.log(s)

            if( c ){
                ca = c.currentAnimation.clip.name;
                c.setTimeScale( ts );
                if( s > 0.25 ){
                    //c.setTimeScale( s*2 );
                    if(ca !== 'run') c.play( 'run', tt )
                } else if(s>0){
                    //c.setTimeScale( s*2 );
                    if(ca !== 'walk') c.play( 'walk', tt )
                } else{ 
                    //c.setTimeScale( 0.25*2 );
                    if(ca !== 'idle') c.play( 'idle', tt )
                }
            }

            

        }//);

    },

    removeAgent: function ( o ) {

        o = o || {};
        
        var h = o.id !== undefined ? this.agents[o.id] : o.h; 
        var c = h.children[0];
        if(c){
            c.stop();
            h.remove(c);
        }

        this.content.remove( h );

        if( o.id ){

            this.agents.splice( o.id, 1 );
            crowd.send( 'remove', o );

        }

    },

    agent: function ( o ) {

    	o = o || {};

        var radius = o.radius || 2;
        var pos = o.pos || [0,0,0];

        var m = new THREE.Mesh( this.geo.agent, this.mat.agent );

        //if(o.model){

        var n = o.n || Math.randInt(1,5)
        var m2 = view.getMesh( 'heros', 'hero_0'+n ).clone();
        m2.material = this.mat.heros;

        m2.receiveShadow = true;
        m2.castShadow = true;

        m.receiveShadow = false;
        m.castShadow = false;

        m2.scale.set(0.3,0.3,0.3);
        m2.position.set( 0, 3 , 0);
        m2.play('idle',0.5)
        m.add( m2 );
        m.material = this.mat.agentHide;

        m.scale.set( radius, radius, radius );
        m.position.fromArray( pos );

        this.content.add(m);
        this.agents.push(m);

        crowd.send( 'add', o );

    },

    obstacle: function ( o ) {

        o = o || {};

        var m = new THREE.Mesh( this.geo.box, this.mat.wall )

        m.scale.fromArray(o.size);
        m.position.fromArray(o.pos);
        m.rotation.y = o.r || 0;

        m.castShadow = true;
        m.receiveShadow = false;

        this.content.add( m )
        this.solids.push( m );

        o.type = 'box';

        crowd.send( 'obstacle', o );

    },

    way: function ( o ) {

        o = o || {};
        var m = new THREE.Mesh( this.geo.circle, this.mat.way )
        if( o.w ) m.position.set( o.w[0], 0, o.w[1] );
        else m.position.set( o.x || 0, 0, o.z || 0 );
        this.content.add( m );
        this.solids.push( m );
        crowd.send( 'way', o );

    },

    /*reset: function () {

        view.reset();

    	/*this.isNeedUpdate = false;
    	this.controler.resetFollow();

    	var h, c;

    	while( this.solids.length > 0 ) this.content.remove( this.solids.pop() );
    	while( this.agents.length > 0 ) this.removeAgent( { h:this.agents.pop() } );

        this.agents = [];
        this.solids = [];
          
    	this.helper.visible = true;
        if( this.shadowGround !== null ) this.shadowGround.visible = true;

        this.update = function () {};
        this.tmpCallback = function(){};
        this.byName = {};*/

    //}

}