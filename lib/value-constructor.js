/*
    Everything related to values.

    This file defines values, data associated with how they are represented and
    connected to other objects, and actions they can perform, such as on drag and 
    click events.

    Note that since value type behavior is very similar to entities, we reuse
    many of the functions, defined in graph-constructor.js.
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
tolerance.link["value"] = 2*value_param.height ;
tolerance.snap["value"] = value_param.snapTolerance ;

// Graph variables
var svg; // Defined in svg-constructor
var orm; // Defined in parse-svg

/*----- END Global definitions -----*/

class Value {
    
    d3object;
    id;
    kind = "value";
    ref = "values";

    constructor(data) {
        if(!data.d3object) {
            // Create new d3 object
            this.id = Value.generateID();
            this.create_d3object(data);

        } else {
            // Create new object with provided d3 object
            this.id = data.d3object.attr("id");
            data.d3object.datum().id = this.id;
            this.d3object = data.d3object;
        }

        // Record object
        this.record();

        // Update ORM
        parse_orm();
    }

    /*----- Value IDs -----*/
    
    static generateID() {
        // Generate ID for a new value
        var valueID = "id-value-" + orm.highestValueID.toString();
        orm.highestValueID += 1;
        return valueID
    }

    static is_valueID(anyID) {
         /* Does anyID play any part in an value? 
            (Returns true for boxes, text, etc) */
        if ( anyID.includes("value") ) { return true; }
        return false;
    }

    /*----- END Value IDs -----*/

    /*-----  Drawing values -----*/

    create_d3object(data) {

        /*  Define the value appearance (box, display name, overlays) 
            and initialize its datum. */

        // Name
        var vname = "Value "+object_number(this.id);

        // Size
        var width = Value.name_width(vname);
        var height = value_param.height;

        // Datum
        var def_d = Value.default_datum();
        def_d.name = vname;
        var d = Graph.fill_datum(data, def_d);
        d.x0 = d.x;
        d.y0 = d.y;
        d.id = this.id;

        // Create a group for the rect / text
        var value = svg.append("g")
            .datum( d )
            .attr("class","value_prototype")
            .attr("id",this.id)
            .attr("parent",this.id) // This is used for the overlay definitions
            .attr("x", d.x)
            .attr("y", d.y)
            .attr("width", width)
            .attr("height", height);
        // Value rectangle
        value.append("rect")
            .attr("class","value")
            .attr("id","r-"+this.id)
            .attr("x", d.x)
            .attr("y", d.y)
            .attr("width", width)
            .attr("transform", () => translate(-width/2,-height/2));
        
        // Display value name
        value.append("text")
            .attr("class","ename")
            .attr("id","t-"+this.id)
            .attr("x", d.x)
            .attr("y", d.y)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .text( function(d){ return d.name } );

        // Create new overlay for value
        // Overlays are defined in graph-constructor
        overlay_definition(value,"voverlay");
        
        // Assign value            
        this.d3object = value;

        // Add actions
        this.actions();

        // Correct refmode display based on datum
        this.update_display_name();
        
        return value;
    }

    // Names

    static name_width(vname) {
        // Based on name length, set size of value
        return vname.length*10 + 21;
    }

    update_width() {
        /*  When the name or refmode of an value changes, update the
            width of the visualization to accommodate the name. */

        Graph.object_width(this);
    }

    update_overlay() {

        /* When the width of the value changes, adjust the size of the 
           overlays so they appear on each side of the value correctly. */
    
        Graph.overlay_width(this);
    }

    update_display_name() {
        // Use datum to update how name and refmode appear
        var d = this.d3object.datum();
        var disp_name = Value.format_name(d.name);

        // Update width based on display name
        this.update_width();

        // Update d3 object
        d3.select(`#t-${this.id}`).text( disp_name );
    }

    static format_name(ename) {
        /* Format name appearance:
           1. Capitalize each word in name
           TBC */
        return ename.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
    }

    // Data

    static default_datum() {
        var param = {x: 0, y: 0, dx: 0, dy: 0, x0: 0, y0: 0,
                selected: false, kind: "value",
                connectors: [], independent: false, 
                type: "popular"};
        return param
    }

    record() {
        // Add new value to global record
        orm.values[this.id] = this;
    }

    duplicate() {
        // Data about original fact
        var d = this.d3object.datum();

        // Location for duplicate
        var offset = value_param.height*0.75;
        var x = d.x + offset;
        var y = d.y + offset;

        // Set datum
        var dc = {x: x, y:y};
        var match_datum = ["name", "independent", "type"];
        match_datum.map( (n) => { dc[n] = d[n]; });
        
        // Duplicate value
        new Value(dc);

        // Update orm
        parse_orm();
    }

