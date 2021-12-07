/*
    Everything related to connectors.

    Connectors are the lines that join Entities, Roleboxes, Values, and Constraints.
    They also include constraints represented by connections, like Subtype, since
    their actions are the same.

*/

/*----- Global definitions -----*/

var svg; // Defined in svg-constructor
var orm; // Defined in parse-svg
var dragevent; // Defined in graph-constructor

/* Set all supported types of connections. This information is used to
   to determine how and whether objects can connect. */
var conntypes = {
    subtype: "subtype",
    default: "none",
    EtoRB: "EtoRB",
    VtoRB: "VtoRB"
};

/*----- END Global definitions -----*/

/*----- Connector IDS -----*/

function generate_connID() {
    connID = "id-conn-" + orm.highestConnID.toString();
    orm.highestConnID += 1;
    return connID
}

/*----- END Connector IDs -----*/

/*-----  Defining connectors -----*/

function draw_conn_line(x1, y1, x2, y2) {

    /*
       Define the connection generically, 
       on a drag event from an object overlay. 
       
       Once the connector joins two objects,
       it will be assigned a conntype. Before then it has the 
       default type and appearance.
     */

    // Create connector id
    var connID = generate_connID();
    
    // Draw the line
    line = svg.append("path")
              .datum( { x1: x1, y1: y1, x2: x2, y2: y2, 
                        kind: "connector", selected: false,
                        conntype: conntypes.default, 
                        mandatory: false,
                        from: "", to: "",
                        from_loc: dragevent.locations,
                        to_loc: dragevent.locations } )
              .attr("class","conn_line")
              .attr("id",connID)
              .attr("d", d3.line()([ [x1,y1], [x2,y2] ]));
    
    // Add actions for teh connector.
    connector_actions(line);
    
    return line;
}

function connector_actions(conn) {
    conn
        .on("contextmenu", d3.contextMenu(connOptions)) // Right click menu
        .on("click", remove_connector); // Delete the connector
}

/*----- END Defining connectors -----*/

/*----- Drag connectors -----*/

function update_connector_positions(conn) {
    
    /* 
       Connector is being dragged by a connected object. 
       Update position accordingly.
     */
    
    // Get overlay position of entity that's closest to the other object
    // connected to the connector.
    var cd = conn.datum();
    // Get starting and ending positions from connected object location
    var from_pos = closest_overlay( get_any_object( cd.to ).datum(), cd.from,
                                   locations=cd.from_loc);
    var to_pos = closest_overlay( get_any_object( cd.from ).datum(), cd.to,
                                  locations=cd.to_loc );
    // Move the connector
    cd.x1 = from_pos.x;
    cd.y1 = from_pos.y;
    cd.x2 = to_pos.x;
    cd.y2 = to_pos.y;

    draw_connector(conn);
}

function redraw_connectors(conns) {

    /* Redraw all the connectors in the list conns. */

    for (var n in conns) {
        conn = orm.connectors[conns[n]];
        update_connector_positions(conn);
    }
}

/*----- END Drag connectors -----*/

/*----- Add and remove connectors and their data -----*/

function remove_connector(event) {
    
    /* Remove connector on click event */

    //if (event.defaultPrevented) return; // Drag

    // Only 2 types of click events should result in deleting connector:
    // Ctrl key for click event, buttons for right click menu
    if (event.ctrlKey || event.buttons == 2) {
        // Note: d3.select(this) works for ctrl+click events but not right click menu
        //var conn = d3.select(this);
        var click_objID = event.target.id.toString();
        var conn = d3.select("#"+click_objID);
        delete_connector(conn);
    }
}

function connect_to_objects(conn) {

    /*
       Add connection information to objects.

       Using the conn's datum, determine what the conn is 
       connected to and update the object(s) datum(s) to 
       reflect the connection.
     */
    
    // Find connected objects
    var cd = conn.datum();
    var from_obj = get_any_object( cd.from );
    var to_obj = get_any_object( cd.to );
    // Add to datum of objects connected to connector
    from_obj.datum().connectors.push(conn.attr("id"));
    to_obj.datum().connectors.push(conn.attr("id"));
    
    // Add to rolebox group datum
    update_rolebox_group_connectors(conn);
}

