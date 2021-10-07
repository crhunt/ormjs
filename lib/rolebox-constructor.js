/*
    Everything related to roleboxes

    This file defines roleboxes, data associated with how they are represented and
    connected to other objects, and actions they can perform, such as on drag and 
    click events.
*/

/***** Global definitions *****/

// Rolebox appearance and behavior
// TO DO: Pull from css
var rb_param = {
    width : 50,
    height : 18,
    snapTolerance : 5
};

// Distance tolerances for snap and link events
var tolerance;
tolerance.link["rolebox"] = rb_param.width ;
tolerance.snap["rolebox"] = rb_param.snapTolerance ;
tolerance.snap["rolebox_group"] = rb_param.snapTolerance ;

// Graph variables
var svg; // Defined in svg-constructor
var orm; // Defined in graph-constructor
var dragevent; // Defined in graph-constructor

/***** END Global definitions *****/

/***** Rolebox IDS *****/

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
    for (var rbID in orm.rbgroups) {
        var numID = parseInt( entity_number(rbID) );
        if ( numID == orm.highestRBID ) {
            orm.highestRBID = numID+1;
        }
    }
}

/***** END Rolebox IDs *****/

/*****  Drawing roleboxes *****/

function draw_rolebox(x,y) {

    // Draw a new instance of a rolebox

    // Create rolebox id (this is for the rolebox group)
    var rbID = generate_roleboxID();

    var rbgroup = svg.append("g")
        .datum( {x: x, y: y, dx: 0, dy: 0, x0: x, y0: y,
                 selected: false, 
                 kind: "rolebox_group",
                 name: "", 
                 entity_in: null, 
                 boxes: [], 
                 flipped: false, rotated: false, arrow: false} )
        .attr("id",rbID)
        .attr("class", "rolebox_group")
        .attr("x", -rb_param.width/2 )
        .attr("y", -rb_param.height/2 );
        //.attr("transform", () => translate(x,y) );
    rbgroup
        .append("text")
        .attr("class","rbname")
        .attr("id","t-"+rbID)
        .attr("x", function(d){ return (d.x0) })
        .attr("y", function(d){ return (d.y0 - 1.5*rb_param.height) })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "center")
        .attr("pointer-events","none")
        .text( function(d){ return d.name } );

    // Add overlay used for adding roleboxes to the group
    var addrbID = "add-"+rbID;
    var osize = rb_param.height;
    rbgroup
        .append("path")
        .attr("d", function(d) { return plusPath(d,osize) } )
        .attr("class","rbadd")
        .attr("id", addrbID)
        .attr("x", function(d){ return (d.x0 - rb_param.width) })
        .attr("y", function(d){ return (d.y0) })
        //.attr("transform", "translate( -" + rb_param.width + ", 0 )");
        .attr("transform", () => translate(-rb_param.width, 0) );

    // Add rolebox to group, including overlays and actions
    add_rolebox(rbgroup);

    rolebox_group_actions(rbgroup);

    // Record new rolebox group
    orm.rbgroups[rbID] = rbgroup;

}

function plusPath(position, size) {

    // Draw the plus sign overlay for adding new roleboxes
    var hsize = size/2;
    return [
        "M", position.x, ",", position.y-hsize,
        "L", position.x, ",", position.y+hsize,
        "M", position.x-hsize, ",", position.y,
        "L", position.x+hsize, ",", position.y,
        "Z"
    ].join("");
}

