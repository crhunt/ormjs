/*
    Everything related to constraints.

    This file defines constraints, data associated with how they are represented and
    connected to other objects, and actions they can perform, such as on drag and 
    click events.
*/

var ormjs;


ormjs.Constraint = class {

    d3object;
    id;
    kind = "constraint";
    model;
    view;
    param = {
        oradius : ormjs.size.constraint.oradius,
        radius : ormjs.size.constraint.radius,
        stroke : ormjs.size.connector.stroke
    };

    constructor(data) {
        
        if(!data.d3object) {
            this.model = data.model;
            // Create new d3 object
            this.id = ormjs.Constraint.generateID(this.model);
            this.create_d3object(data);

        } else {
            // Create new constraint object with provided d3 object
            var d = data.d3object.datum();
            this.id = data.d3object.attr("id");
            this.model = data.model ? data.model
                                    : d.model;
            d.id = this.id;
            this.d3object = data.d3object;
        }

        this.d3object.datum().model = this.model;

        this.view = d3.select( d3.select(`#${this.id}`).node().parentNode )
                      .node().id;
        this.d3object.datum().view = this.view;

        // Record object
        this.record();

        // Update ORM
        parse_orm();
    }

    static generateID(modelID) {
        // Generate ID for a new constraint
        /*var constID = "id-constraint-" + orm.highestConstID.toString();
        orm.highestConstID += 1;
        return constID*/
        return ormjs.Model.generateID(modelID,"constraint")
    }

    create_d3object(data) {

        /* Draw a new constraint. The svg group is assigned to d3object. */

        // Default type for a new constraint
        var constrainttypes = ormjs.Constraint.supported_types().names;
        var default_type = constrainttypes.inclusive_or;
        
        var svg = data.view ? data.view
                            : ormjs.models[this.model].currentview.d3object;
        
        var x = data.x; 
        var y = data.y;
        
        // Create group
        var constraint = svg.append("g")
            .datum( { x: x, y: y, dx: x, dy: y, x0: 0, y0: 0,
                      selected: false, connectors: [], id: this.id,
                      kind: "constraint", type: default_type,
                      content: "", deontic: false, 
                      ring: false, obligatory: false } )
            .attr("class", "constraint_prototype")
            .attr("id", this.id)
            .attr("parent", this.id)
            .attr("width", 2*this.param.radius)
            .attr("height", 2*this.param.radius);
        
        // Draw overlay
        constraint.append("circle")
            .attr("class", `overlay coverlay`)
            .attr("id", `o-${this.id}`)
            .attr("r", this.param.oradius);

        // Add constraint visualization
        ormjs.Constraint.draw_constraint(constraint);

        // Move to position
        constraint.attr("transform", () => ormjs.Graph.translate(x,y));

        // Assign
        this.d3object = constraint;

        // Add actions
        this.actions();
    }

    record() {
        // Add new constraint to global record
        ormjs.models[this.model].objects[this.kind][this.id] = this;
    }

    redraw() {

        /* After the datum has been updated, check that the datum is valid and
           redraw the constraint according to the datum. */

        // Correct content based on format rules.
        this.set_content();
        // Set radius data
        this.set_radius();
        // Group
        d3.select(`#${this.id}`)
            .attr("width", 2*this.param.radius)
            .attr("height", 2*this.param.radius);
        // Overlay
        d3.select(`#o-${this.id}`)
            .attr("r", this.param.oradius);

        // Draw contraint
        ormjs.Constraint.draw_constraint(this.d3object);

        // Redraw connectors
        ormjs.Connector.redraw(this.d3object.datum().connectors);
        
    }

    set_content(val) {

        /* Set content to val, if provided and allowed.
        
           Not all constraint types can have a populated content. And
           some constraints can only have a pre-determined content (subtype). */
        
        // Only these constraints allowed to have populated content
        var allow_content = ["internal-frequency", "external-frequency", "role-value"];
        
        // Change content if necessary
        var d = this.d3object.datum();
        if (d.type == "subset") { d.content = "⊆"; }
        else if (!allow_content.includes(d.type)) { d.content = ""; }
        // If content value is provided, set it.
        if (arguments.length == 1 && allow_content.includes(d.type)) {
            d.content = val;
        }
        // Some characters we replace for appearance.
        d.content = d.content.replaceAll(" ", "");
        d.content = d.content.replace(">=", "≥");
        d.content = d.content.replace("<=", "≤");
    }

    set_radius() {

        /* For constraints with user-defined content, reset the radius to
           match the content. */

        // Default radius
        var r = ormjs.GraphUtils.get_css_number('--constraint-radius');
        var or = ormjs.GraphUtils.get_css_number('--constraint-oradius');

        // Set based on value of content
        if (this.d3object.datum().content.length > 0) {
            var dr = or-r;
            var newr = (this.d3object.datum().content.length*12 + 4)/2;
            var ndot = this.d3object.datum().content.split(".").length -1;
            newr = newr - ndot*4;
            r = Math.max(newr, r);
            or = r+dr;
        }

        this.param.radius = r;
        this.param.oradius = or;
    }

    static supported_types() {
        /* Names of supported constraint types. 
           Please reference types using constrainttypes. */

        var constrainttypes = {
            inclusive_or: "inclusive-or",
            exclusion: "exclusion",
            exclusive_or: "exclusive-or",
            equality: "equality",
            external_freq: "external-frequency",
            internal_freq: "internal-frequency",
            identifier: "identifier",
            preferred_id: "preferred-identifier",
            subset: "subset",
            role_value: "role-value"
        };
        var constraintlist = ["inclusive-or", "exclusion", "exclusive-or", "equality",
                    "identifier", "preferred-identifier", "subset", 
                    "external-frequency", "internal-frequency"]
        return { names: constrainttypes, list: constraintlist }
    }

    static draw_constraint(d3parent) {
        
        /* 
           Draw the constraint as a circle + constraint-specific path(s).
           Attach to a group, d3parent.

           We draw constraints through a static function because we also 
           use this to generate constraint images in the property menu.
         */

        var id = d3parent.attr("id");
        d3.select(`#c-${id}`).remove();

        // Set radius
        var radius = d3parent.attr("width")/2;
        
        d3parent.append("circle")
            .attr("class", "constraint")
            .attr("id",`c-${id}`)
            .attr("shape-rendering","geometricPrecision")
            .attr("r", radius);
        
        if (d3parent.datum().type == "internal-frequency") {
            ormjs.Graph.class_as(`c-${id}`, "clear");
        }

        ormjs.Constraint.draw_constraint_path(d3parent);

    }

    static draw_constraint_path(d3parent) {

        /* Remove current path(s) in visualization of constraint.
           Draw path(s) or text that depends on constraint type. */

        // Remove current constraint visualization
        var id = d3parent.attr("id");
        d3.select(`#val-${id}`).remove();
        
        // Type of constraint
        var constrainttype = d3parent.datum().type;

        // Add path visualization
        var path = ormjs.Constraint.constraint_path(d3parent);
        if (path != null) {
            d3parent.datum().content = "";
            d3parent.append("path")
                .attr("d", path)
                .attr("class", "constraint_val " + constrainttype)
                .attr("id", `val-${id}`);
            return
        }

        // Add text visualization
        d3parent.append("text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("class", "constraint_text " + constrainttype)
            .attr("id", `val-${id}`)
            .text( d3parent.datum().content );
    }

    static constraint_path(d3object, r=-1) {

        // Get path string based on constraint type
        
        if(r < 0) { r = d3object.attr("width")/2; }
        var paths = {
            "inclusive-or": () => {return inclusive_or_path(r) },
            "exclusion": () => {return exclusion_path(r) },
            "exclusive-or": () => {return exclusive_or_path(r) },
            "equality": () => {return equality_path(r) },
            "identifier": () => {return identifier_path(r) },
            "preferred-identifier": () => {return preferred_identifier_path(r) }
        };
        return paths[d3object.datum().type]
    }

    static valid_frequency_content(str) {
        /* Frequency constraints only accept a certain format.
           Check that str contains a valid frequency constraint. */
        if (str.length == 0) {return false}
        var rgnum = "(\-)?[0-9]+((.)?[0-9]+)?"; // Number
        var rgrng = "(( )?(..( )?)?"+rgnum+")?"; // Range
        var regex = new RegExp("^([\>\<≥≤])?(\=)?( )?([\(\[]( )?)?"+rgnum+rgrng+"(( )?[\)\]]?)?$");
        if (regex.test(str)) { return true }
        return false
    }

    duplicate() {
        
        // Create new constraint with same properties as this constraint

        // Location for duplicate
        var d = this.d3object.datum();
        var offset = this.param.radius*2;
        var data = { x : d.x + offset, y : d.y + offset, model: this.model };

        // Duplicate
        var constcopy = new ormjs.Constraint(data);
        var dc = constcopy.d3object.datum();

        var match_datum = ["type", "content", "deontic", "ring", "obligatory"];
        match_datum.map( (n) => { dc[n] = d[n]; });

        // Redraw
        constcopy.redraw();

        // Update orm
        parse_orm();

    }

    /* Actions */

    actions() {

        /* All actions related to constraints. */

        // Drag actions
        var drag_constraint = d3.drag()
            .on("start", this.dragstarted)
            .on("drag", this.dragged )
            .on("end",  this.dragended);
        
        // Object actions
        var constraintMenu = ormjs.OptionMenu.constraint_menu(this.model);
        this.d3object
            .on("dblclick", popup_event)
            .on("contextmenu", d3.contextMenu(constraintMenu)) // Right click menu
            .on("click", ormjs.Constraint.remove) // Ctrl+click --> remove constraint
            .call(drag_constraint);

        // Overlay actions
        var overlay = d3.select(`#o-${this.id}`);
        overlay.on("mousedown", (event) => { this.mousedown(event, this); });
    }

    dragstarted(event,d) {
        ormjs.Graph.dragstarted(event,d);
    }

    dragged(event, d) {
        ormjs.Graph.dragged(event,d);
    }

    dragended(event,d) {
        ormjs.Graph.dragended(event,d);
    }

    move() {
        ormjs.Graph.object_move(this);
    }

    mousedown(event, constraint) {

        /* On overlay mousedown, create a new connector. */

        // Current pointer position
        var d = constraint.d3object.datum();
        var m = d3.pointer(event);
        var mousepos = { x: m[0] + d.x, y: m[1] + d.y };

        ormjs.Graph.mousedown(event, constraint, mousepos);
    }

    /* End Actions */

    /* Delete */

    static remove(event) {
        /* Remove connector on click event */

        // Only 2 types of click events should result in deleting constraint:
        // Ctrl key for click event, buttons for right click menu
        event.stopPropagation();
        if (event.ctrlKey || event.buttons == 2) {
            var click_objID = event.target.id.toString();
            var parentID = ormjs.Graph.get_parentID(click_objID);
            ormjs.Graph.any_object(parentID).delete();
        }
    }

    delete() {

        /* Delete the constraint.
           1. Remove connectors from constraint
           2. Remove visualization
           3. Remove references to constraint
           4. Update ORM metamodel */
    
           ormjs.Graph.delete_object(this);
    }

    /* End Delete */

    /* Connections */

    closest_overlay(pos) {
        // Get position at radius of constraint for connectors 
        var d = this.d3object.datum();
        var posdata = {x1: d.x, y1: d.y, x2: pos.x, y2: pos.y, r: this.param.radius};
        return point_on_circle(posdata)
    }

    roles() {
        // All roles connected to constraint
        var conns = this.d3object.datum().connectors;
        var conntypes = ormjs.Connector.supported_types().names;
        var connectors = ormjs.models[this.model].objects.connector;
        var roles = conns.map( (connID) => {
            var cd = connectors[connID].d3object.datum();
            if ( cd.conntype == conntypes.CtoRB ) { return cd.to }
        }).filter(v => v);

        return roles
    }

    subtype_roles() {
        // All subtype "roles" connected to constraint
        var conns = this.d3object.datum().connectors;
        var conntypes = ormjs.Connector.supported_types().names;
        var connectors = ormjs.models[this.model].objects.connector;
        var roles = conns.map( (connID) => {
            var cd = connectors[connID].d3object.datum();
            if ( cd.conntype == conntypes.CtoS ) { return cd.to }
        }).filter(v => v);

        return roles
    }

    entities() {
        // All entities connected to roles connected to constraint
        var roles = this.roles();
        var entities = roles.map( (rboxID) => {
            return d3.select("#"+rboxID).datum().entity
        });
        // All supertype entities connected to subtype arrows connected to constraint
        var subroles = this.subtype_roles();
        entities.push.apply( entities, subroles.map( (connID) => {
            return d3.select("#"+connID).datum().to
        }) );

        return entities
    }

    primary_entities() {
        // All first entities connected to facts where a role is connected to constraint
        var roles = this.roles();
        var entities = roles.map( (rboxID) => {
            var rbgroup = d3.select("#" + d3.select("#"+rboxID).attr("parent"));
            return rbgroup.datum().entity_in
        });
        // All subtype entities connect to subtype arrows connected to constraint
        var subroles = this.subtype_roles();
        entities.push.apply( entities, subroles.map( (connID) => {
            return d3.select("#"+connID).datum().from
        }) );

        return entities
    }

    neighbor_roles() {

        /* If a constraint is connected between 2 roleboxes, we assume we want
           to connect to both. 
           
           This function returns neighbors of connected roleboxes and indicates with
           "auto" whether we should autoconnect because the rolebox is connected on
           the left or right side. */

        // Current connectors
        var conns = this.d3object.datum().connectors;
        var conntypes = ormjs.Connector.supported_types().names;
        var connectors = ormjs.models[this.model].objects.connector;

        // Roles connected to constraint
        var lr = ["left", "right"];
        var role_info = conns.map( (connID) => {
            var cd = connectors[connID].d3object.datum();
            if ( cd.conntype == conntypes.CtoRB ) {
                if ( lr.includes(cd.to_loc[0]) ) { 
                    return {rboxID: cd.to, location: cd.to_loc[0],
                            directed: cd.directed, auto: true} 
                } else {
                    return {rboxID: cd.to, location: cd.to_loc[0],
                            directed: cd.directed, auto: false} 
                }
            }
        } ).filter(v => v);
        
        // New role to connect
        var neighbors = role_info.map( (r) => {
            var rbgroup = d3.select( "#"+ d3.select(`#${r.rboxID}`).attr("parent") );
            var boxes = [...rbgroup.datum().boxes];
            var ind = boxes.indexOf(r.rboxID);
            var neighborlist = [];
            if ( ind > 0 ) {
                var auto = r.auto;
                if ( r.location == "right" ) { auto = false; }
                neighborlist.push(
                    {rboxID: boxes[ind-1], location: "right", directed: r.directed,
                     auto: auto } );
            } 
            if ( ind < boxes.length-1 ) {
                var auto = r.auto;
                if ( r.location == "left" ) { auto = false; }
                neighborlist.push(
                    {rboxID: boxes[ind+1], location: "left", directed: r.directed,
                     auto: auto} );
            }
            return neighborlist
        } ).flat().filter(v => v);

        return neighbors
    }

    propagate_roles() {

        /* If a constraint is connected between 2 roleboxes, we assume we want
           to connect to both. This function connects the constraint to a neighboring
           rolebox, if that rolebox was connected on the left or right side. */

        // Current roles
        var roles = this.roles();

        // Roles to add
        var neighbors = this.neighbor_roles();
        var dragevent = ormjs.models[this.model].dragevent;

        // Create connections to new roles
        neighbors.map( (r) => {
            if (! roles.includes(r.rboxID) && r.auto ) {
                dragevent.locations = [ r.location ];
                // Directed is important if the constraint is directed.
                // Want to match direction
                r.directed ? ormjs.Connector.connect_by_id(this.id, r.rboxID)
                           : ormjs.Connector.connect_by_id(r.rboxID, this.id);
            }
        }).filter(v => v);
        dragevent.locations = dragevent.all_locations;

    }

    can_connect(d3target) {
        /* Check that this constraint can connect to the target */

        // Data
        var d = d3target.datum(); // target datum

        // Connect to rolebox
        if (d.kind == "rolebox") {
            return this._can_connect_rolebox(d3target)
        }

        // Connect to subtype
        var conntypes = ormjs.Connector.supported_types().names;
        if (d.kind == "connector" && d.conntype == conntypes.subtype) {
            return this._can_connect_subtype(d3target)
        }

        return false
    }

    _can_connect_rolebox(d3target) {

        /* A set of rules for determining if a constraint can connect to
           the rolebox d3target. Since these rules depend on the type of 
           constraint, there is a lot of ORM logic encoded here. */

        // Get data
        var d = d3target.datum(); // rolebox
        var ctd = this.d3object.datum(); // constraint
        var constrainttypes = ormjs.Constraint.supported_types().names;

        // Rolebox must be assigned
        if (d.entity == null) { return false }

        // No connections, no problems
        if (ctd.connectors.length == 0) { return true }

        // Same type (can't connect to both subtype and rolebox)
        var roles = this.subtype_roles();
        if (roles.length > 0) { return false }

        // No double dipping (can't connect to same role twice)
        roles = this.roles();
        if (roles.includes( d3target.attr("id") )) { return false }

        // Only single rolebox connection
        var allowed_single = [constrainttypes.role_value];
        if (allowed_single.includes(ctd.type)) {
            if (ctd.connectors.length > 0) { return false }
            return true // Shouldn't reach this b/c already checked for ctd.connectors.length = 0
        }

        /* Same fact: constraint restricted to connect to neighbor roles in same fact */
        var same_fact = [constrainttypes.internal_freq];
        if (same_fact.includes(ctd.type)) {
            var rboxIDs = this.neighbor_roles().map((r) => { return r.rboxID });
            if ( rboxIDs.includes(d3target.attr("id")) ) {  return true }
            return false
        }
        

        /* Same entity: constraints must reference same entity */
        // Certain constraints match on primary entity of fact
        var match_primary = [constrainttypes.identifier, 
                             constrainttypes.preferred_id,
                             constrainttypes.external_freq];
        if ( match_primary.includes(ctd.type) ) {
            // For identifiers and EF, match primary entity
            var fact_entity = d3.select(`#${d.parent}`).datum().entity_in; // Primary entity for fact
            if( fact_entity == d.entity ) { return false }
            var entities = this.primary_entities(); // Primary entities for this constraint
            if( entities.includes(fact_entity) ) { return true }
            return false
        }
        // Match entity of rolebox
        var entities = this.entities();
        if( entities.includes(d.entity) ) { return true }

        // Exception to same entity: neighboring rolebox
        var rboxIDs = this.neighbor_roles().map((r) => { return r.rboxID });
        if ( rboxIDs.includes(d3target.attr("id")) ) { 
            return true 
        }

        return false

    }

    _can_connect_subtype(d3target) {

        /* A set of rules for determining if a constraint can connect to
           the subtype arrow d3target. Since these rules depend on the type of 
           constraint, there is a lot of ORM logic encoded here. */


        // Get data
        var d = d3target.datum(); // subtype connector
        var ctd = this.d3object.datum(); // constraint
        var constrainttypes = ormjs.Constraint.supported_types().names;

        // Only certain constraints
        var allowed_constraints = [constrainttypes.exclusion,
                    constrainttypes.exclusive_or,
                    constrainttypes.inclusive_or];
        if ( !allowed_constraints.includes(ctd.type) ) {
            return false
        }

        // No connections, no problems
        var conns = ctd.connectors;
        if (conns.length == 0) { return true }

        // Same type (can't connect to both subtype and rolebox)
        var roles = this.roles();
        if (roles.length > 0) { return false }

        // No double dipping (can't connect to same subtype twice)
        roles = this.subtype_roles();
        if (roles.includes( d3target.attr("id") )) { return false }

        // Same entity: constraints must reference same entity
        var entities = this.entities();
        if( entities.includes(d.to) ) { return true }

        return false
    }

    /* End Connections */

}

/* Geometry transformations */

function point_on_circle(pos) {

    /* Find a point a distance r from a circle centered at (pos.x1, pos.y1)
       along a line pointing to (pos.x2, pos.y2). */

    
    var totalangle = Math.atan( ( pos.y2 - pos.y1 ) / ( pos.x2 - pos.x1 ) );
    if (pos.x1 > pos.x2) {totalangle += Math.PI; }

    return {x: pos.x1 + pos.r*Math.cos(totalangle), y: pos.y1 + pos.r*Math.sin(totalangle)}
    
}