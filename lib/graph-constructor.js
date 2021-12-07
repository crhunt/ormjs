/* 
   Functions that apply across objects 
*/

/*----- Global definitions -----*/

var orm; // Defined in parse-svg

// dragevent is defined here.
var dragevent = {locations : ["bottom","right","top","left"]};

// tolerance is defined here, but values are added in other constructors.
var tolerance = {
    link : {},
    snap : {}
};

/*----- General purpose -----*/

function remove_from_array(arr, v) {
    /* Remove first instance of v from arr */
    var index = arr.indexOf(v);
    if (index > -1) {
        arr.splice(index, 1);
    }
    return arr;
}

function range(size, startAt = 0) {
    /* Get a range of ints of length size starting at value startAt */
    return [...Array(size).keys()].map(i => i + startAt);
}

function translate(x,y) {
    /* Generate string for translate transform */
    return "translate( " + x + "," + y + " )"
}

function translate_rotate(x0,y0,x,y) {
    /* Generate string for rotating object 90 degrees around (x0,y0)
       and then translating to (x,y).
       
       Used for rotating rolebox groups. */
    return "rotate(90, "+x0+", "+y0+") translate("+x+", "+y+")"
}

function get_css_variable(varname) {
    /* Pull css variables from any css file and return as a string. */
    return window.getComputedStyle(document.documentElement).getPropertyValue(varname)
}

function parse_number(mystring) {
    /* Parse mystring as an integer. */
    return parseInt( mystring.replace(/\D/g, "") )
}

function get_any_object(anyID) {

    /* Get any main ORM object. */

    // To Do: If we're using this, get rid of default option
    // Should act as "integrity constraint"

    if (orm.entities.hasOwnProperty(anyID)) {
        return orm.entities[anyID];
    }
    if (orm.connectors.hasOwnProperty(anyID)) {
        return orm.connectors[anyID];
    }
    if (orm.roleboxes.hasOwnProperty(anyID)) {
        return orm.roleboxes[anyID];
    }
    if (orm.rbgroups.hasOwnProperty(anyID)) {
        return orm.rbgroups[anyID];
    }
    if (orm.values.hasOwnProperty(anyID)) {
        return orm.values[anyID];
    }
    return d3.select("#"+anyID);
}

function get_parentID(anyID) {
    /* From any sub-component of the object group, get the group ID */
    var splitID = anyID.split("-");
    var len = splitID.length;
    return splitID[len-3] + "-" + splitID[len-2] + "-" + splitID[len-1];
}

function get_object_kind(anyID) {
    /* From the ID, return what kind of object it is. */
    if ( anyID.includes("conn") ) { return "connector" }
    if ( anyID.includes("entity") ) { return "entity" }
    if ( anyID.includes("value") ) { return "value" }
    if ( anyID.includes("rolebox") &&
         anyID.includes("r-") &&
         ! anyID.includes("r-r-") ) { return "rolebox" }
    if ( anyID.includes("rolebox") ) { return "rolebox_group" }
    return ""
}

function textwrap(text, width) {

    /* Add text wrapping to a text node. Wrap text at width. 
       Not used. */

    text.each(function () {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            x = text.attr("x"),
            y = text.attr("y"),
            dy = 0, //parseFloat(text.attr("dy")),
            tspan = text.text(null)
                        .append("tspan")
                        .attr("x", x)
                        .attr("y", y)
                        .attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                            .attr("x", x)
                            .attr("y", y)
                            .attr("dy", ++lineNumber * lineHeight + dy + "em")
                            .text(word);
            }
        }
    });
}

/*----- Drag events -----*/

function closest_overlay(position, anyID,locations=dragevent.locations) {

    /* Generic function for returning overlay positions of any object. */

    if ( is_entityID(anyID) || is_valueID(anyID) ) {
        return closest_eoverlay(position, anyID);
    }
    if ( is_roleboxID(anyID) ) {
        return closest_rboverlay(position, anyID,locations=locations)
    }
}

