/*
    Everything related to entities.

    This file defines entities, data associated with how they are represented and
    connected to other objects, and actions they can perform, such as on drag and 
    click events.
*/

var ormjs;
ormjs.Entity = class {
    
    d3object;
    id;
    model;
    view;
    kind = "entity";

    constructor(data) {

        if(!data.d3object) {
            // Create new d3 object
            this.view = data.view;
            this.model = data.model ? data.model
                                    : ormjs.Graph.any_object(this.view).model;
            this.id = ormjs.Entity.generateID(this.model);
            this.create_d3object(data);
        } else {
            // Create new object with provided d3 object
            var d = data.d3object.datum();
            this.id = data.d3object.attr("id");
            this.model = data.model ? data.model
                                    : d.model;
            d.id = this.id;
            this.d3object = data.d3object;
        }

        this.d3object.datum().model = this.model;

        // Ensure view is accurate
        this.view = d3.select( d3.select(`#${this.id}`).node().parentNode ).node().id;
        this.d3object.datum().view = this.view;

        // Record object
        this.record();

        // Update ORM
        ormjs.models[this.model].update();
    }

    /*----- Entity IDs -----*/
    
    static generateID(modelID) {
        // Generate ID for a new value
        /*var entityID = "id-entity-" + orm.highestEntityID.toString();
        orm.highestEntityID += 1;*/
        return ormjs.Model.generateID(modelID,"entity")
    }

    static is_entityID(anyID) {
         /* Does anyID play any part in an entity? 
            (Returns true for boxes, text, etc) */
        if ( anyID.includes("entity") ) { return true; }
        return false;
    }

    /*----- END Entity IDs -----*/

    /*-----  Drawing entities -----*/

    create_d3object(data) {

        /* Define the entity appearance (box, display name, overlays) 
        and initialize its datum. */

        // Name
        var ename = "Entity "+object_number(this.id);
        
        // Size
        var width = ormjs.Entity.name_width(ename);
        var height = ormjs.size.entity.height;

        // Datum
        var def_d = ormjs.Entity.default_datum();
        def_d.name = ename;
        var d = ormjs.Graph.fill_datum(data, def_d);
        d.x0 = d.x;
        d.y0 = d.y;
        d.id = this.id;

        var svg = data.view ? d3.select(`#${data.view}`)
                            : ormjs.models[this.model].currentview.d3object;

        // Create a group for the rect / text
        var entity = svg.append("g")
            .datum( d )
            .attr("class","ormjs-entity_prototype")
            .attr("id",this.id)
            .attr("parent",this.id) // This is used for the overlay definitions
            .attr("x", d.x)
            .attr("y", d.y)
            .attr("width", width)
            .attr("height", height);
        // Entity rectangle
        entity.append("rect")
            .attr("class","ormjs-entity")
            .attr("id","r-"+this.id)
            .attr("x", d.x)
            .attr("y", d.y)
            .attr("width", width)
            .attr("transform", () => ormjs.Graph.translate(-width/2,-height/2));

        var spl = 9; // Height to split the Entity name and ref mode
        entity.append("text")
            .attr("class","ormjs-ename")
            .attr("id","t-"+this.id)
            .attr("x", d.x0)
            .attr("y", function(){ return (d.y0) })
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .text( function(d){ return d.name } );

        // Display entity refmode
        entity.append("text")
            .attr("class","ormjs-refmode")
            .attr("id","tr-"+this.id)
            .attr("x", d.x0)
            .attr("y", function(){ return (d.y0+spl) })
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .text("");
        
        // Create new overlay for entity
        // Overlays are defined in graph-constructor
        ormjs.Graph.draw_overlay(entity,"ormjs-eoverlay");
        
        // Assign entity            
        this.d3object = entity;


        // Add actions
        this.actions();

        // Correct refmode display based on datum
        this.update_display_name();

        return entity;
    }

    // Names

    static name_width(ename) {
        // Based on name length, set size of entity
        return ename.length*10 + 21;
    }

    update_width() {
        /*  When the name or refmode of an entity changes, update the
            width of the visualization to accommodate the name. */

        ormjs.Graph.object_width(this);
    }

    update_overlay() {

        /* When the width of the entity changes, adjust the size of the 
           overlays so they appear on each side of the entity correctly. */
    
        ormjs.Graph.overlay_width(this);
    }

    update_display_name() {
        // Use datum to update how name and refmode appear
        var d = this.d3object.datum();
        var disp_name = ormjs.Entity.format_name(d.name);
        var ref_name = "";
        if (d.refmode != "") {
            ref_name = ormjs.Entity.format_refmode(d.refmode, d.reftype);
        }

        // More name formatting basased on datum
        if (d.independent) { disp_name = `${disp_name} !`; }

        // Update d3 object
        d3.select(`#t-${this.id}`).text( disp_name );
        d3.select(`#tr-${this.id}`).text( ref_name );

        var spl = 9; // Height to split the Entity name and ref mode
        if (d.refmode != "") {
            d3.select(`#t-${this.id}`).attr("y", function(){ return (d.y0-spl) })
        } else {
            d3.select(`#t-${this.id}`).attr("y", function(){ return (d.y0) })
        }

        // Update width based on display name
        this.update_width();
    }

    static format_name(ename) {
        /* Format name appearance:
           1. Capitalize each word in entity name
           TBC */
        return ename.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
    }

    static format_refmode(initname, type="popular") {
        /* Format refmode name appearance */
        var fname = initname;
        if (type == "popular") {
            fname = fname.split(" ").join("_");
        }
        if (type == "popular") { fname = `(.${fname})`; }
        else if (type == "unit") { fname = `${fname}:`; }
        else if (type == "general") { fname = `${fname.toUpperCase()}` }

        return fname
    }

    // Data

    static default_datum() {
        var param = {x: 0, y: 0, dx: 0, dy: 0, x0: 0, y0: 0,
                     selected: false, kind: "entity",
                     connectors: [], independent: false,
                     refmode: "", reftype: "popular", unittype: ""};
        return param
    }

    record() {
        // Add new entity to global record
        ormjs.models[this.model].objects[this.kind][this.id] = this;
    }

    duplicate() {
        // Data about original fact
        var d = this.d3object.datum();

        // Location for duplicate
        var offset = ormjs.size.entity.height*0.75;
        var x = d.x + offset;
        var y = d.y + offset;

        // Set datum
        var dc = {x: x, y:y, model: this.model, view: this.view};
        var match_datum = ["name", "independent", "refmode", "reftype", "unittype"];
        match_datum.map( (n) => { dc[n] = d[n]; });
        
        // Duplicate entity
        new ormjs.Entity(dc);

        // Update ORM
        ormjs.models[this.model].update();
    }

    /*----- END Drawing entities -----*/

    /*----- Entity actions -----*/

    actions() {

        /* What to do with an entity on drag event, double click event,
        or overlay mousedown event. */

        // What to do on drag event
        var drag_entity = d3.drag()
            .on("start", this.dragstarted)
            .on("drag", this.dragged )
            .on("end", this.dragended);

        // Add events to the entity
        var entityMenu = ormjs.OptionMenu.entity_menu(this.model);
        this.d3object
            .on("dblclick", ormjs.PropertyMenu.popup_event)
            .on("contextmenu", d3.contextMenu(entityMenu)) // Right click menu
            .on("click", ormjs.Entity.remove) // Ctrl+click --> remove entity
            .call(drag_entity);

        // Add events to overlay
        this.overlay_actions();
    }

    overlay_actions() {
        /* What to do with an overlay on a mousedown event (create connector) */
        d3.select( `#o-${this.id}` )
          .on("mousedown", (event) => { this.mousedown(event, this); });
    }

    dragstarted(event,d) {
        ormjs.Graph.dragstarted(event,d);
    }

    dragged(event,d) {
        ormjs.Graph.dragged(event,d);
    }

    dragended(event,d) {

        /* End drag event for entity */
        var entity = ormjs.Graph.dragended(event,d);
    
        /* Check flip condition for each fact (rolebox group) attached
           to the entity, flip if appropriate, and redraw connected connectors */
        var rbgroups = entity.plays_lead_roles();
        var objects = ormjs.models[entity.model].objects;
        rbgroups.map( (rbgroupID) => {
            objects["rolebox_group"][rbgroupID].update_flip();
        });
    }

    move() {
        ormjs.Graph.object_move(this);
    }

    mousedown(event, entity) {

        /* First actions to perform on a mousedown event on an
           overlay of an entity.
           
           The big trick here is that the entity is transformed to move the origin, 
           to the middle of the entity, but the pointer of the event doesn't know this 
           apparently. So we need to construct the actual location of the entity and 
           the click event. */
    
        // Current pointer position
        var d = entity.d3object.datum();
        var m = d3.pointer(event);
        var width = entity.d3object.attr("width");
        var mousepos = {x: m[0] + d.x - width/2, 
                        y: m[1] + d.y - ormjs.size.entity.height/2};
    
        ormjs.Graph.mousedown(event, entity, mousepos);
    
    }

    /*----- END Entity actions -----*/

    /*----- Entity delete -----*/

    static remove(event) {
        /* Remove connector on click event */

        // Only 2 types of click events should result in deleting constraint:
        // Ctrl key for click event, buttons for right click menu
        event.stopPropagation();
        if (event.ctrlKey || event.buttons == 2) {
            var parentID = ormjs.Graph.get_parentID( event.target.id.toString() );
            var parent = ormjs.Graph.any_object(parentID);
            if (parent == null) { return }
            parent.delete();
        }
    }

    delete() {

        /* Delete the entity.
           1. Remove connectors from entity
           2. Remove visualization
           3. Remove references to entity
           4. Update ORM metamodel */
    
        ormjs.Graph.delete_object(this);
    }

    /*----- END Entity delete -----*/

    /*----- Entity connections -----*/

    closest_overlay(pos) {
        /* Get position of closest overlay to pos */
        // Get the overlay positions of the entity
        var xyo = this.overlay_positions();
        // Get closest of the overlay positions
        return ormjs.Graph.closest_location(pos,xyo);
    }

    overlay_positions() {
        /* Create a set of positions for each overlay,
           based on its current position. */
        return ormjs.Graph.overlay_positions(this)
    }

    plays_lead_roles() {
        /* Find all facts for which the entity plays a "lead" role.
           That is, the entity is the "subject" of the fact.
            
           This lead role concept is used to determine whether to flip a fact
           in the visualization. */
        return ormjs.Graph.plays_lead_roles(this)
    }

    plays_roles() {
        /* Find all roles played by object */
        return ormjs.Graph.plays_roles(this)
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
        // Determine whether entity can connect to the d3target

        var d = d3target.datum();

        // Can always connect to entities
        if (d.kind == "entity") { return true }
        // Only other connection is to rolebox
        if (d.kind != "rolebox") { return false }

        // Can we connect to rolebox?

        // Roleboxes only connect to 1 entity/value
        if (d.entity != null) { return false }

        return true
    }

    static nearest_neighbors(objID) {
        // Find nearest entities and values, traversing all paths

        var nnlist = ormjs.Connector.neighbors(objID);
        var nodes = { terminal: [], nonterminal: [] };
        var rnds = 0; // Safety measure
        while (nnlist.length > 0 && rnds < 10) {
            var next_nnlist = [];
            nnlist.map( (nnID) => {
                if (! nodes.terminal.includes(nnID)) {
                    if (nnID.includes("entity") || nnID.includes("value")) {
                        nodes.terminal.push(nnID);
                    } else {
                        nodes.nonterminal.push(nnID);
                        next_nnlist.push.apply(next_nnlist, ormjs.Connector.neighbors(nnID));
                    }
                }
            });
            // Remove duplicates
            next_nnlist = next_nnlist.filter( function( item, index, inputArray ) {
                return inputArray.indexOf(item) == index;
            });
            nnlist = [...next_nnlist];
            rnds += 1;
        }
        // In final list, just rolebox groups, not roleboxes
        nodes.nonterminal = nodes.nonterminal.filter(value => 
            !(ormjs.Graph.object_kind(value) == "rolebox")
        );

        return nodes
    }

    /*----- END Entity connections -----*/
}