    /*----- END Drawing values -----*/

    /*----- Value actions -----*/

    actions() {

        /* What to do with an value on drag event, double click event,
        or overlay mousedown event. */

        // What to do on drag event
        var drag_value = d3.drag()
            .on("start", this.dragstarted)
            .on("drag", this.dragged )
            .on("end", this.dragended);

        // Add events to the value
        this.d3object
            .on("dblclick", popup_event)
            .on("contextmenu", d3.contextMenu(valueOptions)) // Right click menu
            .on("click", this.remove) // Ctrl+click --> remove value
            .call(drag_value);

        // Add events to overlay
        this.overlay_actions();
    }

    overlay_actions() {
        /* What to do with an overlay on a mousedown event (create connector) */
        d3.select( `#o-${this.id}` )
          .on("mousedown", (event) => { this.mousedown(event, this); });
    }

    dragged(event,d) {
        var value = orm.values[d.id];
        Graph.dragged(event,d,value);
    }

    dragstarted(event,d) {

        /* Initiate drag event */

        var value = orm.values[d.id];
        Graph.dragstarted(event,d,value);
    }

    dragended(event,d) {

        /* End drag event for value */

        var value = orm.values[d.id];
        Graph.dragended(value);
    
        /* Check flip condition for each fact (rolebox group) attached
           to the value, flip if appropriate, and redraw connected connectors */
           var rbgroups = entity.plays_lead_roles();
           rbgroups.map( (rbgroup) => {
               rbgroup.update_flip();
           });
    }

    move() {
        Graph.object_move(this);
    }

    mousedown(event, value) {

        /* First actions to perform on a mousedown event on an
           overlay of an entity.
           
           The big trick here is that the entity is transformed to move the origin, 
           to the middle of the entity, but the pointer of the event doesn't know this 
           apparently. So we need to construct the actual location of the entity and 
           the click event. */
    
        // Current pointer position
        var d = value.d3object.datum();
        var m = d3.pointer(event);
        var width = value.d3object.attr("width");
        var mousepos = {x: m[0] + d.x - width/2, 
                        y: m[1] + d.y - value_param.height/2};
    
        Graph.mousedown(event, value, mousepos);
    
    }

    /*----- END Value actions -----*/

    /*----- Value delete -----*/

    static remove(event) {
        /* Remove connector on click event */

        // Only 2 types of click events should result in deleting constraint:
        // Ctrl key for click event, buttons for right click menu
        event.stopPropagation();
        if (event.ctrlKey || event.buttons == 2) {
            var click_objID = event.target.id.toString();
            var parentID = get_parentID(click_objID);
            orm.values[parentID].delete();
        }
    }

    delete() {

        /* Delete the value.
           1. Remove connectors from value
           2. Remove visualization
           3. Remove references to value
           4. Update ORM metamodel */
    
        Graph.delete_object(this);
    }

    /*----- END Value delete -----*/

    /*----- Value connections -----*/

    closest_overlay(pos) {
        /* Get position of closest overlay to pos */
        // Get the overlay positions of the value
        var xyo = this.overlay_positions();
        // Get closest of the overlay positions
        return closest_location(pos,xyo);
    }

    overlay_positions() {
        /* Create a set of positions for each overlay,
           based on its current position. */
        return Graph.overlay_positions(this)
    }

    plays_lead_roles() {
        /* Find all facts for which the value plays a "lead" role.
           That is, the value is the "subject" of the fact.
            
           This lead role concept is used to determine whether to flip a fact
           in the visualization. */
        return Graph.plays_lead_roles(this)
    }

    plays_roles() {
        /* Find all roles played by object */
        return Graph.plays_roles(this)
    }

    check_independence() {
        var roles = this.plays_roles();
        for (var n in roles) {
            if( d3.select("#"+roles[n]).datum().mandatory ) {
                return false
            }
        } 
        return true
    }

    can_connect(d3target) {
        // Determine whether value can connect to the d3target

        var d = d3target.datum();

        // Can only connect to rolebox
        if (d.kind != "rolebox") { return false }

        // Can we connect to rolebox?

        // Roleboxes only connect to 1 entity/value
        if (d.entity != null) { return false }

        // We have removed restriction that value cannot be the primary entity.

        return true
    }

    /*----- END Value connections -----*/

}