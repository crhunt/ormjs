/*
    Everything related to entities.

    This file defines entities, data associated with how they are represented and
    connected to other objects, and actions they can perform, such as on drag and 
    click events.
*/

/*----- Global definitions -----*/

// Entity appearance and behavior
// These quantities are pulled from the style sheet, orm-style.css
var entity_param = {
    /*width : parse_number( get_css_variable('--entity-width') ),*/
    height : parse_number( get_css_variable('--entity-height') ),
    snapTolerance : parse_number( get_css_variable('--entity-height') )/10
};

// Distance tolerances for snap and link events
var tolerance;
tolerance.link["entity"] = 2*entity_param.height ;
tolerance.snap["entity"] = entity_param.snapTolerance ;

// Graph variables
var svg; // Defined in svg-constructor
var orm; // Defined in graph-constructor

/*----- END Global definitions -----*/

/*----- Entity IDS -----*/

function generate_entityID() {
    entityID = "id-entity-" + orm.highestEntityID.toString();
    orm.highestEntityID += 1;
    return entityID
}

function is_entityID(anyID) {
    if ( anyID.includes("entity") ) { return true; }
    return false;
}

function overlay_from_ID(entityID) {
    return "o-"+entityID;
}

function entityID_from_overlayID(oentityID) {
    return oentityID.split("-")[1] + "-" + 
           oentityID.split("-")[2] + "-" +
           oentityID.split("-")[3];
}

/*----- END Entity IDs -----*/

/*-----  Drawing entities -----*/

function entity_definition(x,y,entityID) {

    // Definition of how an entity looks

    var ename = "Entity "+object_number(entityID);
    //var width = entity_param.width;
    var width = calc_entity_width(ename);
    var height = entity_param.height;

    // Create a group for the rect / text
    var entity = svg.append("g")
        .datum( {x: x, y: y, dx: 0, dy: 0, x0: x, y0: y,
                selected: false, kind: "entity",
                overlay: overlay_from_ID(entityID),
                connectors: [],
                name: ename, refmode: "id"} )
        .attr("class","entity_prototype")
        .attr("id",entityID)
        .attr("parent",entityID) // This is used for the overlay definitions
        .attr("x", function(){ return (x) })
        .attr("y", function(){ return (y) })
        .attr("width", width)
        .attr("height", height);
    // Entity rectangle
    entity.append("rect")
        .attr("class","entity")
        .attr("id","r-"+entityID)
        .attr("x", function(){ return (x) })
        .attr("y", function(){ return (y) })
        .attr("width", width)
        .attr("transform", "translate( -" + width/2 + 
                                     " -" + height/2 + " )");
    
    // Display entity name
    var spl = 9;
    entity.append("text")
        .attr("class","ename")
        .attr("id","t-"+entityID)
        .attr("x", function(){ return (x) })
        .attr("y", function(){ return (y-spl) })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .text( function(d){ return d.name } );

    // Display entity refmode
    entity.append("text")
        .attr("class","refmode")
        .attr("id","tr-"+entityID)
        .attr("x", function(){ return (x) })
        .attr("y", function(){ return (y+spl) })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .text( function(d){ return `(.${d.refmode})` } );
    
    return entity;

}

function draw_entity(x,y) {

    // Draw a new instance of an entity

    // Create entity id
    var entityID = generate_entityID();

    // Add the visualization of the entity
    var entity = entity_definition(x,y,entityID);

    // Record new entity
    orm.entities[entityID] = entity;

    // Create new overlay for entity
    // Overlays are defined in graph-constructor
    var overlay = overlay_definition(entity,"eoverlay");

    // Add actions to entity and overlay
    entity_actions(entity);

    // Update rel
    parse_orm();

}

function calc_entity_width(ename) {
    // Based on name length, set size of entity
    return ename.length*10 + 21;
}

/*----- END Drawing entities -----*/

/*----- Entity actions -----*/

