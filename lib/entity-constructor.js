/*
    Everything related to entities
*/

/***** Entity property definitions *****/

var entity_param = {
    width : 100,
    height : 50,
    snapTolerance : 15
};

var svg;
var relationships;

var entities = {},
    eoverlays = {},
    highestEntityID = 0;

function generate_entityID() {
    entityID = "id-entity-" + highestEntityID.toString();
    highestEntityID += 1;
    return entityID
}

function is_entityID(anyID) {
    if ( anyID.includes("entity") ) { return true; }
    return false;
}

function entity_number(entityID) {
    return entityID.split("-")[2]
}

function overlay_from_ID(entityID) {
    return "o-"+entityID;
}

function entityID_from_overlayID(oentityID) {
    return oentityID.split("-")[1] + "-" + 
           oentityID.split("-")[2] + "-" +
           oentityID.split("-")[3];
}

/***** END Entity property definitions *****/

/*****  Drawing entities *****/

/*
function entity_translate(x,y) {
    var tx = x - entity_param.width/2;
    var ty = y - entity_param.height/2;
    return "translate( " + tx + " " + ty + " )"
}

function entity_definition(x,y,entityID) {

    var width = entity_param.width;
    var height = entity_param.height;
    var tx = x - width/2;
    var ty = y - height/2;
    // Create a group for the rect / text
    var g = svg.append("g")
        .datum( {x: x, y: y, selected: false, kind: "entity",
            relationships: [],
            name: "Entity "+entity_number(entityID)} )
        .attr("id",entityID)
        .attr("x", function(d){ return (d.x) })
        .attr("y", function(d){ return (d.y) })
        .attr("width", width)
        .attr("height", height)
        .attr("transform", function(d){ return entity_translate(d.x,d.y); } );
    // Entity rectangle
    g.append("rect")
     .attr("class","entity");
    // Display entity name
    g.append("text")
     .attr("class","ename")
     .attr("transform", "translate( " + width/2 + " " + height/2 + " )")
     .attr("text-anchor", "middle")
     .attr("dominant-baseline", "central")
     .text(function(d) { return d.name; });
    
    return g;

}
*/

function entity_prototype(defs) {
    
    /* Define the look of an entity */

    var width = entity_param.width;
    var height = entity_param.height;
    // Create a group for the rect / text
    // NOTE: Can't use this prototype til I figure out custom text content :(
    //       Using entity_definition in the meanwhile
    var g = defs.append("g")
        .attr("id","entity_prototype")
        .attr("class","entity_prototype")
        .attr("width", width)
        .attr("height", height)
        .attr("transform", "translate( -" + width/2 + " -" + height/2 + " )");
    // Entity rectangle
    g.append("rect")
     .attr("class","entity");
    // Display entity name (Can't define this here with custom text)
    /*
    g.append("text")
     .attr("class","ename")
     .attr("transform", "translate( " + width/2 + " " + height/2 + " )")
     .attr("text-anchor", "middle")
     .attr("dominant-baseline", "central");
     //.text(function(d) { return d; });*/

    var go = defs.append("g")
        .attr("id","entity_overlay_prototype")
        .attr("class","entity_overlay_prototype")
        .attr("width", width)
        .attr("height", height)
        .attr("transform", "translate( -" + width/2 + " -" + height/2 + " )");
    // Top circle overlay
    go.append("circle")
      .attr("class","eoverlay")
      .attr("transform", "translate( " + width/2 + " " + 0 + " )");
    // Right circle overlay
    go.append("circle")
      .attr("class","eoverlay")
      .attr("transform", "translate( " + width + " " + height/2 + " )");
    // Bottom circle overlay
    go.append("circle")
      .attr("class","eoverlay")
      .attr("transform", "translate( " + width/2 + " " + height + " )");
    // Left circle overlay
    go.append("circle")
      .attr("class","eoverlay")
      .attr("transform", "translate( " + 0 + " " + height/2 + " )");
}

function draw_entity(x,y) {

    // Draw a new instance of an entity

    // Create entity id
    var entityID = generate_entityID();

    // Add the visualization of the entity
    /* Not using entity_definition rn
    var entity = entity_definition(x,y,entityID);
    entity.on("click", remove_entity)
          .call(drag);*/

    /* With prototype. Want to use this, but need custom text in prototype.
       Creating group and appending text instead. */
    var ename = "Entity "+entity_number(entityID);
    var entity = svg.append("g")
        .datum( {x: x, y: y, selected: false, kind: "entity",
                relationships: [],
                name: ename} )
        .attr("id",entityID)
        .attr("class", "entity_instance");
        //.on("dblclick", null)
        //.on("click", remove_entity)
        //.call(drag_entity);
    entity
        .append("use")
        .attr("href","#entity_prototype")
        .attr("id","r-"+entityID)
        .attr("x", function(d){ return (d.x) })
        .attr("y", function(d){ return (d.y) });
    entity
        .append("text")
        .attr("class","ename")
        .attr("id","t-"+entityID)
        .attr("x", function(d){ return (d.x) })
        .attr("y", function(d){ return (d.y) })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("pointer-events","none")
        .text( ename );

    entity_actions(entity);

    // Record new entity
    entities[entityID] = entity;

    console.log( entities[entityID] );

    // Create new overlay for entity

    var overlayID = overlay_from_ID(entityID);
    
    var overlay = svg.append("use")
       .datum( {x: x, y: y, selected: false} )
       .attr("href","#entity_overlay_prototype")
       .attr("id", overlayID)
       .attr("x", function(d){ return (x) })
       .attr("y", function(d){ return (y) });

    overlay_actions(overlay);
    
    // Record overlay
    eoverlays[overlayID] = overlay;

}

