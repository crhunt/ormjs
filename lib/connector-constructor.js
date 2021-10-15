/*
    Everything connated to connectors
*/

var svg;
var orm;
var dragevent;

var conntypes = {
    subtype: "subtype",
    default: "none",
    RBtoE: "RBtoE",
    EtoRB: "EtoRB"
};

function generate_connID() {
    connID = "id-conn-" + orm.highestRelID.toString();
    orm.highestRelID += 1;
    return connID
}

function conn_number(entityID) {
    return entityID.split("-")[2]
}

function set_highest_conn_ID() {
    for (var connID in orm.connectors) {
        var numID = parseInt( conn_number(connID) );
        if ( numID == orm.highestRelID ) {
            orm.highestRelID = numID+1;
        }
    }
}

function draw_conn_line(x1, y1, x2, y2) {

    // Create connector id
    var connID = generate_connID();
    
    // Draw the line
    line = svg.append("path")
              .datum( { x1: x1, y1: y1, x2: x2, y2: y2, 
                        kind: "connector", selected: false,
                        conntype: conntypes.default, 
                        from: "", to: "",
                        from_loc: dragevent.locations,
                        to_loc: dragevent.locations } )
              .attr("class","conn_line")
              .attr("id",connID)
              .attr("d", d3.line()([ [x1,y1], [x2,y2] ]));

    connector_actions(line);
    
    return line;
}

function connector_actions(conn) {
    conn
        .on("contextmenu", d3.contextMenu(connOptions)) // Right click menu
        .on("click", remove_connector);
}

// Remove connector on click event
function remove_connector(event) {
    //if (event.defaultPrevented) return; // Drag
    // Ctrl key for click event, buttons for right click menu
    if (event.ctrlKey || event.buttons == 2) {
        // Note: d3.select(this) works for ctrl+click events but not right click menu
        //var conn = d3.select(this);
        var click_objID = event.target.id.toString();
        console.log(click_objID)
        var conn = d3.select("#"+click_objID);
        delete_connector(conn);
    }
}


function dragged_by_object(conn) {
    // Relation is being dragged by a connecting object. Update position accordingly.
    
    // Get overlay position of entity that's closest to the other object
    // connected to the connector.
    var cd = conn.datum();
    var from_obj = get_any_object( cd.from );
    var to_obj = get_any_object( cd.to );
    // Get starting and ending positions from connected object location
    var from_pos = closest_overlay(to_obj.datum(), from_obj.attr("id"),
                                   locations=cd.from_loc);
    var to_pos = closest_overlay(from_obj.datum(), to_obj.attr("id"),
                                 locations=cd.to_loc);
    // Move the connector
    cd.x1 = from_pos.x;
    cd.y1 = from_pos.y;
    cd.x2 = to_pos.x;
    cd.y2 = to_pos.y;

    draw_connector(conn);
}

function redraw_connectors(conns) {
    for (var n in conns) {
        conn = orm.connectors[conns[n]];
        dragged_by_object(conn);
    }
}

function connect_to_objects(conn) {
    // Add to datum of objects connected to connector
    var cd = conn.datum();
    var from_obj = get_any_object( cd.from );
    var to_obj = get_any_object( cd.to );
    from_obj.datum().connectors.push(conn.attr("id"));
    to_obj.datum().connectors.push(conn.attr("id"));
    // Add to rolebox group datum
    update_rolebox_group_connectors(conn);
}

function remove_from_objects(conn) {
    // Remove from datum of objects connected to connector
    var cd = conn.datum();
    var from_obj = get_any_object( cd.from );
    var to_obj = get_any_object( cd.to );
    var fr = from_obj.datum().connectors;
    var tr = to_obj.datum().connectors;
    tr = remove_from_array(tr, conn.attr("id") );
    fr = remove_from_array(fr, conn.attr("id") );
    // Remove from rolebox group datum
    update_rolebox_group_connectors(conn, remove=true);
}

