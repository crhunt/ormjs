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
var dragevent;

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

    var osize = rb_param.height;
    var oboxsize = 1.2*osize;
    var transx = -width;
    var transy = 0;

    var addo = create_group(defs,oboxsize,oboxsize,"rolebox_add_prototype");
    addo.attr("transform", "translate( " + transx + " -" + transy + " )");
    addo.append("path")
        .attr("d", plusPath(osize))
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

function draw_rolebox(x,y) {

    // Draw a new instance of a rolebox

    // Create rolebox id
    var rbID = generate_roleboxID();

    var rbgroup = svg.append("g")
        .datum( {x: x, y: y, dx: 0, dy: 0, x0: x, y0: y,
                 selected: false, kind: "rolebox",
                 entity: null, name: "",
                 boxes: [], rbdata: {}} )
        .attr("id",rbID)
        .attr("class", "rolebox_group")
        .attr("x", function(){ return (x) })
        .attr("y", function(){ return (y) });
    rbgroup
        .append("text")
        .attr("class","ename")
        .attr("id","t-"+rbID)
        .attr("x", function(d){ return (d.x0) })
        .attr("y", function(d){ return (d.y0 - 1.5*rb_param.height) })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "center")
        .attr("pointer-events","none")
        .text( function(d){ return d.name } );
    
    add_rolebox(rbgroup);
    
    rolebox_group_actions(rbgroup);

    // Record new entity
    orm.roleboxes[rbID] = rbgroup;

    // Create new overlay for rolebox

    /*var overlayID = "o-r-0-"+rbID;
    
    var overlay = svg.append("use")
       .datum( {x: x, y: y, selected: false} )
       .attr("href","#rolebox_overlay_prototype")
       .attr("id", overlayID)
       .attr("x", function(d){ return (x) })
       .attr("y", function(d){ return (y) });*/

    //overlay_actions(overlay);
    
    // Record overlay
    //orm.rboverlays[overlayID] = { link : null, add : null};
    //orm.rboverlays[overlayID].link = overlay;

    var addrbID = "add-"+rbID;

    rbgroup.append("use")
        .datum( {x: x, y: y, selected: false} )
        .attr("href","#rolebox_add_prototype")
        .attr("id", addrbID)
        .attr("x", function(d){ return (x) })
        .attr("y", function(d){ return (y) })
        .on("click", function() { add_rolebox(rbgroup); });

}

function add_rolebox(rbgroup) {

    // Data related to identifying new rolebox
    var d = rbgroup.datum();
    var boxcount = d.boxes.length;
    var rbID = rbgroup.attr("id");
    var boxID = "r-" + boxcount.toString() + "-" + rbID;
    d.boxes.push(boxID);
    rbname = "rolebox " + boxcount.toString() ;
    d.rbdata[boxID] = { relationships : [], name : rbname };

    // Rolebox visualization
    rbgroup.append("rect")
           .attr("class","rolebox")
           .attr("id", boxID)
           .attr("parent", rbID)
           .attr("transform", "translate( -" + rb_param.width/2 + 
                                        " -" + rb_param.height/2 + " )")
           .attr("x", function(){
                return d.x0 + boxcount * rb_param.width;
           })
           .attr("y", function(){
                return d.y0;
           });
    
    // Adjust text
    set_rolebox_display_name(rbgroup);
    // Add rolebox actions
    var rbox = d3.select("#"+boxID);
    rolebox_actions( rbox );
    // Add overlay
    add_overlay( rbox );
}

function add_overlay(rbox) {

    var rbgroup = d3.select("#"+rbox.attr("parent"));
    var gd = rbgroup.datum();
    var boxcount = gd.boxes.length - 1; // rolebox already added so -1
    var rbID = rbgroup.attr("id");
    var overlayID = "or-" + boxcount.toString() + "-" + rbID;

    rbgroup.append("use")
       .attr("href","#rolebox_overlay_prototype")
       .attr("id", overlayID)
       .attr("rbox", rbox.attr("id") )
       .attr("x", rbox.attr("x"))
       .attr("y", rbox.attr("y") )
       .on("mousedown", rbomousedown );;
}

function set_rolebox_display_name(rbgroup) {
    
    var gd = rbgroup.datum();
    var boxcount = gd.boxes.length;

    var rbname = [];
    for ( n in gd.boxes ) {
        rbname.push( gd.rbdata[ gd.boxes[n] ].name );
    }
    gd.name = rbname.join(" ... ")
    tfield = d3.select("#t-" + rbgroup.attr("id"));
    tfield.text(gd.name)
        .attr("x", function() { 
            return (gd.x0 + (boxcount-1) * rb_param.width/2) 
        });
}

/* Rolebox actions */

function rolebox_group_actions(rbgroup) {

    // What to do on drag event

    var drag_rb = d3.drag()
        .on("start", rbdragstarted)
        .on("drag", function (event,d) { rbdragged(event,d, rbgroup.attr("id") ) } )
        .on("end", edragended);

    rbgroup
        .on("dblclick", function(event) { event.stopPropagation() })
        //.on("click", remove_entity)
        .call(drag_rb);

}