function entity_actions(entity) {

    // What to do on drag event
    var drag_entity = d3.drag()
        .on("start", edragstarted)
        .on("drag", function (event,d) { edragged(event,d, entity.attr("id") ) } )
        .on("end", edragended);

    // Add events to the entity
    entity
        .on("dblclick", popup_event)
        .on("contextmenu", d3.contextMenu(entityOptions)) // Right click menu
        .on("click", remove_entity) // Ctrl+click --> remove entity
        .call(drag_entity);

    // Add events to overlay
    eoverlay = d3.select( "#" + overlay_from_ID(entity.attr("id")) );
    overlay_actions(eoverlay);
}

function overlay_actions(eoverlay) {
    eoverlay.on("mousedown", eomousedown );
}

// Removing entities on click events
function remove_entity(event) {
    // Get entity
    // Note: d3.select(this) works for ctrl+click events but not right click menu
    var click_objID = event.target.id.toString();//.substring(0,event.target.length);
    var parentID = get_rbgroupID(click_objID);
    entity = orm.entities[parentID];
    if (entity == null) { return }
    // Ctrl key for click event, buttons for right click menu
    if (event.ctrlKey || event.buttons == 2) {
        delete_entity( entity );
    }
}

function delete_entity(entity) {

    // ** Remove connectors **
    d = entity.datum();
    conns = d.connectors;
    for ( n in conns ) {
        delete_connector(orm.connectors[ conns[n] ]);
    }

    // ** Remove the entity visualization **
    entityID = entity.attr("id");
    // Remove overlay part
    d3.select( "#" + overlay_from_ID(entityID) ).remove();
    // Remove entity part
    entity
        .transition()
        .duration(500)
        .attr("transform", "translate(" + d.x + "," + 
                        d.y + ") scale(0)")
        .remove();
    
    // ** Remove the entity from records **
    delete orm.entities[ entityID ];

    // ** If popup related to entity exists, remove it **
    if ( ! d3.select("#pop-"+entityID).empty() ) { 
        remove_popup( d3.select("#pop-"+entityID) ); 
    }

    // Update ORM
    parse_orm();
}

function update_entity_name(entity) {
    // Update the name visualization based on the datum
    update_entity_width(entity);
    d = entity.datum();
    d3.select("#t-"+entity.attr("id"))
        .text( d.name );
        //.call(textwrap, entity_param.width-10);
    d3.select("#tr-"+entity.attr("id"))
        .text( `(.${d.refmode})` );
}

function update_entity_width(entity) {
    // Calculate width
    var entityID = entity.attr("id");
    var d = entity.datum();
    var prevwidth = entity.attr("width");
    var width = calc_entity_width(d.name);
    // Adjust width of group
    entity.attr("width",width);
    // Adjust width of overlay
    update_overlay_width(entity);
    // Adjust width of rect
    d3.select("#r-"+entityID)
        //.attr("x", d.x)
        //.attr("y", d.y)
        .attr("width", width)
        .attr("transform", () => translate( -width/2, -entity_param.height/2 ));

    // Drag all connected connectors
    for (var n in d.connectors) {
        conn = orm.connectors[d.connectors[n]];
        update_connector_positions(conn);
    }
}

function update_overlay_width(entity) {
    // Delete the original overlay
    var entityID = entity.attr("id");
    d3.select( "#" + overlay_from_ID(entityID) ).remove();
    // Replace the overlay
    var eoverlay = overlay_definition(entity,"eoverlay");
    var d = entity.datum();
    eoverlay.attr("transform", () => overlay_translate(d.x0, d.y0, 
        entity.attr("width"),entity.attr("height")) );
    // Add actions to new overlay
    overlay_actions(eoverlay);
}

/*-----  Drag control for the entity -----*/

/* On drag for the entity rect */

function edragstarted(event) {
    event.sourceEvent.stopPropagation();
    d3.select(this).datum().selected = true;
}

