var demos = [ 
    'basic','circle','building','office','crossing','crossroads', 'remove'
];

demos.sort();

var demoName = 'basic';

var simulation;

var isWithCode = false;
//var view;
var tell = editor.tell;

function init () {

    view.init();
    view.addSky({ url:'photo.jpg' });

    intro.init('Crowd: Samuel Girardin | Lab: 3th');

    simulation = new Simulation ();
    
    crowd.init( load, 2000 );
    crowd.onUpdate = function(){ simulation.update() };

}

function load () {

    view.load( ['./assets/models/heros.sea' ], next );

}

function next ( p ) {
    
    editor.init( launch, isWithCode, '#9966FF', 'Crowd.lab' );

    view.setEditor( editor );
    view.unPause = unPause;

    intro.clear();

    //crowd.start();

    ready();
    
}

function unPause () {

    crowd.start();

}

function ready () {

    var hash = location.hash.substr( 1 );
    if(hash !=='') demoName = hash;
    editor.load('demos/' + demoName + '.js');

};

function launch ( name ) {

    var full = true;
    var hash = location.hash.substr( 1 );
    if( hash === name ) full = false;

    location.hash = name;

    crowd.reset( full );
    
    demo = new window['demo'];

};

// editor fonction

function cam ( o ) { view.moveCam( o ); };
function follow ( name ) { view.setFollow( name ); };

function agent ( o ) { simulation.agent( o ); };

function obstacle ( o ) { simulation.obstacle( o ); };
function way ( o ) { simulation.way( o ); };
function goal ( o ) { crowd.send( 'goal', o ); };
function precision ( o ) { crowd.send( 'precision', o ); };
function set ( o ) { crowd.send( 'set', o ); };
function up ( o ) { crowd.send( 'up', o ); };

function hideGrid () { view.hideGrid(); };
//function load ( name, callback ) { view.load( name, callback  ); };