function add_rolebox(rbgroup) {

    // Data related to identifying new rolebox
    var d = rbgroup.datum();
    var boxcount = d.boxes.length;
    var rbID = rbgroup.attr("id");
    var boxID = "r-" + boxcount.toString() + "-" + rbID;
    rbname = "rolebox " + boxcount.toString() ;

    // Rolebox visualization
    rbgroup.append("g")
           .datum( {x : d.x + boxcount * rb_param.width,
                    y : d.y,
                    dx : boxcount * rb_param.width, // this is used for the overlay definition
                    kind : "rolebox",
                    name : rbname,
                    parent: rbID,
                    overlay: "o"+boxID,
                    entity: null, 
                    connectors : [],
                    selected : false } )
           .attr("class","rolebox_prototype")
           .attr("id", boxID)
           .attr("parent", rbID)
           .attr("x", function(){
                return d.x0 + boxcount * rb_param.width;
           })
           .attr("y", function(){
                return d.y0;
           })
           .attr("width", rb_param.width)
           .attr("height", rb_param.height)
           .append("rect")
                .attr("class","rolebox")
                .attr("id", "r-" + boxID)
                .attr("width", rb_param.width)
                .attr("height", rb_param.height)
                .attr("x", function(){
                            return d.x0 + boxcount * rb_param.width;
                    })
                .attr("y", function(){
                            return d.y0;
                    })
                .attr("transform", "translate( -" + rb_param.width/2 + 
                                                " -" + rb_param.height/2 + " )");

    var rbox = d3.select("#"+boxID);
    // Add rolebox overlay
    var overlay = overlay_definition(rbox, "rboverlay");
    overlay.attr("rbox", rbox.attr("id") );
    // Add rolebox actions
    rolebox_actions( rbox );
    // Record rolebox
    orm.roleboxes[ boxID ] = rbox;

    // Add to parent
    if (d.flipped) {
        var boxes = [...d.boxes];
        boxes.reverse();
        boxes.push(boxID);
        boxes.reverse();
        d.boxes = [...boxes];
        d.dx -= rb_param.width;
        d.x = d.x0 + d.dx;
        move_rolebox_group(rbgroup);
        align_roleboxes(rbgroup); 
    } else {
        d.boxes.push(boxID);
    }

    // Adjust text on group
    set_rolebox_display_name(rbgroup);

    // Update overlay connections for box to the left of new boxs
    if ( d.boxes.length > 1 ) {
        var ind = 0;
        d.flipped ? ind = 1 : ind = d.boxes.length - 2;
        set_eligible_overlays_rolebox( d.boxes[ind] );
    }

    // Redraw connectors
    redraw_connectors(d.connectors);

    // Update orm
    parse_orm();
}

function set_rolebox_display_name(rbgroup) {

    /** This is used to read the names of each box in the rolebox group and
        combine them into a total display name. The final name is centered
        based on the total size of the group.
      */
    
    var gd = rbgroup.datum();
    var boxcount = gd.boxes.length;

    // Get all names in a list, rbname
    var rbname = [];
    var boxes = [...gd.boxes];
    if (gd.flipped == true) { boxes = boxes.reverse(); }
    for ( n in boxes ) {
        rbname.push( d3.select("#"+boxes[n]).datum().name );
    }
    // Join names
    gd.name = rbname.slice(0,2).join(" ")
    boxcount > 2 ? gd.name += " ... " + rbname.slice(2,boxcount).join(" ... ") : gd.name += "";
    var display_name = gd.name;
    // 🞀 &#128896;
    gd.arrow ? display_name = "🞀 " + gd.name : display_name = gd.name;
    // Set text field value and position
    tfield = d3.select("#t-" + rbgroup.attr("id"));
    tfield.text(display_name)
        .attr("x", function() { 
            return (gd.x0 + (boxcount-1) * rb_param.width/2) 
        });
}

/* Flipping */

function flip_rolebox_group(rbgroup) {
    /* Flip the rolebox order of a group of roleboxes */

    // Set flip in datum
    var gd = rbgroup.datum();
    gd.flipped ? gd.flipped = false : gd.flipped = true;
    gd.arrow = gd.flipped;

    // Reorder boxes in datum
    gd.boxes = gd.boxes.reverse();

    // Move each rolebox (group, rect, and overlay)
    align_roleboxes(rbgroup);
    // Update display name
    set_rolebox_display_name(rbgroup);
}

function align_roleboxes(rbgroup) {

    // Move each rolebox (group, rect, and overlay)
    // based on group position.

    var gd = rbgroup.datum();

    var x = gd.x0;
    var y = gd.y0;
    for (var n in gd.boxes) {
        move_rolebox(d3.select( "#"+gd.boxes[n] ),x,y);
        // Set eligible overlays for connectors
        set_eligible_overlays_rolebox(gd.boxes[n]);
        x += rb_param.width;
    }
    // Update position data in roleboxes
    set_rolebox_positions(rbgroup, gd.x, gd.y);
}

