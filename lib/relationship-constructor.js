/*
    Everything related to relationships
*/

var svg;
var orm;
var dragevent;

var reltypes = {
    subtype: "subtype",
    default: "none",
    RBtoE: "RBtoE",
    EtoRB: "EtoRB"
};

function generate_relID() {
    relID = "id-rel-" + orm.highestRelID.toString();
    orm.highestRelID += 1;
    return relID
}

function rel_number(entityID) {
    return entityID.split("-")[2]
}

function set_highest_rel_ID() {
    for (var relID in orm.relationships) {
        var numID = parseInt( rel_number(relID) );
        if ( numID == orm.highestRelID ) {
            orm.highestRelID = numID+1;
        }
    }
}

function draw_rel_line(x1, y1, x2, y2) {

    // Create relationship id
    var relID = generate_relID();
    
    // Draw the line
    line = svg.append("path")
              .datum( { x1: x1, y1: y1, x2: x2, y2: y2, 
                        kind: "relation", selected: false,
                        reltype: reltypes.default, 
                        from: "", to: "",
                        from_loc: dragevent.locations,
                        to_loc: dragevent.locations } )
              .attr("class","rel_line")
              .attr("id",relID)
              .attr("d", d3.line()([ [x1,y1], [x2,y2] ]));

    relationship_actions(line);
    
    return line;
}

function relationship_actions(rel) {
    rel.on("click", remove_relationship);
}

// Remove relationship on click event
function remove_relationship(event) {
    if (event.defaultPrevented) return; // Drag
    if (event.ctrlKey) {
        var rel = d3.select(this);
        delete_relationship(rel);
    }
}


function dragged_by_object(rel) {
    // Relation is being dragged by a connecting object. Update position accordingly.
    
    // Get overlay position of entity that's closest to the other object
    // connected to the relation.
    var dr = rel.datum();
    var from_obj = get_any_object( dr.from );
    var to_obj = get_any_object( dr.to );
    // Get starting and ending positions from connected object location
    var from_pos = closest_overlay(to_obj.datum(), from_obj.attr("id"),
                                   locations=dr.from_loc);
    var to_pos = closest_overlay(from_obj.datum(), to_obj.attr("id"),
                                 locations=dr.to_loc);
    // Move the relation
    dr.x1 = from_pos.x;
    dr.y1 = from_pos.y;
    dr.x2 = to_pos.x;
    dr.y2 = to_pos.y;

    draw_relationship(rel);
}

function redraw_relationships(rels) {
    for (var n in rels) {
        rel = orm.relationships[rels[n]];
        dragged_by_object(rel);
    }
}

function connect_to_objects(rel) {
    // Add to datum of objects connected to relationship
    var dr = rel.datum();
    var from_obj = get_any_object( dr.from );
    var to_obj = get_any_object( dr.to );
    from_obj.datum().relationships.push(rel.attr("id"));
    to_obj.datum().relationships.push(rel.attr("id"));
    // Add to rolebox group datum
    update_rolebox_group_relationships(rel);
}

function remove_from_objects(rel) {
    // Remove from datum of objects connected to relationship
    var dr = rel.datum();
    var from_obj = get_any_object( dr.from );
    var to_obj = get_any_object( dr.to );
    var fr = from_obj.datum().relationships;
    var tr = to_obj.datum().relationships;
    tr = remove_from_array(tr, rel.attr("id") );
    fr = remove_from_array(fr, rel.attr("id") );
    // Remove from rolebox group datum
    update_rolebox_group_relationships(rel, remove=true);
}

function update_rolebox_group_relationships(rel, remove=false) {
    // If rel is connected to a relationship group, ensure rel
    // is part of the group's datum.
    // If remove, remove the relationship from rolebox group datum

    var dr = rel.datum();
    var from_obj = get_any_object( dr.from );
    var to_obj = get_any_object( dr.to );
    var rbgroup;
    if ( from_obj.datum().kind == "rolebox" ) {
        rbgroup = d3.select("#"+from_obj.attr("parent"));
        // Set relationships at the group level
        bubble_relationships(rbgroup);
        if ( to_obj.datum().kind == "entity" && remove ) {
            // Rolebox no longer connects to an entity
            from_obj.datum().entity = null;
        }
        // Check if there is a "primary" entity (used to flip rolebox groups)
        set_primary_entity(rbgroup);
    }
    if ( to_obj.datum().kind == "rolebox" ) {
        rbgroup = d3.select("#"+to_obj.attr("parent"));
        // Set relationships at the group level
        bubble_relationships(rbgroup);
        if ( from_obj.datum().kind == "entity" && remove ) {
            // Rolebox no longer connects to an entity
            to_obj.datum().entity = null;
        }
        // Check if there is a "primary" entity (used to flip rolebox groups)
        set_primary_entity(rbgroup);
    }
}

function record_relationship(rel) {
    connect_to_objects(rel);
    orm.relationships[rel.attr("id")] = rel;
}

function delete_relationship(rel) {
    // Remove from record
    delete orm.relationships[ rel.attr("id") ];
    // Detach from objects (entities/roleboxes)
    remove_from_objects(rel);
    // Remove the relationship visualization
    rel.remove();

    // Update rel
    parse_orm();
}


function svg_mousemove(event, rel) {
    
    // Set end of line from current pointer position
    dr = rel.datum();
    var m = d3.pointer(event);
    dr.x2 = m[0];
    dr.y2 = m[1];

    // Set beginning of line from closest overlay
    //entityID = entityID_from_overlayID( overlay.attr("id") );
    eo = closest_overlay({x: m[0], y: m[1]}, rel.datum().from);
    dr.x1 = eo.x;
    dr.y1 = eo.y;

    rel.attr("d", d3.line()([ [dr.x1, dr.y1], [dr.x2, dr.y2] ]));
}

