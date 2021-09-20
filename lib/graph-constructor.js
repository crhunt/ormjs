/* Functions that apply across objects */

var orm = {
    entities : {},
    eoverlays : {},
    relationships : {},
    rbgroups : {},
    roleboxes : {},
    rboverlays : {},
    highestEntityID : 0,
    highestRelID : 0,
    highestRBID : 0
};

var dragevent = {locations : ["bottom","right","top","left"]};

var tolerance = {
    link : {},
    snap : {}
};

function create_group(defs,width,height,name) {
    
    return defs.append("g")
            .attr("id",name)
            .attr("class",name)
            .attr("width", width)
            .attr("height", height)
            .attr("transform", "translate( -" + width/2 + " -" + height/2 + " )");
    
}

function get_any_object(anyID) {

    if (orm.entities.hasOwnProperty(anyID)) {
        return orm.entities[anyID];
    }
    if (orm.relationships.hasOwnProperty(anyID)) {
        return orm.relationships[anyID];
    }
    if (orm.roleboxes.hasOwnProperty(anyID)) {
        return orm.roleboxes[anyID];
    }
    return d3.select("#"+anyID);
}

function get_object_kind(anyID) {
    if ( anyID.includes("rel") ) { return "relationship" }
    if ( anyID.includes("entity") ) { return "entity" }
    if ( anyID.includes("rolebox") &&
         anyID.includes("r-") ) { return "rolebox" }
    if ( anyID.includes("rolebox") ) { return "rolebox_group" }
    return ""
}

function closest_overlay(position, anyID) {
    if ( is_entityID(anyID) ) {
        return closest_eoverlay(position, anyID);
    }
    if ( is_roleboxID(anyID) ) {
        return closest_rboverlay(position, anyID)
    }
}

function closest_location(position,xyo) {
    // Find the shortest distance
    var closestDistance = Number.MAX_VALUE;
    var closestLocation = "right";
    for (var n in dragevent.locations) {
        var location = dragevent.locations[n];
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

function closest_object_1D(myobjID, objects, field, ideal) {

    /* Find the closest object of type objects to position ideal,
       excluding object myobjID. Only compare field field.
       
       This is used to find the closest object to myobjID for snap() to
       position during drag.
     */

    var closest = { object: null, distance: Number.MAX_VALUE };
    for (var objID in objects) {
        if (objects.hasOwnProperty(objID)) {
            var candidateObject = objects[objID];
            if ( objID != myobjID ){
                // Distance from each object
                var distance = Math.abs(candidateObject.datum()[field] - ideal);
                if (distance < closest.distance){
                    // Found closest object
                    closest.object = candidateObject;
                    closest.distance = distance;
                }
            }
        }
    }
    return closest;
}

function closest_object(position) {

    /* Find the closest object to position.

       Note: just looks at entities right now.
     */

    var objinfo = { object: false, 
                    distance: Number.MAX_VALUE, 
                    tolerance: 0 }
    objinfo = closest_of_kind(position,objinfo,orm.entities);
    objinfo = closest_of_kind(position,objinfo,orm.roleboxes);

    objinfo.tolerance = objinfo.object ? 
                        tolerance.link[ objinfo.object.datum().kind ] : 0;
    return objinfo;
}

function closest_of_kind(position, objinfo, objdic) {
    var distance;
    for ( var anyID in objdic ) {
        var candidateObject = objdic[anyID];
        distance = Math.sqrt( Math.pow( (position.x - candidateObject.datum().x), 2) +
                              Math.pow( (position.y - candidateObject.datum().y), 2) );
        if ( distance < objinfo.distance ) {
            objinfo.distance = distance;
            objinfo.object = candidateObject;
        }
    }
    return objinfo;
}

function snap( pos, field, anyID ) {
    // Used to "snap" an object into alignment with closest entity
   
    // Get distance from object and it's nearest neighbors
    // Closest entity
    var closest = closest_object_1D(anyID, orm.entities, field, pos);

    // Return new position if within tolerance
    var tolerance_anyID = tolerance.snap[ get_object_kind(anyID) ];
    if (closest.distance < tolerance_anyID){
        return closest.object.datum()[field];
    } else {
        return pos;
    }
}

function remove_from_array(arr, v) {
    var index = arr.indexOf(v);
    if (index > -1) {
        arr.splice(index, 1);
    }
    return arr;
}