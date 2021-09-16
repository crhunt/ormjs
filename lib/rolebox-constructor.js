/*
    Everything related to roleboxes
*/

/***** Rolebox property definitions *****/

var rb_param = {
    width : 50,
    height : 20,
    snapTolerance : 15
};

var svg;
var orm;

function generate_roleboxID() {
    rbID = "id-rolebox-" + orm.highestRBID.toString();
    orm.highestRBID += 1;
    return rbID
}

function is_roleboxID(anyID) {
    if ( anyID.includes("rolebox") ) { return true; }
    return false;
}

function rolebox_number(rbID) {
    return rbID.split("-")[2]
}

function set_highest_rolebox_ID() {
    for (var rbID in orm.roleboxes) {
        var numID = parseInt( entity_number(rbID) );
        if ( numID == orm.highestRBID ) {
            orm.highestRBID = numID+1;
        }
    }
}

function rolebox_prototype(defs) {

    /* Define the look of a rolebox */

    var width = rb_param.width;
    var height = rb_param.height;

    var g = defs.append("g")
        .attr("id","rolebox_prototype")
        .attr("class","rolebox_prototype")
        .attr("width", width)
        .attr("height", height)
        .attr("transform", "translate( -" + width/2 + " -" + height/2 + " )");
    // Entity rectangle
    g.append("rect")
     .attr("class","rolebox");

     var go = defs.append("g")
        .attr("id","rolebox_overlay_prototype")
        .attr("class","rolebox_overlay_prototype")
        .attr("width", width)
        .attr("height", height)
        .attr("transform", "translate( -" + width/2 + " -" + height/2 + " )");
    // Top circle overlay
    go.append("circle")
        .attr("class","rboverlay")
        .attr("transform", "translate( " + width/2 + " " + 0 + " )");
    // Right circle overlay
    go.append("circle")
        .attr("class","rboverlay")
        .attr("transform", "translate( " + width + " " + height/2 + " )");
    // Bottom circle overlay
    go.append("circle")
        .attr("class","rboverlay")
        .attr("transform", "translate( " + width/2 + " " + height + " )");
    // Left circle overlay
    go.append("circle")
        .attr("class","rboverlay")
        .attr("transform", "translate( " + 0 + " " + height/2 + " )");

}

function draw_rolebox(x,y) {

    // Draw a new instance of a rolebox

    // Create rolebox id
    var rbID = generate_roleboxID();

    var rbname = "rolebox0";

    var rbgroup = svg.append("g")
        .datum( {x: x, y: y, selected: false, kind: "rolebox",
        relationships: [], entity: null, boxes: ["r-0-"+rbID],
        name: rbname} )
        .attr("id",rbID)
        .attr("class", "rolebox_instance");
    rbgroup
        .append("text")
        .attr("class","ename")
        .attr("id","t-"+rbID)
        .attr("x", function(d){ return (d.x) })
        .attr("y", function(d){ return (d.y - rb_param.height) })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "center")
        .attr("pointer-events","none")
        .text( rbname );
    rbgroup
        .append("use")
        .attr("href","#rolebox_prototype")
        .attr("id","r-0-"+rbID)
        .attr("x", function(d){ return (d.x) })
        .attr("y", function(d){ return (d.y) });
    
    //rolebox_actions(rbgroup);

    // Record new entity
    orm.roleboxes[rbID] = rbgroup;

    // Create new overlay for rolebox

    var overlayID = "o-r-0-"+rbID;
    
    var overlay = svg.append("use")
       .datum( {x: x, y: y, selected: false} )
       .attr("href","#rolebox_overlay_prototype")
       .attr("id", overlayID)
       .attr("x", function(d){ return (x) })
       .attr("y", function(d){ return (y) });

    //overlay_actions(overlay);
    
    // Record overlay
    orm.rboverlays[overlayID] = overlay;
}

