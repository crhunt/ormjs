/*
    Everything related to entities.

    This file defines entities, data associated with how they are represented and
    connected to other objects, and actions they can perform, such as on drag and 
    click events.
*/

/*----- Global definitions -----*/

// Entity appearance and behavior
// These quantities are pulled from the style sheet, orm-style.css
var entity_param = {
    height : parse_number( get_css_variable('--entity-height') ),
    snapTolerance : parse_number( get_css_variable('--entity-height') )/10
};

// Distance tolerances for snap and link events
var tolerance; // Defined in graph-constructor
tolerance.link["entity"] = 2*entity_param.height ;
tolerance.snap["entity"] = entity_param.snapTolerance ;

// Graph variables
var svg; // Defined in svg-constructor
var orm; // Defined in parse-svg

/*----- END Global definitions -----*/

class Entity {
    
    d3object;
    id;
    kind = "entity";
    ref = "entities";

    constructor(data) {
        if(!data.d3object) {
            // Create new d3 object
            this.id = Entity.generateID();
            this.create_d3object(data);

        } else {
            // Create new constraint object with provided d3 object
            this.id = data.d3object.attr("id");
            data.d3object.datum().id = this.id;
            this.d3object = data.d3object;
        }

        // Record object
        this.record();

        // Update ORM
        //parse_orm();
    }

    /*----- Entity IDS -----*/
    
    static generateID() {
        // Generate ID for a new constraint
        var entityID = "id-entity-" + orm.highestEntityID.toString();
        orm.highestEntityID += 1;
        return entityID
    }

    static is_entityID(anyID) {
         /* Does anyID play any part in an entity? 
            (Returns true for boxes, text, etc) */
        if ( anyID.includes("entity") ) { return true; }
        return false;
    }

    static entityID_from_overlayID(oentityID) {
        /* Given entity's overlay ID, generate its entity ID */
        return oentityID.split("-")[1] + "-" + 
               oentityID.split("-")[2] + "-" +
               oentityID.split("-")[3];
    }

    /*----- END Entity IDs -----*/

    /*-----  Drawing entities -----*/

    create_d3object(data) {

        /* Define the entity appearance (box, display name, overlays) 
        and initialize its datum. */

        // Name
        var ename = "Entity "+object_number(this.id);
        
        // Size
        var width = Entity.name_width(ename);
        var height = entity_param.height;

        // Datum
        var def_d = Entity.default_datum();
        def_d.name = ename;
        var d = fill_datum(data, def_d);
        d.x0 = d.x;
        d.y0 = d.y;
        d.id = this.id;

        // Create a group for the rect / text
        var entity = svg.append("g")
            .datum( d )
            .attr("class","entity_prototype")
            .attr("id",this.id)
            .attr("parent",this.id) // This is used for the overlay definitions
            .attr("x", d.x)
            .attr("y", d.y)
            .attr("width", width)
            .attr("height", height);
        // Entity rectangle
        entity.append("rect")
            .attr("class","entity")
            .attr("id","r-"+this.id)
            .attr("x", d.x)
            .attr("y", d.y)
            .attr("width", width)
            .attr("transform", () => translate(-width/2,-height/2));
        
        // Display entity name
        var spl = 9; // Height to split the Entity name and ref mode
        entity.append("text")
            .attr("class","ename")
            .attr("id","t-"+this.id)
            .attr("x", d.x)
            .attr("y", function(){ return (d.y-spl) })
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .text( function(d){ return d.name } );

        // Display entity refmode
        entity.append("text")
            .attr("class","refmode")
            .attr("id","tr-"+this.id)
            .attr("x", d.x)
            .attr("y", function(){ return (d.y+spl) })
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .text( function(d){ return `(.${d.refmode})` } );

        // Create new overlay for entity
        // Overlays are defined in graph-constructor
        overlay_definition(entity,"eoverlay");
        
        // Assign entity            
        this.d3object = entity;

        // Add actions
        this.actions();

        // Correct refmode display based on datum
        this.update_name_display();

        return entity;
    }

