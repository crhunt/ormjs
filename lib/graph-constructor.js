/* 
   Functions that apply across objects 
*/

/*----- Global definitions -----*/

var orm; // Defined in parse-svg
var metamodel; // Defined in parse-orm

// dragevent is defined here.
var dragevent = {locations : ["bottom","right","top","left"],
                 all_locations: ["bottom","right","top","left"]};

// tolerance is defined here, but values are added in other constructors.
var tolerance = {
    link : {},
    snap : {}
};

class Graph {

    // Actions

    static object_move(object) {
        // Move the object based on the position in datum
        var d = object.d3object.datum();
        object.d3object
            .attr("x", d.x)
            .attr("y", d.y )
            .attr("transform", () => translate(d.dx,d.dy));

        // Redraw all connected connectors
        Connector.redraw(d.connectors);
    }

    static dragstarted(event,d,object) {
        /* Initiate drag event */
        event.sourceEvent.stopPropagation();
        object.d3object.datum().selected = true;
        object.d3object.style("cursor", "grabbing");
    }

    static dragged(event,d,object) {
        /* Drag event for an object */
    
        if (object.d3object.classed("selected")) {
            drag_selected(event);
        } else {
            
            // Set the new position
            d.dx += event.dx;
            d.dy += event.dy;
    
            // Snap to entities
            d.dx = snap( d.dx + d.x0, "x", object.id ) - d.x0;
            d.dy = snap( d.dy + d.y0, "y", object.id ) - d.y0;
            d.x = d.x0 + d.dx;
            d.y = d.y0 + d.dy;
    
            // Drag entity
            object.move();

            if (object.kind == "rolebox_group") { object.position_boxes(); }
        }
    }

    static dragended(object) {
        object.d3object.datum().selected = false;
        object.d3object.style("cursor", "grab");
    }

    static mousedown(event, object, mousepos) {

        /* On overlay mousedown, create a new connector. */
        
        event.stopPropagation();

        if (event.buttons == 2) {return} // Only left click events
        /* Note: this prevents a bug that can sometimes leave a connector behind 
           when someone has clicky fingers. */

        var pos = object.closest_overlay(mousepos);
        var data = { x1: pos.x, x2: mousepos.x, y1: pos.y, y2: mousepos.y };
        if (object.kind == "constraint") {
            data.conntype = conntypes.CtoRB;
        }
        var conn = new Connector(data);
        var cd = conn.d3object.datum();

        cd.from = object.id;
        cd.selected = true;

        // Add svg mouse actions for dragging connector across svg
        // We unset these on mouseup (svg_mouseup).
        svg
            .on("mousemove", function (event) { conn.svg_mousemove(event) })
            .on("mouseup", function (event) { conn.svg_mouseup(event) } );
    }

    // Delete

    static delete_object(object) {
        
        /* Delete the object.
           1. Remove connectors from object
           2. Remove visualization
           3. Remove references to object
           4. Update ORM metamodel */
    
        // ** Remove connectors **
        var d = object.d3object.datum();
        var conns = [...d.connectors];
        conns.map( (connID) => {
            orm.connectors[connID].delete();
        });
    
        // ** Remove the entity visualization **
        object.d3object
            .transition()
            .duration(400)
            .attr("transform", "translate(" + d.x + "," + d.y + ") scale(0)")
            .remove();

        // ** If popup related to entity exists, remove it **
        if ( ! d3.select(`#pop-${object.id}`).empty() ) { 
            remove_popup( d3.select(`#pop-${object.id}`) ); 
        }

        // ** Remove the entity from records **
        delete orm[object.ref][ object.id ];

        // Make available for garbage collection
        delete_reference(object);

        // Update ORM
        parse_orm();
    }

    // Connections

