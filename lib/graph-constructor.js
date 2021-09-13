/* Functions that apply across objects */

function get_any_object(anyID) {

    if (entities.hasOwnProperty(anyID)) {
        return entities[anyID];
    }
    if (relationships.hasOwnProperty(anyID)) {
        return relationships[anyID];
    }
}

function closest_overlay(position, anyID) {
    if ( is_entityID(anyID) ) {
        return closest_eoverlay(position, anyID);
    }
}