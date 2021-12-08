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
    height : parse_number( get_css_variable('--entity-height') ),
    snapTolerance : parse_number( get_css_variable('--entity-height') )/10
};

// Distance tolerances for snap and link events
var tolerance; // Defined in graph-constructor
tolerance.link["entity"] = 2*entity_param.height ;
tolerance.snap["entity"] = entity_param.snapTolerance ;

// Graph variables
var svg; // Defined in svg-constructor
var orm; // Defined in parse-svg

/*----- END Global definitions -----*/

/*----- Entity IDS -----*/

function generate_entityID() {
    /* ID of the entity group */
    entityID = "id-entity-" + orm.highestEntityID.toString();
    orm.highestEntityID += 1;
    return entityID
}

function is_entityID(anyID) {
    /* Does anyID play any part in an entity? 
       (Returns true for boxes, text, etc) */
    if ( anyID.includes("entity") ) { return true; }
    return false;
}

function overlay_from_ID(entityID) {
    /* Given entity ID, generate its overlay ID */
    return "o-"+entityID;
}

function entityID_from_overlayID(oentityID) {
    /* Given entity's overlay ID, generate its entity ID */
    return oentityID.split("-")[1] + "-" + 
           oentityID.split("-")[2] + "-" +
           oentityID.split("-")[3];
}

/*----- END Entity IDs -----*/

/*-----  Drawing entities -----*/

function entity_definition(x,y,entityID) {

    /* Define the entity appearance (box, display name, overlays) 
       and initialize its datum. */

    var ename = "Entity "+object_number(entityID);
    //var width = entity_param.width;
    var width = calc_entity_width(ename);
    var height = entity_param.height;

    // Create a group for the rect / text
    var entity = svg.append("g")
        .datum( {x: x, y: y, dx: 0, dy: 0, x0: x, y0: y,
                selected: false, kind: "entity",
                overlay: overlay_from_ID(entityID),
                connectors: [], independent: false,
                name: ename, 
                refmode: "id", reftype: "popular", unittype: ""} )
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
        .attr("transform", () => translate(-width/2,-height/2));
    
    // Display entity name
    var spl = 9; // Height to split the Entity name and ref mode
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

    /* Draw a new instance of an entity */

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

    /* What to do with an entity on drag event, double click event,
       or overlay mousedown event. */

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
    /* What to do with an overlay on a mousedown event (create connector) */
    eoverlay.on("mousedown", eomousedown );
}

function remove_entity(event) {

    /* Remove an entity on an event. */

    // Get entity
    // Note: d3.select(this) works for ctrl+click events but not right click menu
    var click_objID = event.target.id.toString();//.substring(0,event.target.length);
    var parentID = get_parentID(click_objID);
    entity = orm.entities[parentID];
    if (entity == null) { return }
    // Ctrl key for click event, buttons for right click menu
    if (event.ctrlKey || event.buttons == 2) {
        delete_entity( entity );
    }
}

function delete_entity(entity) {

    /* Delete the entity.
       1. Remove connectors from entity
       2. Remove visualization
       3. Remove references to entity
       4. Update ORM metamodel */

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
    
    /* Update the name visualization based on the datum */
    
    d = entity.datum();
    // Format the name as-entered to conform to ORM standards
    d.name = format_entity_name(d.name);
    // Format the refmode as-entered to conform to ORM standards
    d.refmode = format_refmode_name(d.refmode, type=d.reftype);

    // Update width of entity based on name and refmode
    update_entity_width(entity);

    // Set visualization of name
    var ename = d.name;
    if (d.independent) { ename = `${ename} !`; }
    d3.select("#t-"+entity.attr("id"))
        .text( ename );
        //.call(textwrap, entity_param.width-10);
    
    // Set visualization of refmode
    var refmode = d.refmode;
    if (d.reftype == "popular") { refmode = `(.${refmode})`; }
    else if (d.reftype == "unit") { refmode = `${refmode}:`; }
    else if (d.reftype == "general") { refmode = `${refmode.toUpperCase()}` }
    d3.select("#tr-"+entity.attr("id"))
            .text( refmode );
}

function format_entity_name(ename) {
    /* Format name appearance: Capitalize each word in entity name */
    return ename.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
}

function format_refmode_name(initname, type="popular") {
    /* Format refmode name appearance */
    if (type == "popular") {
        var newname = initname.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toLowerCase());
        var newname = newname.split(" ").join("_");
        return newname
    }
    return initname
}

function update_entity_width(entity) {

    /* When the name or refmode of an entity changes, update the
       width of the visualization to accommodate the name. */

    // Calculate width
    var entityID = entity.attr("id");
    var d = entity.datum();
    if (d.kind == "entity") {
        var width = Math.max( calc_entity_width(d.name), calc_entity_width(d.refmode) );
    } else {
        // Used for value types
        var width = calc_entity_width(d.name);
    }
    var height = parseInt( entity.attr("height") );
    // Adjust width of group
    entity.attr("width",width);
    // Adjust width of overlay
    update_overlay_width(entity);
    // Adjust width of rect
    d3.select("#r-"+entityID)
        .attr("width", width)
        .attr("transform", () => translate( -width/2, -height/2 ));

    // Drag all connected connectors
    for (var n in d.connectors) {
        conn = orm.connectors[d.connectors[n]];
        update_connector_positions(conn);
    }
}

