/*
    Everything related to relationships
*/

var svg;
var orm;
var dragevent;

var reltypes = {
    subtype: "subtype",
    default: "none"
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
                        from: "", to: "" } )
              //.attr("href","#rel_line_prototype")
              .attr("class","rel_line")
              .attr("id",relID)
              .attr("d", d3.line()([ [x1,y1], [x2,y2] ]));
              //.on("click", remove_relationship);
              //.call(drag);

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
    var from_pos = closest_overlay(to_obj.datum(), from_obj.attr("id"));
    var to_pos = closest_overlay(from_obj.datum(), to_obj.attr("id"));
    // Move the relation
    dr.x1 = from_pos.x;
    dr.y1 = from_pos.y;
    dr.x2 = to_pos.x;
    dr.y2 = to_pos.y;

    draw_relationship(rel);
    /*
    var lineparam = resize_and_rotate(dr);
    rel.attr("d", function() { return subtypeOutline(0,lineparam.length).outline })
       .attr("transform", lineparam.transform );
    */
    //rel.attr("d", d3.line()([ [dr.x1, dr.y1], [dr.x2, dr.y2] ]));
}

function connect_to_objects(rel) {
    // Add to datum of objects connected to relationship
    var dr = rel.datum();
    var from_obj = get_any_object( dr.from );
    var to_obj = get_any_object( dr.to );
    from_obj.datum().relationships.push(rel.attr("id"));
    to_obj.datum().relationships.push(rel.attr("id"));
}

function remove_from_objects(rel) {
    var dr = rel.datum();
    var from_obj = get_any_object( dr.from );
    var to_obj = get_any_object( dr.to );
    var fr = from_obj.datum().relationships;
    var tr = to_obj.datum().relationships;
    tr = remove_from_array(tr, rel.attr("id") );
    fr = remove_from_array(fr, rel.attr("id") );
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
    if ( to_what.object.datum().kind == "entity" &&
         to_what.object.attr("id") != orm.entities[dr.from].attr("id") ) {
        if ( to_what.distance < entity_param.width ) {
            // Overlapping with an entity
            to_pos = closest_eoverlay(orm.entities[dr.from].datum(), 
                                      to_what.object.attr("id"));
            dr.x2 = to_pos.x;
            dr.y2 = to_pos.y;
            dr.to = to_what.object.attr("id");
        }
    }
    if ( dr.to != "" ) {
        // Keep relation, tie location
        dr.reltype = reltypes.subtype;
        draw_relationship(rel);
        record_relationship(rel);
        dr.selected = false;
    } else {
        // Delete relation
        rel.remove();
    }

    // Update rel
    parse_orm();

}

/* Drawing relationships */


function resize_and_rotate(pos) {

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
           .attr("class","rel_line");
    }
    else if ( dr.reltype == reltypes.subtype ) {
        rel.attr("d", function() { return subtypeOutline(lineparam.length).outline })
           .attr("class","rel_subtype")
           .attr("transform", lineparam.transform );
    }

}

function subtypeOutline(end) {
    var start = 0;
    var arrowWidth = 1;
    var shaftRadius = arrowWidth / 4;
    var headRadius = arrowWidth * 2;
    var headLength = headRadius * 2;
    var shoulder = end - headLength;
    return {
        outline: [
            "M", start, ",", shaftRadius,
            "L", shoulder, ",", shaftRadius,
            "L", shoulder, ",", headRadius,
            "L", end, ",", 0,
            "L", shoulder, ",", -headRadius,
            "L", shoulder, ",", -shaftRadius,
            "L", start, ",", -shaftRadius,
            "Z"
        ].join(""),
        apex: {
            x: start + (shoulder - start) / 2,
            y: 0
        }
    };
};