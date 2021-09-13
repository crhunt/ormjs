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

var entities = {},
    eoverlays = {},
    highestEntityID = 0;

function generate_entityID() {
    entityID = "id-entity-" + highestEntityID.toString();
    highestEntityID += 1;
    return entityID
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

function entity_prototype(defs) {
    
    // Define the look of an entity

    var width = entity_param.width;
    var height = entity_param.height;
    // Create a group for the rect / text
    var g = defs.append("g")
        .attr("id","entity_prototype")
        .attr("class","entity_prototype")
        .attr("width", width)
        .attr("height", height)
        .attr("transform", "translate( -" + width/2 + " -" + height/2 + " )");
    // Entity rectangle
    g.append("rect")
     .attr("class","entity");
    // Display entity name
    g.append("text")
     .attr("class","ename")
     .attr("transform", "translate( " + width/2 + " " + height/2 + " )")
     .attr("text-anchor", "middle")
     .attr("dominant-baseline", "central")
     .text("Entity");

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

    // What to do on drag events
    // rect
    var drag = d3.drag()
        .on("start", edragstarted)
        .on("drag", function (event,d) { edragged(event,d, this, entityID) } )
        .on("end", edragended);
    // circles
    var dragcircle = d3.drag()
        .on("start", eomousedown );
        //.on("end", eomouseup );

    // Removing entities on click events
    function remove_entity(event,d) {
        if (event.ctrlKey) {
            // Remove the entity visualization
            d3.select(this)
                .transition()
                .duration(500)
                .attr("transform", "translate(" + d.x + "," + 
                                d.y + ") scale(0)")
                .remove();
            // Remove the entity from records
            delete entities[ d3.select(this).attr("id") ];
            delete eoverlays[ overlay_from_ID(d3.select(this).attr("id")) ];
        }
    }

    // Add the visualization of the entity
    entity = svg.append("use")
       .datum( {x: x, y: y, selected: false, kind: "entity",
                name: "Entity "+entity_number(entityID)} )
       .attr("href","#entity_prototype")
       .attr("id",entityID)
       .attr("x", function(d){ return (x) })
       .attr("y", function(d){ return (y) })
       .on("click", remove_entity)
       .call(drag);
    
    entity.select("text").text("Test");

    //entity.selectAll("text").text("Entity "+entity_number(entityID)).exit();

    // Record new entity
    entities[entityID] = entity;

    // Create new overlay for entity

    var overlayID = overlay_from_ID(entityID);
    
    overlay = svg.append("use")
       .datum( {x: x, y: y, selected: false} )
       .attr("href","#entity_overlay_prototype")
       .attr("id", overlayID)
       .attr("x", function(d){ return (x) })
       .attr("y", function(d){ return (y) })
       .on("mousedown", eomousedown );
       //.call(dragcircle);
    // Record overlay
    eoverlays[overlayID] = overlay;

}

/***** END  Drawing entities *****/

/*****  Drag control for the entity *****/

/* On drag for the entity rect */

function edragstarted(event) {
    //event.sourceEvent.stopPropagation();
    //d3.select(this).classed("selected", true);
    d3.select(this).datum().selected = true;
}

function edragged(event,d,ethis,entityID) {

    // Set the new position
    d.x = event.x;
    d.y = event.y;

    // Snap
    d.x = snap(d.x, "x", entityID);
    d.y = snap(d.y, "y", entityID);
    
    // Drag the entity rect
    var entity = d3.select(ethis);
    entity.attr("x", d.x).attr("y", d.y);
    
    // Drag the circle overlays
    d3.select("#"+overlay_from_ID(entityID))
      .attr("x", d.x).attr("y", d.y);
    
    // Drag all connected relations
    

}

function edragended() {
    d3.select(this).datum().selected = false;
}

function snap( ideal, field, myentityID ) {
    // Used to "snap" an entity into alignment with another entity
   
    var closestEntity;
    var closestDistance = Number.MAX_VALUE;
    // Get distance from entity and it's nearest neighbor
    for (var entityID in entities) {
        if (entities.hasOwnProperty(entityID)) {
            var candidateEntity = entities[entityID];
            if ( entityID != myentityID ){
                // Distance from each entity
                var distance = Math.abs(candidateEntity.datum()[field] - ideal);
                if (distance < closestDistance){
                    // Found closest entity
                    closestEntity = candidateEntity;
                    closestDistance = distance;
                }
            }
        }
    }
    if (closestDistance < entity_param.snapTolerance){
        return closestEntity.datum()[field];
    } else {
        return ideal;
    }
}

/* On mouse up and down for the entity overlay circles */

function eomousedown(event) {
    
    //event.sourceEvent.stopPropagation();

    // current pointer position
    var m = d3.pointer(event);
    var mousepos = {x: m[0], y: m[1]};

    // Center of closest entity overlay
    entityID = entityID_from_overlayID( d3.select(this).attr("id") );
    console.log(entityID)
    eo = closest_eoverlay(mousepos, entityID);
    console.log(eo)

    var rel = draw_rel_line(eo.x, eo.y, mousepos.x, mousepos.y);
    rel.datum().from = entityID;
    /*
    d3.select(this).call(d3.drag()
       .on("drag", function (event) { eomousemove(event, d3.select(this), rel) })
       .on("end", function (event) { eomouseup(event, rel) } )
    );*/
    svg
       .on("mousemove", function (event) { eomousemove(event, rel) })
       .on("mouseup", function (event) { eomouseup(event, rel) } );

}

function eomousemove(event, rel) {
    
    // Set end of line from current pointer position
    dr = rel.datum();
    var m = d3.pointer(event);
    dr.x2 = m[0];
    dr.y2 = m[1];

    // Set beginning of line from closest overlay
    //entityID = entityID_from_overlayID( overlay.attr("id") );
    eo = closest_eoverlay({x: m[0], y: m[1]}, rel.datum().from);
    dr.x1 = eo.x;
    dr.y1 = eo.y;

    console.log(dr);
    rel.attr("d", d3.line()([ [dr.x1, dr.y1], [dr.x2, dr.y2] ]));
}

function eomouseup(event, rel) {

    // Turn off svg mouse actions
    svg.on("mousemove", null).on("mouseup", null);

    dr = rel.datum();

    // Only keep line if we're overlapping with an object
    var m = d3.pointer(event);
    var mouse_position = {x: m[0], y: m[1]};
    var to_what = closest_object(mouse_position);
    if ( to_what.object.datum().kind == "entity" ) {
        if ( to_what.distance < entity_param.width ) {
            // Overlapping with an entity
            to_pos = closest_eoverlay(mouse_position, to_what.object.attr("id"));
            dr.x2 = to_pos.x;
            dr.y2 = to_pos.y;
            dr.to = to_what.object.attr("id");
        }
    }
    if ( dr.to != "" ) {
        // Keep relation, tie location
        rel.attr("d", d3.line()([ [dr.x1, dr.y1], [dr.x2, dr.y2] ]));
    } else {
        // Delete relation
        rel.remove();
    }

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

function closest_object(position) {
    var closestDistance = Number.MAX_VALUE;
    var closestEntity = false;
    for ( var entityID in entities ) {
        var candidateEntity = entities[entityID];
        distance = Math.sqrt( Math.pow( (position.x - candidateEntity.datum().x), 2) +
                              Math.pow( (position.y - candidateEntity.datum().y), 2) );
        if ( distance < closestDistance ) {
            closestDistance = distance;
            closestEntity = candidateEntity;
        }
    }
    return {object: closestEntity, distance: closestDistance};
}

/* On drag for the circle overlays */

/***** END  Drag control for the entity *****/