function remove_from_objects(conn) {

    /*
       Remove connection information from objects.

       Using the conn's datum, determine what the conn is 
       connected to and update the object(s) datum(s) to 
       remove the connection.
     */
    
    // Find connected objects
    var cd = conn.datum();
    var from_obj = get_any_object( cd.from );
    var to_obj = get_any_object( cd.to );
    // Get objects' list of connectors
    var fr = from_obj.datum().connectors;
    var tr = to_obj.datum().connectors;
    // Remove conn from lists
    tr = remove_from_array(tr, conn.attr("id") );
    fr = remove_from_array(fr, conn.attr("id") );
    // Remove from rolebox group datum
    update_rolebox_group_connectors(conn, remove=true);
}

function update_rolebox_group_connectors(conn, remove=false) {
    
    /* 
       If conn is connected to a rolebox, ensure conn
       is part of the rolebox group's datum.

       If remove, remove the connector from rolebox group datum
     */

    // Find objects connected to conn
    var cd = conn.datum();
    var from_obj = get_any_object( cd.from );
    var to_obj = get_any_object( cd.to );
    var rbgroup;
    // Check if from_obj is a rolebox
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
    // Check if to_obj is a rolebox
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
    // The connection is staying. Let's add it to the orm model.
    connect_to_objects(conn);
    orm.connectors[conn.attr("id")] = conn;
}

function delete_connector(conn) {

    /* Delete the connector, both visualization and model
       data about it. */

    // Detach from objects (entities/roleboxes)
    remove_from_objects(conn);
    // Remove the connector visualization
    conn.remove();
    // Remove from record
    delete orm.connectors[ conn.attr("id") ];

    // Update rel
    parse_orm();
}

/*----- END Add and remove connectors and their data -----*/

/*----- Connector creation event -----*/

function svg_mousemove(event, conn) {

    /*
       Drag event from an object overlay.

       Draw a line from the overlay and to the cursor,
       following the cursor while the click press continues.
     */
    
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

    /*
       Drag event from an object overlay is over.

       Determine based on cursor position on mouse up whether
       the connector connects to objects and if that connection 
       is allowed by ORM. If so, finalize the connector as a
       new part of the model.
     */

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
        Determine whether ORM logic allows for the connection.

        This is a bit of a fussy bit of logic that checks the
        object types the connection is trying to link and uses
        ORM rules to determine whether or not the connection is 
        allowed.
     */
    
    // What are the objects we're connecting?
    var cd = conn.datum();
    var d_to = d3.select("#"+cd.to).datum();
    var d_from = d3.select("#"+cd.from).datum();

    // Choose connectors type based on pairs
    if ( d_to.kind == "entity" && d_from.kind == "entity") {
        /* Entity to Entity */
        
        // This is always allowed as a subtype constraint.
        // Default conntype
        cd.conntype = conntypes.subtype;
    } else if ( d_to.kind == "entity" && d_from.kind == "rolebox" ) {
        /* Rolebox to Entity */
        
        // Only one entity is allowed per rolebox
        if ( d_from.entity == null ) {
            // We always define connections as from entity to rolebox
            // When connected the other way, flip.
            // Flip
            flip_connection_data(cd);
            // Get connected objects datum's
            d_to = d3.select("#"+cd.to).datum();
            d_from = d3.select("#"+cd.from).datum();
            assign_role_to_entity(d_to, cd);
        } else {
            // The rolebox is already connected to an entity.
            // This connection isn't allowed.
            cd.to = "";
            return
        }
    } else if ( d_to.kind == "rolebox" && d_from.kind == "entity" ) {
        /* Entity to Rolebox */

        // Only one entity is allowed per rolebox
        if ( d_to.entity == null ) {
            assign_role_to_entity(d_to, cd);
        } else {
            // The rolebox is already connected to an entity.
            // This connection isn't allowed.
            cd.to = "";
            return
        }
    } else {
        // Not allowed, catch-all
        cd.to = "";
        return
    }

    /* Update overlays the connector is connected to.
       This can change now that we know the types of objects that
       are connected. */
    update_connector_positions(conn);

}

