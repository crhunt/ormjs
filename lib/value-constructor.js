/*
    Everything related to values.

    This file defines values, data associated with how they are represented and
    connected to other objects, and actions they can perform, such as on drag and 
    click events.

    Note that since value type behavior is very similar to entities, we reuse
    many of the functions defined for entities in entity-constructor.
*/

/*----- Global definitions -----*/

// Value appearance and behavior
// These quantities are pulled from the style sheet, orm-style.css
var value_param = {
    height : parse_number( get_css_variable('--entity-height') ),
    snapTolerance : parse_number( get_css_variable('--entity-height') )/10
};

// Distance tolerances for snap and link events
var tolerance; // Defined in graph-constructor
tolerance.link["value"] = 2*entity_param.height ;
tolerance.snap["value"] = entity_param.snapTolerance ;

// Graph variables
var svg; // Defined in svg-constructor
var orm; // Defined in parse-svg

/*----- END Global definitions -----*/

/*----- Value IDS -----*/

function generate_valueID() {
    /* ID of the value group */
    valueID = "id-value-" + orm.highestValueID.toString();
    orm.highestValueID += 1;
    return valueID
}

function is_valueID(anyID) {
    /* Does anyID play any part in a value? 
       (Returns true for boxes, text, etc) */
    if ( anyID.includes("value") ) { return true; }
    return false;
}

/*----- END Value IDs -----*/

/*-----  Drawing values -----*/

function value_definition(x,y,valueID) {

    /* Define the value appearance (box, display name, overlays) 
       and initialize its datum. */

    var vname = "Value "+object_number(valueID);
    var width = calc_entity_width(vname);
    var height = value_param.height;

    // Create a group for the rect / text
    var value = svg.append("g")
        .datum( {x: x, y: y, dx: 0, dy: 0, x0: x, y0: y,
                selected: false, kind: "value",
                overlay: overlay_from_ID(valueID),
                connectors: [],
                name: vname, independent: false, type: "popular"} )
        .attr("class","value_prototype")
        .attr("id",valueID)
        .attr("parent",valueID) // This is used for the overlay definitions
        .attr("x", function(){ return (x) })
        .attr("y", function(){ return (y) })
        .attr("width", width)
        .attr("height", height);
    // Value rectangle
    value.append("rect")
        .attr("class","value")
        .attr("id","r-"+valueID)
        .attr("x", function(){ return (x) })
        .attr("y", function(){ return (y) })
        .attr("width", width)
        .attr("transform", () => translate(-width/2,-height/2));
    
    // Display value name
    value.append("text")
        .attr("class","ename")
        .attr("id","t-"+valueID)
        .attr("x", function(){ return (x) })
        .attr("y", function(){ return (y) })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .text( function(d){ return d.name } );
    
    return value;

}

function draw_value(x,y) {

    /* Draw a new instance of an value */

    // Create value id
    var valueID = generate_valueID();

    // Add the visualization of the value
    var value = value_definition(x,y,valueID);

    // Record new value
    orm.values[valueID] = value;

    // Create new overlay for value
    // Overlays are defined in graph-constructor
    var overlay = overlay_definition(value,"voverlay");

    // Add actions to value and overlay
    value_actions(value);

    // Update rel
    parse_orm();

}

/*----- END Drawing values -----*/

/*----- Value actions -----*/

function value_actions(value) {

    /* What to do with an value on drag event, double click event,
       or overlay mousedown event. */

    // What to do on drag event
    var drag_value = d3.drag()
        .on("start", edragstarted)
        .on("drag", function (event,d) { edragged(event,d, value.attr("id") ) } )
        .on("end", vdragended);

    // Add events to the value
    value
        .on("dblclick", popup_event)
        .on("contextmenu", d3.contextMenu(valueOptions)) // Right click menu
        .on("click", remove_value) // Ctrl+click --> remove entity
        .call(drag_value);

    // Add events to overlay
    voverlay = d3.select( "#" + overlay_from_ID(value.attr("id")) );
    overlay_actions(voverlay);
}

function remove_value(event) {

    /* Remove an value on an event. */

    // Get value
    // Note: d3.select(this) works for ctrl+click events but not right click menu
    var click_objID = event.target.id.toString();//.substring(0,event.target.length);
    var parentID = get_parentID(click_objID);
    value = orm.values[parentID];
    if (value == null) { return }
    // Ctrl key for click event, buttons for right click menu
    if (event.ctrlKey || event.buttons == 2) {
        delete_value( value );
    }
}

function delete_value(value) {

    /* Delete the value.
       1. Remove connectors from value
       2. Remove visualization
       3. Remove references to value
       4. Update ORM metamodel */

    // ** Remove connectors **
    d = value.datum();
    conns = d.connectors;
    for ( n in conns ) {
        delete_connector(orm.connectors[ conns[n] ]);
    }

    // ** Remove the entity visualization **
    valueID = value.attr("id");
    // Remove overlay part
    d3.select( "#" + overlay_from_ID(valueID) ).remove();
    // Remove entity part
    value
        .transition()
        .duration(500)
        .attr("transform", "translate(" + d.x + "," + 
                        d.y + ") scale(0)")
        .remove();
    
    // ** Remove the value from records **
    delete orm.values[ valueID ];

    // ** If popup related to value exists, remove it **
    if ( ! d3.select("#pop-"+valueID).empty() ) { 
        remove_popup( d3.select("#pop-"+valueID) ); 
    }

    // Update ORM
    parse_orm();
}

function update_value_name(value) {
    
    /* Update the name visualization based on the datum */
    
    d = value.datum();

    // Format the name as-entered to conform to ORM standards
    d.name = format_entity_name(d.name);

    // Update width of entity based on name and refmode
    update_entity_width(value);

    // Set visualization of name
    var vname = d.name;
    if (d.independent) { vname = `${vname} !`; }
    d3.select("#t-"+value.attr("id"))
        .text( vname );
}

/*----- END Value actions -----*/

/*-----  Drag control for the value -----*/

function vdragended() {

    /* End drag event for value */

    var value = d3.select(this);
    value.datum().selected = false;

    // Update ORM
    parse_orm();
}

/*----- END Drag control for the value -----*/