function rbdragstarted(event,d) {
    //event.sourceEvent.stopPropagation();
    //d3.select(this).classed("selected", true);
    d.selected = true;
    rbgroup = d3.select(this);

    // We initialize the position here so we don't get a jump
    // the first time we drag the group.
    //d.x = parseFloat( rbgroup.attr("x") );
    //d.y = parseFloat( rbgroup.attr("y") );

}

function rbdragged(event,d,rbgroupID) {

    // Set the new position
    d.dx += event.dx;
    d.dy += event.dy;

    // Snap to entities
    d.dx = snap( d.dx + d.x0, "x", rbgroupID ) - d.x0;
    d.dy = snap( d.dy + d.y0, "y", rbgroupID ) - d.y0;
    d.x = d.x0 + d.dx;
    d.y = d.y0 + d.dy;

    // Snap (not added yet)
    var rbgroup = d3.select("#"+rbgroupID);
    var x = parseFloat(rbgroup.attr("x"));
    var y = parseFloat(rbgroup.attr("y"));

    // Drag rolebox group
    // Groups must be moved with transform
    rbgroup.attr("x", d.x )
           .attr("y", d.y )
           .attr("transform", "translate("+d.dx+","+d.dy+")");
}

/* Remove rolebox */

function rolebox_actions(rbox) {
    rbox
        .on("click", remove_rolebox);
}

function remove_rolebox(event,d) {
    if (event.ctrlKey) {
        delete_rolebox( d3.select(this) );
    }
}

function delete_rolebox(rbox) {

    // Get parent group of rolebox
    rbgroup = d3.select("#"+rbox.attr("parent"));
    gd = rbgroup.datum();

    // Only remove right-most
    if ( rbox.attr("id") != gd.boxes[gd.boxes.length -1] ) { return }

    // Remove relationships
    rels = gd.rbdata[rbox.attr("id")].relationships;
    for ( n in rels ) {
        // Delete the relationships
        delete_relationship(orm.relationships[ rels[n] ]);
        // Remove relationship reference from parent
        gd.relationships = remove_from_array( gd.relationships, rels[n] );
    }

    // Remove box reference from parent
    rboxID = rbox.attr("id");
    gd.boxes = remove_from_array( gd.boxes, rboxID );

    // Remove the rolebox visualization
    // Remove overlay part
    //d3.select( "#" + overlay_from_ID(entityID) ).remove();
    // Remove box part
    rbox.remove();
    set_rolebox_display_name(rbgroup);
    
    // Remove the rolebox from records
    var x = gd.x;
    var y = gd.y;
    if ( gd.boxes.length == 0 ) {
        // Remove group reference
        delete orm.roleboxes[ rboxID ];
        // Remove group
        rbgroup
            .transition()
            .duration(500)
            .attr("transform", "translate(" + x + "," + y + ") scale(0)")
            .remove();
    }
    //delete orm.roleboxes[ rboxID ];
    //delete orm.eoverlays[ overlay_from_ID(entityID) ];
}

/* On mouse up and down for the rolebox overlay circles */

function rbomousedown(event) {
    
    event.stopPropagation();

    // current pointer position
    var m = d3.pointer(event);
    var mousepos = {x: m[0], y: m[1]};

    // Center of closest entity overlay
    var boxID = d3.select(this).attr("rbox");
    var rbo = closest_rboverlay(mousepos, boxID);
    var lr = ["left", "right"];
    var tb = ["top", "bottom"];
    dragevent.locations = lr;
    if ( !dragevent.locations.includes(rbo.location) ) { 
        dragevent.locations = tb; 
    } 

    var rel = draw_rel_line(rbo.x, rbo.y, mousepos.x, mousepos.y);
    rel.datum().from = boxID;
    rel.datum().selected = true;

    // Add svg mouse actions for dragging relation across svg
    svg
       .on("mousemove", function (event) { svg_mousemove(event, rel) })
       .on("mouseup", function (event) { svg_mouseup(event, rel) } );

}

function closest_rboverlay(pos,boxID) {
    // Get the overlay positions of the rolebox (not group!)
    var xyo = rboverlay_positions(boxID);
    return closest_location(pos,xyo)
}

function rboverlay_positions(boxID) {
    
    // Entity position
    var rbox = d3.select("#"+boxID);
    var gd = d3.select("#"+rbox.attr("parent")).datum();
    var x = parseFloat( rbox.attr("x") ) + gd.dx;
    var y = parseFloat( rbox.attr("y") ) + gd.dy;
    var xyoverlay = {
        "bottom" : { x: x,
                     y : y + rb_param.height/2, 
                     location : "bottom" },
        "right" : {x : x + rb_param.width/2,
                   y: y,
                   location : "right" },
        "top" : { x: x,
                  y: y - rb_param.height/2,
                  location : "top" },
        "left" : {x: x - rb_param.width/2,
                  y: y,
                  location : "left" }
    }
    return xyoverlay;
}