function flip_connection_data(cd) {
    /* Flip the object that is connected "from" and "to"
       the connector in its datum, cd. */

    var cdto = cd.to;
    cd.to = cd.from;
    cd.from = cdto;
    var cdtoloc = cd.to_loc;
    cd.to_loc = cd.from_loc;
    cd.from_loc = cdtoloc;
}

function assign_role_to_entity(d_rolebox, d_conn) {

    /*
       If a connector connects a rolebox and entity,
       1. Set the connection type
       2. The rolebox datum needs to be updated to include
          which entity plays the role
       3. Check which entity acts as the "primary" entity
          for the rolebox group. (This is used for flipping rolebox groups.)
       4. Set which overlays on the entity the connection is eligible to
          link to.
     */
    // Default conntype
    d_conn.conntype = conntypes.EtoRB;
    // Set entity for rolebox
    d_rolebox.entity = d_conn.from;
    // Update primary entity_in for rolebox group
    set_primary_entity( d3.select("#"+d_rolebox.parent) );
    // Check flip condition for rolebox group and redraw connected connectors
    check_flip_and_connectors( d3.select("#"+d_rolebox.parent) );
    // Set eligible overlay locations for linking connector
    d_conn.to_loc = eligible_rolebox_locations(d_conn.to, linkto="entity");
}

function set_default_conntype(conn) {
    
    /*
       Set the conntype based on what it is connecting.
       We are setting the default behavior when creating a new connector.
     */

    // What are the objects we're connecting?
    var cd = conn.datum();
    var d_to = d3.select("#"+cd.to).datum();
    var d_from = d3.select("#"+cd.from).datum();


    // Choose connectors type based on pairs
    if ( d_to.kind == "entity" && d_from.kind == "entity") {
        cd.conntype = conntypes.subtype;
    }
    if ( d_to.kind == "rolebox" && d_from.kind == "entity") {
        cd.conntype = conntypes.EtoRB;
    }

}

function set_eligible_overlays(conn) {

    /*
       Update which overlay locations this 
       connector is eligible to connect to on the to and from object.

       This is necessary to ensure the connectors look aesthetically
       pleasing and the visual connection points between objects make
       sense based on what is being connected.
     */

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

/*----- END Connector creation event -----*/

/*----- Drawing connectors -----*/

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

    /*
       Based on the conntype of the connection, set the style of
       the connector and draw it. 

       This is where we set what the connector actually looks like
       (simple line vs arrow, color, etc).

       The paths referenced here are defined in connector-paths.js
     */

    var cd = conn.datum();
    var lineparam = resize_and_rotate(cd);
    //conn.attr("d", d3.line()([ [0, 0], [0, lineparam.length] ]))
    if ( cd.conntype == conntypes.default ) {
        conn.attr("d", d3.line()([ [cd.x1, cd.y1], [cd.x2, cd.y2] ]))
            .attr("class","connector conn_line");
    }
    else if ( cd.conntype == conntypes.subtype ) {
        conn.attr("d", function() { return subtypePath(lineparam.length).outline })
            .attr("class","connector conn_subtype")
            .attr("transform", lineparam.transform );
    } 
    else if ( cd.conntype == conntypes.EtoRB && cd.mandatory == false) {
        //conn.attr("d", d3.line()([ [cd.x1, cd.y1], [cd.x2, cd.y2] ]))
        conn.attr("d", function() { return linePath(lineparam.length).outline })
            .attr("class","connector conn_line")
            .attr("transform", lineparam.transform );
    }
    else if ( cd.conntype == conntypes.EtoRB && cd.mandatory == true) {
        conn
            .attr("d", function() { return mandatoryPath(lineparam.length).outline })
            .attr("class","connector conn_mandatory") // conn_mandatory
            //.attr("fill","url(#mandatoryConstraint)")
            .attr("transform", lineparam.transform );
    }

}

/*----- END Drawing connectors -----*/