    static overlay_positions(object) {

        /* Create a set of positions for each overlay,
           based on its current position. */
        
        // Object position
        var x = object.d3object.datum().x;
        var y = object.d3object.datum().y;
        var width = parseInt( object.d3object.attr("width") );
        var height = parseInt( object.d3object.attr("height") );
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

    static rotated_overlay_positions(object) {
        // For rotated roleboxes
        // Object position
        var x = object.d3object.datum().x;
        var y = object.d3object.datum().y;
        var width = parseInt( object.d3object.attr("width") );
        var height = parseInt( object.d3object.attr("height") );
        var xyoverlay = {
            "bottom" : { x: x - height/2,
                      y : y, 
                      location : "bottom" },
            "right" : {x : x,
                       y: y + width/2,
                       location : "right" },
            "top" : { x: x + height/2,
                         y: y,
                         location : "top" },
            "left" : {x: x,
                      y: y - width/2,
                      location : "left" }
        }
        return xyoverlay;
        
    }

    static plays_lead_roles(object) { 
        /*  Find all facts for which the object plays a "lead" role.
            That is, the object is the "subject" of the fact. */

        var roles = Graph.plays_roles(object);

        var rbgroups = roles.map( (roleID) => {
            var rbgID = d3.select(`#${roleID}`).datum().parent;
            // Is the object the lead role of the rolebox group?
            if ( d3.select(`#${rbgID}`).datum().entity_in == object.id ) {
                    // It is! Add to list
                    return orm.rbgroups[rbgID]
            }
        }).filter(v=>v);

        return rbgroups
    }

    static plays_roles(object) {
        
        /* Find all roles played by object */

        var conns = object.d3object.datum().connectors;
        var roles = [];
        // Iterate through all connections of the entity
        conns.map( (connID) => {
            // Datum of connector
            //console.log("plays_roles",connID)
            var d = d3.select(`#${connID}`).datum();
            //console.log("plays_roles",d)
            // Check if connected to a rolebox
            if ( d3.select(`#${d.to}`).datum().kind == "rolebox" ){
                // It is! Add the rolebox
                roles.push(d.to);
            }
        });
        return roles
    }

    static object_kind(anyID) {
        /* From the ID, return what kind of object it is. */
        if ( anyID.includes("conn") ) { return "connector" }
        if ( anyID.includes("entity") ) { return "entity" }
        if ( anyID.includes("value") ) { return "value" }
        if ( anyID.includes("constraint") ) { return "constraint" }
        if ( anyID.includes("rolebox") &&
             anyID.includes("r-") &&
             ! anyID.includes("r-r-") ) { return "rolebox" }
        if ( anyID.includes("rolebox") ) { return "rolebox_group" }
        return ""
    }

    static object_ref(anyID) {
        var refs = {
            "connector" : "connectors",
            "entity" : "entities",
            "value" : "values",
            "constraint" : "constraints",
            "rolebox" : "roleboxes",
            "rolebox_group" : "rbgroups"
        };
        return refs[ Graph.object_kind(anyID) ]
    }

    static any_object(anyID) {
        /* Get any main ORM object. */

        var ref = Graph.object_ref(anyID);
        if (orm[ref].hasOwnProperty(anyID)) {
            return orm[ref][anyID];
        }
        return null
    }

    // Appearance

    static object_width(object) {
        /*  When the name or refmode of an entity changes, update the
            width of the visualization to accommodate the name. */

        // Calculate width
        var d = object.d3object.datum();
        if (d.kind == "entity") {
            var width = Math.max( Entity.name_width(d.name), Entity.name_width(d.refmode) );
        } else {
            var width = Entity.name_width(d.name);
        } 
        var height = parseInt( object.d3object.attr("height") );
        
        // Adjust width of group
        object.d3object.attr("width",width);
        // Adjust width of overlay
        object.update_overlay();
        // Adjust width of rect
        d3.select(`#r-${object.id}`)
            .attr("width", width)
            .attr("transform", () => translate( -width/2, -height/2 ));
    }

    static overlay_width(object) {

        /* When the width of the entity changes, adjust the size of the 
           overlays so they appear on each side of the entity correctly. */
    
        // Delete the original overlay
        d3.select(`#o-${object.id}`).remove();
        // Replace the overlay
        var d = object.d3object.datum();
        // Entity or value?
        var ov = d.kind.substring(0,1) + "overlay"
        var overlay = overlay_definition(object.d3object,ov);
        overlay.attr("transform", () => 
            overlay_translate(d.x0, d.y0, 
                              parseInt(object.d3object.attr("width")), 
                              parseInt(object.d3object.attr("height"))) 
        );
        // Add actions to new overlay
        object.overlay_actions();
    }

    static fill_datum(d, def_d) {
        var fin_d = def_d;
        for (var attr in fin_d) {
            if (d[attr] != null) {
                fin_d[attr] = d[attr];
            }
        }
        return fin_d
    }

}

/*----- General purpose -----*/

function remove_from_array(arr, v) {
    /* Remove first instance of v from arr */
    var index = arr.indexOf(v);
    if (index > -1) {
        arr.splice(index, 1);
    }
    return arr;
}

function key_from_value(obj, value) {
    return Object.keys(obj).find(key => obj[key] === value)
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

function get_parentID(anyID) {
    /* From any sub-component of the object group, get the group ID */
    var splitID = anyID.split("-");
    var len = splitID.length;
    return splitID[len-3] + "-" + splitID[len-2] + "-" + splitID[len-1];
}

function levelupID(anyID) {
    var splitID = anyID.split("-");
    return splitID.slice(1,splitID.length).join("-");
}

function delete_reference(class_obj) {
    delete class_obj
}

/* Text */

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

    if ( Entity.is_entityID(anyID) ) {
        return orm.entities[anyID].closest_overlay(position);
    }
    if ( Value.is_valueID(anyID) ) {
        return orm.values[anyID].closest_overlay(position);
    }
    if ( Predicate.is_roleboxID(anyID) ) {
        //return closest_rboverlay(position, anyID, locations=locations)
        return orm.roleboxes[anyID].closest_overlay(position, locations);
    }
    if ( Graph.object_kind(anyID) == "constraint" ) {
        return orm.constraints[anyID].closest_overlay(position);
    }
    if ( Graph.object_kind(anyID) == "connector" ) {
        return orm.connectors[anyID].closest_overlay(position);
    }
}

function closest_location(position,xyo,locations=dragevent.all_locations) {
    
    /* Find the shortest distance between position and any of the locations
       in xyo. This is used to find the closest overlay to a mouse position. */
    
    var closestDistance = Number.MAX_VALUE;
    var closestLocation = "right";

    locations.map( (location) => {
        xyo[location]["distance"] = 
            Math.sqrt( Math.pow( (position.x - xyo[location].x), 2) +
                       Math.pow( (position.y - xyo[location].y), 2) );
        if (xyo[location]["distance"] < closestDistance) {
            closestDistance = xyo[location]["distance"];
            closestLocation = location;
        }
    });
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
        var candidateObject = d3.select(`#${objID}`);
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
    objinfo = closest_of_kind(position, objinfo, orm.values);
    objinfo = closest_of_kind(position, objinfo, orm.constraints);
    var subtypes = Connector.all_subtypes();
    objinfo = closest_of_kind(position, objinfo, subtypes);

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
        //var candidateObject = objdic[anyID];
        var candidateObject = d3.select("#"+anyID);
        distance = position_distance(position, candidateObject.datum());
        if ( distance < objinfo.distance ) {
            objinfo.distance = distance;
            objinfo.object = candidateObject;
            objinfo.found = true;
        }
    }
    return objinfo;
}

