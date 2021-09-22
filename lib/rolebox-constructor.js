/*
    Everything related to roleboxes
*/

/***** Rolebox property definitions *****/

var rb_param = {
    width : 50,
    height : 18,
    snapTolerance : 5
};
var tolerance;
tolerance.link["rolebox"] = rb_param.width ;
tolerance.snap["rolebox"] = rb_param.snapTolerance ;
tolerance.snap["rolebox_group"] = rb_param.snapTolerance ;

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
    for (var rbID in orm.rbgroups) {
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
        .attr("class","overlay rboverlay")
        .attr("transform", "translate( " + width/2 + " " + 0 + " )");
    // Right circle overlay
    go.append("circle")
        .attr("class","overlay rboverlay")
        .attr("transform", "translate( " + width + " " + height/2 + " )");
    // Bottom circle overlay
    go.append("circle")
        .attr("class","overlay rboverlay")
        .attr("transform", "translate( " + width/2 + " " + height + " )");
    // Left circle overlay
    go.append("circle")
        .attr("class","overlay rboverlay")
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

    // Draw the plus sign overlay for adding new roleboxes
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
                 selected: false, kind: "rolebox_group",
                 name: "", entity_in: null, 
                 boxes: [], flipped: false} )
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

    // Add overlay used for adding roleboxes to the group
    var addrbID = "add-"+rbID;
    rbgroup.append("use")
        .datum( {x: x, y: y, selected: false} )
        .attr("href","#rolebox_add_prototype")
        .attr("id", addrbID)
        .attr("x", function(d){ return (x) })
        .attr("y", function(d){ return (y) });

    rolebox_group_actions(rbgroup);

    // Record new entity
    orm.rbgroups[rbID] = rbgroup;

}

function add_rolebox(rbgroup) {

    // Data related to identifying new rolebox
    var d = rbgroup.datum();
    var boxcount = d.boxes.length;
    var rbID = rbgroup.attr("id");
    var boxID = "r-" + boxcount.toString() + "-" + rbID;
    d.boxes.push(boxID);
    rbname = "rolebox " + boxcount.toString() ;

    // Rolebox visualization
    rbgroup.append("rect")
           .datum( {x : d.x + boxcount * rb_param.width,
                    y : d.y,
                    kind : "rolebox",
                    name : rbname,
                    parent: rbID,
                    entity: null, 
                    relationships : [],
                    selected : false } )
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

    // Add rolebox actions
    var rbox = d3.select("#"+boxID);
    rolebox_actions( rbox );
    // Add rolebox overlay
    add_overlay( rbox );
    // Record rolebox
    orm.roleboxes[ boxID ] = rbox;

    // Adjust text on group
    set_rolebox_display_name(rbgroup);

    // Update orm
    parse_orm();

    // Update overlay connections for box to the left of new box
    if ( d.boxes.length > 1 ) {
        set_eligible_overlays_rolebox( d.boxes[d.boxes.length - 2] );
    }
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

    /** This is used to read the names of each box in the rolebox group and
        combine them into a total display name. The final name is centered
        based on the total size of the group.
      */
    
    var gd = rbgroup.datum();
    var boxcount = gd.boxes.length;

    // Get all names in a list, rbname
    var rbname = [];
    for ( n in gd.boxes ) {
        rbname.push( d3.select("#"+gd.boxes[n]).datum().name );
    }
    // Join names
    gd.name = rbname.join(" ... ")
    // Set text field value and position
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

    var addrbID = "add-"+rbgroup.attr("id");
    d3.select("#"+addrbID)
        .on("click", function() { add_rolebox(rbgroup); });

}

function rbdragstarted(event,d) {
    //event.sourceEvent.stopPropagation();
    //d3.select(this).classed("selected", true);
    d.selected = true;
    rbgroup = d3.select(this);

    // Ensure latest relationship list at group level
    bubble_relationships(rbgroup);

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
    var rbgroup = d3.select("#"+rbgroupID);
    rbgroup.attr("x", d.x )
           .attr("y", d.y )
           .attr("transform", "translate("+d.dx+","+d.dy+")");

    // Record position for each rolebox
    set_rolebox_positions(rbgroup, d.x, d.y);

    // Drag all connected relations
    for (var n in d.relationships) {
        rel = orm.relationships[d.relationships[n]];
        dragged_by_object(rel);
    }
}

function set_rolebox_positions(rbgroup, x, y) {
    var xval = 0;
    var rbox, n;
    var rboxes = rbgroup.datum().boxes;
    for ( n in rboxes ) {
        d = d3.select("#"+rboxes[n]).datum();
        xval = x + n * rb_param.width;
        d.x = xval;
        d.y = y;
    }
}

function bubble_relationships(rbgroup) {
    // Update the list of all relationships associated
    // with the relationship group.
    // This is used when dragging the relationship group.
    var n, d;
    var gd = rbgroup.datum();
    var rellist = [];
    for ( n in gd.boxes ) {
        d = d3.select("#"+gd.boxes[n]).datum();
        rellist.push.apply( rellist, d.relationships );
    }
    gd.relationships = rellist;
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
    //rels = gd.rbdata[rbox.attr("id")].relationships;
    rels = rbox.datum().relationships;
    for ( n in rels ) {
        // Delete the relationships
        delete_relationship(orm.relationships[ rels[n] ]);
        // Remove relationship reference from parent
        gd.relationships = remove_from_array( gd.relationships, rels[n] );
    }

    // Remove box reference from parent
    rboxID = rbox.attr("id");
    gd.boxes = remove_from_array( gd.boxes, rboxID );

    // Remove box reference from records
    delete orm.roleboxes[ rboxID ];

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

/* On mouse down for the rolebox overlay circles */

function rbomousedown(event) {
    
    event.stopPropagation();

    // current pointer position
    var m = d3.pointer(event);
    var mousepos = {x: m[0], y: m[1]};

    // Center of closest entity overlay
    var boxID = d3.select(this).attr("rbox");
    var rbo = closest_rboverlay(mousepos, boxID);

    // We're changing globals here. They get set back on mouseup.
    dragevent.locations = ["top", "bottom"];
    if ( !dragevent.locations.includes(rbo.location) ) { 
        dragevent.locations = [ rbo.location ]; 
    } 

    var rel = draw_rel_line(rbo.x, rbo.y, mousepos.x, mousepos.y);
    rel.datum().from = boxID;
    rel.datum().selected = true;

    // Add svg mouse actions for dragging relation across svg
    svg
       .on("mousemove", function (event) { svg_mousemove(event, rel) })
       .on("mouseup", function (event) { svg_mouseup(event, rel) } );

}

function closest_rboverlay(pos,boxID,locations=dragevent.locations) {
    // Get the overlay positions of the rolebox (not group!)
    var xyo = rboverlay_positions(boxID);
    return closest_location(pos,xyo,locations=locations)
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

function eligible_rolebox_locations(boxID,linkto="entity") {

    var left_rb = ["bottom","top","left"];
    var right_rb = ["bottom","right","top"];
    var middle_rb = ["bottom","top"];
    var rblocations = { "left": left_rb, "right": right_rb, 
                        "middle": middle_rb, "only": dragevent.locations };

    var rbox = d3.select("#"+boxID);

    // What overlays can used to link to rolebox?
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

    var rels = d3.select("#"+boxID).datum().relationships;
    for (var n in rels) {
        set_eligible_overlays( d3.select("#"+rels[n]) );
    }
}