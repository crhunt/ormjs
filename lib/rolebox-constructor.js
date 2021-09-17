/*
    Everything related to roleboxes
*/

/***** Rolebox property definitions *****/

var rb_param = {
    width : 50,
    height : 18,
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

    //var g = create_group(defs,width,height,"rolebox_prototype");
    // Entity rectangle

    var go = create_group(defs,width,height,"rolebox_overlay_prototype");
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

    var osize = 15;
    var oboxsize = 25;
    var transx = -width;
    var transy = osize/2;

    var addo = create_group(defs,oboxsize,oboxsize,"rolebox_add_prototype");
    addo.attr("transform", "translate( " + transx + " -" + transy + " )");
    addo.append("path")
        .attr("d", plusPath(osize))
        .attr("class","overlay rbadd");
    
    var minuso = create_group(defs,oboxsize,oboxsize,"rolebox_minus_prototype");
    minuso.attr("transform", "translate( " + transx + " " + transy + " )");
    minuso.append("path")
        .attr("d", minusPath(osize))
        .attr("class","overlay rbadd");
}

function plusPath(size) {
    var hsize = size/2;
    return [
        "M", 0, ",", -hsize,
        "L", 0, ",", hsize,
        "M", -hsize, ",", 0,
        "L", hsize, ",", 0,
        "Z"
    ].join("");
}

function minusPath(size) {
    var hsize = size/2;
    return [
        "M", -hsize, ",", 0,
        "L", hsize, ",", 0,
        "Z"
    ].join("");
}

function draw_rolebox(x,y) {

    // Draw a new instance of a rolebox

    // Create rolebox id
    var rbID = generate_roleboxID();

    var rbname = "rolebox 0";

    var rbgroup = svg.append("g")
        .datum( {x: x, y: y, selected: false, kind: "rolebox",
                 entity: null, boxes: [], name: rbname} )
        .attr("id",rbID)
        .attr("class", "rolebox_group")
        .attr("x",0)
        .attr("y",0);
    rbgroup
        .append("text")
        .attr("class","ename")
        .attr("id","t-"+rbID)
        .attr("x", function(d){ return (d.x) })
        .attr("y", function(d){ return (d.y - 1.5*rb_param.height) })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "center")
        .attr("pointer-events","none")
        .text( rbname );
    
    add_rolebox(rbgroup);

    // Initialize position datum for drag
    //rbgroup.datum().x = 0;
    //rbgroup.datum().y = 0;
    
    /*rbgroup
        .append("use")
        .attr("href","#rolebox_prototype")
        .attr("id","r-0-"+rbID)
        .attr("x", function(d){ return (d.x) })
        .attr("y", function(d){ return (d.y) });*/
    
    rolebox_actions(rbgroup);

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
    orm.rboverlays[overlayID] = { link : null, add : null, minus : null};
    orm.rboverlays[overlayID].link = overlay;

    var addrbID = "add-"+rbID;

    var addoverlay = svg.append("use")
        .datum( {x: x, y: y, selected: false} )
        .attr("href","#rolebox_add_prototype")
        .attr("id", addrbID)
        .attr("x", function(d){ return (x) })
        .attr("y", function(d){ return (y) })
        .on("click", function() { add_rolebox(rbgroup); });
    
    // Record overlay
    orm.rboverlays[overlayID].add = addoverlay;

    var minusrbID = "minus-"+rbID;

    var minusoverlay = svg.append("use")
        .datum( {x: x, y: y, selected: false} )
        .attr("href","#rolebox_minus_prototype")
        .attr("id", minusrbID)
        .attr("x", function(d){ return (x) })
        .attr("y", function(d){ return (y) });
    
    // Record overlay
    orm.rboverlays[overlayID].minus = minusoverlay;
}

function add_rolebox(rbgroup) {

    // Data related to identifying new rolebox
    var d = rbgroup.datum();
    var boxcount = d.boxes.length;
    var rbID = rbgroup.attr("id");
    var boxid = "r-" + boxcount.toString() + "-" + rbID;
    d.boxes.push(boxid);

    // Rolebox visualization
    rbgroup.append("rect")
           .datum({ relationships: [], selected: false,
                    parent: rbID })
           .attr("class","rolebox")
           .attr("id", boxid)
           .attr("transform", "translate( -" + rb_param.width/2 + 
                                        " -" + rb_param.height/2 + " )")
           .attr("x", function(){
                return d.x + boxcount * rb_param.width;
           })
           .attr("y", function(){
            return d.y;
           })
}

/* Rolebox dragging */

function rolebox_actions(rbgroup) {

    // What to do on drag event

    var drag_rb = d3.drag()
        .on("start", rbdragstarted)
        .on("drag", function (event,d) { rbdragged(event,d, rbgroup.attr("id") ) } )
        .on("end", edragended);

    rbgroup
        .on("dblclick", null)
        //.on("click", remove_entity)
        .call(drag_rb);

}

function rbdragstarted(event,d) {
    //event.sourceEvent.stopPropagation();
    //d3.select(this).classed("selected", true);
    d.selected = true;
    var m = d3.pointer(event);
    rbgroup = d3.select(this);
    console.log( rbgroup.attr("x") );

    // We initialize the position here so we don't get a jump
    // the first time we drag the group.
    d.x = parseFloat( rbgroup.attr("x") );
    d.y = parseFloat( rbgroup.attr("y") );

}

function rbdragged(event,d,rbgroupID) {

    // Set the new position
    d.x += event.dx;
    d.y += event.dy;

    // Snap (not added yet)

    // Drag rolebox group
    // Groups must be moved with transform
    var rbgroup = d3.select("#"+rbgroupID);
    rbgroup.attr("x", d.x).attr("y", d.y)
           .attr("transform", "translate("+d.x+","+d.y+")");
}