function move_rolebox(rbox,x,y) {
    // Move the group
    rbox
        .attr("x", x)
        .attr("y", y);
    // Move the rect
    d3.select("#r-"+rbox.attr("id"))
        .attr("x", x)
        .attr("y", y);
    // Move the overlays
    var oID = rbox.datum().overlay;
    var width = rbox.attr("width");
    var height = rbox.attr("height");
    d3.select("#"+oID)
        .attr("transform", () => overlay_translate(x,y,width,height) );

}

function check_flip_condition(rbgroup) {
    
    var gd = rbgroup.datum();
    var flipit = { flip: false, arrow: gd.arrow };

    // If not connected to an entity, do nothing
    if ( gd.entity_in == null ) { return flipit }
    // If single box, do nothing
    if ( gd.boxes.length == 1 ) { return flipit }

    // Get the entity
    var entity = d3.select("#"+gd.entity_in);
    var ed = entity.datum();

    // Decide whether to flip
    var fliptable = {0: false, 1: true};
    var flipme = 0;
    var isflipped = 0;
    gd.flipped ? isflipped = 1 : isflipped = 0;
    if (gd.rotated) {
        // Rolebox group is rotated 90 degrees
        // Flip if the rolebox is above the entity
        gd.y < ed.y ? flipme = (1-isflipped) : flipme = isflipped;
    } else {
        // Flip if the rolebox is left of the entity
        gd.x < ed.x ? flipme = (1-isflipped) : flipme = isflipped;
    }
    flipit.flip = fliptable[flipme];

    // Decide whether to display arrow
    // This isn't used in the current version. 
    // Needed to match ORM 2 rotation convention (but I don't know if we want to).
    flipit.arrow = fliptable[ Math.abs(isflipped - flipme) ];

    return flipit
}

function set_primary_entity(rbgroup) {
    var gd = rbgroup.datum();
    var ind = 0;
    var boxes = gd.boxes;
    gd.flipped ? ind = boxes.length - 1 : ind = 0;
    gd.entity_in = d3.select("#"+boxes[ind]).datum().entity;
}

/* Rotating */

function rotate_rolebox_group(rbgroup) {
    // Set rotate in datum
    var d = rbgroup.datum();
    d.rotated = !d.rotated;

    // Apply rotate
    if ( d.rotated ) {
        rbgroup
            .attr("transform", () => translate_rotate(d.x,d.y,d.dx,d.dy));
    } else {
        rbgroup
            .attr("transform", () => translate(d.dx,d.dy));
    }
    console.log(d.rotated)
    
    // Update position data in roleboxes
    set_rolebox_positions(rbgroup, d.x, d.y);

    // Check flip condition and redraw connected connectors
    check_flip_and_connectors(rbgroup);
}

function check_flip_and_connectors(rbgroup) {
    // Check flip condition and redraw connected connectors
    
    // Check flip condition
    var d = rbgroup.datum();
    var flipit = check_flip_condition(rbgroup);
    if (flipit.flip) {
        flip_rolebox_group(rbgroup);
    }
    
    // Redraw all connected connectors
    redraw_connectors(d.connectors);

}

/***** END Drawing roleboxes *****/

/***** Rolebox actions *****/

function rolebox_group_actions(rbgroup) {

    // What to do on drag event

    var drag_rb = d3.drag()
        .on("start", rbdragstarted)
        .on("drag", function (event,d) { rbdragged(event,d, rbgroup.attr("id") ) } )
        .on("end", edragended);

    rbgroup
        .on("dblclick", function(event) { 
            event.stopPropagation();
            rotate_rolebox_group(rbgroup);
        })
        //.on("click", remove_entity)
        .call(drag_rb);

    var addrbID = "add-"+rbgroup.attr("id");
    d3.select("#"+addrbID)
        .on("click", function() { add_rolebox(rbgroup); });

}

function rolebox_actions(rbox) {
    rbox
        .on("click", remove_rolebox);
    d3.select("#"+rbox.datum().overlay)
        .on("mousedown", rbomousedown );
}

/* Remove rolebox */

function remove_rolebox(event,d) {
    if (event.ctrlKey) {
        delete_rolebox( d3.select(this) );
    }
}

