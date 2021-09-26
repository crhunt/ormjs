/*
    Everything related to entities
*/

/***** Entity property definitions *****/

var entity_param = {
    width : 100,
    height : 50,
    snapTolerance : 8
};

var tolerance;
tolerance.link["entity"] = entity_param.width ;
tolerance.snap["entity"] = entity_param.snapTolerance ;

var svg;
var orm;

function generate_entityID() {
    entityID = "id-entity-" + orm.highestEntityID.toString();
    orm.highestEntityID += 1;
    return entityID
}

function is_entityID(anyID) {
    if ( anyID.includes("entity") ) { return true; }
    return false;
}

function entity_number(entityID) {
    return entityID.split("-")[2]
}

function set_highest_entity_ID() {
    for (var entityID in orm.entities) {
        var numID = parseInt( entity_number(entityID) );
        if ( numID == orm.highestEntityID ) {
            orm.highestEntityID = numID+1;
        }
    }
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


function object_translate(x,y,width,height) {
    var tx = x - width/2;
    var ty = y - height/2;
    return "translate( " + tx + "," + ty + " )"
}

function entity_definition(x,y,entityID) {

    var width = entity_param.width;
    var height = entity_param.height;
    var tx = x - width/2;
    var ty = y - height/2;
    var ename = "Entity "+entity_number(entityID);

    // Create a group for the rect / text
    var entity = svg.append("g")
        .datum( {x: x, y: y, dx: 0, dy: 0, x0: x, y0: y,
                selected: false, kind: "entity",
                overlay: overlay_from_ID(entityID),
                relationships: [],
                name: ename} )
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
        .attr("transform", "translate( -" + entity_param.width/2 + 
                                     " -" + entity_param.height/2 + " )");
    // Display entity name
    entity.append("text")
        .attr("class","ename")
        .attr("id","t-"+entityID)
        //.attr("transform", "translate( " + width/2 + " " + height/2 + " )")
        .attr("x", function(){ return (x) })
        .attr("y", function(){ return (y) })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .text( function(d){ return d.name } );
    
    return entity;

}

function overlay_definition(object,oclass) {
    //var width = entity_param.width;
    //var height = entity_param.height;

    var width = object.attr("width");
    var height = object.attr("height");

    var d = object.datum();
    var pd = d3.select("#" + object.attr("parent") ).datum();
    var overlayID = d.overlay;

    var x = pd.x0 + d.dx;
    var y = pd.y0;

    var tr = d3.select("#r-"+object.attr("id")).attr("transform");

    var overlay = object.append("g")
        .attr("id", overlayID)
        .attr("class","overlay_prototype")
        .attr("width", width)
        .attr("height", height)
        .attr("x", 0)
        .attr("y", 0)
        //.attr("transform",tr);
        .attr("transform", function() { return object_translate(x,y,width,height); });
        //.attr("transform", function() { return object.attr("transform") });
    // Right circle overlay
    overlay.append("circle")
        .attr("class","overlay "+oclass)
        .attr("transform", "translate( " + width/2 + " " + 0 + " )");
    // Right circle overlay
    overlay.append("circle")
        .attr("class","overlay "+oclass)
        .attr("transform", "translate( " + width + " " + height/2 + " )");
    // Bottom circle overlay
    overlay.append("circle")
        .attr("class","overlay "+oclass)
        .attr("transform", "translate( " + width/2 + " " + height + " )");
    // Top circle overlay
    overlay.append("circle")
        .attr("class","overlay "+oclass)
        .attr("transform", "translate( " + 0 + " " + height/2 + " )");
    
    return overlay;
}
/*
function entity_prototype(defs) {
    
    // Define the look of an entity

    var width = entity_param.width;
    var height = entity_param.height;
    // Create a group for the rect / text
    // NOTE: Can't use this prototype til I figure out custom text content :(
    //       Using entity_definition in the meanwhile
    var g = create_group(defs,width,height,"entity_prototype");
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
/*
    var go = create_group(defs,width,height,"entity_overlay_prototype");
    // Top circle overlay
    go.append("circle")
      .attr("class","eoverlay overlay")
      .attr("transform", "translate( " + width/2 + " " + 0 + " )");
    // Right circle overlay
    go.append("circle")
      .attr("class","overlay eoverlay")
      .attr("transform", "translate( " + width + " " + height/2 + " )");
    // Bottom circle overlay
    go.append("circle")
      .attr("class","overlay eoverlay")
      .attr("transform", "translate( " + width/2 + " " + height + " )");
    // Left circle overlay
    go.append("circle")
      .attr("class","overlay eoverlay")
      .attr("transform", "translate( " + 0 + " " + height/2 + " )");
}*/

function draw_entity(x,y) {

    // Draw a new instance of an entity

    // Create entity id
    var entityID = generate_entityID();

    // Add the visualization of the entity
    var entity = entity_definition(x,y,entityID);

    /* With prototype. Want to use this, but need custom text in prototype.
       Creating group and appending text instead.
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
        .text( ename ); */

    entity_actions(entity);

    // Record new entity
    orm.entities[entityID] = entity;

    // Create new overlay for entity

    var overlayID = overlay_from_ID(entityID);
    
    /*
    var overlay = svg.append("use")
       .datum( {x: x, y: y, selected: false} )
       .attr("href","#entity_overlay_prototype")
       .attr("class","overlay eoverlay")
       .attr("id", overlayID)
       .attr("x", function(d){ return (x) })
       .attr("y", function(d){ return (y) });*/

    //var ebox = d3.select("#r-"+entity.attr("id"));
    var overlay = overlay_definition(entity,"eoverlay");

    overlay_actions(overlay);

    //entity.append(overlay);
    
    // Record overlay
    orm.eoverlays[overlayID] = overlay;

    // Update rel
    parse_orm();

}

function entity_actions(entity) {

    // What to do on drag event

    var drag_entity = d3.drag()
        .on("start", edragstarted)
        .on("drag", function (event,d) { edragged(event,d, entity.attr("id") ) } )
        .on("end", edragended);

    entity
        .on("dblclick", function(event) { event.stopPropagation() })
        .on("click", remove_entity)
        .call(drag_entity);

}

function overlay_actions(eoverlay) {
    eoverlay.on("mousedown", eomousedown )
            .on("hover", function() { 
                this.attr("fill-opacity", "1.0");
                console.log("opacity") });
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
        delete_relationship(orm.relationships[ rels[n] ]);
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
    delete orm.entities[ entityID ];
    delete orm.eoverlays[ overlay_from_ID(entityID) ];
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

    /* When using defs for entity
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
          .attr("x", d.x).attr("y", d.y)
    //console.log( d3.select("#t-"+entityID) )*/

    /*
    // Drag the circle overlays
    d3.select("#"+overlay_from_ID(entityID))
      .attr("x", d.x).attr("y", d.y);*/
    
    // Drag all connected relations
    for (var n in d.relationships) {
        rel = orm.relationships[d.relationships[n]];
        dragged_by_object(rel);
    }

}

function edragended() {
    d3.select(this).datum().selected = false;
    // Update rel
    parse_orm();
}

/* On mouse up and down for the entity overlay circles */

function eomousedown(event) {
    
    event.stopPropagation();

    // Get entity
    var entityID = entityID_from_overlayID( d3.select(this).attr("id") );
    var d = orm.entities[entityID].datum();

    // current pointer position
    var m = d3.pointer(event);
    var mousepos = {x: m[0] + d.x - entity_param.width/2, 
                    y: m[1] + d.y - entity_param.height/2};
    console.log(m, mousepos);

    // Center of closest entity overlay
    var eo = closest_eoverlay(mousepos, entityID);

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
    // Get closest of the overlay positions
    return closest_location(position,xyo);
}

function eoverlay_positions(entityID) {
    
    // Entity position
    var entity = orm.entities[entityID];
    var x = entity.datum().x;
    var y = entity.datum().y;
    var xyoverlay = {
        "bottom" : { x: x,
                  y : y + entity_param.height/2, 
                  location : "bottom" },
        "right" : {x : x + entity_param.width/2,
                   y: y,
                   location : "right" },
        "top" : { x: x,
                     y: y - entity_param.height/2,
                     location : "top" },
        "left" : {x: x - entity_param.width/2,
                  y: y,
                  location : "left" }
    }
    return xyoverlay;
}

/* END On mouse up and down for the entity overlay circles */

/***** END  Drag control for the entity *****/