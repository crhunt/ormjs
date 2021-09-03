/*
    Everything related to entities
*/

/***** Entity property definitions *****/

var entity_param = {
    width : 100,
    height : 50,
    snapTolerance : 15
};

var entities = {},
    eoverlays = {},
    highestEntityID = 0;

function generate_entityID() {
    entityID = "id-entity-" + highestEntityID.toString();
    highestEntityID += 1;
    return entityID
}

function overlay_from_ID(entityID) {
    return "o-"+entityID;
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

function draw_entity(svg,x,y) {

    // Draw a new instance of an entity

    var entityID = generate_entityID();

    // What to do on drag events
    // rect
    var drag = d3.drag()
        .on("start", dragstarted)
        .on("drag", function (event,d) { dragged(event,d, this, entityID) } )
        .on("end", dragended);
    // circles
    var dragcircle = d3.drag()
        .on("start", function (event) {event.sourceEvent.stopPropagation();} )
        .on("drag", function () {} )
        .on("end", function () {} );

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
        }
    }

    // Add the visualization of the entity
    entity = svg.append("use")
       .datum( {x: x, y: y, selected: false} )
       .attr("href","#entity_prototype")
       .attr("id",entityID)
       .attr("x", function(d){ return (x) })
       .attr("y", function(d){ return (y) })
       //.attr("x", function(d){ return (x - d.x) })
       //.attr("y", function(d){ return (y - d.y) })
       //.attr("transform", function(d) { return 'translate(' + d.x + ' '+ d.y + ')'; })
       .on("click", remove_entity)
       .call(drag);

    entities[entityID] = entity;

    var overlayID = overlay_from_ID(entityID);
    
    overlay = svg.append("use")
       .datum( {x: x, y: y, selected: false} )
       .attr("href","#entity_overlay_prototype")
       .attr("id", overlayID)
       .attr("x", function(d){ return (x) })
       .attr("y", function(d){ return (y) })
       .call(dragcircle);

    eoverlays[overlayID] = overlay;

}

/***** END  Drawing entities *****/

/*****  Drag control for the entity *****/

/* On drag for the entity rect */

function dragstarted(event) {
    event.sourceEvent.stopPropagation();
    //d3.select(this).classed("selected", true);
    d3.select(this).datum().selected = true;
}

function dragged(event,d,ethis,entityID) {

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

}

function dragended() {
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

function closest_eoverlay(position,entityID) {
    // Get the overlay positions of the entity
    var xyo = eoverlay_positions(entityID);

    // Find the shortest distance
    var closestDistance = Number.MAX_VALUE;
    var closestLocation = "right";
    for (var location in xyo) {
        xyo[location]["distance"] = 
            Math.sqrt( Math.pow( (position.x - xyo[location]["x"]), 2) +
                       Math.pow( (position.y - xyo[location]["y"]), 2) )
        if (xyo[location]["distance"] < closestDistance) {
            closestDistance = xyo[location]["distance"];
            closestLocation = location;
        }
    }
    return xyo[closestLocation]
}

function eoverlay_positions(entityID) {
    // Entity position
    var entity = entities[entityID];
    var x = entity.datum().x;
    var y = entity.datum().y;
    var xyoverlay = {
        "top" : { "x": x,
                  "y" : y + entity_param.height/2 },
        "right" : {"x" : x + entity_param.width/2,
                   "y" : y },
        "bottom" : { "x": x,
                     "y" : y - entity_param.height/2 },
        "left" : {"x" : x - entity_param.width/2,
                  "y" : y }
    }
    return xyoverlay
}

/* On drag for the circle overlays */

/***** END  Drag control for the entity *****/