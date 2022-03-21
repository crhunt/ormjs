/* 
   Functions that apply across objects 
*/

var ormjs;

var tolerance = { link: {}, snap: {}}; 

ormjs.Graph = class {

    //----- Drag events -----

    static object_move(object) {
        // Move the object based on the position in datum
        var d = object.d3object.datum();
        object.d3object
            .attr("x", d.x)
            .attr("y", d.y )
            .attr("transform", () => ormjs.Graph.translate(d.dx,d.dy));

        // Redraw all connected connectors
        ormjs.Connector.redraw(d.connectors);
    }

    static dragstarted(event,d) {
        /* Initiate drag event */
        event.sourceEvent.stopPropagation();
        var object = ormjs.Graph.any_object(d.id);
        object.d3object.datum().selected = true;
        object.d3object.style("cursor", "grabbing");
        return object
    }

    static dragged(event,d) {
        /* Drag event for an object */

        var object = ormjs.Graph.any_object(d.id);
    
        if (object.d3object.classed("selected")) {
            ormjs.HighlightRegion.drag_selected(event);
        } else {
            
            // Set the new position
            d.dx += event.dx;
            d.dy += event.dy;
    
            // Snap to entities
            d.dx = ormjs.Graph.snap( d.dx + d.x0, "x", object.id ) - d.x0;
            d.dy = ormjs.Graph.snap( d.dy + d.y0, "y", object.id ) - d.y0;
            d.x = d.x0 + d.dx;
            d.y = d.y0 + d.dy;
    
            // Drag entity
            object.move();

            if (object.kind == "rolebox_group") { object.position_boxes(); }
        }
    }

    static dragended(event,d) {
        var object = ormjs.Graph.any_object(d.id);
        object.d3object.datum().selected = false;
        object.d3object.style("cursor", "grab");
        return object
    }

    static mousedown(event, object, mousepos) {

        /* On overlay mousedown, create a new connector. */
        
        event.stopPropagation();

        if (event.buttons == 2) {return} // Only left click events
        /* Note: this prevents a bug that can sometimes leave a connector behind 
           when someone has clicky fingers. */

        var conntypes = ormjs.Connector.supported_types().names;
        var pos = object.closest_overlay(mousepos);
        var data = { x1: pos.x, x2: mousepos.x, y1: pos.y, y2: mousepos.y,
                     model: object.model };
        
        if (object.kind == "constraint") {
            data.conntype = conntypes.CtoRB;
        }
        if (object.kind == "rolebox") {
            /*  The dragevent sets which overlays we can connect to during the 
                mousemove event that creates a new connector. We restrict the
                available overlays so the rolebox connection point doesn't look 
                "weird" by ORM standards while we're dragging.) 
            */
            var dragevent = ormjs.models[object.model].dragevent;
            dragevent.locations = ["top", "bottom"];
            if ( !dragevent.locations.includes(pos.location) ) { 
                dragevent.locations = [ pos.location ]; 
            } 
        }
        
        var conn = new ormjs.Connector(data);
        var cd = conn.d3object.datum();

        cd.from = object.id;
        cd.selected = true;

        var svg = ormjs.models[object.model].currentview.d3object;

        // Add svg mouse actions for dragging connector across svg
        // We unset these on mouseup (svg_mouseup).
        svg
            .on("mousemove", function (event) { conn.svg_mousemove(event) })
            .on("mouseup", function (event) { conn.svg_mouseup(event) } );
    }

    //----- Delete -----

    static delete_object(object) {
        
        /* Delete the object.
           1. Remove connectors from object
           2. Remove visualization
           3. Remove references to object
           4. Update ORM metamodel */
    
        // ** Remove connectors **
        var d = object.d3object.datum();
        var conns = [...d.connectors];
        var model = ormjs.models[object.model];
        conns.map( (connID) => {
            //orm.connectors[connID].delete();
            model.objects.connector[connID].delete();
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
        delete model.objects[object.kind][ object.id ];

        // Update ORM
        parse_orm();
    }

    //----- Connecting objects -----

    static model_from_id(anyID) {
        var d = d3.select(`#${anyID}`).datum();
        return ormjs.models[d.model]
    }

    static any_object(anyID) {
        var d = d3.select(`#${anyID}`).datum();
        if (!d) { return null }
        var objects = ormjs.models[d.model].objects[d.kind];
        if (objects.hasOwnProperty(anyID)) {
            return objects[anyID];
        }
        return null
    }

    static closest_overlay(position, anyID,locations=ormjs.default_dragevent) {

        /* Generic function for returning overlay positions of any object. */

        return ormjs.Graph.any_object(anyID).closest_overlay(position, locations)
    }

    static closest_location(position,xyo,locations=ormjs.default_dragevent) {
        
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

    static closest_object(position,modelID) {

        /* Find the closest object to position. Looks in 2D, Euclidean distance.

        Needs to be changed to be at the view level

        Returns for the closest object to position
            object: actual d3 object
            distance: distance from position to object center
            tolerance: for object, allowed distance from object for connection
                    to be created
            found: whether or not any object has been found.

        */

        var objects = ormjs.models[modelID].objects;

        var objinfo = { object: null, 
            distance: Number.MAX_VALUE, 
            tolerance: 0,
            found: false }

        var obj_options = ["entity", "rolebox", "value", "constraint"];
        obj_options.map( (obj) => {
            objinfo = ormjs.Graph.closest_of_kind(position, objinfo, objects[obj]);
        });
        /*objinfo = Graph.closest_of_kind(position, objinfo, orm.entities);
        objinfo = Graph.closest_of_kind(position, objinfo, orm.roleboxes);
        objinfo = Graph.closest_of_kind(position, objinfo, orm.values);
        objinfo = Graph.closest_of_kind(position, objinfo, orm.constraints);*/
        var subtypes = ormjs.Connector.all_subtypes(modelID); // This should be the view
        objinfo = ormjs.Graph.closest_of_kind(position, objinfo, subtypes);

        objinfo.tolerance = objinfo.object ? ormjs.tolerance.link[ objinfo.object.datum().kind ] 
                                           : 0;
        return objinfo;
    }

    static closest_of_kind(position, objinfo, objdic) {

        /* For objects of kind in objdic (ie, entities or roleboxes),
        find the object closest to position. 
        
        If the object found is closer than the object in objinfo,
        replace objinfo with the information for the found object. */

        var distance;
        for ( var anyID in objdic ) {
            //var candidateObject = objdic[anyID];
            var candidateObject = d3.select("#"+anyID);
            distance = ormjs.Graph.position_distance(position, candidateObject.datum());
            if ( distance < objinfo.distance ) {
                objinfo.distance = distance;
                objinfo.object = candidateObject;
                objinfo.found = true;
            }
        }
        return objinfo;
    }

    static position_distance(pos1,pos2) {
        if (typeof pos2.x !== "undefined") {
            return Math.sqrt( Math.pow( (pos1.x - pos2.x), 2) +
                            Math.pow( (pos1.y - pos2.y), 2) );
        }
        else {
            return ormjs.Geometry.closest_on_line(pos1,pos2).distance
        }
    }

    //----- Snapping -----

    static snap( pos, field, anyID ) {
        
        /* Used to "snap" an object into alignment with closest entity
        or x position of rolebox. */

        var objects = ormjs.Graph.model_from_id(anyID).objects;
        var closest = { object: null, distance: Number.MAX_VALUE };
        var obj_options = ["entity", "value", "rolebox", "rolebox_group"];
        var field_suff = "";
        obj_options.map( (obj) => {
            var _closest = ormjs.Graph.closest_object_1D(anyID, objects[obj], field, pos);
            if( _closest.distance < closest.distance ) {
                closest = _closest;
                if (obj == "rolebox_group") { field_suff = "c"; }
            }
        });

        // Return new position if within tolerance
        var tolerance_anyID = ormjs.tolerance.snap[ ormjs.Graph.object_kind(anyID) ];
        if (closest.distance < tolerance_anyID){
            return closest.object.datum()[field+field_suff];
        } else {
            return pos;
        }
    }

    static closest_object_1D(myobjID, objects, field, ideal) {

        /* 
        Find the closest object of type objects to position ideal,
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

    //----- Connections -----

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

        var roles = ormjs.Graph.plays_roles(object);

        var rbgroups = roles.map( (roleID) => {
            var rbgID = d3.select(`#${roleID}`).datum().parent;
            // Is the object the lead role of the rolebox group?
            if ( d3.select(`#${rbgID}`).datum().entity_in == object.id ) {
                    // It is! Add to list
                    //return orm.rbgroups[rbgID]
                    return rbgID
            }
        }).filter(v=>v);

        return rbgroups
    }

    static plays_roles(object) {
        
        /* Find all roles played by object */

        var conns = object.d3object.datum().connectors;
        // Iterate through all connections of the entity
        var roles = conns.map( (connID) => {
            // Datum of connector
            var d = d3.select(`#${connID}`).datum();
            //if (! d3.select(`#${d.to}`) ) { return } // Can happen with subtypes on import
            // Check if connected to a rolebox
            if ( ormjs.Graph.object_kind(d.to) == "rolebox" ){
                // It is! Add the rolebox
                return d.to;
            }
        }).filter(v=>v);
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

    //----- Overlays -----

    static draw_overlay(object,oclass) {

        /* Generic function for creating overlays for objects. */
    
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
            .attr("transform", () => ormjs.Graph.overlay_translate(x,y,width,height) );
        // Top circle overlay
        overlay.append("circle")
            .attr("class","overlay "+oclass)
            .attr("transform", () => ormjs.Graph.translate(width/2, 0) );
        // Right circle overlay
        overlay.append("circle")
            .attr("class","overlay "+oclass)
            .attr("transform", () => ormjs.Graph.translate(width, height/2) );
        // Bottom circle overlay
        overlay.append("circle")
            .attr("class","overlay "+oclass)
            .attr("transform", () => ormjs.Graph.translate(width/2, height) );
        // Left circle overlay
        overlay.append("circle")
            .attr("class","overlay "+oclass)
            .attr("transform", () => ormjs.Graph.translate(0, height/2) );
        
        return overlay;
    }
    
    static overlay_translate(x,y,width,height) {
        /* Translate overlays using parent object position.
           Used when:
           1. Resizing entity width
           2. Moving roleboxes on flip events. */
        var tx = x - width/2;
        var ty = y - height/2;
        return "translate( " + tx + "," + ty + " )"
    }

    //----- Appearance -----

    static object_width(object) {
        /*  When the name or refmode of an entity changes, update the
            width of the visualization to accommodate the name. */

        // Calculate width
        var d = object.d3object.datum();
        if (d.kind == "entity") {
            var width = Math.max( ormjs.Entity.name_width(d.name), ormjs.Entity.name_width(d.refmode) );
        } else {
            var width = ormjs.Entity.name_width(d.name);
        } 
        var height = parseInt( object.d3object.attr("height") );
        
        // Adjust width of group
        object.d3object.attr("width",width);
        // Adjust width of overlay
        object.update_overlay();
        // Adjust width of rect
        d3.select(`#r-${object.id}`)
            .attr("width", width)
            .attr("transform", () => ormjs.Graph.translate( -width/2, -height/2 ));

        ormjs.Connector.redraw(d.connectors);
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
        var overlay = ormjs.Graph.draw_overlay(object.d3object,ov);
        overlay.attr("transform", () => 
            ormjs.Graph.overlay_translate(d.x0, d.y0, 
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

    //----- General purpose -----

    static translate(x,y) {
        /* Generate string for translate transform */
        return "translate( " + x + "," + y + " )"
    }

    static translate_rotate(x0,y0,x,y) {
        /* Generate string for rotating object 90 degrees around (x0,y0)
        and then translating to (x,y).
        
        Used for rotating rolebox groups. */
        return "rotate(90, "+x0+", "+y0+") translate("+x+", "+y+")"
    }

    static get_parentID(anyID) {
        /* From any sub-component of the object group, get the group ID */
        var splitID = anyID.split("-");
        var len = splitID.length;
        return splitID[len-3] + "-" + splitID[len-2] + "-" + splitID[len-1];
    }

    static levelupID(anyID) {
        var splitID = anyID.split("-");
        return splitID.slice(1,splitID.length).join("-");
    }

    //----- Shadows -----

    static add_shadows(metamodel) {
        //shadow_facts_from_metamodel();

        var objects = ormjs.models[metamodel.model].objects;

        /* Shadows for facts */
        // Unshadow all
        for (var objID in objects["rolebox_groups"]) { 
            ormjs.Graph.unclass_as(objID, "shadowed");
        }
        for (var factID in metamodel.Fact) {
            // Get all rbgroup id's referring to this fact
            var shadows = metamodel.Fact[factID]._Shadows;
            if (shadows.length > 1) {
                // If there's more than one, add shadow
                for (var n in shadows) { 
                    ormjs.Graph.class_as(shadows[n], "shadowed"); 
                }
            }
        }

        /* Shadows for entities and values */
        // Unshadow all
        for (var objID in objects["entity"]) { 
            ormjs.Graph.unclass_as(objID, "shadowed");
        }
        for (var objID in objects["value"]) { 
            ormjs.Graph.unclass_as(objID, "shadowed");
        }
        for (var objID in metamodel.Object) {
            // Get all id's referring to this object
            var shadows = metamodel.Object[objID]._Shadows;
            if (shadows.length > 1) {
                // If there's more than one, add shadow
                for (var n in shadows) { 
                    ormjs.Graph.class_as(shadows[n], "shadowed"); 
                }
            }
        }
    }

    static unclass_as(anyID,cname) {
        var class_string = d3.select("#"+anyID).attr("class");
        d3.select("#"+anyID).attr("class", class_string.replaceAll(` ${cname}`, ``) );
    }

    static class_as(anyID,cname) {
        var class_string = d3.select("#"+anyID).attr("class");
        ormjs.Graph.unclass_as(anyID,cname);
        d3.select("#"+anyID).attr("class", `${class_string} ${cname}`);
    }

}

ormjs.GraphUtils = class {

    /* General purpose utilities used for displaying the graph. */

    static remove_from_array(arr, v) {
        // Remove first instance of v from arr
        var index = arr.indexOf(v);
        if (index > -1) {
            arr.splice(index, 1);
        }
        return arr;
    }
    
    static key_from_value(obj, value) {
        return Object.keys(obj).find(key => obj[key] === value)
    }
    
    static range(size, startAt = 0) {
        /* Get a range of ints of length size starting at value startAt */
        return [...Array(size).keys()].map(i => i + startAt);
    }

    static get_css_variable(varname) {
        /* Pull css variables from any css file and return as a string. */
        return window.getComputedStyle(document.documentElement).getPropertyValue(varname)
    }
    
    static parse_number(mystring) {
        /* Parse mystring as an integer. */
        return parseInt( mystring.replace(/\D/g, "") )
    }

    static get_css_number(varname) {
        return ormjs.GraphUtils.parse_number(ormjs.GraphUtils.get_css_variable(varname))
    }

}

ormjs.Geometry = class {

    static resize_and_rotate(pos) {

        /* Path shapes need to be drawn based on distance between positions
           and rotated to indicate connection from (pos.x1, pos.y1)
           to (pos.x2, pos.y2). This function calculates the angle to rotate
           and defines the total length of the path. */
    
        var totallen = Math.sqrt( Math.pow( (pos.x1 - pos.x2), 2) +
                                  Math.pow( (pos.y1 - pos.y2), 2) );
        var transform_string = "translate(" + pos.x1 + " " + pos.y1 + ")";
        var totalangle = Math.atan( ( pos.y2 - pos.y1 ) / ( pos.x2 - pos.x1 ) ) * 180 / Math.PI;
        if (pos.x1 > pos.x2) {totalangle += 180; }
        transform_string += " rotate("+totalangle+")";
    
        var rr = {transform: transform_string, length: totallen};
    
        return rr
    }
    
    static line_midpoint(pos) {
        return {
            x: (pos.x2 - pos.x1)/2 + pos.x1,
            y: (pos.y2 - pos.y1)/2 + pos.y1,
        }
    }
    
    static closest_on_line(pos,linepos) {
        // Line equation
        var m = ( linepos.y2 - linepos.y1 )/( linepos.x2 - linepos.x1 )
        var b = linepos.y1 - m*linepos.x1;
        // Perpendicular line through pos
        var pm = -1/m;
        var pb = pos.y - pos.x*pm;
        // Intercept
        var ix = (pb - b)/(m - pm);
        var iy = m*ix + b;
        var ipos = {x: ix, y:iy};
        // On line segment
        ipos = ormjs.Geometry.position_in_box(ipos,linepos);
        // Distance from position to intercept
        var distance = Math.sqrt( Math.pow( (pos.x - ipos.x), 2) +
                                  Math.pow( (pos.y - ipos.y), 2) );
        return {x: ipos.x, y:ipos.x, distance: distance}
    }
    
    static position_in_box(pos, boxpos) {
        var minx = Math.min(boxpos.x1, boxpos.x2);
        var maxx = Math.max(boxpos.x1, boxpos.x2);
        pos.x = Math.max(minx,pos.x);
        pos.x = Math.min(maxx,pos.x);
        var miny = Math.min(boxpos.y1, boxpos.y2);
        var maxy = Math.max(boxpos.y1, boxpos.y2);
        pos.y = Math.max(miny,pos.y);
        pos.y = Math.min(maxy,pos.y);
        return pos
    }

    static point_on_circle(pos) {

        /* Find a point a distance r from a circle centered at (pos.x1, pos.y1)
           along a line pointing to (pos.x2, pos.y2). */
    
        
        var totalangle = Math.atan( ( pos.y2 - pos.y1 ) / ( pos.x2 - pos.x1 ) );
        if (pos.x1 > pos.x2) {totalangle += Math.PI; }
    
        return {x: pos.x1 + pos.r*Math.cos(totalangle), y: pos.y1 + pos.r*Math.sin(totalangle)}
        
    }
}

/* Text -- not used

function textwrap(text, width) {

    // Add text wrapping to a text node. Wrap text at width. 
    //   Not used.

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
}*/