function update_rolebox_group_connectors(conn, remove=false) {
    // If conn is connected to a connector group, ensure conn
    // is part of the group's datum.
    // If remove, remove the connector from rolebox group datum

    var cd = conn.datum();
    var from_obj = get_any_object( cd.from );
    var to_obj = get_any_object( cd.to );
    var rbgroup;
    if ( from_obj.datum().kind == "rolebox" ) {
        rbgroup = d3.select("#"+from_obj.attr("parent"));
        // Set connectors at the group level
        bubble_connectors(rbgroup);
        if ( to_obj.datum().kind == "entity" && remove ) {
            // Rolebox no longer connects to an entity
            from_obj.datum().entity = null;
        }
        // Check if there is a "primary" entity (used to flip rolebox groups)
        set_primary_entity(rbgroup);
    }
    if ( to_obj.datum().kind == "rolebox" ) {
        rbgroup = d3.select("#"+to_obj.attr("parent"));
        // Set connectors at the group level
        bubble_connectors(rbgroup);
        if ( from_obj.datum().kind == "entity" && remove ) {
            // Rolebox no longer connects to an entity
            to_obj.datum().entity = null;
        }
        // Check if there is a "primary" entity (used to flip rolebox groups)
        set_primary_entity(rbgroup);
    }
}

function record_connector(conn) {
    connect_to_objects(conn);
    orm.connectors[conn.attr("id")] = conn;
}

function delete_connector(conn) {
    // Remove from record
    delete orm.connectors[ conn.attr("id") ];
    // Detach from objects (entities/roleboxes)
    remove_from_objects(conn);
    // Remove the connector visualization
    conn.remove();

    // Update rel
    parse_orm();
}


function svg_mousemove(event, conn) {
    
    // Set end of line from current pointer position
    cd = conn.datum();
    var m = d3.pointer(event);
    cd.x2 = m[0];
    cd.y2 = m[1];

    // Set beginning of line from closest overlay
    //entityID = entityID_from_overlayID( overlay.attr("id") );
    eo = closest_overlay({x: m[0], y: m[1]}, conn.datum().from);
    cd.x1 = eo.x;
    cd.y1 = eo.y;

    conn.attr("d", d3.line()([ [cd.x1, cd.y1], [cd.x2, cd.y2] ]));
}

function svg_mouseup(event, conn) {

    // Turn off svg mouse actions
    svg.on("mousemove", null).on("mouseup", null);

    // Reset dragevent
    dragevent.locations = ["bottom","right","top","left"];

    cd = conn.datum();

    // Only keep line if we're overlapping with an object
    var m = d3.pointer(event);
    var mouse_position = {x: m[0], y: m[1]};
    var to_what = closest_object(mouse_position);

    // Check with overlap
    if ( to_what.found ) {
        if ( to_what.distance < to_what.tolerance &&
             to_what.object.attr("id") != cd.from ) {
            // Set object as conn "to"
            cd.to = to_what.object.attr("id");
            // Determine whether objects can be linked 
            // (allowed by logic)
            check_orm_logic(conn);
        }
    }
    if ( cd.to != "" ) {
        // Keep connector
        // Draw the connector
        draw_connector(conn);
        // Make a record of the connector
        record_connector(conn);
        cd.selected = false;
    } else {
        // Delete connector
        conn.remove();
    }

    // Update rel
    parse_orm();

}

function check_orm_logic(conn) {

    /* 
        Determine whether logic allows for the connection
     */
    
    // What are the objects we're connecting?
    cd = conn.datum();
    d_to = d3.select("#"+cd.to).datum();
    d_from = d3.select("#"+cd.from).datum();

    // Choose connectors type based on pairs
    if ( d_to.kind == "entity" && d_from.kind == "entity") {
        // This is always allowed
        // Default conntype
        cd.conntype = conntypes.subtype;
    } else if ( d_to.kind == "entity" && d_from.kind == "rolebox" ) {
        // Only one entity per rolebox
        if ( d_from.entity == null ) {
            // Default conntype
            cd.conntype = conntypes.RBtoE;
            // Set entity for rolebox
            d_from.entity = cd.to;
            // Update primary entity_in for rolebox group
            set_primary_entity( d3.select("#"+d_from.parent) );
            // Check flip condition for rolebox group and redraw connected connectors
            check_flip_and_connectors( d3.select("#"+d_from.parent) );
            // Set eligible overlay locations for linking connector
            cd.from_loc = eligible_rolebox_locations(cd.from, linkto="entity");
        } else {
            cd.to = "";
            return
        }
    } else if ( d_to.kind == "rolebox" && d_from.kind == "entity" ) {
        if ( d_to.entity == null ) {
            // Default conntype
            cd.conntype = conntypes.EtoRB;
            // Set entity for rolebox
            d_to.entity = cd.from;
            // Update primary entity_in for rolebox group
            set_primary_entity( d3.select("#"+d_to.parent) );
            // Check flip condition for rolebox group and redraw connected connectors
            check_flip_and_connectors( d3.select("#"+d_to.parent) );
            // Set eligible overlay locations for linking connector
            cd.to_loc = eligible_rolebox_locations(cd.to, linkto="entity");
        } else {
            cd.to = "";
            return
        }
    } else {
        // Not allowed
        cd.to = "";
        return
    }

    // Update connector connection positions
    // from
    from_pos = closest_overlay(get_any_object(cd.to).datum(), 
                               cd.from, locations=cd.from_loc);
    cd.x1 = from_pos.x;
    cd.y1 = from_pos.y;
    // to
    to_pos = closest_overlay(get_any_object(cd.from).datum(), 
                             cd.to, locations=cd.to_loc);
    cd.x2 = to_pos.x;
    cd.y2 = to_pos.y;

}