function delete_rolebox(rbox) {

    // Get parent group of rolebox
    rbgroup = d3.select("#"+rbox.attr("parent"));
    gd = rbgroup.datum();

    // Only remove last added
    if ( rbox.attr("id") != gd.boxes[gd.boxes.length -1] && !gd.flipped ) { return }
    if ( rbox.attr("id") != gd.boxes[0] && gd.flipped ) { return }

    // Remove connectors
    //conns = gd.rbdata[rbox.attr("id")].connectors;
    conns = rbox.datum().connectors;
    for ( n in conns ) {
        // Delete the connectors
        delete_connector(orm.connectors[ conns[n] ]);
        // Remove connector reference from parent
        gd.connectors = remove_from_array( gd.connectors, conns[n] );
    }

    // Remove box reference from parent
    rboxID = rbox.attr("id");
    gd.boxes = remove_from_array( gd.boxes, rboxID );

    // Remove box reference from records
    delete orm.roleboxes[ rboxID ];

    // Remove the rolebox visualization
    rbox.remove();
    if (gd.flipped) { 
        // Adjust center of rolebox group to new left rolebox
        gd.dx += rb_param.width;
        gd.x = gd.x0 + gd.dx;
        move_rolebox_group(rbgroup);
        align_roleboxes(rbgroup); 
        // Unflip if only one box left
        if ( gd.boxes.length == 1 ) { flip_rolebox_group(rbgroup); }
    }
    set_rolebox_display_name(rbgroup);
    
    // Remove the rolebox from records
    var x = gd.x;
    var y = gd.y;
    if ( gd.boxes.length == 0 ) {
        // Remove group reference
        delete orm.rbgroups[ rbgroup.attr("id") ];
        // Remove group
        rbgroup
            .transition()
            .duration(500)
            .attr("transform", "translate(" + x + "," + y + ") scale(0)")
            .remove();
    } else {
        // For the new right-most box, update eligible overlays
        set_eligible_overlays_rolebox( gd.boxes[gd.boxes.length - 1] );
    }

    // Update ORM
    parse_orm();
}

/*****  Drag control for the rolebox group *****/

function rbdragstarted(event,d) {
    //event.sourceEvent.stopPropagation();
    //d3.select(this).classed("selected", true);
    d.selected = true;
    rbgroup = d3.select(this);

    // Ensure latest connector list at group level
    bubble_connectors(rbgroup);

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

    // Drag rolebox group
    // Groups must be moved using transform
    move_rolebox_group(rbgroup);

    // Check flip condition and redraw connected connectors
    check_flip_and_connectors(rbgroup);
}

function move_rolebox_group(rbgroup) {
    
    // Groups must be moved using transform
    var d = rbgroup.datum();
    if (d.rotated) {
        rbgroup
            .attr("transform", () => translate_rotate(d.x,d.y,d.dx,d.dy));
    } else {
        rbgroup
            .attr("transform", () => translate(d.dx,d.dy));
    }
    
    // Record position for each rolebox
    set_rolebox_positions(rbgroup, d.x, d.y);
}

function set_rolebox_positions(rbgroup, x, y) {
    // For each rolebox datum, set it's x and y
    // based on rolebox group position.
    var xval = 0;
    var gd = rbgroup.datum();
    for ( var n in gd.boxes ) {
        d = d3.select("#"+gd.boxes[n]).datum();
        if (gd.rotated) {
            yval = y + n * rb_param.width;
            xval = x;
        } else {
            xval = x + n * rb_param.width;
            yval = y;
        }
        d.x = xval;
        d.y = yval;
    }
}

function bubble_connectors(rbgroup) {
    // Update the list of all connectors associated
    // with the connector group.
    // This is used when dragging the connector group.
    var n, d;
    var gd = rbgroup.datum();
    var connlist = [];
    for ( n in gd.boxes ) {
        d = d3.select("#"+gd.boxes[n]).datum();
        connlist.push.apply( connlist, d.connectors );
    }
    gd.connectors = connlist;
}

/***** END Drag control for the rolebox group *****/

/* On mouse down for the rolebox overlay circles */

