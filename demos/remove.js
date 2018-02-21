var max = 60;

function demo() {

    cam ({azim:0, polar:15, distance:60});

    set({ 
        fps:60, 
        forceStep:0.3, 
        iteration:1, 
        precision:[ 10, 15, 10, 10 ],
        patchVelocity:false, 
    });

    populate();

    setTimeout( removeAll, 8000 );
    setTimeout( populate, 12000 );

};

function populate () {

    for(var i=0; i<max; i++){ 

        addOne();

    }

    up();

}

function addOne () {

    agent({ 

        pos:[ Math.rand(-300,300), 0, Math.rand(-100,100)],
        radius: 2,
        speed: 1,
        useRoad:false,
        goal:[0,0],

    })

}

function removeAll () {

    var i = view.agents.length;

    while ( i-- ){

        view.removeAgent( { id:i })

    }

}