function update_overlay_width(entity) {

    /* When the width of the entity changes, adjust the size of the 
       overlays so they appear on each side of the entity correctly. */

    // Delete the original overlay
    var entityID = entity.attr("id");
    d3.select( "#" + overlay_from_ID(entityID) ).remove();
    // Replace the overlay
    var d = entity.datum();
    // Entity or value?
    var ov = d.kind.substring(0,1) + "overlay"
    var eoverlay = overlay_definition(entity,ov);
    eoverlay.attr("transform", () => overlay_translate(d.x0, d.y0, 
        parseInt(entity.attr("width")), parseInt(entity.attr("height"))) );
    // Add actions to new overlay
    overlay_actions(eoverlay);
}

/*-----  Drag control for the entity -----*/

/* On drag for the entity rect */

function edragstarted(event) {

    /* Initiate drag event */

    event.sourceEvent.stopPropagation();
    d3.select(this).datum().selected = true;
}

function edragged(event,d,entityID) {

    /* Drag event for an entity */

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
          .attr("transform", () => translate(d.dx,d.dy));
    
    // Drag all connected connectors
    for (var n in d.connectors) {
        conn = orm.connectors[d.connectors[n]];
        update_connector_positions(conn);
    }

}

function edragended() {

    /* End drag event for entity */

    var entity = d3.select(this);
    entity.datum().selected = false;

    /* Check flip condition for each fact (rolebox group) attached
       to the entity, flip if appropriate, and redraw connected connectors */
    var rbgroups = entity_plays_lead_roles(entity);
    for (var n in rbgroups) {
        check_flip_and_connectors(rbgroups[n]);
    }

    // Update ORM
    parse_orm();
}

function entity_plays_lead_roles(entity) {

    /* Find all facts for which the entity plays a "lead" role.
       That is, the entity is the "subject" of the fact.
       
       This lead role concept is used to determine whether to flip a fact
       in the visualization. */

    var conns = entity.datum().connectors;
    var entityID = entity.attr("id");
    var rbgroups = [];
    // Iterate through all connections of the entity
    for (var n in conns) {
        // Datum of connector
        var d = d3.select("#"+conns[n]).datum();
        var rbgID = null;
        // Check if connected to a rolebox
        if ( d3.select("#"+d.to).datum().kind == "rolebox" ){
            // It is! Get the rolebox group
            rbgID =  d3.select("#"+d.to).datum().parent;
        }
        // Is the entity the lead role of the rolebox group?
        if (rbgID != null) {
            if ( d3.select("#"+rbgID).datum().entity_in == entityID ) {
                // It is! Add to list
                rbgroups.push( d3.select("#"+rbgID) );
            }
        }
    }
    return rbgroups
}

/*----- END Drag control for the entity -----*/

/*----- On mouse down for the entity overlay circles -----*/

function eomousedown(event) {

    /* First actions to perform on a mousedown event on an
       overlay of an entity.
       
       The big trick here is that the entity is transformed to move the origin, 
       to the middle of the entity, but the pointer of the event doesn't know this 
       apparently. So we need to construct the actual location of the entity and 
       the click event. */
    
    event.stopPropagation();

    // Get entity
    var entityID = entityID_from_overlayID( d3.select(this).attr("id") );
    var entity = get_any_object(entityID);
    var d = entity.datum();

    // Current pointer position
    var m = d3.pointer(event);
    var width = entity.attr("width");
    var mousepos = {x: m[0] + d.x - width/2, 
                    y: m[1] + d.y - entity_param.height/2};

    // Center of closest entity overlay
    var eo = closest_eoverlay(mousepos, entityID);

    // Create the initial connector line from center of overlay to
    // mouse position
    var conn = draw_conn_line(eo.x, eo.y, mousepos.x, mousepos.y);
    conn.datum().from = entityID;
    conn.datum().selected = true;

    // Add svg mouse actions for dragging connector across svg
    // We unset these on mouseup (svg_mouseup).
    svg
       .on("mousemove", function (event) { svg_mousemove(event, conn) })
       .on("mouseup", function (event) { svg_mouseup(event, conn) } );

}

function closest_eoverlay(position,entityID) {
    /* Get position of closest overlay of entityID to position */
    // Get the overlay positions of the entity
    var xyo = eoverlay_positions(entityID);
    // Get closest of the overlay positions
    return closest_location(position,xyo);
}

function eoverlay_positions(entityID) {

    /* Create a set of positions for each overlay of entity entityID,
       based on its current position. */
    
    // Entity position
    var entity = get_any_object(entityID);
    var x = entity.datum().x;
    var y = entity.datum().y;
    var width = entity.attr("width");
    var height;
    var height = parseInt( entity.attr("height") );
    var xyoverlay = {
        "bottom" : { x: x,
                  y : y + height/2, 
                  location : "bottom" },
        "right" : {x : x + width/2,
                   y: y,
                   location : "right" },
        "top" : { x: x,
                     y: y - height/2,
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