function rbomousedown(event) {
    
    event.stopPropagation();

    // Get rolebox
    var boxID = d3.select(this).attr("rbox");
    var d = orm.roleboxes[boxID].datum();
    var gd = d3.select("#"+d.parent).datum();

    // current pointer position
    var m = d3.pointer(event);
    //var mousepos = {x: m[0], y: m[1]};
    // Event thinks the mouse is at the origin
    var mousepos = {x: m[0] + d.x - rb_param.width/2, 
                    y: m[1] + d.y - rb_param.height/2};
    if (gd.rotated) {
        mousepos = {y: m[0] - rb_param.width/2 + d.y,
                    x: -m[1] + rb_param.height/2 + d.x}
    }

    // Center of closest entity overlay
    var rbo = closest_rboverlay(mousepos, boxID);

    // We're changing globals here. They get set back on mouseup.
    dragevent.locations = ["top", "bottom"];
    if ( !dragevent.locations.includes(rbo.location) ) { 
        dragevent.locations = [ rbo.location ]; 
    } 

    var conn = draw_conn_line(rbo.x, rbo.y, mousepos.x, mousepos.y);
    conn.datum().from = boxID;
    conn.datum().selected = true;

    // Add svg mouse actions for dragging connector across svg
    svg
       .on("mousemove", function (event) { svg_mousemove(event, conn) })
       .on("mouseup", function (event) { svg_mouseup(event, conn) } );

}

function closest_rboverlay(pos,boxID,locations=dragevent.locations) {
    // Get the overlay positions of the rolebox (not group!)
    var xyo = rboverlay_positions(boxID);
    return closest_location(pos,xyo,locations=locations)
}

function rboverlay_positions(boxID) {
    
    // Rolebox position
    var rbox = d3.select("#"+boxID);
    var gd = d3.select("#"+rbox.attr("parent")).datum();
    //var x = parseFloat( rbox.attr("x") ) + gd.dx;
    //var y = parseFloat( rbox.attr("y") ) + gd.dy;
    var x = rbox.datum().x;
    var y = rbox.datum().y;
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
    
    if ( gd.rotated ) {
        xyoverlay = {
            "bottom" : { x: x - rb_param.height/2,
                         y : y, 
                         location : "bottom" },
            "right" : {x : x,
                       y: y + rb_param.width/2,
                       location : "right" },
            "top" : { x: x + rb_param.height/2,
                      y: y,
                      location : "top" },
            "left" : {x: x,
                      y: y - rb_param.width/2,
                      location : "left" }
        }
    }
    return xyoverlay;
}

function eligible_rolebox_locations(boxID,linkto="entity") {

    var left_rb = ["bottom","top","left"];
    var right_rb = ["bottom","right","top"];
    var middle_rb = ["bottom","top"];
    var rblocations = { "left": left_rb, "right": right_rb, 
                        "middle": middle_rb, "only": dragevent.locations };

    var rbox = d3.select("#"+boxID);

    // What overlays can be used to link to rolebox?
    // Depends on object we are linking to (linkto)
    if (linkto == "entity") {
        // Where is the rolebox in the list?
        // Eligible overlays based on rolebox position
        rbposition = rolebox_position(rbox);
        if ( rbposition.relative != null ) {
            return rblocations[ rbposition.relative ];
        } else { 
            return dragevent.locations;
        }
    }
}

function rolebox_position(rbox) {
    
    // Where in the rbgroup chain is this rolebox?
    // Possible values:
    //     relative: "left","middle","right"
    //     absolute: [index]
    var position = { relative: null, absolute: null };
    var boxes = d3.select( "#"+rbox.datum().parent ).datum().boxes;
    var index = boxes.indexOf(rbox.attr("id"));
    if ( index == 0 && index == boxes.length -1 ) {
        position.relative = "only";
        position.absolute = index;
    } else if ( index == 0 ) {
        position.relative = "left";
        position.absolute = index;
    } else if ( index == boxes.length -1 ) {
        position.relative = "right";
        position.absolute = index;
    } else if ( index > 0 && index < boxes.length -1 ) {
        position.relative = "middle";
        position.absolute = index;
    }
    return position;

}

function set_eligible_overlays_rolebox(boxID) {
    
    // When a rolebox is added or removed, update which overlays are eligible to link to.

    var conns = d3.select("#"+boxID).datum().connectors;
    for (var n in conns) {
        set_eligible_overlays( d3.select("#"+conns[n]) );
    }
}

/* END On mouse up for the rolebox overlay circles */

/***** END Rolebox actions *****/