function position_distance(pos1,pos2) {
    if (typeof pos2.x !== "undefined") {
        return Math.sqrt( Math.pow( (pos1.x - pos2.x), 2) +
                          Math.pow( (pos1.y - pos2.y), 2) );
    }
    else {
        return closest_on_line(pos1,pos2).distance
    }
}

function snap( pos, field, anyID ) {
    
    /* Used to "snap" an object into alignment with closest entity
       or x position of rolebox. */
   
    // Get distance from object and it's nearest neighbors
    // Closest entity
    var closest = closest_object_1D(anyID, orm.entities, field, pos);
    // Closest value
    var closest_v = closest_object_1D(anyID, orm.values, field, pos);
    if (closest_v.distance < closest.distance) { closest = closest_v }
    // Closest rolebox
    var closest_rb = closest_object_1D(anyID, orm.roleboxes, field, pos);
    if (closest_rb.distance < closest.distance ) { closest = closest_rb; }
    // Closest fact
    // We don't use x,y in the datum, this is centered on the first rolebox
    // We use xc,yc which is centered on the fact midpoint
    var closest_f = closest_object_1D(anyID, orm.rbgroups, field+"c", pos);
    var field_suff = "";
    if (closest_f.distance < closest.distance ) { 
        closest = closest_f; 
        field_suff = "c";
    }

    // Return new position if within tolerance
    var tolerance_anyID = tolerance.snap[ Graph.object_kind(anyID) ];
    if (closest.distance < tolerance_anyID){
        return closest.object.datum()[field+field_suff];
    } else {
        return pos;
    }
}

/*----- Overlays -----*/

function overlay_definition(object,oclass) {

    /* Generic function for creating overlays for objects. */

    //var width = entity_param.width;
    //var height = entity_param.height;

    var width = parseInt( object.attr("width") );
    var height = parseInt( object.attr("height") );

    var d = object.datum();
    var pd = d3.select("#" + object.attr("parent") ).datum();
    var overlayID = "o-"+object.attr("id");

    if( pd.kind == "rolebox_group" ) {
        height = 1.5*height;
    }

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

/*----- Shadows -----*/

function add_shadows() {
    //shadow_facts_from_metamodel();

    /* Shadows for facts */
    // Unshadow all
    for (var objID in orm.rbgroups) { unclass_as(objID, "shadowed");}
    for (var factID in metamodel.Fact) {
        // Get all rbgroup id's referring to this fact
        var shadows = metamodel.Fact[factID]._Shadows;
        if (shadows.length > 1) {
            // If there's more than one, add shadow
            for (var n in shadows) { class_as(shadows[n], "shadowed"); }
        }
    }

    /* Shadows for entities and values */
    // Unshadow all
    for (var objID in orm.entities) { unclass_as(objID, "shadowed");}
    for (var objID in orm.values) { unclass_as(objID, "shadowed");}
    for (var objID in metamodel.Object) {
        // Get all id's referring to this object
        var shadows = metamodel.Object[objID]._Shadows;
        if (shadows.length > 1) {
            // If there's more than one, add shadow
            for (var n in shadows) { class_as(shadows[n], "shadowed"); }
        }
    }
}

function unclass_as(anyID,cname) {
    var class_string = d3.select("#"+anyID).attr("class");
    d3.select("#"+anyID).attr("class", class_string.replaceAll(` ${cname}`, ``) );
}

function class_as(anyID,cname) {
    var class_string = d3.select("#"+anyID).attr("class");
    unclass_as(anyID,cname);
    d3.select("#"+anyID).attr("class", `${class_string} ${cname}`);
}