    // Names

    static name_width(ename) {
        // Based on name length, set size of entity
        return ename.length*10 + 21;
    }

    update_name_display() {
        // Use datum to update how name and refmode appear
        var d = this.d3object.datum();
        var disp_name = Entity.format_name(d.name);
        var ref_name = Entity.format_refmode(d.refmode, d.reftype);

        d3.select(`#t-${this.id}`).text( disp_name );
        d3.select(`#tr-${this.id}`).text( ref_name );
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
                     refmode: "id", reftype: "popular", unittype: ""};
        return param
    }

    record() {
        // Add new entity to global record
        orm.entities[this.id] = this;
    }

    duplicate() {
        // Data about original fact
        var d = this.d3object.datum();

        // Location for duplicate
        var offset = entity_param.height*0.75;
        var x = d.x + offset;
        var y = d.y + offset;

        // Set datum
        var dc = {x: x, y:y};
        var match_datum = ["name", "independent", "refmode", "reftype", "unittype"];
        match_datum.map( (n) => { dc[n] = d[n]; });
        
        // Duplicate entity
        var ecopy = new Entity(dc);

        // Update orm
        //parse_orm();
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
        this.d3object
            .on("dblclick", popup_event)
            .on("contextmenu", d3.contextMenu(entityOptions)) // Right click menu
            //.on("click", remove_entity) // Ctrl+click --> remove entity
            .call(drag_entity);

        // Add events to overlay
        this.overlay_actions();
    }

    overlay_actions() {
        /* What to do with an overlay on a mousedown event (create connector) */
        d3.select( `#o-${this.id}` )
          .on("mousedown", (event) => { this.mousedown(event, this); });
    }

    dragged(event,d) {

        console.log("dragged", event, d)
        var entity = orm.entities[d.id];
    
        /* Drag event for an entity */
        Graph.dragged(event,d,entity)
    
    }

    dragstarted(event) {

        /* Initiate drag event */
        console.log("entity dragstarted: this", this)
        event.sourceEvent.stopPropagation();
        d3.select(this).datum().selected = true;
        d3.select(this).style("cursor", "grabbing");
        // Graph.dragstarted(event,d,entity)
    }

    dragended() {

        /* End drag event for entity */

        var entityID = d3.select(this).attr("id");
        var entity = orm.entities[entityID];
    
        console.log("entity dragended: this", this, entity.id)
        entity.d3object.datum().selected = false;
        entity.d3object.style("cursor", "grab");
        // Graph.dragended(event,d,this)
    
        /* Check flip condition for each fact (rolebox group) attached
           to the entity, flip if appropriate, and redraw connected connectors */
        var rbgroups = entity.plays_lead_roles();
        for (var n in rbgroups) {
            check_flip_and_connectors(rbgroups[n]);
        }
    }

    move() {
        // Move the constraint based on the position in datum
        var d = this.d3object.datum();
        this.d3object
            .attr("x", d.x)
            .attr("y", d.y )
            .attr("transform", () => translate(d.dx,d.dy));

        // Redraw all connected connectors
        Connector.redraw(d.connectors);
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
        var width = entity.attr("width");
        var mousepos = {x: m[0] + d.x - width/2, 
                        y: m[1] + d.y - entity_param.height/2};
    
        Graph.mousedown(event, entity, mousepos);
    
    }

    /*----- END Entity actions -----*/

    /*----- Entity connections -----*/

    plays_lead_roles() {
        /* Find all facts for which the entity plays a "lead" role.
           That is, the entity is the "subject" of the fact.
            
           This lead role concept is used to determine whether to flip a fact
           in the visualization. */
        return Graph.plays_lead_roles(this)
    }

    plays_roles() {
        /* Find all roles played by object */
        return Graph.plays_roles(this)
    }

    /*----- END Entity connections -----*/
}