function set_default_conntype(conn) {
    // Set the conntype based on what it is connecting
    // This is the default behavior when creating a new connector

    // What are the objects we're connecting?
    var cd = conn.datum();
    var d_to = d3.select("#"+cd.to).datum();
    var d_from = d3.select("#"+cd.from).datum();


    // Choose connectors type based on pairs
    if ( d_to.kind == "entity" && d_from.kind == "entity") {
        cd.conntype = conntypes.subtype;
    }
    if ( d_to.kind == "entity" && d_from.kind == "rolebox") {
        cd.conntype = conntypes.RBtoE;
    }
    if ( d_to.kind == "rolebox" && d_from.kind == "entity") {
        cd.conntype = conntypes.EtoRB;
    }

}

function set_eligible_overlays(conn) {

    // Update which overlay locations on the to and from object this 
    // connector is eligible to connect to

    // What are the objects we're connecting?
    var cd = conn.datum();
    var d_to = d3.select("#"+cd.to).datum();
    var d_from = d3.select("#"+cd.from).datum();

    // Default
    cd.from_loc = dragevent.locations;
    cd.to_loc = dragevent.locations;

    if ( d_to.kind == "rolebox" ) {
        cd.to_loc = eligible_rolebox_locations(cd.to, linkto=d_from.kind);
    }
    if ( d_from.kind == "rolebox" ) {
        cd.from_loc = eligible_rolebox_locations(cd.from, linkto=d_to.kind);
    }
}

/* Drawing connectors */


function resize_and_rotate(pos) {

    /* Path shapes need to be drawn based on distance between positions
       and rotated to indicate connection from (pos.x1, pos.y1)
       to (pos.x2, pos.y2). This function calculates the angle to rotate
       and defines the total length of the path. */

    var totallen = Math.sqrt( Math.pow( (pos.x1 - pos.x2), 2) +
                              Math.pow( (pos.y1 - pos.y2), 2) );
    var transform_string = "translate(" + pos.x1 + " " + pos.y1 + ")";
    var totalangle = Math.atan( ( pos.y2 - pos.y1 ) / ( pos.x2 - pos.x1 ) ) * 180 / Math.PI;
    if (pos.x1 > pos.x2) {totalangle += 180; }
    transform_string += " rotate("+totalangle+")";

    var rr = {transform: transform_string, length: totallen};

    return rr
}

function draw_connector(conn) {

    var cd = conn.datum();
    var lineparam = resize_and_rotate(cd);
    if ( cd.conntype == conntypes.default ) {
        conn.attr("d", d3.line()([ [cd.x1, cd.y1], [cd.x2, cd.y2] ]))
           .attr("class","connector conn_line");
    }
    else if ( cd.conntype == conntypes.subtype ) {
        conn.attr("d", function() { return subtypePath(lineparam.length).outline })
           .attr("class","connector conn_subtype")
           .attr("transform", lineparam.transform );
    } else if ( cd.conntype == conntypes.EtoRB || cd.conntype == conntypes.RBtoE ) {
        conn.attr("d", d3.line()([ [cd.x1, cd.y1], [cd.x2, cd.y2] ]))
           .attr("class","connector conn_line");
    }

}