function entity_actions(entity) {

    // What to do on drag event

    var drag_entity = d3.drag()
        .on("start", edragstarted)
        .on("drag", function (event,d) { edragged(event,d, entity.attr("id") ) } )
        .on("end", edragended);

    entity
        .on("dblclick", null)
        .on("click", remove_entity)
        .call(drag_entity);

}

function overlay_actions(eoverlay) {
    eoverlay.on("mousedown", eomousedown );
}

// Removing entities on click events
function remove_entity(event,d) {
    if (event.ctrlKey) {
        delete_entity( d3.select(this) );
    }
}

function delete_entity(entity) {

    // Remove relationships
    d = entity.datum();
    rels = d.relationships;
    for ( n in rels ) {
        delete_relationship(relationships[ rels[n] ]);
    }

    // Remove the entity visualization
    entityID = entity.attr("id");
    // Remove overlay part
    d3.select( "#" + overlay_from_ID(entityID) ).remove();
    // Remove entity part
    d3.select( "#" + entityID )
        .transition()
        .duration(500)
        .attr("transform", "translate(" + d.x + "," + 
                        d.y + ") scale(0)")
        .remove();
    // Remove the entity from records
    delete entities[ entityID ];
    delete eoverlays[ overlay_from_ID(entityID) ];
}

/***** END  Drawing entities *****/

/*****  Drag control for the entity *****/

/* On drag for the entity rect */

function edragstarted(event) {
    event.sourceEvent.stopPropagation();
    //d3.select(this).classed("selected", true);
    d3.select(this).datum().selected = true;
}

function edragged(event,d,entityID) {

    // Set the new position
    d.x = event.x;
    d.y = event.y;

    // Snap
    d.x = snap(d.x, "x", entityID);
    d.y = snap(d.y, "y", entityID);
    
    // Drag the entity rect
    // Need transform as long as we can't use prototype
    var entity = d3.select("#r-"+entityID);
    entity.attr("x", d.x).attr("y", d.y);
    d3.select("#t-"+entityID)
          .attr("x", d.x).attr("y", d.y);
    //      .attr("transform", function(d){ return entity_translate(d.x,d.y); } );
    //console.log( d3.select("#t-"+entityID) )

    // Drag the circle overlays
    d3.select("#"+overlay_from_ID(entityID))
      .attr("x", d.x).attr("y", d.y);
    
    // Drag all connected relations
    for (var n in d.relationships) {
        rel = relationships[d.relationships[n]];
        dragged_by_object(rel);
    }

}

function edragended() {
    d3.select(this).datum().selected = false;
}

function snap( ideal, field, myentityID ) {
    // Used to "snap" an entity into alignment with another entity
   
    // Get distance from entity and it's nearest neighbors
    // Closest entity
    var closest = closest_object_1D(myentityID, entities, field, ideal);

    // Return new position if within tolerance
    if (closest.distance < entity_param.snapTolerance){
        return closest.object.datum()[field];
    } else {
        return ideal;
    }
}

/* On mouse up and down for the entity overlay circles */

function eomousedown(event) {
    
    //event.sourceEvent.stopPropagation();

    console.log(event);

    // current pointer position
    var m = d3.pointer(event);
    var mousepos = {x: m[0], y: m[1]};

    // Center of closest entity overlay
    entityID = entityID_from_overlayID( d3.select(this).attr("id") );
    eo = closest_eoverlay(mousepos, entityID);

    var rel = draw_rel_line(eo.x, eo.y, mousepos.x, mousepos.y);
    rel.datum().from = entityID;
    rel.datum().selected = true;

    // Add svg mouse actions for dragging relation across svg
    svg
       .on("mousemove", function (event) { svg_mousemove(event, rel) })
       .on("mouseup", function (event) { svg_mouseup(event, rel) } );

}

function closest_eoverlay(position,entityID) {
    
    // Get the overlay positions of the entity
    var xyo = eoverlay_positions(entityID);

    // Find the shortest distance
    var closestDistance = Number.MAX_VALUE;
    var closestLocation = "right";
    for (var location in xyo) {
        xyo[location]["distance"] = 
            Math.sqrt( Math.pow( (position.x - xyo[location].x), 2) +
                       Math.pow( (position.y - xyo[location].y), 2) )
        if (xyo[location]["distance"] < closestDistance) {
            closestDistance = xyo[location]["distance"];
            closestLocation = location;
        }
    }
    return xyo[closestLocation];
}

function eoverlay_positions(entityID) {
    
    // Entity position
    var entity = entities[entityID];
    var x = entity.datum().x;
    var y = entity.datum().y;
    var xyoverlay = {
        "bottom" : { x: x,
                  y : y + entity_param.height/2 },
        "right" : {x : x + entity_param.width/2,
                   y: y },
        "top" : { x: x,
                     y: y - entity_param.height/2 },
        "left" : {x: x - entity_param.width/2,
                  y: y }
    }
    return xyoverlay;
}

/* END On mouse up and down for the entity overlay circles */

/***** END  Drag control for the entity *****/