function edragged(event,d,entityID) {

    // Set the new position
    d.dx += event.dx;
    d.dy += event.dy;

    // Snap to entities
    d.dx = snap( d.dx + d.x0, "x", entityID ) - d.x0;
    d.dy = snap( d.dy + d.y0, "y", entityID ) - d.y0;
    d.x = d.x0 + d.dx;
    d.y = d.y0 + d.dy;

    // Drag entity
    // Need transform on group as long as we can't use prototype
    var entity = d3.select("#"+entityID);
    entity.attr("x", d.x )
          .attr("y", d.y )
          .attr("transform", "translate("+d.dx+","+d.dy+")");
    
    // Drag all connected connectors
    for (var n in d.connectors) {
        conn = orm.connectors[d.connectors[n]];
        update_connector_positions(conn);
    }

}

function edragended() {
    d3.select(this).datum().selected = false;

    // Check flip condition and redraw connected connectors
    var entity = d3.select(this);
    var rbgroups = entity_plays_lead_roles(entity);
    for (var n in rbgroups) {
        check_flip_and_connectors(rbgroups[n]);
    }

    // Update ORM
    parse_orm();
}

function entity_plays_lead_roles(entity) {
    var conns = entity.datum().connectors;
    var entityID = entity.attr("id");
    var rbgroups = [];
    for (var n in conns) {
        var d = d3.select("#"+conns[n]).datum();
        var rbgID = null;
        if ( d3.select("#"+d.from).datum().kind == "rolebox" ){
            rbgID = d3.select("#"+d.from).datum().parent;
        } else if ( d3.select("#"+d.to).datum().kind == "rolebox" ){
            rbgID =  d3.select("#"+d.to).datum().parent;
        }
        if (rbgID != null) {
            if ( d3.select("#"+rbgID).datum().entity_in == entityID ) {
                rbgroups.push( d3.select("#"+rbgID) );
            }
        }
    }
    return rbgroups
}

/* On mouse down for the entity overlay circles */

function eomousedown(event) {
    
    event.stopPropagation();

    // Get entity
    var entityID = entityID_from_overlayID( d3.select(this).attr("id") );
    var d = orm.entities[entityID].datum();

    // Current pointer position
    var m = d3.pointer(event);
    var width = orm.entities[entityID].attr("width");
    var mousepos = {x: m[0] + d.x - width/2, 
                    y: m[1] + d.y - entity_param.height/2};

    // Center of closest entity overlay
    var eo = closest_eoverlay(mousepos, entityID);

    var conn = draw_conn_line(eo.x, eo.y, mousepos.x, mousepos.y);
    conn.datum().from = entityID;
    conn.datum().selected = true;

    // Add svg mouse actions for dragging connector across svg
    svg
       .on("mousemove", function (event) { svg_mousemove(event, conn) })
       .on("mouseup", function (event) { svg_mouseup(event, conn) } );

}

function closest_eoverlay(position,entityID) {
    
    // Get the overlay positions of the entity
    var xyo = eoverlay_positions(entityID);
    // Get closest of the overlay positions
    return closest_location(position,xyo);
}

function eoverlay_positions(entityID) {
    
    // Entity position
    var entity = orm.entities[entityID];
    var x = entity.datum().x;
    var y = entity.datum().y;
    var width = entity.attr("width");
    var xyoverlay = {
        "bottom" : { x: x,
                  y : y + entity_param.height/2, 
                  location : "bottom" },
        "right" : {x : x + width/2,
                   y: y,
                   location : "right" },
        "top" : { x: x,
                     y: y - entity_param.height/2,
                     location : "top" },
        "left" : {x: x - width/2,
                  y: y,
                  location : "left" }
    }
    return xyoverlay;
}

/* END On mouse up for the entity overlay circles */

/*----- END  Drag control for the entity -----*/

/*----- END Entity actions -----*/