function closest_location(position,xyo,locations=dragevent.locations) {
    
    /* Find the shortest distance between position and any of the locations
       in xyo. This is used to find the closest overlay to a mouse position. */
    
    var closestDistance = Number.MAX_VALUE;
    var closestLocation = "right";
    for (var n in locations) {
        var location = locations[n];
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
       excluding object myobjID. Only compare field field (x or y).
       
       This is used to find the closest object to myobjID for snap() to
       position during drag.
     */

    var closest = { object: null, distance: Number.MAX_VALUE };
    for (var objID in objects) {
        var candidateObject = objects[objID];
        if ( objID != myobjID && myobjID != candidateObject.attr("parent") ){
            // Distance from each object
            var distance = Math.abs(candidateObject.datum()[field] - ideal);
            if (distance < closest.distance){
                // Found closest object
                closest.object = candidateObject;
                closest.distance = distance;
            }
        }
    }
    return closest;
}

function closest_object(position) {

    /* Find the closest object to position. Looks in 2D, Euclidean distance.

       Returns for the closest object to position
        object: actual d3 object
        distance: distance from position to object center
        tolerance: for object, allowed distance from object for connection
                   to be created
        found: whether or not any object has been found.

     */

    var objinfo = { object: null, 
                    distance: Number.MAX_VALUE, 
                    tolerance: 0,
                    found: false }
    objinfo = closest_of_kind(position, objinfo, orm.entities);
    objinfo = closest_of_kind(position, objinfo, orm.roleboxes);

    objinfo.tolerance = objinfo.object ? 
                        tolerance.link[ objinfo.object.datum().kind ] : 0;
    return objinfo;
}

function closest_of_kind(position, objinfo, objdic) {

    /* For objects of kind in objdic (ie, entities or roleboxes),
       find the object closest to position. 
       
       If the object found is closer than the object in objinfo,
       replace objinfo with the information for the found object. */

    var distance;
    for ( var anyID in objdic ) {
        var candidateObject = objdic[anyID];
        distance = Math.sqrt( Math.pow( (position.x - candidateObject.datum().x), 2) +
                              Math.pow( (position.y - candidateObject.datum().y), 2) );
        if ( distance < objinfo.distance ) {
            objinfo.distance = distance;
            objinfo.object = candidateObject;
            objinfo.found = true;
        }
    }
    return objinfo;
}

function snap( pos, field, anyID ) {
    
    /* Used to "snap" an object into alignment with closest entity
       or x position of rolebox. */
   
    // Get distance from object and it's nearest neighbors
    // Closest entity
    var closest = closest_object_1D(anyID, orm.entities, field, pos);
    var closest_v = closest_object_1D(anyID, orm.values, field, pos);
    if (closest_v.distance < closest.distance) { closest = closest_v }
    // If x axis, check roleboxes too.
    if (field == "x") {
        var closest_rb = closest_object_1D(anyID, orm.roleboxes, field, pos);
        if (closest_rb.distance < closest.distance ) { closest = closest_rb; }
    }

    // Return new position if within tolerance
    var tolerance_anyID = tolerance.snap[ get_object_kind(anyID) ];
    if (closest.distance < tolerance_anyID){
        return closest.object.datum()[field];
    } else {
        return pos;
    }
}

/*----- Overlays -----*/

function overlay_definition(object,oclass) {

    /* Generic function for creating overlays for objects. */

    //var width = entity_param.width;
    //var height = entity_param.height;

    var width = object.attr("width");
    var height = object.attr("height");

    var d = object.datum();
    var pd = d3.select("#" + object.attr("parent") ).datum();
    var overlayID = d.overlay;

    var x = pd.x0 + d.dx;
    var y = pd.y0;

    var overlay = object.append("g")
        .attr("id", overlayID)
        .attr("class","overlay_prototype")
        .attr("width", width)
        .attr("height", height)
        .attr("x", 0)
        .attr("y", 0)
        .attr("transform", () => overlay_translate(x,y,width,height) );
    // Top circle overlay
    overlay.append("circle")
        .attr("class","overlay "+oclass)
        .attr("transform", () => translate(width/2, 0) );
    // Right circle overlay
    overlay.append("circle")
        .attr("class","overlay "+oclass)
        .attr("transform", () => translate(width, height/2) );
    // Bottom circle overlay
    overlay.append("circle")
        .attr("class","overlay "+oclass)
        .attr("transform", () => translate(width/2, height) );
    // Left circle overlay
    overlay.append("circle")
        .attr("class","overlay "+oclass)
        .attr("transform", () => translate(0, height/2) );
    
    return overlay;
}

function overlay_translate(x,y,width,height) {
    /* Translate overlays using parent object position.
       Used when:
       1. Resizing entity width
       2. Moving roleboxes on flip events. */
    var tx = x - width/2;
    var ty = y - height/2;
    return "translate( " + tx + "," + ty + " )"
}