/* Functions that apply across objects */

var orm = {
    entities : {},
    eoverlays : {},
    relationships : {},
    roleboxes : {},
    rboverlays : {},
    highestEntityID : 0,
    highestRelID : 0,
    highestRBID : 0
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
}

function closest_overlay(position, anyID) {
    if ( is_entityID(anyID) ) {
        return closest_eoverlay(position, anyID);
    }
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

    var closestDistance = Number.MAX_VALUE;
    var closestEntity = false;
    for ( var entityID in orm.entities ) {
        var candidateEntity = orm.entities[entityID];
        distance = Math.sqrt( Math.pow( (position.x - candidateEntity.datum().x), 2) +
                              Math.pow( (position.y - candidateEntity.datum().y), 2) );
        if ( distance < closestDistance ) {
            closestDistance = distance;
            closestEntity = candidateEntity;
        }
    }
    return {object: closestEntity, distance: closestDistance};
}