function svg_mouseup(event, rel) {

    // Turn off svg mouse actions
    svg.on("mousemove", null).on("mouseup", null);

    // Reset dragevent
    dragevent.locations = ["bottom","right","top","left"];

    dr = rel.datum();

    // Only keep line if we're overlapping with an object
    var m = d3.pointer(event);
    var mouse_position = {x: m[0], y: m[1]};
    var to_what = closest_object(mouse_position);

    // Check with overlap
    if ( to_what.found ) {
        if ( to_what.distance < to_what.tolerance &&
             to_what.object.attr("id") != dr.from ) {
            // Set object as rel "to"
            dr.to = to_what.object.attr("id");
            // Determine whether objects can be linked 
            // (allowed by logic)
            check_orm_logic(rel);
        }
    }
    if ( dr.to != "" ) {
        // Keep relation
        // Draw the relationship
        draw_relationship(rel);
        // Make a record of the relationship
        record_relationship(rel);
        dr.selected = false;
    } else {
        // Delete relation
        rel.remove();
    }

    // Update rel
    parse_orm();

}

function check_orm_logic(rel) {

    /* 
        Determine whether logic allows for the connection
     */
    
    // What are the objects we're connecting?
    rd = rel.datum();
    d_to = d3.select("#"+rd.to).datum();
    d_from = d3.select("#"+rd.from).datum();

    // Choose relationships type based on pairs
    if ( d_to.kind == "entity" && d_from.kind == "entity") {
        // This is always allowed
        // Default reltype
        rd.reltype = reltypes.subtype;
    } else if ( d_to.kind == "entity" && d_from.kind == "rolebox" ) {
        // Only one entity per rolebox
        if ( d_from.entity == null ) {
            // Default reltype
            rd.reltype = reltypes.RBtoE;
            // Set entity for rolebox
            d_from.entity = rd.to;
            // Update primary entity_in for rolebox group
            set_primary_entity( d3.select("#"+d_from.parent) );
            // Set eligible overlay locations for linking relation
            rd.from_loc = eligible_rolebox_locations(rd.from, linkto="entity");
        } else {
            rd.to = "";
            return
        }
    } else if ( d_to.kind == "rolebox" && d_from.kind == "entity" ) {
        if ( d_to.entity == null ) {
            // Default reltype
            rd.reltype = reltypes.EtoRB;
            // Set entity for rolebox
            d_to.entity = rd.from;
            // Update primary entity_in for rolebox group
            set_primary_entity( d3.select("#"+d_to.parent) );
            // Set eligible overlay locations for linking relation
            rd.to_loc = eligible_rolebox_locations(rd.to, linkto="entity");
        } else {
            rd.to = "";
            return
        }
    } else {
        // Not allowed
        rd.to = "";
        return
    }

    // Update relation connection positions
    // from
    from_pos = closest_overlay(get_any_object(rd.to).datum(), 
                               rd.from, locations=rd.from_loc);
    rd.x1 = from_pos.x;
    rd.y1 = from_pos.y;
    // to
    to_pos = closest_overlay(get_any_object(rd.from).datum(), 
                             rd.to, locations=rd.to_loc);
    rd.x2 = to_pos.x;
    rd.y2 = to_pos.y;

}

function set_default_reltype(rel) {
    // Set the reltype based on what it is connecting
    // This is the default behavior when creating a new relationship

    // What are the objects we're connecting?
    var rd = rel.datum();
    var d_to = d3.select("#"+rd.to).datum();
    var d_from = d3.select("#"+rd.from).datum();


    // Choose relationships type based on pairs
    if ( d_to.kind == "entity" && d_from.kind == "entity") {
        rd.reltype = reltypes.subtype;
    }
    if ( d_to.kind == "entity" && d_from.kind == "rolebox") {
        rd.reltype = reltypes.RBtoE;
    }
    if ( d_to.kind == "rolebox" && d_from.kind == "entity") {
        rd.reltype = reltypes.EtoRB;
    }

}

function set_eligible_overlays(rel) {

    // Update which overlay locations on the to and from object this 
    // relation is eligible to connect to

    // What are the objects we're connecting?
    var rd = rel.datum();
    var d_to = d3.select("#"+rd.to).datum();
    var d_from = d3.select("#"+rd.from).datum();

    // Default
    rd.from_loc = dragevent.locations;
    rd.to_loc = dragevent.locations;

    if ( d_to.kind == "rolebox" ) {
        rd.to_loc = eligible_rolebox_locations(rd.to, linkto=d_from.kind);
    }
    if ( d_from.kind == "rolebox" ) {
        rd.from_loc = eligible_rolebox_locations(rd.from, linkto=d_to.kind);
    }
}

/* Drawing relationships */


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

function draw_relationship(rel) {

    var dr = rel.datum();
    var lineparam = resize_and_rotate(dr);
    if ( dr.reltype == reltypes.default ) {
        rel.attr("d", d3.line()([ [dr.x1, dr.y1], [dr.x2, dr.y2] ]))
           .attr("class","relationship rel_line");
    }
    else if ( dr.reltype == reltypes.subtype ) {
        rel.attr("d", function() { return subtypePath(lineparam.length).outline })
           .attr("class","relationship rel_subtype")
           .attr("transform", lineparam.transform );
    } else if ( dr.reltype == reltypes.EtoRB || dr.reltype == reltypes.RBtoE ) {
        rel.attr("d", d3.line()([ [dr.x1, dr.y1], [dr.x2, dr.y2] ]))
           .attr("class","relationship rel_line");
    }

}
